import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, txMock, passwordMock } = vi.hoisted(() => {
  const txMock = {
    user: { create: vi.fn() },
    category: { createMany: vi.fn() },
  };

  return {
    txMock,
    prismaMock: {
      $transaction: vi.fn(),
      user: { create: vi.fn() },
      category: { createMany: vi.fn() },
    },
    passwordMock: { hashPassword: vi.fn(), comparePassword: vi.fn() },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/password", () => passwordMock);

import { POST } from "@/app/api/register/route";
import { buildRequest, uniqueConstraintError } from "./helpers";

const validPayload = { name: "Maria", email: "maria@example.com", senha: "senha-forte-123" };
const createdUser = { id: "user-1", name: "Maria", email: "maria@example.com" };

let consoleError: ReturnType<typeof vi.spyOn>;

function register(body: unknown, rawBody?: string) {
  return POST(buildRequest("/api/register", { method: "POST", body, rawBody }));
}

beforeEach(() => {
  vi.clearAllMocks();
  passwordMock.hashPassword.mockResolvedValue("hash-gerado");
  txMock.user.create.mockResolvedValue(createdUser);
  txMock.category.createMany.mockResolvedValue({ count: 18 });
  prismaMock.$transaction.mockImplementation((callback: (tx: typeof txMock) => unknown) =>
    callback(txMock),
  );
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe("POST /api/register", () => {
  it("cria o usuário e retorna 201 sem expor o hash da senha", async () => {
    const response = await register(validPayload);

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ user: createdUser });
    expect(txMock.user.create).toHaveBeenCalledWith({
      data: { name: "Maria", email: "maria@example.com", passwordHash: "hash-gerado" },
      select: { id: true, name: true, email: true },
    });
  });

  it("grava o hash e nunca a senha em texto puro", async () => {
    await register(validPayload);

    expect(passwordMock.hashPassword).toHaveBeenCalledWith("senha-forte-123");
    expect(JSON.stringify(txMock.user.create.mock.calls[0][0])).not.toContain("senha-forte-123");
  });

  it("normaliza nome e e-mail (trim e minúsculas)", async () => {
    await register({ ...validPayload, name: "  Maria  ", email: "  MARIA@Example.COM " });

    expect(txMock.user.create.mock.calls[0][0].data).toMatchObject({
      name: "Maria",
      email: "maria@example.com",
    });
  });

  it("aceita o campo password como alternativa a senha", async () => {
    const response = await register({
      name: "Maria",
      email: "maria@example.com",
      password: "outra-senha-123",
    });

    expect(response.status).toBe(201);
    expect(passwordMock.hashPassword).toHaveBeenCalledWith("outra-senha-123");
  });

  it("cria as 18 categorias padrão vinculadas ao novo usuário", async () => {
    await register(validPayload);

    const { data } = txMock.category.createMany.mock.calls[0][0] as {
      data: { name: string; type: string; color: string; userId: string }[];
    };

    expect(data).toHaveLength(18);
    expect(data.every((category) => category.userId === "user-1")).toBe(true);
    expect(data.filter((category) => category.type === "income")).toHaveLength(4);
    expect(data.filter((category) => category.type === "outcome")).toHaveLength(9);
    expect(data.filter((category) => category.type === "investment")).toHaveLength(5);
    expect(data.every((category) => /^#[0-9a-f]{6}$/.test(category.color))).toBe(true);
  });

  it("não repete nome e tipo nas categorias padrão (restrição de unicidade)", async () => {
    await register(validPayload);

    const { data } = txMock.category.createMany.mock.calls[0][0] as {
      data: { name: string; type: string }[];
    };
    const keys = data.map((category) => `${category.type}:${category.name}`);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("cria usuário e categorias dentro de uma única transação", async () => {
    await register(validPayload);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.category.createMany).not.toHaveBeenCalled();
  });

  it("retorna 500 e não confirma o cadastro quando a criação das categorias falha", async () => {
    txMock.category.createMany.mockRejectedValue(new Error("falha nas categorias"));

    const response = await register(validPayload);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro interno do servidor." });
    expect(consoleError).toHaveBeenCalled();
  });

  it.each([
    ["nome ausente", { name: "" }],
    ["nome só com espaços", { name: "   " }],
    ["e-mail ausente", { email: "" }],
    ["senha ausente", { senha: "" }],
  ])("retorna 400 para %s", async (_caso, overrides) => {
    const response = await register({ ...validPayload, ...overrides });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Nome, e-mail e senha são obrigatórios.",
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it.each(["maria", "maria@", "@example.com", "maria@example", "maria @example.com"])(
    "retorna 400 para e-mail inválido (%s)",
    async (email) => {
      const response = await register({ ...validPayload, email });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Informe um e-mail válido." });
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    },
  );

  it("retorna 400 para senha com menos de 8 caracteres", async () => {
    const response = await register({ ...validPayload, senha: "1234567" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "A senha deve ter pelo menos 8 caracteres.",
    });
    expect(passwordMock.hashPassword).not.toHaveBeenCalled();
  });

  it("aceita senha com exatamente 8 caracteres", async () => {
    const response = await register({ ...validPayload, senha: "12345678" });

    expect(response.status).toBe(201);
  });

  it("retorna 409 quando o e-mail já está cadastrado", async () => {
    txMock.user.create.mockRejectedValue(uniqueConstraintError());

    const response = await register(validPayload);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Já existe uma conta com este e-mail.",
    });
    expect(txMock.category.createMany).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("retorna 400 para JSON malformado", async () => {
    const response = await register(undefined, "{nome:");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Corpo da requisição inválido." });
  });

  it("retorna 400 quando o corpo não é um objeto", async () => {
    const response = await register(undefined, "null");

    expect(response.status).toBe(400);
  });

  it("retorna 500 quando o banco falha", async () => {
    prismaMock.$transaction.mockRejectedValue(new Error("db fora do ar"));

    const response = await register(validPayload);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro interno do servidor." });
    expect(consoleError).toHaveBeenCalled();
  });
});
