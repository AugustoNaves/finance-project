import { NextRequest, NextResponse } from "next/server";
import { invalidBodyResponse, readJsonBody } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import {
  markPasswordResetTokenAsUsed,
  validatePasswordResetToken,
} from "@/lib/tokens";

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody(request);

    if (!body) {
      return invalidBodyResponse();
    }

    const { token, password } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Token inválido." },
        { status: 400 },
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "A nova senha deve ter pelo menos 8 caracteres." },
        { status: 400 },
      );
    }

    const resetToken = await validatePasswordResetToken(token);

    if (!resetToken) {
      return NextResponse.json(
        { error: "Link inválido ou expirado." },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      });
      await markPasswordResetTokenAsUsed(token, tx);
    });

    return NextResponse.json(
      { message: "Senha redefinida com sucesso." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro ao redefinir senha:", error);
    return NextResponse.json(
      { error: "Erro ao redefinir senha." },
      { status: 500 },
    );
  }
}
