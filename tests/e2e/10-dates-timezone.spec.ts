import { E2E_MONTH, E2E_MONTH_LABEL } from "./support/env";
import { expect, test } from "./support/fixtures";
import {
  card,
  createTransactionViaUi,
  gotoAndWaitForTransactions,
  metric,
  modal,
  money,
  section,
  transactionForm,
  transactionRow,
} from "./support/ui";

/**
 * Regressões de data/fuso (America/Sao_Paulo, UTC-3). Datas de transações e
 * prazos de metas são "só data" gravadas à meia-noite UTC; antes da correção
 * apareciam um dia antes e caíam no mês anterior em telas mensais.
 */
const FIRST_DAY = `${E2E_MONTH}-01`;
const FIRST_DAY_BR = "01/10/2026";

test.describe("Datas e fuso horário — dia 1º do mês", () => {
  test.beforeEach(async ({ page, api }) => {
    await api.createBudget({ category: "Moradia", amount: 2000, month: E2E_MONTH });
    await gotoAndWaitForTransactions(page, "/transactions");
    await createTransactionViaUi(page, {
      description: "Aluguel do dia primeiro",
      amount: "1500",
      category: "Moradia",
      date: FIRST_DAY,
    });
    await expect(transactionRow(page, "Aluguel do dia primeiro")).toBeVisible();
  });

  test("lista mostra exatamente a data digitada", async ({ page, api }) => {
    await expect(transactionRow(page, "Aluguel do dia primeiro")).toContainText(FIRST_DAY_BR);
    expect(String((await api.list("transactions"))[0].date)).toBe(`${FIRST_DAY}T00:00:00.000Z`);

    await page.reload();
    await expect(transactionRow(page, "Aluguel do dia primeiro")).toContainText(FIRST_DAY_BR);
  });

  test("filtro De = Até = dia 1º encontra a transação", async ({ page, api }) => {
    await api.createTransaction({ description: "Véspera", value: 10, type: "outcome", category: "Outros", date: "2026-09-30" });
    await api.createTransaction({ description: "Dia seguinte", value: 10, type: "outcome", category: "Outros", date: `${E2E_MONTH}-02` });
    await gotoAndWaitForTransactions(page, "/transactions");
    await expect(page.getByText("3 registro(s) encontrado(s)")).toBeVisible();

    await page.getByLabel("De", { exact: true }).fill(FIRST_DAY);
    await page.getByLabel("Até", { exact: true }).fill(FIRST_DAY);

    await expect(page.getByText("1 registro(s) encontrado(s)")).toBeVisible();
    await expect(transactionRow(page, "Aluguel do dia primeiro")).toBeVisible();
    await expect(transactionRow(page, "Véspera")).toHaveCount(0);
    await expect(transactionRow(page, "Dia seguinte")).toHaveCount(0);
  });

  test("painel inclui a transação no Resumo do mês", async ({ page }) => {
    await gotoAndWaitForTransactions(page, "/");

    await expect(page.getByText(E2E_MONTH_LABEL)).toBeVisible();
    await expect(metric(page, "Saídas")).toContainText(money(-1500));
    await expect(metric(page, "Movimento do mês")).toContainText("1");
    await expect(metric(page, "Maior despesa")).toContainText("Aluguel do dia primeiro foi a maior saída deste mês.");
    await expect(section(page, "Últimas transações").getByRole("table").locator("tbody tr").first()).toContainText(
      FIRST_DAY_BR,
    );
  });

  test("Categorias conta a transação em Transações no mês", async ({ page }) => {
    await gotoAndWaitForTransactions(page, "/categories");

    const housing = card(page, "Moradia");

    await expect(metric(housing, "Transações no mês")).toContainText("1");
    await expect(metric(housing, "Total no mês")).toContainText(money(1500));
  });

  test("orçamento da categoria no mês soma a transação", async ({ page }) => {
    await gotoAndWaitForTransactions(page, "/planning");

    const budget = card(page, "Moradia");

    await expect(budget).toContainText("75%");
    await expect(metric(budget, "Gasto")).toContainText(money(1500));
    await expect(metric(budget, "Restante")).toContainText(money(500));
  });

  test("Relatórios do mês incluem a transação (e setembro não)", async ({ page }) => {
    await gotoAndWaitForTransactions(page, "/reports");

    await expect(page.getByLabel("Período")).toHaveValue(E2E_MONTH);
    await expect(metric(page, "Despesas")).toContainText(money(-1500));
    await expect(metric(page, "Categoria líder")).toContainText("Moradia");

    await page.getByLabel("Período").fill("2026-09");
    await expect(metric(page, "Despesas")).toContainText(money(0));
    await expect(metric(page, "Categoria líder")).toContainText("Sem dados");
  });
});

test.describe("Datas e fuso horário — metas e edição", () => {
  test("prazo de meta no último dia do mês aparece com o mesmo dia", async ({ page, account }) => {
    void account;
    await page.goto("/planning");
    await page.getByRole("button", { name: "+ Nova meta" }).click();

    const dialog = modal(page, "Nova meta");

    await dialog.getByLabel("Nome da meta").fill("Fechar o ano no azul");
    await dialog.getByLabel("Valor alvo").fill("5000");
    await dialog.getByLabel("Prazo (opcional)").fill("2026-12-31");
    await dialog.getByRole("button", { name: "Salvar meta" }).click();

    await expect(card(page, "Fechar o ano no azul")).toContainText("Prazo: 31/12/2026");

    await page.reload();
    await expect(card(page, "Fechar o ano no azul")).toContainText("Prazo: 31/12/2026");

    await card(page, "Fechar o ano no azul").getByRole("button", { name: "Atualizar progresso" }).click();
    await expect(modal(page, "Atualizar meta").getByLabel("Prazo (opcional)")).toHaveValue("2026-12-31");
  });

  test("editar só a descrição de uma transação de mês anterior preserva a data", async ({ page, api }) => {
    await api.createTransaction({ description: "IPVA", value: 900, type: "outcome", category: "Transporte", date: "2026-08-31" });
    await gotoAndWaitForTransactions(page, "/transactions");
    await expect(transactionRow(page, "IPVA")).toContainText("31/08/2026");

    await transactionRow(page, "IPVA").getByRole("button", { name: "Editar" }).click();

    const form = transactionForm(page);

    await expect(form.getByLabel("Data")).toHaveValue("2026-08-31");
    await form.getByLabel("Descrição").fill("IPVA parcela única");
    await form.getByRole("button", { name: "Salvar alterações" }).click();

    await expect(transactionRow(page, "IPVA parcela única")).toContainText("31/08/2026");
    expect(String((await api.list("transactions"))[0].date)).toBe("2026-08-31T00:00:00.000Z");

    await page.reload();
    await expect(transactionRow(page, "IPVA parcela única")).toContainText("31/08/2026");
  });
});

test.describe("Datas e fuso horário — 22h30 do último dia do mês em Brasília", () => {
  // 31/10/2026 22:30 em São Paulo = 01/11/2026 01:30 UTC.
  test.use({ clockNow: "2026-11-01T01:30:00.000Z" });

  test("formulário de nova transação sugere o dia local de hoje", async ({ page, account }) => {
    void account;
    await gotoAndWaitForTransactions(page, "/transactions");
    await page.getByRole("button", { name: "+ Nova Transação" }).click();

    await expect(transactionForm(page).getByLabel("Data")).toHaveValue("2026-10-31");
  });

  test("transação criada com a data sugerida entra no mês local corrente", async ({ page, account }) => {
    void account;
    await gotoAndWaitForTransactions(page, "/");
    await createTransactionViaUi(page, { description: "Pizza de Halloween", amount: "90", category: "Lazer" });

    await expect(page.getByText(E2E_MONTH_LABEL)).toBeVisible();
    await expect(metric(page, "Saídas")).toContainText(money(-90));
    await expect(metric(page, "Movimento do mês")).toContainText("1");
    await expect(section(page, "Últimas transações").getByRole("table").locator("tbody tr").first()).toContainText(
      "31/10/2026",
    );
  });

  test("telas mensais continuam em outubro", async ({ page, account }) => {
    void account;
    await page.goto("/planning");
    await expect(page.getByRole("heading", { name: `Orçamentos — ${E2E_MONTH_LABEL}` })).toBeVisible();

    await page.getByRole("button", { name: "+ Novo orçamento" }).click();
    await expect(modal(page, "Novo orçamento").getByLabel("Mês")).toHaveValue(E2E_MONTH);
    await page.keyboard.press("Escape");
    await expect(modal(page, "Novo orçamento")).toBeHidden();

    await page.goto("/reports");
    await expect(page.getByLabel("Período")).toHaveValue(E2E_MONTH);
    await expect(section(page, "Evolução do saldo").locator("article").last()).toContainText("out. de 2026");

    await page.goto("/investments");
    await expect(section(page, "Evolução dos aportes").getByText("out. de 2026")).toBeVisible();
  });
});
