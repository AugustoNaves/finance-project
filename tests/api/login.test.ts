import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, passwordMock } = vi.hoisted(() => ({
  prismaMock: { user: { findUnique: vi.fn() } },
  passwordMock: { hashPassword: vi.fn(), comparePassword: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/password", () => passwordMock);

import { POST } from "@/app/api/login/route";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";
import { buildRequest } from "./helpers";

const storedUser = {
  id: "user-1",
  name: "Maria",
  email: "maria@example.com",
  passwordHash: "hash-armazenado",
};

const fetchMock = vi.fn();
let consoleError: ReturnType<typeof vi.spyOn>;
let emailCounter = 0;

function uniqueEmail() {
  emailCounter += 1;

  return `usuario${emailCounter}@example.com`;
}

function mockRecaptcha(data: Record<string, unknown>) {
  fetchMock.mockResolvedValue({ json: async () => data });
}

function login(body: unknown, options: { ip?: string; rawBody?: string } = {}) {
  return POST(
    buildRequest("/api/login", {
      method: "POST",
      body,
      rawBody: options.rawBody,
      headers: options.ip ? { "x-forwarded-for": options.ip } : {},
    }),
  );
}

function credentials(overrides: Record<string, unknown> = {}) {
  return { email: uniqueEmail(), senha: "senha-correta", recaptchaToken: "token-recaptcha", ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  mockRecaptcha({ success: true, score: 0.9, action: "login", hostname: "localhost" });
  prismaMock.user.findUnique.mockResolvedValue(storedUser);
  passwordMock.comparePassword.mockImplementation(
    async (password: string, hash: string) =>
      password === "senha-correta" && hash === "hash-armazenado",
  );
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  consoleError.mockRestore();
});

describe("POST /api/login", () => {
  describe("validação do corpo", () => {
    it.each([
      ["e-mail ausente", { email: undefined }],
      ["e-mail vazio", { email: "   " }],
      ["e-mail não textual", { email: { $ne: null } }],
      ["senha ausente", { senha: undefined }],
      ["senha vazia", { senha: "" }],
    ])("retorna 400 para %s", async (_caso, overrides) => {
      const response = await login(credentials(overrides));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "E-mail e senha são obrigatórios.",
      });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it("retorna 400 quando o token do reCAPTCHA está ausente", async () => {
      const response = await login(credentials({ recaptchaToken: undefined }));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Token do reCAPTCHA ausente" });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it("retorna 400 quando o token do reCAPTCHA não é texto", async () => {
      const response = await login(credentials({ recaptchaToken: 12345 }));

      expect(response.status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("retorna 400 para JSON malformado", async () => {
      const response = await login(undefined, { rawBody: "{email:" });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Corpo da requisição inválido." });
    });

    it("retorna 400 quando o corpo não é um objeto", async () => {
      const response = await login(undefined, { rawBody: '"texto"' });

      expect(response.status).toBe(400);
    });
  });

  describe("reCAPTCHA", () => {
    it("envia o segredo e o token para a API de verificação do Google", async () => {
      await login(credentials({ recaptchaToken: "token-do-cliente" }));

      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [url, init] = fetchMock.mock.calls[0];
      const params = new URLSearchParams(init.body);

      expect(url).toBe("https://www.google.com/recaptcha/api/siteverify");
      expect(init.method).toBe("POST");
      expect(init.headers).toEqual({ "Content-Type": "application/x-www-form-urlencoded" });
      expect(params.get("secret")).toBe("test-recaptcha-secret");
      expect(params.get("response")).toBe("token-do-cliente");
    });

    it("retorna 403 quando o Google reprova o token", async () => {
      mockRecaptcha({ success: false, "error-codes": ["invalid-input-response"] });

      const response = await login(credentials());

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        error: "Acesso bloqueado. Atividade suspeita detectada.",
      });
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it("retorna 403 quando a ação do token não é login", async () => {
      mockRecaptcha({ success: true, action: "register", hostname: "localhost" });

      const response = await login(credentials());

      expect(response.status).toBe(403);
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it("retorna 403 quando a ação está ausente", async () => {
      mockRecaptcha({ success: true, hostname: "localhost" });

      const response = await login(credentials());

      expect(response.status).toBe(403);
    });

    it("retorna 403 quando o hostname do token difere do host da requisição", async () => {
      mockRecaptcha({ success: true, action: "login", hostname: "site-malicioso.com" });

      const response = await login(credentials());

      expect(response.status).toBe(403);
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it("aceita resposta sem hostname", async () => {
      mockRecaptcha({ success: true, action: "login" });

      const response = await login(credentials());

      expect(response.status).toBe(200);
    });

    it("comportamento atual: não aplica limite mínimo de score", async () => {
      mockRecaptcha({ success: true, score: 0.1, action: "login", hostname: "localhost" });

      const response = await login(credentials());

      expect(response.status).toBe(200);
    });

    it("retorna 403 quando RECAPTCHA_SECRET_KEY não está configurada", async () => {
      vi.stubEnv("RECAPTCHA_SECRET_KEY", "");

      const response = await login(credentials());

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        error: "Configuração do reCAPTCHA ausente.",
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("retorna 503 quando a chamada ao Google falha por erro de rede", async () => {
      fetchMock.mockRejectedValue(new TypeError("fetch failed"));

      const response = await login(credentials());

      expect(response.status).toBe(503);
      await expect(response.json()).resolves.toEqual({
        error: "Não foi possível validar o reCAPTCHA. Tente novamente.",
      });
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalled();
    });

    it("retorna 503 quando o Google responde com conteúdo que não é JSON", async () => {
      fetchMock.mockResolvedValue({
        json: async () => {
          throw new SyntaxError("Unexpected token <");
        },
      });

      const response = await login(credentials());

      expect(response.status).toBe(503);
    });
  });

  describe("credenciais", () => {
    it("retorna 401 para senha incorreta sem definir cookie", async () => {
      const response = await login(credentials({ senha: "senha-errada" }));

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: "E-mail ou senha inválidos." });
      expect(response.cookies.get(SESSION_COOKIE_NAME)).toBeUndefined();
    });

    it("retorna 401 com a mesma mensagem para usuário inexistente", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const response = await login(credentials());

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: "E-mail ou senha inválidos." });
      expect(response.cookies.get(SESSION_COOKIE_NAME)).toBeUndefined();
    });

    it("compara a senha contra um hash fictício quando o usuário não existe", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await login(credentials());

      expect(passwordMock.comparePassword).toHaveBeenCalledTimes(1);
      expect(passwordMock.comparePassword.mock.calls[0][1]).toMatch(/^\$2b\$12\$.{53}$/);
    });

    it("busca o usuário pelo e-mail normalizado (trim e minúsculas)", async () => {
      const email = uniqueEmail();

      await login(credentials({ email: `  ${email.toUpperCase()}  ` }));

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email } });
    });

    it("retorna 500 quando o banco falha", async () => {
      prismaMock.user.findUnique.mockRejectedValue(new Error("db fora do ar"));

      const response = await login(credentials());

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({ error: "Erro interno do servidor" });
      expect(consoleError).toHaveBeenCalled();
    });
  });

  describe("sucesso", () => {
    it("retorna 200 com mensagem de sucesso", async () => {
      const response = await login(credentials());

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        success: true,
        mensagem: "Login efetuado!",
      });
    });

    it("define o cookie de sessão httpOnly, sameSite lax, path raiz e 30 dias", async () => {
      const response = await login(credentials());
      const cookie = response.cookies.get(SESSION_COOKIE_NAME);

      expect(cookie).toMatchObject({
        name: "session_token",
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
      expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    });

    it("marca o cookie como Secure em produção", async () => {
      vi.stubEnv("NODE_ENV", "production");

      const response = await login(credentials());

      expect(response.headers.get("set-cookie")).toContain("Secure");
    });

    it("emite um token de sessão válido para o usuário autenticado", async () => {
      const response = await login(credentials());
      const token = response.cookies.get(SESSION_COOKIE_NAME)?.value;

      await expect(verifySessionToken(token)).resolves.toMatchObject({
        userId: "user-1",
        email: "maria@example.com",
      });
    });

    it("não expõe o hash da senha na resposta", async () => {
      const response = await login(credentials());

      expect(JSON.stringify(await response.json())).not.toContain("hash-armazenado");
    });
  });

  describe("limite de tentativas", () => {
    it("retorna 429 a partir da sexta tentativa para o mesmo e-mail e IP", async () => {
      const body = credentials({ senha: "senha-errada" });

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        const response = await login(body, { ip: "10.0.0.1" });

        expect(response.status).toBe(401);
      }

      const blocked = await login(body, { ip: "10.0.0.1" });

      expect(blocked.status).toBe(429);
      await expect(blocked.json()).resolves.toEqual({
        error: "Muitas tentativas. Tente novamente em alguns minutos.",
      });
    });

    it("bloqueia mesmo com a senha correta enquanto o limite estiver ativo", async () => {
      const email = uniqueEmail();

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        await login(credentials({ email, senha: "senha-errada" }), { ip: "10.0.0.2" });
      }

      const response = await login(credentials({ email }), { ip: "10.0.0.2" });

      expect(response.status).toBe(429);
      expect(response.cookies.get(SESSION_COOKIE_NAME)).toBeUndefined();
    });

    it("não consulta o reCAPTCHA nem o banco quando bloqueado", async () => {
      const body = credentials({ senha: "senha-errada" });

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        await login(body, { ip: "10.0.0.3" });
      }

      fetchMock.mockClear();
      prismaMock.user.findUnique.mockClear();

      await login(body, { ip: "10.0.0.3" });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it("trata variações de caixa e espaços do e-mail como a mesma chave", async () => {
      const email = uniqueEmail();

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        await login(credentials({ email, senha: "senha-errada" }), { ip: "10.0.0.4" });
      }

      const response = await login(
        credentials({ email: ` ${email.toUpperCase()} `, senha: "senha-errada" }),
        { ip: "10.0.0.4" },
      );

      expect(response.status).toBe(429);
    });

    it("conta as tentativas separadamente por IP", async () => {
      const body = credentials({ senha: "senha-errada" });

      for (let attempt = 1; attempt <= 6; attempt += 1) {
        await login(body, { ip: "10.0.0.5" });
      }

      const response = await login(body, { ip: "10.0.0.6" });

      expect(response.status).toBe(401);
    });

    it("usa o primeiro IP do cabeçalho x-forwarded-for", async () => {
      const body = credentials({ senha: "senha-errada" });

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        await login(body, { ip: "10.0.0.7, 172.16.0.1" });
      }

      const response = await login(body, { ip: "10.0.0.7, 192.168.0.9" });

      expect(response.status).toBe(429);
    });

    it("zera o contador após um login bem-sucedido", async () => {
      const email = uniqueEmail();

      for (let attempt = 1; attempt <= 4; attempt += 1) {
        await login(credentials({ email, senha: "senha-errada" }), { ip: "10.0.0.8" });
      }

      const success = await login(credentials({ email }), { ip: "10.0.0.8" });

      expect(success.status).toBe(200);

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        const response = await login(credentials({ email, senha: "senha-errada" }), {
          ip: "10.0.0.8",
        });

        expect(response.status).toBe(401);
      }
    });

    it("libera novas tentativas após a janela de 15 minutos", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));

      const body = credentials({ senha: "senha-errada" });

      for (let attempt = 1; attempt <= 6; attempt += 1) {
        await login(body, { ip: "10.0.0.9" });
      }

      vi.setSystemTime(new Date("2026-01-01T12:14:59Z"));
      expect((await login(body, { ip: "10.0.0.9" })).status).toBe(429);

      vi.setSystemTime(new Date("2026-01-01T12:15:01Z"));
      expect((await login(body, { ip: "10.0.0.9" })).status).toBe(401);
    });

    it("comportamento atual: requisições sem token do reCAPTCHA não contam para o limite", async () => {
      const email = uniqueEmail();

      for (let attempt = 1; attempt <= 10; attempt += 1) {
        await login(credentials({ email, recaptchaToken: undefined }), { ip: "10.0.0.10" });
      }

      const response = await login(credentials({ email }), { ip: "10.0.0.10" });

      expect(response.status).toBe(200);
    });
  });
});
