import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET } from "@/app/api/me/route";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { authUser, buildRequest, buildSessionCookie, invalidSessionCookie } from "./helpers";

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findUnique.mockResolvedValue(authUser);
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  consoleError.mockRestore();
});

describe("GET /api/me", () => {
  it("retorna 401 sem cookie de sessão", async () => {
    const response = await GET(buildRequest("/api/me"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Não autenticado." });
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("retorna 401 com cookie de sessão inválido", async () => {
    const response = await GET(buildRequest("/api/me", { cookie: invalidSessionCookie }));

    expect(response.status).toBe(401);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("retorna 401 com cookie de sessão adulterado", async () => {
    const cookie = await buildSessionCookie();
    const [name, token] = cookie.split("=");
    const [, signature] = token.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ userId: "outro-usuario", email: "x@example.com", exp: 9999999999 }),
    ).toString("base64url");

    const response = await GET(
      buildRequest("/api/me", { cookie: `${name}=${forgedPayload}.${signature}` }),
    );

    expect(response.status).toBe(401);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("retorna 401 com sessão expirada", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const cookie = await buildSessionCookie();

    vi.setSystemTime(new Date("2026-02-01T00:00:00Z"));

    const response = await GET(buildRequest("/api/me", { cookie }));

    expect(response.status).toBe(401);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("retorna 401 quando o usuário da sessão não existe mais", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const response = await GET(buildRequest("/api/me", { cookie: await buildSessionCookie() }));

    expect(response.status).toBe(401);
  });

  it("retorna os dados do usuário autenticado", async () => {
    const response = await GET(buildRequest("/api/me", { cookie: await buildSessionCookie() }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ user: authUser });
  });

  it("busca o usuário pelo id da sessão sem selecionar o hash da senha", async () => {
    await GET(buildRequest("/api/me", { cookie: await buildSessionCookie() }));

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: authUser.id },
      select: { id: true, name: true, email: true },
    });
  });

  it("ignora cookies com outro nome", async () => {
    const cookie = (await buildSessionCookie()).replace(SESSION_COOKIE_NAME, "auth_token");

    const response = await GET(buildRequest("/api/me", { cookie }));

    expect(response.status).toBe(401);
  });

  it("retorna 500 quando o banco falha", async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error("db fora do ar"));

    const response = await GET(buildRequest("/api/me", { cookie: await buildSessionCookie() }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro interno do servidor." });
    expect(consoleError).toHaveBeenCalled();
  });
});
