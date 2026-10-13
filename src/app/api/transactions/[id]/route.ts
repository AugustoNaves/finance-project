import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { invalidBodyResponse, readJsonBody } from "@/lib/http";
import { validateTransactionInput } from "@/lib/validators";

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
    const body = await readJsonBody(request);

    if (!body) {
      return invalidBodyResponse();
    }

    const { data, error } = validateTransactionInput(body, { partial: true });

    if (error !== undefined) {
      return NextResponse.json({ error }, { status: 400 });
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Nenhum campo para atualizar." },
        { status: 400 },
      );
    }

    const result = await prisma.transaction.updateMany({
      where: { id, userId: user.id },
      data,
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
