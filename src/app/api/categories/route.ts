import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { invalidBodyResponse, isUniqueConstraintError, readJsonBody } from "@/lib/http";
import { validateCategoryInput } from "@/lib/validators";

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

    const body = await readJsonBody(request);

    if (!body) {
      return invalidBodyResponse();
    }

    const { data, error } = validateCategoryInput(body);

    if (error !== undefined) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        ...data,
        userId: user.id,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: "Já existe uma categoria com este nome e tipo." },
        { status: 409 },
      );
    }

    console.error("Erro no POST /api/categories:", error);
    return NextResponse.json(
      { error: "Erro ao salvar categoria." },
      { status: 500 },
    );
  }
}
