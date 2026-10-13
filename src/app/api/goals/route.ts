import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { invalidBodyResponse, readJsonBody } from "@/lib/http";
import { validateGoalInput } from "@/lib/validators";

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

    const body = await readJsonBody(request);

    if (!body) {
      return invalidBodyResponse();
    }

    const { data, error } = validateGoalInput(body);

    if (error !== undefined) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const newGoal = await prisma.goal.create({
      data: {
        ...data,
        deadline: data.deadline ?? null,
        userId: user.id,
      },
    });

    return NextResponse.json(newGoal, { status: 201 });
  } catch (error) {
    console.error("Erro no POST /api/goals:", error);
    return NextResponse.json({ error: "Erro ao salvar meta." }, { status: 500 });
  }
}
