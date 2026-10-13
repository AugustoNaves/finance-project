import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { invalidBodyResponse, isUniqueConstraintError, readJsonBody } from "@/lib/http";
import { validateBudgetInput } from "@/lib/validators";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const resolvedParams = await params;
    const body = await readJsonBody(request);

    if (!body) {
      return invalidBodyResponse();
    }

    const { data, error } = validateBudgetInput(body);

    if (error !== undefined) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const result = await prisma.budget.updateMany({
      where: { id: resolvedParams.id, userId: user.id },
      data,
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
    }

    const budget = await prisma.budget.findUnique({ where: { id: resolvedParams.id } });

    return NextResponse.json(budget);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: "Já existe um orçamento para esta categoria neste mês." },
        { status: 409 },
      );
    }

    console.error("Erro ao atualizar orçamento:", error);
    return NextResponse.json({ error: "Erro ao atualizar." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const resolvedParams = await params;

    const result = await prisma.budget.deleteMany({
      where: { id: resolvedParams.id, userId: user.id },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ message: "Orçamento deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar orçamento:", error);
    return NextResponse.json({ error: "Erro ao deletar." }, { status: 500 });
  }
}
