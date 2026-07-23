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
    const { name, targetAmount, currentAmount, deadline, color } = body;

    const result = await prisma.goal.updateMany({
      where: { id, userId: user.id },
      data: {
        name,
        targetAmount,
        currentAmount,
        deadline: deadline ? new Date(deadline) : null,
        color,
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Meta não encontrada." }, { status: 404 });
    }

    const goal = await prisma.goal.findUnique({ where: { id } });

    return NextResponse.json(goal);
  } catch (error) {
    console.error("Erro ao atualizar meta:", error);
    return NextResponse.json({ error: "Erro ao atualizar meta." }, { status: 500 });
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

    const result = await prisma.goal.deleteMany({
      where: { id, userId: user.id },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Meta não encontrada." }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Meta deletada com sucesso" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro ao deletar meta:", error);
    return NextResponse.json({ error: "Erro ao deletar meta." }, { status: 500 });
  }
}
