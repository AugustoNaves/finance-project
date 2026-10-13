import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, resendMock, tokensMock } = vi.hoisted(() => ({
  prismaMock: { user: { findUnique: vi.fn() } },
  resendMock: { sendPasswordResetEmail: vi.fn() },
  tokensMock: { createPasswordResetToken: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/resend", () => resendMock);
vi.mock("@/lib/tokens", () => tokensMock);

import { POST } from "@/app/api/auth/forgot-password/route";
import { buildRequest } from "./helpers";

const GENERIC_MESSAGE = "Se este email estiver cadastrado, enviaremos um link de recuperação.";
const storedUser = { id: "user-1", name: "Maria", email: "maria@example.com" };

let consoleError: ReturnType<typeof vi.spyOn>;

function forgotPassword(body: unknown, rawBody?: string) {
  return POST(buildRequest("/api/auth/forgot-password", { method: "POST", body, rawBody }));
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findUnique.mockResolvedValue(storedUser);
  tokensMock.createPasswordResetToken.mockResolvedValue("token-gerado");
  resendMock.sendPasswordResetEmail.mockResolvedValue({ data: { id: "email-1" }, error: null });
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  consoleError.mockRestore();
});

describe("POST /api/auth/forgot-password", () => {
  it.each([
    ["e-mail ausente", {}],
    ["e-mail vazio", { email: "" }],
    ["e-mail não textual", { email: 123 }],
    ["e-mail em array", { email: ["maria@example.com"] }],
  ])("retorna 400 para %s", async (_caso, body) => {
    const response = await forgotPassword(body);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Informe um email válido." });
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("retorna 400 para JSON malformado", async () => {
    const response = await forgotPassword(undefined, "{email");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Corpo da requisição inválido." });
  });

  it("busca o usuário pelo e-mail normalizado (trim e minúsculas)", async () => {
    await forgotPassword({ email: "  MARIA@Example.com " });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: "maria@example.com" },
    });
  });

  it("retorna 200 com mensagem genérica para e-mail não cadastrado, sem gerar token nem enviar e-mail", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const response = await forgotPassword({ email: "desconhecido@example.com" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: GENERIC_MESSAGE });
    expect(tokensMock.createPasswordResetToken).not.toHaveBeenCalled();
    expect(resendMock.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("gera o token e envia o e-mail com o link de redefinição para usuário cadastrado", async () => {
    const response = await forgotPassword({ email: "maria@example.com" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: GENERIC_MESSAGE });
    expect(tokensMock.createPasswordResetToken).toHaveBeenCalledWith(
      "user-1",
      "maria@example.com",
    );
    expect(resendMock.sendPasswordResetEmail).toHaveBeenCalledWith(
      "maria@example.com",
      "http://localhost:3000/reset-password?token=token-gerado",
    );
  });

  it("devolve resposta idêntica para e-mail cadastrado e não cadastrado", async () => {
    const existing = await forgotPassword({ email: "maria@example.com" });

    prismaMock.user.findUnique.mockResolvedValue(null);

    const missing = await forgotPassword({ email: "desconhecido@example.com" });

    expect(existing.status).toBe(missing.status);
    expect(await existing.json()).toEqual(await missing.json());
  });

  it("não expõe o token na resposta", async () => {
    const response = await forgotPassword({ email: "maria@example.com" });

    expect(JSON.stringify(await response.json())).not.toContain("token-gerado");
  });

  it("remove a barra final de NEXT_PUBLIC_APP_URL ao montar o link", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://financas.example.com/");

    await forgotPassword({ email: "maria@example.com" });

    expect(resendMock.sendPasswordResetEmail).toHaveBeenCalledWith(
      "maria@example.com",
      "https://financas.example.com/reset-password?token=token-gerado",
    );
  });

  it("mantém a resposta genérica 200 quando o envio do e-mail falha (sem enumeração de usuários)", async () => {
    resendMock.sendPasswordResetEmail.mockRejectedValue(new Error("Resend indisponível"));

    const response = await forgotPassword({ email: "maria@example.com" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: GENERIC_MESSAGE });
    expect(consoleError).toHaveBeenCalledWith(
      "Erro ao enviar email de recuperação de senha:",
      expect.any(Error),
    );
  });

  it("retorna 500 quando a consulta ao banco falha", async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error("db fora do ar"));

    const response = await forgotPassword({ email: "maria@example.com" });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao processar a solicitação." });
    expect(consoleError).toHaveBeenCalled();
  });

  it("retorna 500 e não envia e-mail quando a criação do token falha", async () => {
    tokensMock.createPasswordResetToken.mockRejectedValue(new Error("db fora do ar"));

    const response = await forgotPassword({ email: "maria@example.com" });

    expect(response.status).toBe(500);
    expect(resendMock.sendPasswordResetEmail).not.toHaveBeenCalled();
  });
});
