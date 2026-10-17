import type { Page } from "@playwright/test";
import { E2E_MONTH, E2E_MONTH_LABEL } from "./support/env";
import { expect, test } from "./support/fixtures";
import { createTransactionViaUi, gotoAndWaitForTransactions, ledger, money } from "./support/ui";

const day = (dayOfMonth: number) => `${E2E_MONTH}-${String(dayOfMonth).padStart(2, "0")}`;

function summary(page: Page) {
  return page.getByRole("region", { name: "Sobra do mês" });
}

function triad(page: Page, label: "Entrou" | "Saiu" | "Investiu") {
  return summary(page).locator("dt", { hasText: label }).locator("xpath=following-sibling::dd[1]");
}

function ledgerSection(page: Page, title: string) {
  return page.getByRole("main").locator("section").filter({
    has: page.getByRole("heading", { name: title, level: 2, exact: true }),
  });
}

function latestRows(page: Page) {
  return ledgerSection(page, "Últimos lançamentos").getByRole("button", { name: /\. Editar$/ });
}

test.describe("Mês (página inicial)", () => {
  test("usuário novo vê o mês zerado com convites", async ({ page, account }) => {
    void account;
    await gotoAndWaitForTransactions(page, "/");

    await expect(page.getByRole("heading", { name: E2E_MONTH_LABEL, level: 1 })).toBeVisible();
    await expect(summary(page)).toContainText(money(0));
    await expect(triad(page, "Entrou")).toHaveText("0,00");
    await expect(page.getByText("Nada registrado em outubro.")).toBeVisible();
    await expect(page.getByText("Nenhum orçamento para outubro.")).toBeVisible();
    await expect(page.getByRole("link", { name: /A fatura de outubro ainda não foi importada/ })).toBeVisible();
  });

  test("sobra, trio do mês e saldo acumulado refletem os lançamentos", async ({ page, api }) => {
    await api.createTransaction({ description: "Salário", value: 5000, type: "income", category: "Salário", date: day(10) });
    await api.createTransaction({ description: "Aluguel", value: 1200, type: "outcome", category: "Moradia", date: day(5) });
    await api.createTransaction({ description: "Feira", value: 300, type: "outcome", category: "Alimentação", date: day(8) });
    await api.createTransaction({ description: "Aporte ações", value: 1000, type: "investment", category: "Ações", date: day(12) });
    // Mês anterior: entra no saldo acumulado, não no mês corrente.
    await api.createTransaction({ description: "Freela setembro", value: 2000, type: "income", category: "Freelance", date: "2026-09-10" });
    await api.createTransaction({ description: "Show setembro", value: 500, type: "outcome", category: "Lazer", date: "2026-09-12" });

    await gotoAndWaitForTransactions(page, "/");

    await expect(triad(page, "Entrou")).toHaveText("5.000,00");
    await expect(triad(page, "Saiu")).toHaveText("1.500,00");
    await expect(triad(page, "Investiu")).toHaveText("1.000,00");
    await expect(summary(page)).toContainText(money(2500));
    await expect(summary(page).getByText("Saldo acumulado")).toContainText(money(4000));

    await page.getByRole("button", { name: "Mês anterior" }).click();
    await expect(page.getByRole("heading", { name: "setembro de 2026", level: 1 })).toBeVisible();
    await expect(triad(page, "Entrou")).toHaveText("2.000,00");
    await expect(triad(page, "Saiu")).toHaveText("500,00");
    await expect(summary(page)).toContainText(money(1500));
    await expect(latestRows(page)).toHaveText([/Show setembro/, /Freela setembro/]);
  });

  test("últimos lançamentos mostra os 7 mais recentes do mês em ordem", async ({ page, api }) => {
    const names = ["Um", "Dois", "Três", "Quatro", "Cinco", "Seis", "Sete", "Oito"];

    for (const [index, name] of names.entries()) {
      await api.createTransaction({
        description: `Compra ${name}`,
        value: 10 * (index + 1),
        type: "outcome",
        category: "Outros",
        date: day(index + 2),
      });
    }

    await gotoAndWaitForTransactions(page, "/");

    await expect(latestRows(page)).toHaveText([
      /Compra Oito/,
      /Compra Sete/,
      /Compra Seis/,
      /Compra Cinco/,
      /Compra Quatro/,
      /Compra Três/,
      /Compra Dois/,
    ]);
    await expect(latestRows(page).first()).toContainText(ledger(-80));
    await expect(latestRows(page).first()).toContainText("Outros · sex., 9 de out.");
    await expect(ledgerSection(page, "Últimos lançamentos").getByText("Compra Um")).toHaveCount(0);

    await ledgerSection(page, "Últimos lançamentos").getByRole("link", { name: "Ver todos" }).click();
    await expect(page).toHaveURL(/\/transactions$/);
  });

  test("lançamento criado pela folha Registrar atualiza o mês sem recarregar", async ({ page, api }) => {
    await api.createTransaction({ description: "Salário", value: 3000, type: "income", category: "Salário", date: day(5) });
    await gotoAndWaitForTransactions(page, "/");
    await expect(summary(page)).toContainText(money(3000));

    await createTransactionViaUi(page, {
      description: "Conta de internet",
      amount: "120",
      category: "Contas",
      date: day(14),
    });

    await expect(triad(page, "Saiu")).toHaveText("120,00");
    await expect(summary(page)).toContainText(money(2880));
    await expect(latestRows(page).first()).toContainText("Conta de internet");

    await page.reload();
    await expect(summary(page)).toContainText(money(2880));
  });

  test("orçamentos do mês aparecem do mais usado ao menos usado", async ({ page, api }) => {
    await api.createTransaction({ description: "Aluguel", value: 1500, type: "outcome", category: "Moradia", date: day(5) });
    await api.createTransaction({ description: "Feira", value: 450, type: "outcome", category: "Alimentação", date: day(8) });
    await api.createBudget({ category: "Alimentação", amount: 500, month: E2E_MONTH });
    await api.createBudget({ category: "Moradia", amount: 1200, month: E2E_MONTH });
    await api.createBudget({ category: "Lazer", amount: 300, month: E2E_MONTH });

    await gotoAndWaitForTransactions(page, "/");

    const bars = ledgerSection(page, "Orçamentos").getByRole("progressbar");

    await expect(bars).toHaveCount(3);
    expect(await bars.evaluateAll((items) => items.map((item) => item.getAttribute("aria-label")))).toEqual([
      "Moradia: 100%",
      "Alimentação: 90%",
      "Lazer: 0%",
    ]);
    await expect(ledgerSection(page, "Orçamentos")).toContainText("1.500,00 de 1.200,00");
  });

  test("tocar num lançamento do mês abre a edição", async ({ page, api }) => {
    await api.createTransaction({ description: "Padaria", value: 18, type: "outcome", category: "Alimentação", date: day(9) });
    await gotoAndWaitForTransactions(page, "/");

    await latestRows(page).first().click();

    await expect(page.getByRole("dialog", { name: "Editar lançamento" }).getByLabel("Descrição")).toHaveValue("Padaria");
  });

  test("navegação principal leva a todas as áreas do app", async ({ page, account }) => {
    void account;
    await page.goto("/");

    const destinations: Array<[string, RegExp, string | RegExp]> = [
      ["Lançamentos", /\/transactions$/, "Lançamentos"],
      ["Importar fatura", /\/import$/, "Importar fatura"],
      ["Categorias e regras", /\/categories$/, "Categorias e regras"],
      ["Investimentos", /\/investments$/, "Investimentos"],
      ["Planejar", /\/planning$/, "Planejar"],
      ["Relatórios", /\/reports$/, "Relatórios"],
      ["Configurações", /\/settings$/, "Configurações"],
      ["Mês", /localhost:\d+\/$/, E2E_MONTH_LABEL],
    ];

    for (const [label, url, heading] of destinations) {
      await page.getByRole("link", { name: label, exact: true }).filter({ visible: true }).first().click();
      await expect(page).toHaveURL(url);
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    }
  });
});
