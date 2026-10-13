import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSessionToken,
  getExpiredSessionCookieOptions,
  getSessionCookieOptions,
  getSessionFromRequest,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/session";

const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30;
const user = { id: "user-1", email: "maria@example.com" };

function encodePayload(payload: unknown) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function signWithSecret(payloadValue: string, secret = process.env.SESSION_SECRET as string) {
  return createHmac("sha256", secret).update(payloadValue).digest("base64url");
}

function buildSignedToken(payload: unknown) {
  const payloadValue = encodePayload(payload);

  return `${payloadValue}.${signWithSecret(payloadValue)}`;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("createSessionToken", () => {
  it("gera um token no formato payload.assinatura em base64url", async () => {
    const token = await createSessionToken(user);

    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it("inclui userId, email e expiração de 30 dias no payload", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const token = await createSessionToken(user);
    const payload = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString());

    expect(payload).toEqual({
      userId: "user-1",
      email: "maria@example.com",
      exp: Math.floor(Date.now() / 1000) + THIRTY_DAYS_IN_SECONDS,
    });
  });

  it("assina o payload com HMAC-SHA256 usando o SESSION_SECRET", async () => {
    const token = await createSessionToken(user);
    const [payloadValue, signature] = token.split(".");

    expect(signature).toBe(signWithSecret(payloadValue));
  });

  it("falha quando SESSION_SECRET não está definido", async () => {
    vi.stubEnv("SESSION_SECRET", "");

    await expect(createSessionToken(user)).rejects.toThrow(
      "SESSION_SECRET deve ter pelo menos 32 caracteres.",
    );
  });

  it("falha quando SESSION_SECRET tem menos de 32 caracteres", async () => {
    vi.stubEnv("SESSION_SECRET", "a".repeat(31));

    await expect(createSessionToken(user)).rejects.toThrow(
      "SESSION_SECRET deve ter pelo menos 32 caracteres.",
    );
  });

  it("aceita SESSION_SECRET com exatamente 32 caracteres", async () => {
    vi.stubEnv("SESSION_SECRET", "a".repeat(32));

    await expect(createSessionToken(user)).resolves.toEqual(expect.any(String));
  });
});

describe("verifySessionToken", () => {
  it("valida um token recém-criado e devolve o payload", async () => {
    const token = await createSessionToken(user);

    await expect(verifySessionToken(token)).resolves.toMatchObject({
      userId: "user-1",
      email: "maria@example.com",
    });
  });

  it("preserva caracteres acentuados no payload", async () => {
    const token = await createSessionToken({ id: "user-2", email: "joão+ção@exemplo.com" });

    await expect(verifySessionToken(token)).resolves.toMatchObject({
      email: "joão+ção@exemplo.com",
    });
  });

  it.each([undefined, ""])("retorna null para token ausente (%j)", async (token) => {
    await expect(verifySessionToken(token)).resolves.toBeNull();
  });

  it.each(["sem-ponto", ".assinatura", "payload.", ".", "a.b.c"])(
    "retorna null para token malformado (%s)",
    async (token) => {
      await expect(verifySessionToken(token)).resolves.toBeNull();
    },
  );

  it("retorna null quando a assinatura contém caracteres fora de base64url", async () => {
    const token = await createSessionToken(user);
    const [payloadValue, signature] = token.split(".");

    await expect(verifySessionToken(`${payloadValue}.${signature}!!`)).resolves.toBeNull();
    await expect(verifySessionToken(`${payloadValue}.@@@`)).resolves.toBeNull();
  });

  it("retorna null quando o payload é adulterado mantendo a assinatura", async () => {
    const token = await createSessionToken(user);
    const [, signature] = token.split(".");
    const forgedPayload = encodePayload({
      userId: "outro-usuario",
      email: "maria@example.com",
      exp: Math.floor(Date.now() / 1000) + 1000,
    });

    await expect(verifySessionToken(`${forgedPayload}.${signature}`)).resolves.toBeNull();
  });

  it("retorna null quando a assinatura é adulterada", async () => {
    const token = await createSessionToken(user);
    const [payloadValue, signature] = token.split(".");
    const flipped = (signature[0] === "A" ? "B" : "A") + signature.slice(1);

    await expect(verifySessionToken(`${payloadValue}.${flipped}`)).resolves.toBeNull();
  });

  it("retorna null quando a assinatura é truncada", async () => {
    const token = await createSessionToken(user);
    const [payloadValue, signature] = token.split(".");

    await expect(
      verifySessionToken(`${payloadValue}.${signature.slice(0, 10)}`),
    ).resolves.toBeNull();
  });

  it("retorna null para token assinado com outro segredo", async () => {
    const payloadValue = encodePayload({
      userId: "user-1",
      email: "maria@example.com",
      exp: Math.floor(Date.now() / 1000) + 1000,
    });
    const signature = signWithSecret(payloadValue, "outro-segredo-com-mais-de-32-caracteres!!");

    await expect(verifySessionToken(`${payloadValue}.${signature}`)).resolves.toBeNull();
  });

  it("retorna null quando o token expira", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const token = await createSessionToken(user);

    vi.setSystemTime(new Date(Date.now() + THIRTY_DAYS_IN_SECONDS * 1000));
    await expect(verifySessionToken(token)).resolves.not.toBeNull();

    vi.setSystemTime(new Date(Date.now() + 1000));
    await expect(verifySessionToken(token)).resolves.toBeNull();
  });

  it("retorna null para payload assinado sem userId ou email", async () => {
    const exp = Math.floor(Date.now() / 1000) + 1000;

    await expect(
      verifySessionToken(buildSignedToken({ email: "maria@example.com", exp })),
    ).resolves.toBeNull();
    await expect(
      verifySessionToken(buildSignedToken({ userId: "user-1", exp })),
    ).resolves.toBeNull();
  });

  it("retorna null para payload assinado sem expiração numérica", async () => {
    await expect(
      verifySessionToken(buildSignedToken({ userId: "user-1", email: "maria@example.com" })),
    ).resolves.toBeNull();
    await expect(
      verifySessionToken(
        buildSignedToken({ userId: "user-1", email: "maria@example.com", exp: "9999999999" }),
      ),
    ).resolves.toBeNull();
  });

  it("retorna null quando o payload assinado não é JSON", async () => {
    const payloadValue = Buffer.from("nao-e-json").toString("base64url");

    await expect(
      verifySessionToken(`${payloadValue}.${signWithSecret(payloadValue)}`),
    ).resolves.toBeNull();
  });

  it("aceita token assinado externamente com o mesmo segredo", async () => {
    const token = buildSignedToken({
      userId: "user-1",
      email: "maria@example.com",
      exp: Math.floor(Date.now() / 1000) + 60,
    });

    await expect(verifySessionToken(token)).resolves.toMatchObject({ userId: "user-1" });
  });

  it("lança erro quando SESSION_SECRET está ausente na verificação", async () => {
    const token = await createSessionToken(user);

    vi.stubEnv("SESSION_SECRET", "");

    await expect(verifySessionToken(token)).rejects.toThrow("SESSION_SECRET");
  });
});

describe("compatibilidade com o runtime Edge (sem Buffer)", () => {
  it("cria e valida tokens usando apenas btoa/atob e Web Crypto", async () => {
    const nodeToken = await createSessionToken(user);

    vi.stubGlobal("Buffer", undefined);

    let edgeToken: string;
    let edgePayload: Awaited<ReturnType<typeof verifySessionToken>>;
    let nodeTokenPayload: Awaited<ReturnType<typeof verifySessionToken>>;
    let tampered: Awaited<ReturnType<typeof verifySessionToken>>;

    try {
      edgeToken = await createSessionToken(user);
      edgePayload = await verifySessionToken(edgeToken);
      nodeTokenPayload = await verifySessionToken(nodeToken);
      tampered = await verifySessionToken(`${edgeToken.split(".")[0]}.AAAA`);
    } finally {
      vi.unstubAllGlobals();
    }

    expect(edgeToken).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(edgePayload).toMatchObject({ userId: "user-1", email: "maria@example.com" });
    expect(nodeTokenPayload).toMatchObject({ userId: "user-1" });
    expect(tampered).toBeNull();
    await expect(verifySessionToken(edgeToken)).resolves.toMatchObject({ userId: "user-1" });
  });
});

describe("getSessionFromRequest", () => {
  it("lê o cookie session_token da requisição", async () => {
    const token = await createSessionToken(user);
    const request = new NextRequest("http://localhost:3000/", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
    });

    await expect(getSessionFromRequest(request)).resolves.toMatchObject({ userId: "user-1" });
  });

  it("retorna null quando não há cookie de sessão", async () => {
    const request = new NextRequest("http://localhost:3000/");

    await expect(getSessionFromRequest(request)).resolves.toBeNull();
  });

  it("ignora cookies com outro nome", async () => {
    const token = await createSessionToken(user);
    const request = new NextRequest("http://localhost:3000/", {
      headers: { cookie: `auth_token=${token}` },
    });

    await expect(getSessionFromRequest(request)).resolves.toBeNull();
  });
});

describe("opções do cookie de sessão", () => {
  it("usa o nome session_token", () => {
    expect(SESSION_COOKIE_NAME).toBe("session_token");
  });

  it("define cookie httpOnly, sameSite lax, path raiz e 30 dias de duração", () => {
    expect(getSessionCookieOptions()).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: THIRTY_DAYS_IN_SECONDS,
      path: "/",
    });
  });

  it("marca o cookie como secure em produção", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(getSessionCookieOptions().secure).toBe(true);
    expect(getExpiredSessionCookieOptions().secure).toBe(true);
  });

  it("expira o cookie com maxAge zero no logout", () => {
    expect(getExpiredSessionCookieOptions()).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
  });
});
