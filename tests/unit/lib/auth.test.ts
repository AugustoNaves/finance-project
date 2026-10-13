import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { getAuthenticatedUser } from "@/lib/auth";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

const user = { id: "user-1", name: "Maria", email: "maria@example.com" };

function buildRequest(cookie?: string) {
  return new NextRequest("http://localhost:3000/api/me", {
    headers: cookie ? { cookie } : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getAuthenticatedUser", () => {
  it("retorna null sem consultar o banco quando não há cookie", async () => {
    await expect(getAuthenticatedUser(buildRequest())).resolves.toBeNull();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("retorna null sem consultar o banco quando o cookie é inválido", async () => {
    const request = buildRequest(`${SESSION_COOKIE_NAME}=token.invalido`);

    await expect(getAuthenticatedUser(request)).resolves.toBeNull();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("busca o usuário da sessão selecionando apenas id, nome e e-mail", async () => {
    prismaMock.user.findUnique.mockResolvedValue(user);
    const token = await createSessionToken(user);

    const result = await getAuthenticatedUser(buildRequest(`${SESSION_COOKIE_NAME}=${token}`));

    expect(result).toEqual(user);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { id: true, name: true, email: true },
    });
  });

  it("retorna null quando o usuário da sessão não existe mais", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const token = await createSessionToken(user);

    await expect(
      getAuthenticatedUser(buildRequest(`${SESSION_COOKIE_NAME}=${token}`)),
    ).resolves.toBeNull();
  });

  it("propaga erros do banco", async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error("db fora do ar"));
    const token = await createSessionToken(user);

    await expect(
      getAuthenticatedUser(buildRequest(`${SESSION_COOKIE_NAME}=${token}`)),
    ).rejects.toThrow("db fora do ar");
  });
});
