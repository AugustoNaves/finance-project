import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

export const BASE_URL = "http://localhost:3000";

export const authUser = {
  id: "user-1",
  name: "Maria",
  email: "maria@example.com",
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  rawBody?: string;
  cookie?: string;
  headers?: Record<string, string>;
};

export function buildRequest(
  path: string,
  { method = "GET", body, rawBody, cookie, headers = {} }: RequestOptions = {},
) {
  const payload = rawBody ?? (body === undefined ? undefined : JSON.stringify(body));

  return new NextRequest(`${BASE_URL}${path}`, {
    method,
    body: payload,
    headers: {
      ...(payload === undefined ? {} : { "Content-Type": "application/json" }),
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
  });
}

export async function buildSessionCookie(user: { id: string; email: string } = authUser) {
  return `${SESSION_COOKIE_NAME}=${await createSessionToken(user)}`;
}

export const invalidSessionCookie = `${SESSION_COOKIE_NAME}=payload-forjado.assinatura-invalida`;

export function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

export function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
  });
}
