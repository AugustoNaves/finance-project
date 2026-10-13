import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  category: {
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET, POST } from "@/app/api/categories/route";
import { DELETE, PATCH } from "@/app/api/categories/[id]/route";
import {
  authUser,
  buildRequest,
  buildSessionCookie,
  invalidSessionCookie,
  routeParams,
  uniqueConstraintError,
} from "./helpers";

const validPayload = {
  name: "Pets",
  type: "outcome",
  color: "#ff9f43",
  icon: "paw",
};

const expectedData = validPayload;

const stored = { id: "cat-1", ...validPayload, userId: authUser.id };

const invalidPayloads: [string, Record<string, unknown>, string][] = [
  ["nome ausente", { name: undefined }, "Nome e tipo são obrigatórios."],
  ["nome só com espaços", { name: "   " }, "Nome e tipo são obrigatórios."],
  ["tipo ausente", { type: undefined }, "Nome e tipo são obrigatórios."],
  ["tipo fora de income/outcome/investment", { type: "despesa" }, "Tipo de categoria inválido."],
  ["cor não textual", { color: 123 }, "Cor inválida."],
  ["ícone não textual", { icon: 123 }, "Ícone inválido."],
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
  return POST(buildRequest("/api/categories", { method: "POST", body, ...options }));
}

function patch(body: unknown, options: { cookie?: string; rawBody?: string } = {}) {
  return PATCH(
    buildRequest("/api/categories/cat-1", { method: "PATCH", body, ...options }),
    routeParams("cat-1"),
  );
}

function remove(cookieValue?: string) {
  return DELETE(
    buildRequest("/api/categories/cat-1", { method: "DELETE", cookie: cookieValue }),
    routeParams("cat-1"),
  );
}

describe("GET /api/categories", () => {
  it("retorna 401 sem cookie de sessão", async () => {
    const response = await GET(buildRequest("/api/categories"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Não autenticado." });
    expect(prismaMock.category.findMany).not.toHaveBeenCalled();
  });

  it("retorna 401 com cookie de sessão inválido", async () => {
    const response = await GET(buildRequest("/api/categories", { cookie: invalidSessionCookie }));

    expect(response.status).toBe(401);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.category.findMany).not.toHaveBeenCalled();
  });

  it("retorna 401 quando o usuário da sessão não existe mais", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const response = await GET(buildRequest("/api/categories", { cookie }));

    expect(response.status).toBe(401);
    expect(prismaMock.category.findMany).not.toHaveBeenCalled();
  });

  it("lista apenas as categorias do usuário autenticado ordenadas por tipo e nome", async () => {
    prismaMock.category.findMany.mockResolvedValue([stored]);

    const response = await GET(buildRequest("/api/categories", { cookie }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([stored]);
    expect(prismaMock.category.findMany).toHaveBeenCalledWith({
      where: { userId: authUser.id },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
  });

  it("retorna 500 quando o banco falha", async () => {
    prismaMock.category.findMany.mockRejectedValue(new Error("db fora do ar"));

    const response = await GET(buildRequest("/api/categories", { cookie }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao buscar categorias." });
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("POST /api/categories", () => {
  it("retorna 401 sem cookie de sessão", async () => {
    const response = await post(validPayload);

    expect(response.status).toBe(401);
    expect(prismaMock.category.create).not.toHaveBeenCalled();
  });

  it("retorna 401 com cookie de sessão inválido", async () => {
    const response = await post(validPayload, { cookie: invalidSessionCookie });

    expect(response.status).toBe(401);
    expect(prismaMock.category.create).not.toHaveBeenCalled();
  });

  it("cria a categoria com o userId da sessão e retorna 201", async () => {
    prismaMock.category.create.mockResolvedValue(stored);

    const response = await post(validPayload, { cookie });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(stored);
    expect(prismaMock.category.create).toHaveBeenCalledWith({
      data: { ...expectedData, userId: authUser.id },
    });
  });

  it("ignora userId e id enviados no corpo", async () => {
    prismaMock.category.create.mockResolvedValue(stored);

    await post({ ...validPayload, userId: "outro-usuario", id: "id-forjado" }, { cookie });

    const { data } = prismaMock.category.create.mock.calls[0][0];

    expect(data.userId).toBe(authUser.id);
    expect(data).not.toHaveProperty("id");
  });

  it("remove espaços extras do nome antes de salvar", async () => {
    prismaMock.category.create.mockResolvedValue(stored);

    await post({ ...validPayload, name: "  Pets  " }, { cookie });

    expect(prismaMock.category.create.mock.calls[0][0].data.name).toBe("Pets");
  });

  it.each(["income", "outcome", "investment"])("aceita o tipo %s", async (type) => {
    prismaMock.category.create.mockResolvedValue(stored);

    const response = await post({ ...validPayload, type }, { cookie });

    expect(response.status).toBe(201);
  });

  it.each(invalidPayloads)("retorna 400 para %s", async (_caso, overrides, message) => {
    const response = await post({ ...validPayload, ...overrides }, { cookie });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: message });
    expect(prismaMock.category.create).not.toHaveBeenCalled();
  });

  it("retorna 400 para JSON malformado", async () => {
    const response = await post(undefined, { cookie, rawBody: "{invalido" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Corpo da requisição inválido." });
    expect(prismaMock.category.create).not.toHaveBeenCalled();
  });

  it("retorna 400 quando o corpo não é um objeto", async () => {
    const response = await post(undefined, { cookie, rawBody: "null" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Corpo da requisição inválido." });
  });

  it("retorna 409 quando já existe categoria com o mesmo nome e tipo", async () => {
    prismaMock.category.create.mockRejectedValue(uniqueConstraintError());

    const response = await post(validPayload, { cookie });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "Já existe uma categoria com este nome e tipo." });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("retorna 500 quando o banco falha", async () => {
    prismaMock.category.create.mockRejectedValue(new Error("db fora do ar"));

    const response = await post(validPayload, { cookie });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao salvar categoria." });
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("PATCH /api/categories/[id]", () => {
  it("retorna 401 sem cookie de sessão", async () => {
    const response = await patch(validPayload);

    expect(response.status).toBe(401);
    expect(prismaMock.category.updateMany).not.toHaveBeenCalled();
  });

  it("retorna 401 com cookie de sessão inválido", async () => {
    const response = await patch(validPayload, { cookie: invalidSessionCookie });

    expect(response.status).toBe(401);
    expect(prismaMock.category.updateMany).not.toHaveBeenCalled();
  });

  it("atualiza a categoria restringindo por id e userId", async () => {
    prismaMock.category.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.category.findUnique.mockResolvedValue(stored);

    const response = await patch(validPayload, { cookie });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(stored);
    expect(prismaMock.category.updateMany).toHaveBeenCalledWith({
      where: { id: "cat-1", userId: authUser.id },
      data: expectedData,
    });
    expect(prismaMock.category.findUnique).toHaveBeenCalledWith({ where: { id: "cat-1" } });
  });

  it("não permite trocar o dono do registro pelo corpo", async () => {
    prismaMock.category.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.category.findUnique.mockResolvedValue(stored);

    await patch({ ...validPayload, userId: "outro-usuario" }, { cookie });

    const { data, where } = prismaMock.category.updateMany.mock.calls[0][0];

    expect(data).not.toHaveProperty("userId");
    expect(where.userId).toBe(authUser.id);
  });

  it("retorna 404 quando o registro pertence a outro usuário ou não existe", async () => {
    prismaMock.category.updateMany.mockResolvedValue({ count: 0 });

    const response = await patch(validPayload, { cookie });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Categoria não encontrada." });
    expect(prismaMock.category.findUnique).not.toHaveBeenCalled();
  });

  it.each(invalidPayloads)("retorna 400 para %s", async (_caso, overrides, message) => {
    const response = await patch({ ...validPayload, ...overrides }, { cookie });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: message });
    expect(prismaMock.category.updateMany).not.toHaveBeenCalled();
  });

  it("retorna 400 para JSON malformado", async () => {
    const response = await patch(undefined, { cookie, rawBody: "{" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Corpo da requisição inválido." });
    expect(prismaMock.category.updateMany).not.toHaveBeenCalled();
  });

  it("retorna 409 quando a alteração colide com outra categoria", async () => {
    prismaMock.category.updateMany.mockRejectedValue(uniqueConstraintError());

    const response = await patch(validPayload, { cookie });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "Já existe uma categoria com este nome e tipo." });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("retorna 500 quando o banco falha", async () => {
    prismaMock.category.updateMany.mockRejectedValue(new Error("db fora do ar"));

    const response = await patch(validPayload, { cookie });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao atualizar." });
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("DELETE /api/categories/[id]", () => {
  it("retorna 401 sem cookie de sessão", async () => {
    const response = await remove();

    expect(response.status).toBe(401);
    expect(prismaMock.category.deleteMany).not.toHaveBeenCalled();
  });

  it("retorna 401 com cookie de sessão inválido", async () => {
    const response = await remove(invalidSessionCookie);

    expect(response.status).toBe(401);
    expect(prismaMock.category.deleteMany).not.toHaveBeenCalled();
  });

  it("remove a categoria restringindo por id e userId", async () => {
    prismaMock.category.deleteMany.mockResolvedValue({ count: 1 });

    const response = await remove(cookie);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: "Categoria deletada com sucesso" });
    expect(prismaMock.category.deleteMany).toHaveBeenCalledWith({
      where: { id: "cat-1", userId: authUser.id },
    });
  });

  it("retorna 404 quando o registro pertence a outro usuário ou não existe", async () => {
    prismaMock.category.deleteMany.mockResolvedValue({ count: 0 });

    const response = await remove(cookie);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Categoria não encontrada." });
  });

  it("retorna 500 quando o banco falha", async () => {
    prismaMock.category.deleteMany.mockRejectedValue(new Error("db fora do ar"));

    const response = await remove(cookie);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao deletar." });
    expect(consoleError).toHaveBeenCalled();
  });
});
