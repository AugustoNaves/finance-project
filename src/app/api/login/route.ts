import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, senha, recaptchaToken } = body;

    if (!recaptchaToken) {
      return NextResponse.json(
        { error: "Token do reCAPTCHA ausente" },
        { status: 400 },
      );
    }
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const formData = new URLSearchParams({
      secret: secretKey as string,
      response: recaptchaToken,
    });

    const googleResponse = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      },
    );

    const googleData = await googleResponse.json();

    // if (!googleData.success || googleData.score < 0.5) {
    //   return NextResponse.json(
    //     { error: "Acesso bloqueado. Atividade suspeita detectada." },
    //     { status: 403 },
    //   );
    // }

    const EMAIL = process.env.EMAIL_ACESSO || "";
    const SENHA_DO_CASAL = process.env.SENHA_ACESSO || "";

    if (senha !== SENHA_DO_CASAL || email !== EMAIL) {
      return NextResponse.json(
        { error: "Credenciais inválidas!" },
        { status: 401 },
      );
    }

    const response = NextResponse.json({
      success: true,
      mensagem: "Login efetuado!",
    });
    response.cookies.set("auth_token", "autorizado", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 dias
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Erro na rota de login:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
