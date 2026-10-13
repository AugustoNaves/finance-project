import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { invalidBodyResponse, isUniqueConstraintError, readJsonBody } from "@/lib/http";
import { validateBudgetInput } from "@/lib/validators";

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

    const body = await readJsonBody(request);

    if (!body) {
      return invalidBodyResponse();
    }

    const { data, error } = validateBudgetInput(body);

    if (error !== undefined) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const budget = await prisma.budget.create({
      data: {
        ...data,
        userId: user.id,
      },
    });

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: "Já existe um orçamento para esta categoria neste mês." },
        { status: 409 },
      );
    }

    console.error("Erro no POST /api/budgets:", error);
    return NextResponse.json(
      { error: "Erro ao salvar orçamento." },
      { status: 500 },
    );
  }
}
