import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { config, proxy } from "@/proxy";

const protectedRoutes = [
  "/",
  "/transactions",
  "/import",
  "/investments",
  "/planning",
  "/categories",
  "/budgets",
  "/reports",
  "/settings",
];

function buildRequest(pathname: string, cookie?: string) {
  return new NextRequest(`http://localhost:3000${pathname}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

async function buildSessionCookie() {
  const token = await createSessionToken({ id: "user-1", email: "maria@example.com" });

  return `${SESSION_COOKIE_NAME}=${token}`;
}

function isPassThrough(response: Response) {
  return response.status === 200 && response.headers.get("x-middleware-next") === "1";
}

describe("proxy", () => {
  describe("usuário não autenticado", () => {
    it.each(protectedRoutes)("redireciona %s para /login", async (route) => {
      const response = await proxy(buildRequest(route));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    });

    it("redireciona quando o cookie de sessão é inválido", async () => {
      const response = await proxy(
        buildRequest("/transactions", `${SESSION_COOKIE_NAME}=token.adulterado`),
      );

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    });

    it("descarta a query string ao redirecionar para /login", async () => {
      const response = await proxy(buildRequest("/reports?periodo=2026-01"));

      expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    });

    it("permite acessar /login", async () => {
      const response = await proxy(buildRequest("/login"));

      expect(isPassThrough(response)).toBe(true);
    });

    it.each(["/forgot-password", "/reset-password", "/api/transactions"])(
      "não interfere em rota fora da lista protegida (%s)",
      async (route) => {
        const response = await proxy(buildRequest(route));

        expect(isPassThrough(response)).toBe(true);
      },
    );
  });

  describe("usuário autenticado", () => {
    it("redireciona /login para a página inicial", async () => {
      const response = await proxy(buildRequest("/login", await buildSessionCookie()));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/");
    });

    it.each(protectedRoutes)("permite acessar %s", async (route) => {
      const response = await proxy(buildRequest(route, await buildSessionCookie()));

      expect(isPassThrough(response)).toBe(true);
      expect(response.headers.get("location")).toBeNull();
    });
  });

  describe("config.matcher", () => {
    it("cobre todas as rotas protegidas e a página de login", () => {
      expect(config.matcher).toEqual([...protectedRoutes, "/login"]);
    });
  });
});
