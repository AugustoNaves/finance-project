import { E2E_MONTH, E2E_MONTH_LABEL } from "./support/env";
import { expect, test } from "./support/fixtures";
import type { Page } from "@playwright/test";
import {
  createTransactionViaUi,
  entryCount,
  gotoAndWaitForTransactions,
  modal,
  money,
  openRegister,
  openTransaction,
  section,
  transactionForm,
  transactionRow,
} from "./support/ui";

/** Linha "rótulo → valor" de uma lista de definições (Mês, Relatórios). */
function line(page: Page, label: string) {
  return page
    .getByRole("main")
    .locator("dl > div")
    .filter({ has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }) });
}

function latestRows(page: Page) {
  return section(page, "Últimos lançamentos").getByRole("button", { name: /\. Editar$/ });
}

function listItemWith(page: Page, scope: string, buttonName: string) {
  return section(page, scope)
    .getByRole("listitem")
    .filter({ has: page.getByRole("button", { name: buttonName, exact: true }) });
}

/**
 * Regressões de data/fuso (America/Sao_Paulo, UTC-3). Datas de transações e
 * prazos de metas são "só data" gravadas à meia-noite UTC; antes da correção
 * apareciam um dia antes e caíam no mês anterior em telas mensais.
 */
const FIRST_DAY = `${E2E_MONTH}-01`;
const FIRST_DAY_HEADING = "qui., 1 de out.";

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
    const firstDay = page.getByRole("list", { name: FIRST_DAY_HEADING });

    await expect(firstDay).toContainText("Aluguel do dia primeiro");
    expect(String((await api.list("transactions"))[0].date)).toBe(`${FIRST_DAY}T00:00:00.000Z`);

    await page.reload();
    await expect(firstDay).toContainText("Aluguel do dia primeiro");
  });

  test("filtro De = Até = dia 1º encontra a transação", async ({ page, api }) => {
    await api.createTransaction({ description: "Véspera", value: 10, type: "outcome", category: "Outros", date: "2026-09-30" });
    await api.createTransaction({ description: "Dia seguinte", value: 10, type: "outcome", category: "Outros", date: `${E2E_MONTH}-02` });
    await gotoAndWaitForTransactions(page, "/transactions");
    await expect(entryCount(page, 3)).toBeVisible();

    await page.getByRole("button", { name: /^Filtros/ }).click();
    await page.getByLabel("De", { exact: true }).fill(FIRST_DAY);
    await page.getByLabel("Até", { exact: true }).fill(FIRST_DAY);

    await expect(entryCount(page, 1)).toBeVisible();
    await expect(transactionRow(page, "Aluguel do dia primeiro")).toBeVisible();
    await expect(transactionRow(page, "Véspera")).toHaveCount(0);
    await expect(transactionRow(page, "Dia seguinte")).toHaveCount(0);
  });

  test("Mês inclui o lançamento no mês corrente", async ({ page }) => {
    await gotoAndWaitForTransactions(page, "/");

    await expect(page.getByRole("heading", { name: E2E_MONTH_LABEL, level: 1 })).toBeVisible();
    await expect(line(page, "Saiu")).toContainText("1.500,00");
    await expect(page.getByRole("region", { name: "Sobra do mês" })).toContainText(`−${money(1500)}`);
    await expect(latestRows(page).first()).toContainText(`Moradia · ${FIRST_DAY_HEADING}`);
  });

  test("Categorias conta o lançamento no mês", async ({ page }) => {
    await gotoAndWaitForTransactions(page, "/categories");

    const housing = page.getByRole("tabpanel").getByRole("button", { name: /^Moradia, / });

    await expect(housing).toContainText("1 lançamento");
    await expect(housing).toContainText(money(1500));
  });

  test("orçamento da categoria no mês soma o lançamento", async ({ page }) => {
    await gotoAndWaitForTransactions(page, "/planning");

    const budget = listItemWith(page, "Orçamentos", "Editar orçamento de Moradia");

    await expect(budget).toContainText("75%");
    await expect(budget).toContainText("1.500,00 de 2.000,00");
    await expect(budget).toContainText(`restam ${money(500)}`);
  });

  test("Relatórios do mês incluem o lançamento (e setembro não)", async ({ page }) => {
    await gotoAndWaitForTransactions(page, "/reports");

    await expect(page.getByLabel("Período")).toHaveValue(E2E_MONTH);
    await expect(line(page, "Despesas")).toContainText(`−${money(1500)}`);
    await expect(line(page, "Categoria líder")).toContainText("Moradia");

    await page.getByLabel("Período").fill("2026-09");
    await expect(line(page, "Despesas")).toContainText(money(0));
    await expect(line(page, "Categoria líder")).toContainText("Sem dados");
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

    const goal = listItemWith(page, "Metas", "Editar meta Fechar o ano no azul");

    await expect(goal).toContainText("prazo 31/12/2026");

    await page.reload();
    await expect(goal).toContainText("prazo 31/12/2026");

    await goal.getByRole("button", { name: "Atualizar progresso de Fechar o ano no azul" }).click();
    await expect(modal(page, "Atualizar progresso").getByLabel("Prazo (opcional)")).toHaveValue("2026-12-31");
  });

  test("editar só a descrição de um lançamento de mês anterior preserva a data", async ({ page, api }) => {
    await api.createTransaction({ description: "IPVA", value: 900, type: "outcome", category: "Transporte", date: "2026-08-31" });
    await gotoAndWaitForTransactions(page, "/transactions");

    const lastOfAugust = page.getByRole("list", { name: "seg., 31 de ago." });

    await expect(lastOfAugust).toContainText("IPVA");

    await openTransaction(page, "IPVA");

    const form = transactionForm(page);

    await expect(form.getByLabel("Data")).toHaveValue("2026-08-31");
    await form.getByLabel("Descrição").fill("IPVA parcela única");
    await form.getByRole("button", { name: "Salvar alterações" }).click();

    await expect(lastOfAugust).toContainText("IPVA parcela única");
    expect(String((await api.list("transactions"))[0].date)).toBe("2026-08-31T00:00:00.000Z");

    await page.reload();
    await expect(lastOfAugust).toContainText("IPVA parcela única");
  });
});

test.describe("Datas e fuso horário — 22h30 do último dia do mês em Brasília", () => {
  // 31/10/2026 22:30 em São Paulo = 01/11/2026 01:30 UTC.
  test.use({ clockNow: "2026-11-01T01:30:00.000Z" });

  test("folha Registrar sugere o dia local de hoje", async ({ page, account }) => {
    void account;
    await gotoAndWaitForTransactions(page, "/transactions");
    await openRegister(page);

    await expect(transactionForm(page).getByLabel("Data")).toHaveValue("2026-10-31");
  });

  test("lançamento criado com a data sugerida entra no mês local corrente", async ({ page, account }) => {
    void account;
    await gotoAndWaitForTransactions(page, "/");
    await createTransactionViaUi(page, { description: "Pizza de Halloween", amount: "90", category: "Lazer" });

    await expect(page.getByRole("heading", { name: E2E_MONTH_LABEL, level: 1 })).toBeVisible();
    await expect(line(page, "Saiu")).toContainText("90,00");
    await expect(latestRows(page)).toHaveCount(1);
    await expect(latestRows(page).first()).toContainText("Lazer · sáb., 31 de out.");
  });

  test("telas mensais continuam em outubro", async ({ page, account }) => {
    void account;
    await page.goto("/planning");
    await expect(page.getByRole("main").locator("#planning-month-filter")).toHaveValue(E2E_MONTH);

    await page.getByRole("button", { name: "+ Novo orçamento" }).click();
    await expect(modal(page, "Novo orçamento").getByLabel("Mês")).toHaveValue(E2E_MONTH);
    await page.keyboard.press("Escape");
    await expect(modal(page, "Novo orçamento")).toBeHidden();

    await page.goto("/reports");
    await expect(page.getByLabel("Período")).toHaveValue(E2E_MONTH);
    await expect(
      section(page, "Evolução do saldo").getByRole("list", { name: "Saldo por mês" }).getByRole("listitem").last(),
    ).toContainText(/out/);

    await page.goto("/investments");
    await expect(section(page, "Evolução dos aportes").getByText("out.", { exact: true })).toBeVisible();
  });
});
