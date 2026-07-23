import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
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

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json();
    const { description, amount, category, type, paymentMethod, notes } = body;

    const newTransaction = await prisma.transaction.create({
      data: {
        description,
        amount,
        category,
        type,
        paymentMethod,
        notes,
        userId: user.id,
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
