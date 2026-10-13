import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  goal: {
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET, POST } from "@/app/api/goals/route";
import { DELETE, PATCH } from "@/app/api/goals/[id]/route";
import {
  authUser,
  buildRequest,
  buildSessionCookie,
  invalidSessionCookie,
  routeParams,
} from "./helpers";

const validPayload = {
  name: "Reserva de emergência",
  targetAmount: 10000,
  currentAmount: 2500,
  deadline: "2026-12-31T00:00:00.000Z",
  color: "#00c48c",
};

const expectedData = { ...validPayload, deadline: new Date("2026-12-31T00:00:00.000Z") };

const stored = { id: "goal-1", ...validPayload, userId: authUser.id };

const invalidPayloads: [string, Record<string, unknown>, string][] = [
  ["nome vazio", { name: "" }, "Nome da meta é obrigatório."],
  ["valor alvo zero", { targetAmount: 0 }, "Valor alvo deve ser um número maior que zero."],
  ["valor alvo negativo", { targetAmount: -10 }, "Valor alvo deve ser um número maior que zero."],
  ["valor alvo em texto", { targetAmount: "1000" }, "Valor alvo deve ser um número maior que zero."],
  ["valor alvo nulo", { targetAmount: null }, "Valor alvo deve ser um número maior que zero."],
  [
    "valor atual negativo",
    { currentAmount: -1 },
    "Valor atual deve ser um número maior ou igual a zero.",
  ],
  [
    "valor atual em texto",
    { currentAmount: "abc" },
    "Valor atual deve ser um número maior ou igual a zero.",
  ],
  ["prazo inválido", { deadline: "sem-data" }, "Prazo inválido."],
  ["cor não textual", { color: 42 }, "Cor inválida."],
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
  return POST(buildRequest("/api/goals", { method: "POST", body, ...options }));
}

function patch(body: unknown, options: { cookie?: string; rawBody?: string } = {}) {
  return PATCH(
    buildRequest("/api/goals/goal-1", { method: "PATCH", body, ...options }),
    routeParams("goal-1"),
  );
}

function remove(cookieValue?: string) {
  return DELETE(
    buildRequest("/api/goals/goal-1", { method: "DELETE", cookie: cookieValue }),
    routeParams("goal-1"),
  );
}

describe("GET /api/goals", () => {
  it("retorna 401 sem cookie de sessão", async () => {
    const response = await GET(buildRequest("/api/goals"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Não autenticado." });
    expect(prismaMock.goal.findMany).not.toHaveBeenCalled();
  });

  it("retorna 401 com cookie de sessão inválido", async () => {
    const response = await GET(buildRequest("/api/goals", { cookie: invalidSessionCookie }));

    expect(response.status).toBe(401);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.goal.findMany).not.toHaveBeenCalled();
  });

  it("retorna 401 quando o usuário da sessão não existe mais", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const response = await GET(buildRequest("/api/goals", { cookie }));

    expect(response.status).toBe(401);
    expect(prismaMock.goal.findMany).not.toHaveBeenCalled();
  });

  it("lista apenas as metas do usuário autenticado, da mais recente para a mais antiga", async () => {
    prismaMock.goal.findMany.mockResolvedValue([stored]);

    const response = await GET(buildRequest("/api/goals", { cookie }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([stored]);
    expect(prismaMock.goal.findMany).toHaveBeenCalledWith({
      where: { userId: authUser.id },
      orderBy: { createdAt: "desc" },
    });
  });

  it("retorna 500 quando o banco falha", async () => {
    prismaMock.goal.findMany.mockRejectedValue(new Error("db fora do ar"));

    const response = await GET(buildRequest("/api/goals", { cookie }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao buscar metas." });
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("POST /api/goals", () => {
  it("retorna 401 sem cookie de sessão", async () => {
    const response = await post(validPayload);

    expect(response.status).toBe(401);
    expect(prismaMock.goal.create).not.toHaveBeenCalled();
  });

  it("retorna 401 com cookie de sessão inválido", async () => {
    const response = await post(validPayload, { cookie: invalidSessionCookie });

    expect(response.status).toBe(401);
    expect(prismaMock.goal.create).not.toHaveBeenCalled();
  });

  it("cria a meta com o userId da sessão e retorna 201", async () => {
    prismaMock.goal.create.mockResolvedValue(stored);

    const response = await post(validPayload, { cookie });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(stored);
    expect(prismaMock.goal.create).toHaveBeenCalledWith({
      data: { ...expectedData, userId: authUser.id },
    });
  });

  it("ignora userId e id enviados no corpo", async () => {
    prismaMock.goal.create.mockResolvedValue(stored);

    await post({ ...validPayload, userId: "outro-usuario", id: "id-forjado" }, { cookie });

    const { data } = prismaMock.goal.create.mock.calls[0][0];

    expect(data.userId).toBe(authUser.id);
    expect(data).not.toHaveProperty("id");
  });

  it("grava prazo nulo e deixa o valor atual com o padrão quando não informados", async () => {
    prismaMock.goal.create.mockResolvedValue(stored);

    const response = await post({ name: "Viagem", targetAmount: 3000 }, { cookie });

    expect(response.status).toBe(201);
    expect(prismaMock.goal.create).toHaveBeenCalledWith({
      data: { name: "Viagem", targetAmount: 3000, deadline: null, userId: authUser.id },
    });
  });

  it("retorna 400 quando nome e valor alvo estão ausentes", async () => {
    const response = await post({ color: "#fff" }, { cookie });

    expect(response.status).toBe(400);
    expect(prismaMock.goal.create).not.toHaveBeenCalled();
  });

  it.each(invalidPayloads)("retorna 400 para %s", async (_caso, overrides, message) => {
    const response = await post({ ...validPayload, ...overrides }, { cookie });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: message });
    expect(prismaMock.goal.create).not.toHaveBeenCalled();
  });

  it("retorna 400 para JSON malformado", async () => {
    const response = await post(undefined, { cookie, rawBody: "{invalido" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Corpo da requisição inválido." });
    expect(prismaMock.goal.create).not.toHaveBeenCalled();
  });

  it("retorna 400 quando o corpo não é um objeto", async () => {
    const response = await post(undefined, { cookie, rawBody: "null" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Corpo da requisição inválido." });
  });

  it("retorna 500 quando o banco falha", async () => {
    prismaMock.goal.create.mockRejectedValue(new Error("db fora do ar"));

    const response = await post(validPayload, { cookie });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao salvar meta." });
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("PATCH /api/goals/[id]", () => {
  it("retorna 401 sem cookie de sessão", async () => {
    const response = await patch(validPayload);

    expect(response.status).toBe(401);
    expect(prismaMock.goal.updateMany).not.toHaveBeenCalled();
  });

  it("retorna 401 com cookie de sessão inválido", async () => {
    const response = await patch(validPayload, { cookie: invalidSessionCookie });

    expect(response.status).toBe(401);
    expect(prismaMock.goal.updateMany).not.toHaveBeenCalled();
  });

  it("atualiza a meta restringindo por id e userId", async () => {
    prismaMock.goal.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.goal.findUnique.mockResolvedValue(stored);

    const response = await patch(validPayload, { cookie });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(stored);
    expect(prismaMock.goal.updateMany).toHaveBeenCalledWith({
      where: { id: "goal-1", userId: authUser.id },
      data: expectedData,
    });
    expect(prismaMock.goal.findUnique).toHaveBeenCalledWith({ where: { id: "goal-1" } });
  });

  it("não permite trocar o dono do registro pelo corpo", async () => {
    prismaMock.goal.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.goal.findUnique.mockResolvedValue(stored);

    await patch({ ...validPayload, userId: "outro-usuario" }, { cookie });

    const { data, where } = prismaMock.goal.updateMany.mock.calls[0][0];

    expect(data).not.toHaveProperty("userId");
    expect(where.userId).toBe(authUser.id);
  });

  it("retorna 404 quando o registro pertence a outro usuário ou não existe", async () => {
    prismaMock.goal.updateMany.mockResolvedValue({ count: 0 });

    const response = await patch(validPayload, { cookie });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Meta não encontrada." });
    expect(prismaMock.goal.findUnique).not.toHaveBeenCalled();
  });

  it.each(invalidPayloads)("retorna 400 para %s", async (_caso, overrides, message) => {
    const response = await patch({ ...validPayload, ...overrides }, { cookie });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: message });
    expect(prismaMock.goal.updateMany).not.toHaveBeenCalled();
  });

  it("aceita atualização parcial sem apagar o prazo existente", async () => {
    prismaMock.goal.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.goal.findUnique.mockResolvedValue(stored);

    const response = await patch({ currentAmount: 4000 }, { cookie });

    expect(response.status).toBe(200);
    expect(prismaMock.goal.updateMany).toHaveBeenCalledWith({
      where: { id: "goal-1", userId: authUser.id },
      data: { currentAmount: 4000 },
    });
  });

  it("permite remover o prazo enviando null", async () => {
    prismaMock.goal.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.goal.findUnique.mockResolvedValue(stored);

    await patch({ ...validPayload, deadline: null }, { cookie });

    expect(prismaMock.goal.updateMany.mock.calls[0][0].data.deadline).toBeNull();
  });

  it("retorna 400 quando nenhum campo é enviado", async () => {
    const response = await patch({}, { cookie });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Nenhum campo para atualizar." });
    expect(prismaMock.goal.updateMany).not.toHaveBeenCalled();
  });

  it("retorna 400 para JSON malformado", async () => {
    const response = await patch(undefined, { cookie, rawBody: "{" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Corpo da requisição inválido." });
    expect(prismaMock.goal.updateMany).not.toHaveBeenCalled();
  });

  it("retorna 500 quando o banco falha", async () => {
    prismaMock.goal.updateMany.mockRejectedValue(new Error("db fora do ar"));

    const response = await patch(validPayload, { cookie });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao atualizar meta." });
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("DELETE /api/goals/[id]", () => {
  it("retorna 401 sem cookie de sessão", async () => {
    const response = await remove();

    expect(response.status).toBe(401);
    expect(prismaMock.goal.deleteMany).not.toHaveBeenCalled();
  });

  it("retorna 401 com cookie de sessão inválido", async () => {
    const response = await remove(invalidSessionCookie);

    expect(response.status).toBe(401);
    expect(prismaMock.goal.deleteMany).not.toHaveBeenCalled();
  });

  it("remove a meta restringindo por id e userId", async () => {
    prismaMock.goal.deleteMany.mockResolvedValue({ count: 1 });

    const response = await remove(cookie);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: "Meta deletada com sucesso" });
    expect(prismaMock.goal.deleteMany).toHaveBeenCalledWith({
      where: { id: "goal-1", userId: authUser.id },
    });
  });

  it("retorna 404 quando o registro pertence a outro usuário ou não existe", async () => {
    prismaMock.goal.deleteMany.mockResolvedValue({ count: 0 });

    const response = await remove(cookie);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Meta não encontrada." });
  });

  it("retorna 500 quando o banco falha", async () => {
    prismaMock.goal.deleteMany.mockRejectedValue(new Error("db fora do ar"));

    const response = await remove(cookie);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao deletar meta." });
    expect(consoleError).toHaveBeenCalled();
  });
});
