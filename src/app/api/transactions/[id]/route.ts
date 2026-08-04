import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

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
    const id = resolvedParams.id;
    const body = await request.json();
    const { description, amount, category, type, paymentMethod, notes, date } = body;

    const result = await prisma.transaction.updateMany({
      where: { id, userId: user.id },
      data: {
        description,
        amount,
        category,
        type,
        paymentMethod,
        notes,
        date: date ? new Date(date) : undefined,
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Transação não encontrada." }, { status: 404 });
    }

    const transaction = await prisma.transaction.findUnique({ where: { id } });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Erro ao atualizar transação:", error);
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
    const id = resolvedParams.id;

    const result = await prisma.transaction.deleteMany({
      where: {
        id: id,
        userId: user.id,
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Transação não encontrada." }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Transação deletada com sucesso" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro ao deletar transação:", error);
    return NextResponse.json({ error: "Erro ao deletar." }, { status: 500 });
  }
}
