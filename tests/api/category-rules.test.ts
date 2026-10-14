import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  categoryRule: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET } from "@/app/api/category-rules/route";
import { DELETE } from "@/app/api/category-rules/[id]/route";
import {
  authUser,
  buildRequest,
  buildSessionCookie,
  invalidSessionCookie,
  routeParams,
} from "./helpers";

const storedRule = {
  id: "rule-1",
  pattern: "NETFLIX",
  category: "Lazer",
  type: "outcome",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

let cookie: string;
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  vi.clearAllMocks();
  prismaMock.user.findUnique.mockResolvedValue(authUser);
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  cookie = await buildSessionCookie();
});

afterEach(() => {
  consoleError.mockRestore();
});

function remove(cookieValue?: string, id = "rule-1") {
  return DELETE(
    buildRequest(`/api/category-rules/${id}`, { method: "DELETE", cookie: cookieValue }),
    routeParams(id),
  );
}

describe("GET /api/category-rules", () => {
  it("retorna 401 sem cookie de sessão", async () => {
    const response = await GET(buildRequest("/api/category-rules"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Não autenticado." });
    expect(prismaMock.categoryRule.findMany).not.toHaveBeenCalled();
  });

  it("retorna 401 com cookie inválido", async () => {
    const response = await GET(
      buildRequest("/api/category-rules", { cookie: invalidSessionCookie }),
    );

    expect(response.status).toBe(401);
    expect(prismaMock.categoryRule.findMany).not.toHaveBeenCalled();
  });

  it("lista as regras do usuário ordenadas pelo padrão", async () => {
    prismaMock.categoryRule.findMany.mockResolvedValue([storedRule]);

    const response = await GET(buildRequest("/api/category-rules", { cookie }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      { ...storedRule, createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    expect(prismaMock.categoryRule.findMany).toHaveBeenCalledWith({
      where: { userId: authUser.id },
      orderBy: { pattern: "asc" },
      select: { id: true, pattern: true, category: true, type: true, createdAt: true },
    });
  });

  it("retorna 500 quando o prisma falha", async () => {
    prismaMock.categoryRule.findMany.mockRejectedValue(new Error("db fora do ar"));

    const response = await GET(buildRequest("/api/category-rules", { cookie }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Erro ao buscar regras de categorização.",
    });
  });
});

describe("DELETE /api/category-rules/[id]", () => {
  it("retorna 401 sem cookie de sessão", async () => {
    const response = await remove();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Não autenticado." });
    expect(prismaMock.categoryRule.deleteMany).not.toHaveBeenCalled();
  });

  it("retorna 401 com cookie inválido", async () => {
    const response = await remove(invalidSessionCookie);

    expect(response.status).toBe(401);
    expect(prismaMock.categoryRule.deleteMany).not.toHaveBeenCalled();
  });

  it("remove a regra filtrando pelo usuário da sessão", async () => {
    prismaMock.categoryRule.deleteMany.mockResolvedValue({ count: 1 });

    const response = await remove(cookie);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: "Regra removida com sucesso" });
    expect(prismaMock.categoryRule.deleteMany).toHaveBeenCalledWith({
      where: { id: "rule-1", userId: authUser.id },
    });
  });

  it("retorna 404 quando a regra é de outro usuário", async () => {
    prismaMock.categoryRule.deleteMany.mockResolvedValue({ count: 0 });

    const response = await remove(cookie, "rule-de-outro");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Regra não encontrada." });
    expect(prismaMock.categoryRule.deleteMany).toHaveBeenCalledWith({
      where: { id: "rule-de-outro", userId: authUser.id },
    });
  });

  it("retorna 500 quando o prisma falha", async () => {
    prismaMock.categoryRule.deleteMany.mockRejectedValue(new Error("db fora do ar"));

    const response = await remove(cookie);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao deletar." });
  });
});
