import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/logout/route";
import { SESSION_COOKIE_NAME } from "@/lib/session";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/logout", () => {
  it("retorna 200 com mensagem de sucesso", async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      mensagem: "Logout efetuado.",
    });
  });

  it("limpa o cookie de sessão com valor vazio e maxAge zero", async () => {
    const response = await POST();
    const cookie = response.cookies.get(SESSION_COOKIE_NAME);

    expect(cookie).toMatchObject({
      name: "session_token",
      value: "",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  });

  it("envia o cabeçalho Set-Cookie expirando o cookie", async () => {
    const response = await POST();
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(setCookie).toContain("session_token=;");
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("HttpOnly");
  });

  it("mantém o atributo Secure em produção", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await POST();

    expect(response.headers.get("set-cookie")).toContain("Secure");
  });

  it("funciona mesmo sem sessão ativa", async () => {
    const response = await POST();

    expect(response.ok).toBe(true);
  });
});
