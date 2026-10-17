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

    const batch = await prisma.importBatch.findFirst({
      where: { id: resolvedParams.id, userId: user.id },
      include: { items: { select: { transactionId: true } } },
    });

    if (!batch) {
      return NextResponse.json({ error: "Importação não encontrada." }, { status: 404 });
    }

    const transactionIds = batch.items.map((item) => item.transactionId);

    const removed = await prisma.$transaction(async (tx) => {
      const deleted = await tx.transaction.deleteMany({
        where: { id: { in: transactionIds }, userId: user.id },
      });

      await tx.importBatch.deleteMany({
        where: { id: batch.id, userId: user.id },
      });

      return deleted.count;
    });

    return NextResponse.json({ message: "Importação desfeita.", removed });
  } catch (error) {
    console.error("Erro ao desfazer importação:", error);
    return NextResponse.json({ error: "Erro ao desfazer a importação." }, { status: 500 });
  }
}
