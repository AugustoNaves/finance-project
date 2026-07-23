import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/password";
import {
  createSessionToken,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/session";

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function getAttemptKey(request: NextRequest, email: string) {
  const forwardedFor = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const ip = forwardedFor || request.headers.get("x-real-ip") || "unknown";

  return `${email.toLowerCase()}:${ip}`;
}

function isRateLimited(key: string) {
  const now = Date.now();
  const attempt = attempts.get(key);

  if (!attempt || attempt.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  attempt.count += 1;
  attempts.set(key, attempt);

  return attempt.count > MAX_ATTEMPTS;
}

async function validateRecaptcha(token: string, request: NextRequest) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    return { valid: false, error: "Configuração do reCAPTCHA ausente." };
  }

  const formData = new URLSearchParams({
    secret: secretKey,
    response: token,
  });

  const googleResponse = await fetch(
    "https://www.google.com/recaptcha/api/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    },
  );

  const googleData = (await googleResponse.json()) as {
    success?: boolean;
    score?: number;
    action?: string;
    hostname?: string;
  };
  console.log("API recaptcha", JSON.stringify(googleData));
  const requestHost = request.nextUrl.hostname;

  if (
    !googleData.success ||
    (googleData.score ?? 0) < 0.5 ||
    googleData.action !== "login" ||
    (googleData.hostname && googleData.hostname !== requestHost)
  ) {
    return {
      valid: false,
      error: "Acesso bloqueado. Atividade suspeita detectada.",
    };
  }

  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, senha, recaptchaToken } = body;

    if (!email || !senha) {
      return NextResponse.json(
        { error: "E-mail e senha são obrigatórios." },
        { status: 400 },
      );
    }

    if (!recaptchaToken) {
      return NextResponse.json(
        { error: "Token do reCAPTCHA ausente" },
        { status: 400 },
      );
    }

    const attemptKey = getAttemptKey(request, email);

    if (isRateLimited(attemptKey)) {
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente em alguns minutos." },
        { status: 429 },
      );
    }

    const recaptcha = await validateRecaptcha(recaptchaToken, request);

    if (!recaptcha.valid) {
      return NextResponse.json({ error: recaptcha.error }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase() },
    });
    const passwordMatches = user
      ? await comparePassword(String(senha), user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      return NextResponse.json(
        { error: "E-mail ou senha inválidos." },
        { status: 401 },
      );
    }

    attempts.delete(attemptKey);

    const response = NextResponse.json({
      success: true,
      mensagem: "Login efetuado!",
    });
    const sessionToken = await createSessionToken(user);

    response.cookies.set(
      SESSION_COOKIE_NAME,
      sessionToken,
      getSessionCookieOptions(),
    );

    return response;
  } catch (error) {
    console.error("Erro na rota de login:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
