import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, txMock, passwordMock } = vi.hoisted(() => {
  const txMock = {
    user: { update: vi.fn() },
    passwordResetToken: { update: vi.fn() },
  };

  return {
    txMock,
    prismaMock: {
      $transaction: vi.fn(),
      user: { update: vi.fn() },
      passwordResetToken: { findUnique: vi.fn(), update: vi.fn() },
    },
    passwordMock: { hashPassword: vi.fn(), comparePassword: vi.fn() },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/password", () => passwordMock);

import { POST } from "@/app/api/auth/reset-password/route";
import { buildRequest } from "./helpers";

const NOW = new Date("2026-05-10T12:00:00Z");
const validPayload = { token: "token-valido", password: "nova-senha-123" };

let consoleError: ReturnType<typeof vi.spyOn>;

function buildResetToken(overrides: Record<string, unknown> = {}) {
  return {
    id: "token-id",
    email: "maria@example.com",
    token: "token-valido",
    expiresAt: new Date(NOW.getTime() + 30 * 60 * 1000),
    usedAt: null,
    userId: "user-1",
    ...overrides,
  };
}

function resetPassword(body: unknown, rawBody?: string) {
  return POST(buildRequest("/api/auth/reset-password", { method: "POST", body, rawBody }));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.clearAllMocks();
  passwordMock.hashPassword.mockResolvedValue("novo-hash");
  prismaMock.passwordResetToken.findUnique.mockResolvedValue(buildResetToken());
  prismaMock.$transaction.mockImplementation((callback: (tx: typeof txMock) => unknown) =>
    callback(txMock),
  );
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  consoleError.mockRestore();
});

describe("POST /api/auth/reset-password", () => {
  it.each([
    ["token ausente", { token: undefined }],
    ["token vazio", { token: "" }],
    ["token não textual", { token: 123 }],
  ])("retorna 400 para %s", async (_caso, overrides) => {
    const response = await resetPassword({ ...validPayload, ...overrides });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Token inválido." });
    expect(prismaMock.passwordResetToken.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ["senha ausente", { password: undefined }],
    ["senha com menos de 8 caracteres", { password: "1234567" }],
    ["senha não textual", { password: 12345678 }],
  ])("retorna 400 para %s", async (_caso, overrides) => {
    const response = await resetPassword({ ...validPayload, ...overrides });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "A nova senha deve ter pelo menos 8 caracteres.",
    });
    expect(prismaMock.passwordResetToken.findUnique).not.toHaveBeenCalled();
  });

  it("retorna 400 para JSON malformado", async () => {
    const response = await resetPassword(undefined, "{token");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Corpo da requisição inválido." });
  });

  it("retorna 400 quando o token não existe", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(null);

    const response = await resetPassword(validPayload);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Link inválido ou expirado." });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("retorna 400 quando o token está expirado", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(
      buildResetToken({ expiresAt: new Date(NOW.getTime() - 1000) }),
    );

    const response = await resetPassword(validPayload);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Link inválido ou expirado." });
    expect(passwordMock.hashPassword).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("retorna 400 quando o token já foi utilizado", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(
      buildResetToken({ usedAt: new Date(NOW.getTime() - 60_000) }),
    );

    const response = await resetPassword(validPayload);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Link inválido ou expirado." });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("consulta o token informado", async () => {
    await resetPassword(validPayload);

    expect(prismaMock.passwordResetToken.findUnique).toHaveBeenCalledWith({
      where: { token: "token-valido" },
    });
  });

  it("atualiza a senha do dono do token com o novo hash e retorna 200", async () => {
    const response = await resetPassword(validPayload);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: "Senha redefinida com sucesso." });
    expect(passwordMock.hashPassword).toHaveBeenCalledWith("nova-senha-123");
    expect(txMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { passwordHash: "novo-hash" },
    });
  });

  it("marca o token como utilizado", async () => {
    await resetPassword(validPayload);

    expect(txMock.passwordResetToken.update).toHaveBeenCalledWith({
      where: { token: "token-valido" },
      data: { usedAt: NOW },
    });
  });

  it("atualiza a senha e marca o token na mesma transação", async () => {
    await resetPassword(validPayload);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(prismaMock.passwordResetToken.update).not.toHaveBeenCalled();
  });

  it("aceita senha com exatamente 8 caracteres", async () => {
    const response = await resetPassword({ ...validPayload, password: "12345678" });

    expect(response.status).toBe(200);
  });

  it("ignora userId enviado no corpo e usa o dono do token", async () => {
    await resetPassword({ ...validPayload, userId: "outro-usuario" });

    expect(txMock.user.update.mock.calls[0][0].where).toEqual({ id: "user-1" });
  });

  it("retorna 500 quando marcar o token como utilizado falha", async () => {
    txMock.passwordResetToken.update.mockRejectedValueOnce(new Error("falha ao marcar token"));

    const response = await resetPassword(validPayload);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao redefinir senha." });
    expect(consoleError).toHaveBeenCalled();
  });

  it("retorna 500 quando o banco falha", async () => {
    prismaMock.$transaction.mockRejectedValue(new Error("db fora do ar"));

    const response = await resetPassword(validPayload);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao redefinir senha." });
    expect(consoleError).toHaveBeenCalled();
  });
});
