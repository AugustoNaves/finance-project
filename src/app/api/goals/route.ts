import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const goals = await prisma.goal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(goals);
  } catch (error) {
    console.error("Erro no GET /api/goals:", error);
    return NextResponse.json({ error: "Erro ao buscar metas." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json();
    const { name, targetAmount, currentAmount, deadline, color } = body;

    if (!name || typeof targetAmount !== "number" || targetAmount <= 0) {
      return NextResponse.json(
        { error: "Nome e valor alvo são obrigatórios." },
        { status: 400 },
      );
    }

    const newGoal = await prisma.goal.create({
      data: {
        name,
        targetAmount,
        currentAmount: typeof currentAmount === "number" ? currentAmount : 0,
        deadline: deadline ? new Date(deadline) : null,
        color,
        userId: user.id,
      },
    });

    return NextResponse.json(newGoal, { status: 201 });
  } catch (error) {
    console.error("Erro no POST /api/goals:", error);
    return NextResponse.json({ error: "Erro ao salvar meta." }, { status: 500 });
  }
}
