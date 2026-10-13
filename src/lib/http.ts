import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export type JsonBody = Record<string, unknown>;

export async function readJsonBody(request: NextRequest): Promise<JsonBody | null> {
  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return null;
    }

    return body as JsonBody;
  } catch {
    return null;
  }
}

export function invalidBodyResponse() {
  return NextResponse.json(
    { error: "Corpo da requisição inválido." },
    { status: 400 },
  );
}

export function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}
