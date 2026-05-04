import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // Pega o cookie que criamos lá na API
  const authToken = request.cookies.get("auth_token")?.value;

  const urlAtual = request.nextUrl.pathname;

  // 1. Se tentou acessar o Dashboard (/) MAS NÃO tem o crachá:
  if (!authToken && urlAtual === "/") {
    // Chuta para a tela de login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 2. Se tentou acessar a tela de Login (/login) MAS JÁ TEM o crachá:
  if (authToken && urlAtual === "/login") {
    // Joga direto pro Dashboard (não precisa logar de novo)
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Se estiver tudo ok, deixa passar
  return NextResponse.next();
}

// Configura em quais páginas esse "guarda-costas" deve trabalhar
export const config = {
  matcher: ["/", "/login"],
};
