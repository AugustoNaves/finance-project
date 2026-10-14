import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const rules = await prisma.categoryRule.findMany({
      where: { userId: user.id },
      orderBy: { pattern: "asc" },
      select: { id: true, pattern: true, category: true, type: true },
    });

    return NextResponse.json(rules);
  } catch (error) {
    console.error("Erro no GET /api/category-rules:", error);
    return NextResponse.json(
      { error: "Erro ao buscar regras de categorização." },
      { status: 500 },
    );
  }
}
