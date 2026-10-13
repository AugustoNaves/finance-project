import { createHmac } from "node:crypto";
import { E2E_MONTH } from "./support/env";
import { expect, newSession, test, type ApiRecord, type Session } from "./support/fixtures";
import { gotoAndWaitForTransactions, metric, money, section } from "./support/ui";

type Owned = { transaction: ApiRecord; category: ApiRecord; budget: ApiRecord; goal: ApiRecord };

test.describe("Isolamento entre usuários", () => {
  let other: Session;
  let owned: Owned;

  test.beforeEach(async ({ api, browser }) => {
    owned = {
      transaction: await api.createTransaction({
        description: "Segredo da conta A",
        value: 1234,
        type: "outcome",
        category: "Moradia",
        date: `${E2E_MONTH}-10`,
      }),
      category: await api.createCategory({ name: "Categoria privada A", type: "outcome" }),
      budget: await api.createBudget({ category: "Moradia", amount: 2000, month: E2E_MONTH }),
      goal: await api.createGoal({ name: "Meta privada A", targetAmount: 9000, currentAmount: 900 }),
    };
    other = await newSession(browser, { name: "Usuário B" });
  });

  test.afterEach(async () => {
    await other.context.close();
  });

  test("usuário B não vê nenhum dado do usuário A na interface", async () => {
    const { page } = other;

    await gotoAndWaitForTransactions(page, "/");
    await expect(metric(page, "Saldo Total")).toContainText(money(0));
    await expect(page.getByText("Nenhuma transação registrada ainda.")).toBeVisible();
    await expect(metric(page, "Meta mais próxima")).toContainText("Sem metas");

    await gotoAndWaitForTransactions(page, "/transactions");
    await expect(page.getByText("0 registro(s) encontrado(s)")).toBeVisible();
    await expect(page.getByText("Segredo da conta A")).toHaveCount(0);

    await page.goto("/categories");
    await expect(section(page, "Despesas").getByText("9 categoria(s)")).toBeVisible();
    await expect(page.getByText("Categoria privada A")).toHaveCount(0);

    await page.goto("/planning");
    await expect(page.getByText("Nenhum orçamento cadastrado para este mês.")).toBeVisible();
    await expect(page.getByText("Nenhuma meta cadastrada ainda.")).toBeVisible();
    await expect(page.getByText("Meta privada A")).toHaveCount(0);

    await gotoAndWaitForTransactions(page, "/reports");
    await expect(metric(page, "Maior despesa")).toContainText("Sem dados");

    await gotoAndWaitForTransactions(page, "/settings");
    await expect(metric(page, "E-mail")).toContainText(other.account.email);
    await expect(metric(page, "Transações carregadas")).toContainText("0");
  });

  test("usuário A continua vendo os próprios dados", async ({ page, account }) => {
    await gotoAndWaitForTransactions(page, "/transactions");
    await expect(page.getByRole("row").filter({ hasText: "Segredo da conta A" })).toBeVisible();

    await page.goto("/settings");
    await expect(metric(page, "E-mail")).toContainText(account.email);
  });

  test("listagens da API do usuário B não incluem registros do usuário A", async () => {
    expect(await other.api.list("transactions")).toEqual([]);
    expect(await other.api.list("budgets")).toEqual([]);
    expect(await other.api.list("goals")).toEqual([]);

    const categories = await other.api.list("categories");

    expect(categories).toHaveLength(18);
    expect(categories.map((category) => category.name)).not.toContain("Categoria privada A");
    expect(categories.map((category) => category.id)).not.toContain(owned.category.id);

    const me = await other.context.request.get("/api/me");

    expect(((await me.json()) as { user: { email: string } }).user.email).toBe(other.account.email);
  });

  test("PATCH e DELETE do usuário B em registros do usuário A respondem 404 e nada muda", async ({ api }) => {
    const request = other.context.request;
    const attempts: Array<[string, Record<string, unknown>]> = [
      [
        `/api/transactions/${owned.transaction.id}`,
        { description: "Invadido", amount: -1, category: "Moradia", type: "outcome", date: `${E2E_MONTH}-10` },
      ],
      [`/api/categories/${owned.category.id}`, { name: "Invadida", type: "outcome" }],
      [`/api/budgets/${owned.budget.id}`, { category: "Moradia", amount: 1, month: E2E_MONTH }],
      [`/api/goals/${owned.goal.id}`, { name: "Invadida", targetAmount: 1, currentAmount: 1 }],
    ];

    for (const [url, data] of attempts) {
      expect((await request.patch(url, { data })).status(), `PATCH ${url}`).toBe(404);
      expect((await request.delete(url)).status(), `DELETE ${url}`).toBe(404);
    }

    expect(await api.list("transactions")).toEqual([
      expect.objectContaining({ id: owned.transaction.id, description: "Segredo da conta A", amount: -1234 }),
    ]);
    expect(await api.list("budgets")).toEqual([expect.objectContaining({ id: owned.budget.id, amount: 2000 })]);
    expect(await api.list("goals")).toEqual([
      expect.objectContaining({ id: owned.goal.id, name: "Meta privada A", targetAmount: 9000 }),
    ]);
    expect(await api.list("categories")).toContainEqual(
      expect.objectContaining({ id: owned.category.id, name: "Categoria privada A" }),
    );
  });

  test("unicidade de categoria e orçamento é por usuário", async () => {
    // B pode ter categoria e orçamento com os mesmos nomes/mês usados por A.
    const category = await other.api.createCategory({ name: "Categoria privada A", type: "outcome" });
    const budget = await other.api.createBudget({ category: "Moradia", amount: 700, month: E2E_MONTH });

    expect(category.id).not.toBe(owned.category.id);
    expect(budget.id).not.toBe(owned.budget.id);
    expect(await other.api.list("budgets")).toHaveLength(1);
  });

  test("sessão assinada com outro segredo não acessa os dados", async ({ account, playwright, baseURL }) => {
    const payload = Buffer.from(
      JSON.stringify({ userId: account.id, email: account.email, exp: Math.floor(Date.now() / 1000) + 3600 }),
    ).toString("base64url");
    const forged = `${payload}.${createHmac("sha256", "segredo-errado-com-mais-de-32-caracteres!").update(payload).digest("base64url")}`;
    const anonymous = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { cookie: `session_token=${forged}` },
    });

    expect((await anonymous.get("/api/transactions")).status()).toBe(401);
    expect((await anonymous.get("/api/me")).status()).toBe(401);
    expect((await anonymous.delete(`/api/transactions/${owned.transaction.id}`)).status()).toBe(401);
    await anonymous.dispose();
  });
});

test("histórico de migrations não deixa índice único global de orçamentos (categoria+mês sem usuário)", async () => {
  expect(process.env.E2E_LEGACY_BUDGET_INDEX, "índice budgets_category_month_key criado pelas migrations").toBeUndefined();
});
