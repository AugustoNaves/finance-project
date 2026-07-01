import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      where: { userId: user.id },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Erro no GET /api/categories:", error);
    return NextResponse.json(
      { error: "Erro ao buscar categorias." },
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
    const { name, type, color, icon } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "Nome e tipo são obrigatórios." },
        { status: 400 },
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        type,
        color,
        icon,
        userId: user.id,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Erro no POST /api/categories:", error);
    return NextResponse.json(
      { error: "Erro ao salvar categoria." },
      { status: 500 },
    );
  }
}
