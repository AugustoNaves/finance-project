import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Erro no GET /api/transactions:", error);
    return NextResponse.json(
      { error: "Erro ao buscar dados." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { description, amount, category, payer } = body;

    const newTransaction = await prisma.transaction.create({
      data: {
        description,
        amount,
        category,
        payer,
      },
    });

    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error) {
    console.error("Erro no POST /api/transactions:", error);
    return NextResponse.json(
      { error: "Erro ao salvar os dados." },
      { status: 500 },
    );
  }
}
