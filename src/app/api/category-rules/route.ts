import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const rules = await prisma.categoryRule.findMany({
      where: { userId: user.id },
      orderBy: { pattern: "asc" },
      select: { id: true, pattern: true, category: true, type: true, createdAt: true },
    });

    return NextResponse.json(rules);
  } catch (error) {
    console.error("Erro no GET /api/category-rules:", error);
    return NextResponse.json(
      { error: "Erro ao buscar regras de categorização." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID não fornecido." }, { status: 400 });
    }

    const result = await prisma.categoryRule.deleteMany({
      where: { id, userId: user.id },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Regra não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ message: "Regra removida com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar regra de categorização:", error);
    return NextResponse.json({ error: "Erro ao deletar." }, { status: 500 });
  }
}
