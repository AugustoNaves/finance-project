import { describe, expect, it } from "vitest";
import * as budgetsService from "@/services/budgets";
import * as categoriesService from "@/services/categories";
import * as goalsService from "@/services/goals";
import * as transactionsService from "@/services/transactions";
import { ApiError } from "@/services/http";
import { mockApi, networkError, reply, replyRaw } from "../helpers/api";

type AnyFn = (...args: never[]) => Promise<unknown>;

interface ServiceCase {
  name: string;
  basePath: string;
  list: () => Promise<unknown[]>;
  create: AnyFn;
  patch: AnyFn;
  remove: (id: string) => Promise<boolean>;
  payload: Record<string, unknown>;
  /** Como a entidade aparece nas mensagens de fallback ("a transação", "o orçamento"...). */
  noun: string;
}

const cases: ServiceCase[] = [
  {
    name: "transactions",
    noun: "a transação",
    basePath: "/api/transactions",
    list: transactionsService.fetchTransactions,
    create: transactionsService.createTransaction as AnyFn,
    patch: transactionsService.patchTransaction as AnyFn,
    remove: transactionsService.removeTransaction,
    payload: {
      description: "Mercado",
      amount: -120.5,
      category: "Alimentação",
      type: "outcome",
      paymentMethod: "Pix",
      notes: null,
      date: "2026-10-15",
    },
  },
  {
    name: "categories",
    noun: "a categoria",
    basePath: "/api/categories",
    list: categoriesService.fetchCategories,
    create: categoriesService.createCategory as AnyFn,
    patch: categoriesService.patchCategory as AnyFn,
    remove: categoriesService.removeCategory,
    payload: { name: "Lazer", type: "outcome", color: "#00c48c", icon: "game" },
  },
  {
    name: "budgets",
    noun: "o orçamento",
    basePath: "/api/budgets",
    list: budgetsService.fetchBudgets,
    create: budgetsService.createBudget as AnyFn,
    patch: budgetsService.patchBudget as AnyFn,
    remove: budgetsService.removeBudget,
    payload: { category: "Lazer", amount: 300, month: "2026-10" },
  },
  {
    name: "goals",
    noun: "a meta",
    basePath: "/api/goals",
    list: goalsService.fetchGoals,
    create: goalsService.createGoal as AnyFn,
    patch: goalsService.patchGoal as AnyFn,
    remove: goalsService.removeGoal,
    payload: {
      name: "Viagem",
      targetAmount: 5000,
      currentAmount: 100,
      deadline: null,
      color: "#00c48c",
    },
  },
];

describe.each(cases)("Serviço de $name", ({ basePath, list, create, patch, remove, payload, noun }) => {
  const call = (fn: AnyFn, ...args: unknown[]) => (fn as (...a: unknown[]) => Promise<unknown>)(...args);

  it("lista: faz GET e devolve o array recebido", async () => {
    const api = mockApi({ [`GET ${basePath}`]: [{ id: "1" }, { id: "2" }] });

    await expect(list()).resolves.toEqual([{ id: "1" }, { id: "2" }]);
    expect(api.calls).toEqual([expect.objectContaining({ method: "GET", path: basePath })]);
  });

  it("lista: devolve [] quando a API responde erro (ex.: 401)", async () => {
    mockApi({ [`GET ${basePath}`]: reply(401, { error: "Não autenticado." }) });

    await expect(list()).resolves.toEqual([]);
  });

  it("lista: devolve [] quando o corpo 200 não é um array", async () => {
    mockApi({ [`GET ${basePath}`]: { data: [] } });

    await expect(list()).resolves.toEqual([]);
  });

  it("[comportamento atual] lista: lança exceção quando o erro não vem em JSON (ex.: HTML de 500)", async () => {
    mockApi({ [`GET ${basePath}`]: replyRaw(500, "<html>Internal Server Error</html>") });

    await expect(list()).rejects.toThrow();
  });

  it("lista: propaga a falha de rede", async () => {
    mockApi({ [`GET ${basePath}`]: networkError() });

    await expect(list()).rejects.toThrow("Failed to fetch");
  });

  it("criação: faz POST com JSON e devolve o registro criado", async () => {
    const api = mockApi({ [`POST ${basePath}`]: reply(201, { id: "novo", ...payload }) });

    await expect(call(create, payload)).resolves.toEqual({ id: "novo", ...payload });
    expect(api.calls).toEqual([
      {
        method: "POST",
        path: basePath,
        body: payload,
        headers: { "content-type": "application/json" },
      },
    ]);
  });

  it("criação: lança ApiError com a mensagem e o status devolvidos pela API", async () => {
    mockApi({ [`POST ${basePath}`]: reply(409, { error: "Registro duplicado." }) });

    const error = await call(create, payload).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: "Registro duplicado.", status: 409 });
  });

  it("criação: usa a mensagem padrão quando o corpo do erro não é JSON", async () => {
    mockApi({ [`POST ${basePath}`]: replyRaw(500, "<html>erro</html>") });

    await expect(call(create, payload)).rejects.toMatchObject({
      name: "ApiError",
      message: `Não foi possível salvar ${noun}.`,
      status: 500,
    });
  });

  it("criação: usa a mensagem padrão quando o JSON de erro não traz o campo error", async () => {
    mockApi({ [`POST ${basePath}`]: reply(400, { message: "sem campo error" }) });

    await expect(call(create, payload)).rejects.toThrow(`Não foi possível salvar ${noun}.`);
  });

  it("edição: faz PATCH em /:id com JSON e devolve o registro atualizado", async () => {
    const api = mockApi({ [`PATCH ${basePath}/abc`]: { id: "abc", ...payload } });

    await expect(call(patch, "abc", payload)).resolves.toEqual({ id: "abc", ...payload });
    expect(api.calls).toEqual([
      {
        method: "PATCH",
        path: `${basePath}/abc`,
        body: payload,
        headers: { "content-type": "application/json" },
      },
    ]);
  });

  it("edição: lança ApiError com a mensagem da API quando o registro não existe", async () => {
    mockApi({ [`PATCH ${basePath}/abc`]: reply(404, { error: "Não encontrado." }) });

    await expect(call(patch, "abc", payload)).rejects.toMatchObject({
      name: "ApiError",
      message: "Não encontrado.",
      status: 404,
    });
  });

  it("edição: usa a mensagem padrão quando o corpo do erro não é JSON", async () => {
    mockApi({ [`PATCH ${basePath}/abc`]: replyRaw(500, "erro") });

    await expect(call(patch, "abc", payload)).rejects.toThrow(`Não foi possível atualizar ${noun}.`);
  });

  it("exclusão: faz DELETE em /:id e devolve true", async () => {
    const api = mockApi({ [`DELETE ${basePath}/abc`]: { message: "ok" } });

    await expect(remove("abc")).resolves.toBe(true);
    expect(api.calls).toEqual([
      expect.objectContaining({ method: "DELETE", path: `${basePath}/abc`, body: undefined }),
    ]);
  });

  it("exclusão: lança ApiError com a mensagem da API", async () => {
    mockApi({ [`DELETE ${basePath}/abc`]: reply(404, { error: "Não encontrado." }) });

    await expect(remove("abc")).rejects.toMatchObject({
      name: "ApiError",
      message: "Não encontrado.",
      status: 404,
    });
  });

  it("exclusão: usa a mensagem padrão quando o corpo do erro não é JSON", async () => {
    mockApi({ [`DELETE ${basePath}/abc`]: replyRaw(500, "erro") });

    await expect(remove("abc")).rejects.toThrow(`Não foi possível excluir ${noun}.`);
  });
});
