import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  const urlAtual = request.nextUrl.pathname;

  const rotasProtegidas = [
    "/",
    "/transactions",
    "/categories",
    "/budgets",
    "/reports",
    "/settings",
  ];

  if (!session && rotasProtegidas.includes(urlAtual)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session && urlAtual === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/transactions",
    "/categories",
    "/budgets",
    "/reports",
    "/settings",
    "/login",
  ],
};
