import { createHmac } from "node:crypto";
import { getSessionSecret } from "./env";

export const SESSION_COOKIE_NAME = "session_token";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * Réplica de `createSessionToken` (src/lib/session.ts): payload base64url +
 * "." + HMAC-SHA256(payload) em base64url, assinado com SESSION_SECRET.
 * Usado porque o login real exige reCAPTCHA v3 do Google.
 */
export function createSessionToken(
  user: { id: string; email: string },
  expiresInSeconds = SESSION_MAX_AGE_SECONDS,
) {
  const payload = {
    userId: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };
  const payloadValue = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getSessionSecret())
    .update(payloadValue)
    .digest("base64url");

  return `${payloadValue}.${signature}`;
}

export function sessionCookie(token: string) {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    secure: false,
    sameSite: "Lax" as const,
    expires: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
}
