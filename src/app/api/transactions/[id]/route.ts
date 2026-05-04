import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    await prisma.transaction.delete({
      where: {
        id: id,
      },
    });

    return NextResponse.json(
      { message: "Transação deletada com sucesso" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro ao deletar transação:", error);
    return NextResponse.json({ error: "Erro ao deletar." }, { status: 500 });
  }
}
