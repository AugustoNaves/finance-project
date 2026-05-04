import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const authToken = request.cookies.get("auth_token")?.value;

  const urlAtual = request.nextUrl.pathname;

  if (!authToken && urlAtual === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (authToken && urlAtual === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login"],
};
