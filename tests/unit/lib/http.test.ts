import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { invalidBodyResponse, isUniqueConstraintError, readJsonBody } from "@/lib/http";

function buildRequest(body?: string) {
  return new NextRequest("http://localhost:3000/api/teste", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

describe("readJsonBody", () => {
  it("retorna o objeto quando o corpo é um JSON válido", async () => {
    await expect(readJsonBody(buildRequest('{"nome":"Maria"}'))).resolves.toEqual({
      nome: "Maria",
    });
  });

  it("retorna null para JSON malformado", async () => {
    await expect(readJsonBody(buildRequest("{nome:"))).resolves.toBeNull();
  });

  it("retorna null para corpo vazio", async () => {
    await expect(readJsonBody(buildRequest())).resolves.toBeNull();
  });

  it.each(["null", "[]", '"texto"', "42", "true"])(
    "retorna null quando o JSON não é um objeto (%s)",
    async (body) => {
      await expect(readJsonBody(buildRequest(body))).resolves.toBeNull();
    },
  );
});

describe("invalidBodyResponse", () => {
  it("responde 400 com mensagem em português", async () => {
    const response = invalidBodyResponse();

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Corpo da requisição inválido." });
  });
});

describe("isUniqueConstraintError", () => {
  it("reconhece o erro P2002 do Prisma", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "test",
    });

    expect(isUniqueConstraintError(error)).toBe(true);
  });

  it("ignora outros códigos de erro do Prisma", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Record not found", {
      code: "P2025",
      clientVersion: "test",
    });

    expect(isUniqueConstraintError(error)).toBe(false);
  });

  it("ignora erros genéricos e objetos com o mesmo código", () => {
    expect(isUniqueConstraintError(new Error("falha"))).toBe(false);
    expect(isUniqueConstraintError({ code: "P2002" })).toBe(false);
    expect(isUniqueConstraintError(null)).toBe(false);
  });
});
