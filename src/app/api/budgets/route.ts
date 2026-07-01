import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const budgets = await prisma.budget.findMany({
      where: { userId: user.id },
      orderBy: [{ month: "desc" }, { category: "asc" }],
    });

    return NextResponse.json(budgets);
  } catch (error) {
    console.error("Erro no GET /api/budgets:", error);
    return NextResponse.json(
      { error: "Erro ao buscar orçamentos." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json();
    const { category, amount, month } = body;
    const budgetAmount = Number(amount);

    if (!category || !month || !Number.isFinite(budgetAmount) || budgetAmount <= 0) {
      return NextResponse.json(
        { error: "Categoria, valor válido e mês são obrigatórios." },
        { status: 400 },
      );
    }

    const budget = await prisma.budget.create({
      data: {
        category,
        amount: budgetAmount,
        month,
        userId: user.id,
      },
    });

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    console.error("Erro no POST /api/budgets:", error);
    return NextResponse.json(
      { error: "Erro ao salvar orçamento." },
      { status: 500 },
    );
  }
}
