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

    console.log("Resposta completa do Google:", googleData);

    if (!googleData.success || googleData.score < 0.5) {
      return NextResponse.json(
        { error: "Acesso bloqueado. Atividade suspeita detectada." },
        { status: 403 },
      );
    }
    return NextResponse.json({
      success: true,
      mensagem: "Autenticação bem-sucedida! Você não é um robô.",
      score: googleData.score,
    });
  } catch (error) {
    console.error("Erro na rota de login:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
