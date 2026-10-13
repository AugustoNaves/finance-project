import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  budget: {
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET, POST } from "@/app/api/budgets/route";
import { DELETE, PATCH } from "@/app/api/budgets/[id]/route";
import {
  authUser,
  buildRequest,
  buildSessionCookie,
  invalidSessionCookie,
  routeParams,
  uniqueConstraintError,
} from "./helpers";

const validPayload = {
  category: "Alimentação",
  amount: 800,
  month: "2026-03",
};

const expectedData = validPayload;

const stored = { id: "budget-1", ...validPayload, userId: authUser.id };

const requiredMessage = "Categoria, valor válido e mês são obrigatórios.";

const invalidPayloads: [string, Record<string, unknown>, string][] = [
  ["categoria ausente", { category: undefined }, requiredMessage],
  ["categoria vazia", { category: "" }, requiredMessage],
  ["mês ausente", { month: undefined }, requiredMessage],
  ["valor ausente", { amount: undefined }, requiredMessage],
  ["valor zero", { amount: 0 }, requiredMessage],
  ["valor negativo", { amount: -50 }, requiredMessage],
  ["valor não numérico", { amount: "abc" }, requiredMessage],
  ["mês fora do formato AAAA-MM", { month: "03/2026" }, "Mês deve estar no formato AAAA-MM."],
  ["mês inexistente", { month: "2026-13" }, "Mês deve estar no formato AAAA-MM."],
];

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

function post(body: unknown, options: { cookie?: string; rawBody?: string } = {}) {
  return POST(buildRequest("/api/budgets", { method: "POST", body, ...options }));
}

function patch(body: unknown, options: { cookie?: string; rawBody?: string } = {}) {
  return PATCH(
    buildRequest("/api/budgets/budget-1", { method: "PATCH", body, ...options }),
    routeParams("budget-1"),
  );
}

function remove(cookieValue?: string) {
  return DELETE(
    buildRequest("/api/budgets/budget-1", { method: "DELETE", cookie: cookieValue }),
    routeParams("budget-1"),
  );
}

describe("GET /api/budgets", () => {
  it("retorna 401 sem cookie de sessão", async () => {
    const response = await GET(buildRequest("/api/budgets"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Não autenticado." });
    expect(prismaMock.budget.findMany).not.toHaveBeenCalled();
  });

  it("retorna 401 com cookie de sessão inválido", async () => {
    const response = await GET(buildRequest("/api/budgets", { cookie: invalidSessionCookie }));

    expect(response.status).toBe(401);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.budget.findMany).not.toHaveBeenCalled();
  });

  it("retorna 401 quando o usuário da sessão não existe mais", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const response = await GET(buildRequest("/api/budgets", { cookie }));

    expect(response.status).toBe(401);
    expect(prismaMock.budget.findMany).not.toHaveBeenCalled();
  });

  it("lista apenas os orçamentos do usuário autenticado ordenados por mês e categoria", async () => {
    prismaMock.budget.findMany.mockResolvedValue([stored]);

    const response = await GET(buildRequest("/api/budgets", { cookie }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([stored]);
    expect(prismaMock.budget.findMany).toHaveBeenCalledWith({
      where: { userId: authUser.id },
      orderBy: [{ month: "desc" }, { category: "asc" }],
    });
  });

  it("retorna 500 quando o banco falha", async () => {
    prismaMock.budget.findMany.mockRejectedValue(new Error("db fora do ar"));

    const response = await GET(buildRequest("/api/budgets", { cookie }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao buscar orçamentos." });
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("POST /api/budgets", () => {
  it("retorna 401 sem cookie de sessão", async () => {
    const response = await post(validPayload);

    expect(response.status).toBe(401);
    expect(prismaMock.budget.create).not.toHaveBeenCalled();
  });

  it("retorna 401 com cookie de sessão inválido", async () => {
    const response = await post(validPayload, { cookie: invalidSessionCookie });

    expect(response.status).toBe(401);
    expect(prismaMock.budget.create).not.toHaveBeenCalled();
  });

  it("cria o orçamento com o userId da sessão e retorna 201", async () => {
    prismaMock.budget.create.mockResolvedValue(stored);

    const response = await post(validPayload, { cookie });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(stored);
    expect(prismaMock.budget.create).toHaveBeenCalledWith({
      data: { ...expectedData, userId: authUser.id },
    });
  });

  it("ignora userId e id enviados no corpo", async () => {
    prismaMock.budget.create.mockResolvedValue(stored);

    await post({ ...validPayload, userId: "outro-usuario", id: "id-forjado" }, { cookie });

    const { data } = prismaMock.budget.create.mock.calls[0][0];

    expect(data.userId).toBe(authUser.id);
    expect(data).not.toHaveProperty("id");
  });

  it("converte valor enviado como texto numérico", async () => {
    prismaMock.budget.create.mockResolvedValue(stored);

    const response = await post({ ...validPayload, amount: "1250.50" }, { cookie });

    expect(response.status).toBe(201);
    expect(prismaMock.budget.create.mock.calls[0][0].data.amount).toBe(1250.5);
  });

  it.each(invalidPayloads)("retorna 400 para %s", async (_caso, overrides, message) => {
    const response = await post({ ...validPayload, ...overrides }, { cookie });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: message });
    expect(prismaMock.budget.create).not.toHaveBeenCalled();
  });

  it("retorna 400 para JSON malformado", async () => {
    const response = await post(undefined, { cookie, rawBody: "{invalido" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Corpo da requisição inválido." });
    expect(prismaMock.budget.create).not.toHaveBeenCalled();
  });

  it("retorna 400 quando o corpo não é um objeto", async () => {
    const response = await post(undefined, { cookie, rawBody: "null" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Corpo da requisição inválido." });
  });

  it("retorna 409 quando já existe orçamento para a categoria no mês", async () => {
    prismaMock.budget.create.mockRejectedValue(uniqueConstraintError());

    const response = await post(validPayload, { cookie });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "Já existe um orçamento para esta categoria neste mês." });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("retorna 500 quando o banco falha", async () => {
    prismaMock.budget.create.mockRejectedValue(new Error("db fora do ar"));

    const response = await post(validPayload, { cookie });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao salvar orçamento." });
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("PATCH /api/budgets/[id]", () => {
  it("retorna 401 sem cookie de sessão", async () => {
    const response = await patch(validPayload);

    expect(response.status).toBe(401);
    expect(prismaMock.budget.updateMany).not.toHaveBeenCalled();
  });

  it("retorna 401 com cookie de sessão inválido", async () => {
    const response = await patch(validPayload, { cookie: invalidSessionCookie });

    expect(response.status).toBe(401);
    expect(prismaMock.budget.updateMany).not.toHaveBeenCalled();
  });

  it("atualiza o orçamento restringindo por id e userId", async () => {
    prismaMock.budget.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.budget.findUnique.mockResolvedValue(stored);

    const response = await patch(validPayload, { cookie });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(stored);
    expect(prismaMock.budget.updateMany).toHaveBeenCalledWith({
      where: { id: "budget-1", userId: authUser.id },
      data: expectedData,
    });
    expect(prismaMock.budget.findUnique).toHaveBeenCalledWith({ where: { id: "budget-1" } });
  });

  it("não permite trocar o dono do registro pelo corpo", async () => {
    prismaMock.budget.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.budget.findUnique.mockResolvedValue(stored);

    await patch({ ...validPayload, userId: "outro-usuario" }, { cookie });

    const { data, where } = prismaMock.budget.updateMany.mock.calls[0][0];

    expect(data).not.toHaveProperty("userId");
    expect(where.userId).toBe(authUser.id);
  });

  it("retorna 404 quando o registro pertence a outro usuário ou não existe", async () => {
    prismaMock.budget.updateMany.mockResolvedValue({ count: 0 });

    const response = await patch(validPayload, { cookie });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Orçamento não encontrado." });
    expect(prismaMock.budget.findUnique).not.toHaveBeenCalled();
  });

  it.each(invalidPayloads)("retorna 400 para %s", async (_caso, overrides, message) => {
    const response = await patch({ ...validPayload, ...overrides }, { cookie });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: message });
    expect(prismaMock.budget.updateMany).not.toHaveBeenCalled();
  });

  it("retorna 400 para JSON malformado", async () => {
    const response = await patch(undefined, { cookie, rawBody: "{" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Corpo da requisição inválido." });
    expect(prismaMock.budget.updateMany).not.toHaveBeenCalled();
  });

  it("retorna 409 quando a alteração colide com outro orçamento", async () => {
    prismaMock.budget.updateMany.mockRejectedValue(uniqueConstraintError());

    const response = await patch(validPayload, { cookie });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "Já existe um orçamento para esta categoria neste mês." });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("retorna 500 quando o banco falha", async () => {
    prismaMock.budget.updateMany.mockRejectedValue(new Error("db fora do ar"));

    const response = await patch(validPayload, { cookie });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao atualizar." });
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("DELETE /api/budgets/[id]", () => {
  it("retorna 401 sem cookie de sessão", async () => {
    const response = await remove();

    expect(response.status).toBe(401);
    expect(prismaMock.budget.deleteMany).not.toHaveBeenCalled();
  });

  it("retorna 401 com cookie de sessão inválido", async () => {
    const response = await remove(invalidSessionCookie);

    expect(response.status).toBe(401);
    expect(prismaMock.budget.deleteMany).not.toHaveBeenCalled();
  });

  it("remove o orçamento restringindo por id e userId", async () => {
    prismaMock.budget.deleteMany.mockResolvedValue({ count: 1 });

    const response = await remove(cookie);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: "Orçamento deletado com sucesso" });
    expect(prismaMock.budget.deleteMany).toHaveBeenCalledWith({
      where: { id: "budget-1", userId: authUser.id },
    });
  });

  it("retorna 404 quando o registro pertence a outro usuário ou não existe", async () => {
    prismaMock.budget.deleteMany.mockResolvedValue({ count: 0 });

    const response = await remove(cookie);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Orçamento não encontrado." });
  });

  it("retorna 500 quando o banco falha", async () => {
    prismaMock.budget.deleteMany.mockRejectedValue(new Error("db fora do ar"));

    const response = await remove(cookie);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao deletar." });
    expect(consoleError).toHaveBeenCalled();
  });
});
