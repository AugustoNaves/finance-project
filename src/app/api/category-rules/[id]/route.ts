import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

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

    const result = await prisma.categoryRule.deleteMany({
      where: { id: resolvedParams.id, userId: user.id },
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
