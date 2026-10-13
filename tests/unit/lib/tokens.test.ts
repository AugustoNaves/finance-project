import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  passwordResetToken: {
    create: vi.fn(),
    updateMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  createPasswordResetToken,
  markPasswordResetTokenAsUsed,
  validatePasswordResetToken,
} from "@/lib/tokens";

const NOW = new Date("2026-05-10T12:00:00Z");

function buildResetToken(overrides: Record<string, unknown> = {}) {
  return {
    id: "token-id",
    email: "maria@example.com",
    token: "token-valido",
    expiresAt: new Date(NOW.getTime() + 30 * 60 * 1000),
    usedAt: null,
    createdAt: NOW,
    userId: "user-1",
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation((operations: unknown[]) =>
    Promise.all(operations),
  );
  prismaMock.passwordResetToken.create.mockReturnValue("create-operation");
  prismaMock.passwordResetToken.updateMany.mockReturnValue("invalidate-operation");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createPasswordResetToken", () => {
  it("retorna um token UUID e o persiste com validade de 1 hora", async () => {
    const token = await createPasswordResetToken("user-1", "maria@example.com");

    expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(prismaMock.passwordResetToken.create).toHaveBeenCalledWith({
      data: {
        email: "maria@example.com",
        token,
        expiresAt: new Date("2026-05-10T13:00:00Z"),
        userId: "user-1",
      },
    });
  });

  it("gera tokens diferentes a cada chamada", async () => {
    const first = await createPasswordResetToken("user-1", "maria@example.com");
    const second = await createPasswordResetToken("user-1", "maria@example.com");

    expect(first).not.toBe(second);
  });

  it("invalida os tokens anteriores não utilizados do usuário", async () => {
    await createPasswordResetToken("user-1", "maria@example.com");

    expect(prismaMock.passwordResetToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", usedAt: null },
      data: { usedAt: NOW },
    });
  });

  it("invalida e cria na mesma transação, nessa ordem", async () => {
    await createPasswordResetToken("user-1", "maria@example.com");

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.$transaction).toHaveBeenCalledWith([
      "invalidate-operation",
      "create-operation",
    ]);
  });

  it("propaga o erro quando a transação falha", async () => {
    prismaMock.$transaction.mockRejectedValueOnce(new Error("db fora do ar"));

    await expect(createPasswordResetToken("user-1", "maria@example.com")).rejects.toThrow(
      "db fora do ar",
    );
  });
});

describe("validatePasswordResetToken", () => {
  it("busca o token pelo valor informado", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(buildResetToken());

    await validatePasswordResetToken("token-valido");

    expect(prismaMock.passwordResetToken.findUnique).toHaveBeenCalledWith({
      where: { token: "token-valido" },
    });
  });

  it("retorna o registro quando o token é válido", async () => {
    const resetToken = buildResetToken();
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(resetToken);

    await expect(validatePasswordResetToken("token-valido")).resolves.toEqual(resetToken);
  });

  it("retorna null quando o token não existe", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(null);

    await expect(validatePasswordResetToken("inexistente")).resolves.toBeNull();
  });

  it("retorna null quando o token já foi utilizado", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(
      buildResetToken({ usedAt: new Date("2026-05-10T11:00:00Z") }),
    );

    await expect(validatePasswordResetToken("token-valido")).resolves.toBeNull();
  });

  it("retorna null quando o token está expirado", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(
      buildResetToken({ expiresAt: new Date(NOW.getTime() - 1) }),
    );

    await expect(validatePasswordResetToken("token-valido")).resolves.toBeNull();
  });

  it("aceita o token exatamente no instante de expiração", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(
      buildResetToken({ expiresAt: new Date(NOW.getTime()) }),
    );

    await expect(validatePasswordResetToken("token-valido")).resolves.not.toBeNull();
  });

  it("expira o token após 1 hora da criação", async () => {
    await createPasswordResetToken("user-1", "maria@example.com");
    const { data } = prismaMock.passwordResetToken.create.mock.calls[0][0];
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(buildResetToken(data));

    vi.setSystemTime(new Date(NOW.getTime() + 59 * 60 * 1000));
    await expect(validatePasswordResetToken(data.token)).resolves.not.toBeNull();

    vi.setSystemTime(new Date(NOW.getTime() + 60 * 60 * 1000 + 1));
    await expect(validatePasswordResetToken(data.token)).resolves.toBeNull();
  });
});

describe("markPasswordResetTokenAsUsed", () => {
  it("grava a data de uso no token", async () => {
    await markPasswordResetTokenAsUsed("token-valido");

    expect(prismaMock.passwordResetToken.update).toHaveBeenCalledWith({
      where: { token: "token-valido" },
      data: { usedAt: NOW },
    });
  });

  it("usa o cliente de transação quando informado", async () => {
    const tx = { passwordResetToken: { update: vi.fn() } };

    await markPasswordResetTokenAsUsed("token-valido", tx as never);

    expect(tx.passwordResetToken.update).toHaveBeenCalledWith({
      where: { token: "token-valido" },
      data: { usedAt: NOW },
    });
    expect(prismaMock.passwordResetToken.update).not.toHaveBeenCalled();
  });
});
