import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
    const user = await prisma.user.create({
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

    await prisma.category.createMany({
      data: [
        { name: "Salário", type: "income", color: "#00c48c", userId: user.id },
        { name: "Freelance", type: "income", color: "#00a8ff", userId: user.id },
        { name: "Investimentos", type: "income", color: "#8b5cf6", userId: user.id },
        { name: "Outros", type: "income", color: "#8892a4", userId: user.id },
        { name: "Alimentação", type: "outcome", color: "#ff9f43", userId: user.id },
        { name: "Transporte", type: "outcome", color: "#feca57", userId: user.id },
        { name: "Moradia", type: "outcome", color: "#00d2d3", userId: user.id },
        { name: "Saúde", type: "outcome", color: "#f75a68", userId: user.id },
        { name: "Educação", type: "outcome", color: "#5f27cd", userId: user.id },
        { name: "Lazer", type: "outcome", color: "#01a3a4", userId: user.id },
        { name: "Vestuário", type: "outcome", color: "#f368e0", userId: user.id },
        { name: "Contas", type: "outcome", color: "#ff6b6b", userId: user.id },
        { name: "Outros", type: "outcome", color: "#8395a7", userId: user.id },
        { name: "Ações", type: "investment", color: "#54a0ff", userId: user.id },
        { name: "Criptomoedas", type: "investment", color: "#f39c12", userId: user.id },
        { name: "Renda Fixa", type: "investment", color: "#2ecc71", userId: user.id },
        { name: "Fundos", type: "investment", color: "#9b59b6", userId: user.id },
        { name: "Outros", type: "investment", color: "#636e72", userId: user.id },
      ],
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
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
