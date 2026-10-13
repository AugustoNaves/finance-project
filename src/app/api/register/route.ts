import { NextRequest, NextResponse } from "next/server";
import { invalidBodyResponse, isUniqueConstraintError, readJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody(request);

    if (!body) {
      return invalidBodyResponse();
    }

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.senha || body.password || "");

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nome, e-mail e senha são obrigatórios." },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 8 caracteres." },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      await tx.category.createMany({
        data: [
            { name: "Salário", type: "income", color: "#00c48c", userId: createdUser.id },
            { name: "Freelance", type: "income", color: "#00a8ff", userId: createdUser.id },
            { name: "Investimentos", type: "income", color: "#8b5cf6", userId: createdUser.id },
            { name: "Outros", type: "income", color: "#8892a4", userId: createdUser.id },
            { name: "Alimentação", type: "outcome", color: "#ff9f43", userId: createdUser.id },
            { name: "Transporte", type: "outcome", color: "#feca57", userId: createdUser.id },
            { name: "Moradia", type: "outcome", color: "#00d2d3", userId: createdUser.id },
            { name: "Saúde", type: "outcome", color: "#f75a68", userId: createdUser.id },
            { name: "Educação", type: "outcome", color: "#5f27cd", userId: createdUser.id },
            { name: "Lazer", type: "outcome", color: "#01a3a4", userId: createdUser.id },
            { name: "Vestuário", type: "outcome", color: "#f368e0", userId: createdUser.id },
            { name: "Contas", type: "outcome", color: "#ff6b6b", userId: createdUser.id },
            { name: "Outros", type: "outcome", color: "#8395a7", userId: createdUser.id },
            { name: "Ações", type: "investment", color: "#54a0ff", userId: createdUser.id },
            { name: "Criptomoedas", type: "investment", color: "#f39c12", userId: createdUser.id },
            { name: "Renda Fixa", type: "investment", color: "#2ecc71", userId: createdUser.id },
            { name: "Fundos", type: "investment", color: "#9b59b6", userId: createdUser.id },
            { name: "Outros", type: "investment", color: "#636e72", userId: createdUser.id },
        ],
      });

      return createdUser;
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: "Já existe uma conta com este e-mail." },
        { status: 409 },
      );
    }

    console.error("Erro no POST /api/register:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
