import fs from "node:fs/promises";
import type { Locator, Page } from "@playwright/test";
import { E2E_MONTH } from "./support/env";
import { expect, test } from "./support/fixtures";
import {
  categoryChoices,
  confirmDeletion,
  entryCount,
  fillTransactionForm,
  gotoAndWaitForTransactions,
  ledger,
  metric,
  modal,
  money,
  openTransaction,
  section,
  transactionRow,
} from "./support/ui";

const day = (dayOfMonth: number) => `${E2E_MONTH}-${String(dayOfMonth).padStart(2, "0")}`;
const charts = (scope: Page | Locator) => scope.locator("svg.recharts-surface");
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Valor com o sinal de saída usado no app ("−R$ 1.200,00"). */
const out = (value: number) => `−${money(value)}`;

/** Linha "rótulo → valor" de uma lista de definições (folha de balanço, perfil). */
function line(page: Page, label: string) {
  return page
    .getByRole("main")
    .locator("dl > div")
    .filter({ has: page.locator("dt", { hasText: new RegExp(`^${escape(label)}$`) }) });
}

async function seedMonthData(api: import("./support/fixtures").Api) {
  await api.createTransaction({ description: "Salário", value: 5000, type: "income", category: "Salário", date: day(10) });
  await api.createTransaction({ description: "Aluguel", value: 1200, type: "outcome", category: "Moradia", date: day(5) });
  await api.createTransaction({ description: "Feira", value: 300, type: "outcome", category: "Alimentação", date: day(8) });
  await api.createTransaction({ description: "Aporte ações", value: 1000, type: "investment", category: "Ações", date: day(12) });
  await api.createTransaction({ description: "Freela setembro", value: 2000, type: "income", category: "Freelance", date: "2026-09-10" });
  await api.createTransaction({ description: "Show setembro", value: 500, type: "outcome", category: "Lazer", date: "2026-09-12" });
}

test.describe("Investimentos", () => {
  test("estado vazio mostra totais zerados e o gráfico dos últimos 6 meses", async ({ page, account }) => {
    void account;
    await gotoAndWaitForTransactions(page, "/investments");

    await expect(page.getByRole("heading", { name: "Investimentos", level: 1 })).toBeVisible();
    await expect(metric(page, "Total investido")).toContainText(money(0));
    await expect(metric(page, "Aportes no mês")).toContainText(money(0));
    await expect(page.getByText("Nenhum aporte registrado ainda.")).toBeVisible();
    await expect(page.getByText("Nenhum aporte registrado.")).toBeVisible();

    const chart = section(page, "Evolução dos aportes");

    await expect(charts(chart)).toBeVisible();
    await expect(chart.locator(".recharts-line-dot")).toHaveCount(6);
    await expect(chart.getByText("mai.", { exact: true })).toBeVisible();
    await expect(chart.getByText("out.", { exact: true })).toBeVisible();
  });

  test("totais, distribuição e lista consideram apenas lançamentos de investimento", async ({ page, api }) => {
    await api.createTransaction({ description: "Tesouro Selic", value: 1000, type: "investment", category: "Renda Fixa", date: day(6) });
    await api.createTransaction({ description: "ETF global", value: 500, type: "investment", category: "Fundos", date: day(13) });
    await api.createTransaction({ description: "Bitcoin setembro", value: 300, type: "investment", category: "Criptomoedas", date: "2026-09-15" });
    await api.createTransaction({ description: "Mercado", value: 200, type: "outcome", category: "Alimentação", date: day(7) });
    await api.createTransaction({ description: "Salário", value: 4000, type: "income", category: "Salário", date: day(5) });

    await gotoAndWaitForTransactions(page, "/investments");

    await expect(metric(page, "Total investido")).toContainText(money(1800));
    await expect(metric(page, "Aportes no mês")).toContainText(money(1500));
    await expect(entryCount(page, 3)).toBeVisible();
    await expect(transactionRow(page, "Tesouro Selic")).toContainText(ledger(-1000));
    await expect(page.getByRole("list", { name: /15 de set/ })).toContainText("Bitcoin setembro");
    await expect(transactionRow(page, "Mercado")).toHaveCount(0);
    await expect(transactionRow(page, "Salário")).toHaveCount(0);

    const categories = section(page, "Por categoria").getByRole("listitem");

    await expect(categories).toHaveCount(3);
    await expect(categories.first()).toContainText("Renda Fixa");
    await expect(categories.first()).toContainText("56% do total");
    await expect(charts(section(page, "Evolução dos aportes")).locator(".recharts-line-dot")).toHaveCount(6);
  });

  test("Novo aporte abre a folha com Investimento pré-selecionado e atualiza a página", async ({ page, api }) => {
    await gotoAndWaitForTransactions(page, "/investments");
    await page.getByRole("main").getByRole("button", { name: "Novo aporte" }).click();

    const dialog = modal(page, "Novo aporte");

    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("radio", { name: "Investimento" })).toHaveAttribute("aria-checked", "true");

    const chips = categoryChoices(page);

    await expect(chips).toHaveCount(5);
    for (const name of ["Ações", "Criptomoedas", "Fundos", "Outros", "Renda Fixa"]) {
      await expect(chips.filter({ hasText: name })).toHaveCount(1);
    }

    await fillTransactionForm(page, { description: "Aporte mensal", amount: "750", category: "Fundos", date: day(14) });
    await dialog.getByRole("button", { name: "Salvar", exact: true }).click();

    await expect(dialog).toBeHidden();
    await expect(transactionRow(page, "Aporte mensal")).toContainText(ledger(-750));
    await expect(metric(page, "Total investido")).toContainText(money(750));
    await expect(metric(page, "Aportes no mês")).toContainText(money(750));
    expect((await api.list("transactions"))[0]).toMatchObject({ type: "investment", amount: -750, category: "Fundos" });
  });

  test("edita e exclui um aporte tocando na linha", async ({ page, api }) => {
    await api.createTransaction({ description: "CDB banco", value: 2000, type: "investment", category: "Renda Fixa", date: day(6) });
    await gotoAndWaitForTransactions(page, "/investments");

    const editor = await openTransaction(page, "CDB banco");

    await editor.getByLabel("Valor").fill("2500");
    await editor.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(editor).toBeHidden();
    await expect(metric(page, "Total investido")).toContainText(money(2500));

    await (await openTransaction(page, "CDB banco")).getByRole("button", { name: "Excluir" }).click();
    await confirmDeletion(page);

    await expect(transactionRow(page, "CDB banco")).toHaveCount(0);
    await expect(metric(page, "Total investido")).toContainText(money(0));
    expect(await api.list("transactions")).toHaveLength(0);
  });
});

test.describe("Relatórios", () => {
  test("estado vazio", async ({ page, account }) => {
    void account;
    await gotoAndWaitForTransactions(page, "/reports");

    await expect(page.getByRole("heading", { name: "Relatórios", level: 1 })).toBeVisible();
    await expect(page.getByLabel("Período")).toHaveValue(E2E_MONTH);
    await expect(line(page, "Receitas")).toContainText(money(0));
    await expect(line(page, "Maior despesa")).toContainText("Sem dados");
    await expect(line(page, "Categoria líder")).toContainText("Sem dados");
    await expect(line(page, "Taxa de economia")).toContainText("Sem receitas");
    await expect(line(page, "Movimento do período")).toContainText("0 lançamentos");
    await expect(page.getByText("Nenhuma despesa encontrada neste período.")).toBeVisible();
    await expect(page.getByText("0 categorias")).toBeVisible();
  });

  test("folha de balanço, gráficos e quebras refletem o mês selecionado", async ({ page, api }) => {
    await seedMonthData(api);
    await gotoAndWaitForTransactions(page, "/reports");

    await expect(line(page, "Receitas")).toContainText(money(5000));
    await expect(line(page, "Despesas")).toContainText(out(1500));
    await expect(line(page, "Investimentos")).toContainText(out(1000));
    await expect(line(page, "Saldo")).toContainText(money(2500));
    await expect(line(page, "Maior despesa")).toContainText(out(1200));
    await expect(line(page, "Maior despesa")).toContainText("Aluguel");
    await expect(line(page, "Categoria líder")).toContainText("Moradia");
    // Mês corrente: média pelos dias já decorridos (hoje é dia 15 no relógio do teste).
    await expect(line(page, "Média diária")).toContainText(money(1500 / 15));
    await expect(line(page, "Taxa de economia")).toContainText("50%");
    await expect(line(page, "Movimento do período")).toContainText("4 lançamentos");

    const bars = section(page, "Receitas vs despesas");
    const balance = section(page, "Evolução do saldo");

    await expect(charts(page)).toHaveCount(2);
    await expect(bars.getByText("out.", { exact: true })).toBeVisible();
    await expect(bars.locator(".recharts-bar-rectangle path, .recharts-bar-rectangle rect")).not.toHaveCount(0);
    await expect(balance.locator(".recharts-line-dot")).toHaveCount(6);

    const breakdown = section(page, "Gastos por categoria");

    await expect(breakdown.getByText("2 categorias")).toBeVisible();
    await expect(breakdown).toContainText("80% das despesas");
    await expect(breakdown).toContainText("20% das despesas");
    await expect(breakdown).toContainText(money(1200));

    const evolution = balance.getByRole("list", { name: "Saldo por mês" }).getByRole("listitem");

    await expect(evolution).toHaveCount(6);
    await expect(evolution.nth(4)).toContainText("set. de 2026");
    await expect(evolution.nth(4)).toContainText(money(1500));
    await expect(evolution.nth(5)).toContainText("out. de 2026");
    await expect(evolution.nth(5)).toContainText(money(2500));
  });

  test("filtro de período troca o mês analisado (campo e setas)", async ({ page, api }) => {
    await seedMonthData(api);
    await gotoAndWaitForTransactions(page, "/reports");
    await expect(line(page, "Receitas")).toContainText(money(5000));

    await page.getByLabel("Período").fill("2026-09");

    await expect(line(page, "Receitas")).toContainText(money(2000));
    await expect(line(page, "Despesas")).toContainText(out(500));
    await expect(line(page, "Saldo")).toContainText(money(1500));
    await expect(line(page, "Categoria líder")).toContainText("Lazer");
    // Mês passado: média pelos 30 dias de setembro.
    await expect(line(page, "Média diária")).toContainText(money(500 / 30));
    await expect(page.getByRole("list", { name: "Saldo por mês" }).getByRole("listitem").last()).toContainText("set. de 2026");

    await page.getByRole("button", { name: "Próximo mês" }).click();

    await expect(page.getByLabel("Período")).toHaveValue(E2E_MONTH);
    await expect(line(page, "Receitas")).toContainText(money(5000));

    await page.getByLabel("Período").fill("2026-01");

    await expect(line(page, "Maior despesa")).toContainText("Sem dados");
    await expect(page.getByText("Nenhuma despesa encontrada neste período.")).toBeVisible();
  });
});

test.describe("Configurações", () => {
  test("perfil mostra os dados da conta e o resumo dos lançamentos", async ({ page, api, account }) => {
    await seedMonthData(api);
    await gotoAndWaitForTransactions(page, "/settings");

    await expect(page.getByRole("heading", { name: "Configurações", level: 1 })).toBeVisible();
    await expect(line(page, "Nome")).toContainText(account.name);
    await expect(line(page, "E-mail")).toContainText(account.email);
    await expect(line(page, "Moeda")).toContainText("Real brasileiro (BRL)");
    await expect(line(page, "Lançamentos")).toContainText("6");
    await expect(line(page, "Saldo acumulado")).toContainText(money(4000));
  });

  test("exporta as transações em JSON", async ({ page, api }) => {
    await seedMonthData(api);
    await gotoAndWaitForTransactions(page, "/settings");
    await expect(line(page, "Lançamentos")).toContainText("6");

    const downloadPromise = page.waitForEvent("download");

    await page.getByRole("button", { name: "Exportar JSON" }).click();

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("transacoes.json");

    const exported = JSON.parse(await fs.readFile(await download.path(), "utf-8")) as Array<Record<string, unknown>>;

    expect(exported).toHaveLength(6);
    expect(exported).toContainEqual(
      expect.objectContaining({ description: "Aluguel", amount: -1200, category: "Moradia", type: "outcome" }),
    );
  });

  test("exporta as transações em CSV", async ({ page, api }) => {
    await api.createTransaction({
      description: 'Jantar "especial", com vírgula',
      value: 180.5,
      type: "outcome",
      category: "Lazer",
      date: day(9),
      notes: "Aniversário",
    });
    await api.createTransaction({ description: "Salário", value: 5000, type: "income", category: "Salário", date: day(10) });
    await gotoAndWaitForTransactions(page, "/settings");
    await expect(line(page, "Lançamentos")).toContainText("2");

    const downloadPromise = page.waitForEvent("download");

    await page.getByRole("button", { name: "Exportar CSV" }).click();

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("transacoes.csv");

    const lines = (await fs.readFile(await download.path(), "utf-8")).split("\n");

    expect(lines[0]).toBe("id,description,amount,category,type,paymentMethod,notes,date");
    expect(lines).toHaveLength(3);
    expect(lines.join("\n")).toContain('"Jantar ""especial"", com vírgula","-180.5","Lazer","outcome","Pix","Aniversário"');
    expect(lines.join("\n")).toContain('"Salário","5000","Salário","income"');
  });

  test("explica a instalação do app e Sair encerra a sessão", async ({ page, account }) => {
    void account;
    await gotoAndWaitForTransactions(page, "/settings");

    const install = section(page, "Instalar o app");

    await expect(install).toContainText("Adicionar à Tela de Início");
    await expect(install).toContainText("Instalar app");
    await expect(install.getByRole("button")).toHaveCount(0);

    await page.getByRole("main").getByRole("button", { name: "Sair da conta" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/login$/);
  });
});
