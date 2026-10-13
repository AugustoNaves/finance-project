import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  transaction: {
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET, POST } from "@/app/api/transactions/route";
import { DELETE, PATCH } from "@/app/api/transactions/[id]/route";
import {
  authUser,
  buildRequest,
  buildSessionCookie,
  invalidSessionCookie,
  routeParams,
} from "./helpers";

const validPayload = {
  description: "Mercado",
  amount: -150.5,
  category: "Alimentação",
  type: "outcome",
  paymentMethod: "Pix",
  notes: null,
  date: "2026-03-10",
};

const storedTransaction = {
  id: "tx-1",
  ...validPayload,
  date: "2026-03-10T00:00:00.000Z",
  userId: authUser.id,
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

describe("GET /api/transactions", () => {
  it("retorna 401 sem cookie de sessão", async () => {
    const response = await GET(buildRequest("/api/transactions"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Não autenticado." });
    expect(prismaMock.transaction.findMany).not.toHaveBeenCalled();
  });

  it("retorna 401 com cookie de sessão inválido", async () => {
    const response = await GET(buildRequest("/api/transactions", { cookie: invalidSessionCookie }));

    expect(response.status).toBe(401);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.transaction.findMany).not.toHaveBeenCalled();
  });

  it("retorna 401 quando o usuário da sessão não existe mais", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const response = await GET(buildRequest("/api/transactions", { cookie }));

    expect(response.status).toBe(401);
    expect(prismaMock.transaction.findMany).not.toHaveBeenCalled();
  });

  it("lista apenas as transações do usuário autenticado, da mais recente para a mais antiga", async () => {
    prismaMock.transaction.findMany.mockResolvedValue([storedTransaction]);

    const response = await GET(buildRequest("/api/transactions", { cookie }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([storedTransaction]);
    expect(prismaMock.transaction.findMany).toHaveBeenCalledWith({
      where: { userId: authUser.id },
      orderBy: { date: "desc" },
    });
  });

  it("retorna 500 quando o banco falha", async () => {
    prismaMock.transaction.findMany.mockRejectedValue(new Error("db fora do ar"));

    const response = await GET(buildRequest("/api/transactions", { cookie }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao buscar dados." });
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("POST /api/transactions", () => {
  it("retorna 401 sem cookie de sessão", async () => {
    const response = await POST(
      buildRequest("/api/transactions", { method: "POST", body: validPayload }),
    );

    expect(response.status).toBe(401);
    expect(prismaMock.transaction.create).not.toHaveBeenCalled();
  });

  it("retorna 401 com cookie de sessão inválido", async () => {
    const response = await POST(
      buildRequest("/api/transactions", {
        method: "POST",
        body: validPayload,
        cookie: invalidSessionCookie,
      }),
    );

    expect(response.status).toBe(401);
    expect(prismaMock.transaction.create).not.toHaveBeenCalled();
  });

  it("cria a transação com o userId da sessão e retorna 201", async () => {
    prismaMock.transaction.create.mockResolvedValue(storedTransaction);

    const response = await POST(
      buildRequest("/api/transactions", { method: "POST", body: validPayload, cookie }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(storedTransaction);
    expect(prismaMock.transaction.create).toHaveBeenCalledWith({
      data: {
        description: "Mercado",
        amount: -150.5,
        category: "Alimentação",
        type: "outcome",
        paymentMethod: "Pix",
        notes: null,
        date: new Date("2026-03-10"),
        userId: authUser.id,
      },
    });
  });

  it("ignora userId e id enviados no corpo", async () => {
    prismaMock.transaction.create.mockResolvedValue(storedTransaction);

    await POST(
      buildRequest("/api/transactions", {
        method: "POST",
        body: { ...validPayload, userId: "outro-usuario", id: "id-forjado" },
        cookie,
      }),
    );

    const { data } = prismaMock.transaction.create.mock.calls[0][0];

    expect(data.userId).toBe(authUser.id);
    expect(data).not.toHaveProperty("id");
  });

  it("aceita entrada positiva sem data, tipo ou campos opcionais", async () => {
    prismaMock.transaction.create.mockResolvedValue(storedTransaction);

    const response = await POST(
      buildRequest("/api/transactions", {
        method: "POST",
        body: { description: "Salário", amount: 5000, category: "Salário" },
        cookie,
      }),
    );

    expect(response.status).toBe(201);
    expect(prismaMock.transaction.create).toHaveBeenCalledWith({
      data: {
        description: "Salário",
        amount: 5000,
        category: "Salário",
        userId: authUser.id,
      },
    });
  });

  it.each([
    ["sem descrição", { description: "" }, "Descrição é obrigatória."],
    ["com valor zero", { amount: 0 }, "Informe um valor numérico diferente de zero."],
    ["com valor em texto", { amount: "abc" }, "Informe um valor numérico diferente de zero."],
    ["sem categoria", { category: " " }, "Categoria é obrigatória."],
    ["com tipo inválido", { type: "transfer" }, "Tipo de transação inválido."],
    ["com data inválida", { date: "nao-e-data" }, "Data inválida."],
  ])("retorna 400 %s", async (_caso, overrides, message) => {
    const response = await POST(
      buildRequest("/api/transactions", {
        method: "POST",
        body: { ...validPayload, ...overrides },
        cookie,
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: message });
    expect(prismaMock.transaction.create).not.toHaveBeenCalled();
  });

  it("retorna 400 para JSON malformado", async () => {
    const response = await POST(
      buildRequest("/api/transactions", { method: "POST", rawBody: "{invalido", cookie }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Corpo da requisição inválido." });
    expect(prismaMock.transaction.create).not.toHaveBeenCalled();
  });

  it("retorna 400 quando o corpo não é um objeto", async () => {
    const response = await POST(
      buildRequest("/api/transactions", { method: "POST", rawBody: "[]", cookie }),
    );

    expect(response.status).toBe(400);
  });

  it("retorna 500 quando o banco falha", async () => {
    prismaMock.transaction.create.mockRejectedValue(new Error("db fora do ar"));

    const response = await POST(
      buildRequest("/api/transactions", { method: "POST", body: validPayload, cookie }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao salvar os dados." });
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("PATCH /api/transactions/[id]", () => {
  function patch(body: unknown, options: { cookie?: string; rawBody?: string } = {}) {
    return PATCH(
      buildRequest("/api/transactions/tx-1", { method: "PATCH", body, ...options }),
      routeParams("tx-1"),
    );
  }

  it("retorna 401 sem cookie de sessão", async () => {
    const response = await patch(validPayload);

    expect(response.status).toBe(401);
    expect(prismaMock.transaction.updateMany).not.toHaveBeenCalled();
  });

  it("retorna 401 com cookie de sessão inválido", async () => {
    const response = await patch(validPayload, { cookie: invalidSessionCookie });

    expect(response.status).toBe(401);
    expect(prismaMock.transaction.updateMany).not.toHaveBeenCalled();
  });

  it("atualiza a transação restringindo por id e userId", async () => {
    prismaMock.transaction.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.transaction.findUnique.mockResolvedValue(storedTransaction);

    const response = await patch(validPayload, { cookie });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(storedTransaction);
    expect(prismaMock.transaction.updateMany).toHaveBeenCalledWith({
      where: { id: "tx-1", userId: authUser.id },
      data: { ...validPayload, date: new Date("2026-03-10") },
    });
    expect(prismaMock.transaction.findUnique).toHaveBeenCalledWith({ where: { id: "tx-1" } });
  });

  it("aceita atualização parcial enviando apenas os campos presentes", async () => {
    prismaMock.transaction.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.transaction.findUnique.mockResolvedValue(storedTransaction);

    const response = await patch({ notes: "revisado" }, { cookie });

    expect(response.status).toBe(200);
    expect(prismaMock.transaction.updateMany).toHaveBeenCalledWith({
      where: { id: "tx-1", userId: authUser.id },
      data: { notes: "revisado" },
    });
  });

  it("não permite trocar o dono da transação pelo corpo", async () => {
    prismaMock.transaction.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.transaction.findUnique.mockResolvedValue(storedTransaction);

    await patch({ ...validPayload, userId: "outro-usuario" }, { cookie });

    const { data, where } = prismaMock.transaction.updateMany.mock.calls[0][0];

    expect(data).not.toHaveProperty("userId");
    expect(where.userId).toBe(authUser.id);
  });

  it("retorna 404 quando a transação pertence a outro usuário ou não existe", async () => {
    prismaMock.transaction.updateMany.mockResolvedValue({ count: 0 });

    const response = await patch(validPayload, { cookie });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Transação não encontrada." });
    expect(prismaMock.transaction.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ["descrição vazia", { description: "" }, "Descrição é obrigatória."],
    ["valor zero", { amount: 0 }, "Informe um valor numérico diferente de zero."],
    ["valor nulo", { amount: null }, "Informe um valor numérico diferente de zero."],
    ["categoria vazia", { category: "" }, "Categoria é obrigatória."],
    ["tipo inválido", { type: "gasto" }, "Tipo de transação inválido."],
    ["data inválida", { date: "32/13/2026" }, "Data inválida."],
  ])("retorna 400 para %s", async (_caso, body, message) => {
    const response = await patch(body, { cookie });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: message });
    expect(prismaMock.transaction.updateMany).not.toHaveBeenCalled();
  });

  it("retorna 400 quando nenhum campo é enviado", async () => {
    const response = await patch({}, { cookie });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Nenhum campo para atualizar." });
    expect(prismaMock.transaction.updateMany).not.toHaveBeenCalled();
  });

  it("retorna 400 para JSON malformado", async () => {
    const response = await patch(undefined, { cookie, rawBody: "{" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Corpo da requisição inválido." });
  });

  it("retorna 500 quando o banco falha", async () => {
    prismaMock.transaction.updateMany.mockRejectedValue(new Error("db fora do ar"));

    const response = await patch(validPayload, { cookie });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao atualizar." });
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("DELETE /api/transactions/[id]", () => {
  function remove(cookieValue?: string) {
    return DELETE(
      buildRequest("/api/transactions/tx-1", { method: "DELETE", cookie: cookieValue }),
      routeParams("tx-1"),
    );
  }

  it("retorna 401 sem cookie de sessão", async () => {
    const response = await remove();

    expect(response.status).toBe(401);
    expect(prismaMock.transaction.deleteMany).not.toHaveBeenCalled();
  });

  it("retorna 401 com cookie de sessão inválido", async () => {
    const response = await remove(invalidSessionCookie);

    expect(response.status).toBe(401);
    expect(prismaMock.transaction.deleteMany).not.toHaveBeenCalled();
  });

  it("remove a transação restringindo por id e userId", async () => {
    prismaMock.transaction.deleteMany.mockResolvedValue({ count: 1 });

    const response = await remove(cookie);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: "Transação deletada com sucesso",
    });
    expect(prismaMock.transaction.deleteMany).toHaveBeenCalledWith({
      where: { id: "tx-1", userId: authUser.id },
    });
  });

  it("retorna 404 quando a transação pertence a outro usuário ou não existe", async () => {
    prismaMock.transaction.deleteMany.mockResolvedValue({ count: 0 });

    const response = await remove(cookie);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Transação não encontrada." });
  });

  it("retorna 500 quando o banco falha", async () => {
    prismaMock.transaction.deleteMany.mockRejectedValue(new Error("db fora do ar"));

    const response = await remove(cookie);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao deletar." });
    expect(consoleError).toHaveBeenCalled();
  });
});
