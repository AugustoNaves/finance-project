import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { invalidBodyResponse, isUniqueConstraintError, readJsonBody } from "@/lib/http";
import { validateCategoryInput } from "@/lib/validators";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await readJsonBody(request);

    if (!body) {
      return invalidBodyResponse();
    }

    const { data, error } = validateCategoryInput(body);

    if (error !== undefined) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const result = await prisma.category.updateMany({
      where: { id, userId: user.id },
      data,
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });
    }

    const category = await prisma.category.findUnique({ where: { id } });

    return NextResponse.json(category);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: "Já existe uma categoria com este nome e tipo." },
        { status: 409 },
      );
    }

    console.error("Erro ao atualizar categoria:", error);
    return NextResponse.json({ error: "Erro ao atualizar." }, { status: 500 });
  }
}

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
    const id = resolvedParams.id;

    const result = await prisma.category.deleteMany({
      where: { id, userId: user.id },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ message: "Categoria deletada com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar categoria:", error);
    return NextResponse.json({ error: "Erro ao deletar." }, { status: 500 });
  }
}
