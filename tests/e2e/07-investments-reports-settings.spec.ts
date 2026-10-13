import fs from "node:fs/promises";
import type { Page } from "@playwright/test";
import { E2E_MONTH } from "./support/env";
import { expect, test } from "./support/fixtures";
import {
  fillTransactionForm,
  gotoAndWaitForTransactions,
  metric,
  modal,
  money,
  section,
  transactionForm,
  transactionRow,
} from "./support/ui";

const day = (dayOfMonth: number) => `${E2E_MONTH}-${String(dayOfMonth).padStart(2, "0")}`;
const charts = (scope: Page | import("@playwright/test").Locator) => scope.locator("svg.recharts-surface");

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

    await expect(page.getByRole("heading", { name: "Aportes e patrimônio", level: 1 })).toBeVisible();
    await expect(metric(page, "Total investido")).toContainText(money(0));
    await expect(metric(page, "Aportes no mês")).toContainText(money(0));
    await expect(page.getByText("0 registro(s) encontrado(s)")).toBeVisible();

    const chart = section(page, "Evolução dos aportes");

    await expect(charts(chart)).toBeVisible();
    await expect(chart.getByText("mai. de 2026")).toBeVisible();
    await expect(chart.getByText("out. de 2026")).toBeVisible();
  });

  test("totais e lista consideram apenas transações de investimento", async ({ page, api }) => {
    await api.createTransaction({ description: "Tesouro Selic", value: 1000, type: "investment", category: "Renda Fixa", date: day(6) });
    await api.createTransaction({ description: "ETF global", value: 500, type: "investment", category: "Fundos", date: day(13) });
    await api.createTransaction({ description: "Bitcoin setembro", value: 300, type: "investment", category: "Criptomoedas", date: "2026-09-15" });
    await api.createTransaction({ description: "Mercado", value: 200, type: "outcome", category: "Alimentação", date: day(7) });
    await api.createTransaction({ description: "Salário", value: 4000, type: "income", category: "Salário", date: day(5) });

    await gotoAndWaitForTransactions(page, "/investments");

    await expect(metric(page, "Total investido")).toContainText(money(1800));
    await expect(metric(page, "Aportes no mês")).toContainText(money(1500));
    await expect(page.getByText("3 registro(s) encontrado(s)")).toBeVisible();
    await expect(transactionRow(page, "Tesouro Selic")).toContainText(money(1000));
    await expect(transactionRow(page, "Bitcoin setembro")).toContainText("15/09/2026");
    await expect(transactionRow(page, "Mercado")).toHaveCount(0);
    await expect(transactionRow(page, "Salário")).toHaveCount(0);
    await expect(charts(section(page, "Evolução dos aportes")).locator(".recharts-line-dot")).toHaveCount(6);
  });

  test("+ Novo Aporte abre o modal com Investimento pré-selecionado e atualiza a página", async ({ page, api }) => {
    await gotoAndWaitForTransactions(page, "/investments");
    await page.getByRole("button", { name: "+ Novo Aporte" }).click();

    const dialog = modal(page, "Novo Aporte");
    const form = transactionForm(page);

    await expect(dialog).toBeVisible();
    await expect(form.getByLabel("Categoria", { exact: true }).locator("option")).toHaveText([
      "Selecione uma categoria",
      "Ações",
      "Criptomoedas",
      "Fundos",
      "Outros",
      "Renda Fixa",
    ]);
    await fillTransactionForm(page, { description: "Aporte mensal", amount: "750", category: "Fundos", date: day(14) });
    await form.locator('button[type="submit"]').click();

    await expect(dialog).toBeHidden();
    await expect(transactionRow(page, "Aporte mensal")).toContainText(money(750));
    await expect(metric(page, "Total investido")).toContainText(money(750));
    await expect(metric(page, "Aportes no mês")).toContainText(money(750));
    expect((await api.list("transactions"))[0]).toMatchObject({ type: "investment", amount: -750, category: "Fundos" });
  });

  test("edita e exclui um aporte pela lista da página", async ({ page, api }) => {
    await api.createTransaction({ description: "CDB banco", value: 2000, type: "investment", category: "Renda Fixa", date: day(6) });
    await gotoAndWaitForTransactions(page, "/investments");

    await transactionRow(page, "CDB banco").getByRole("button", { name: "Editar" }).click();
    await transactionForm(page).getByLabel("Valor").fill("2500");
    await transactionForm(page).getByRole("button", { name: "Salvar alterações" }).click();
    await expect(metric(page, "Total investido")).toContainText(money(2500));

    await transactionRow(page, "CDB banco").getByRole("button", { name: "Excluir" }).click();
    await modal(page, "Confirmar exclusão").getByRole("button", { name: "Confirmar exclusão" }).click();

    await expect(transactionRow(page, "CDB banco")).toHaveCount(0);
    await expect(metric(page, "Total investido")).toContainText(money(0));
    expect(await api.list("transactions")).toHaveLength(0);
  });
});

test.describe("Relatórios", () => {
  test("estado vazio", async ({ page, account }) => {
    void account;
    await gotoAndWaitForTransactions(page, "/reports");

    await expect(page.getByRole("heading", { name: "Análise do período", level: 1 })).toBeVisible();
    await expect(page.getByLabel("Período")).toHaveValue(E2E_MONTH);
    await expect(metric(page, "Receitas")).toContainText(money(0));
    await expect(metric(page, "Maior despesa")).toContainText("Sem dados");
    await expect(metric(page, "Categoria líder")).toContainText("Sem dados");
    await expect(metric(page, "Taxa de economia")).toContainText("Sem receitas");
    await expect(page.getByText("Nenhuma despesa para exibir no gráfico.")).toBeVisible();
    await expect(page.getByText("Nenhuma despesa encontrada neste período.")).toBeVisible();
    await expect(page.getByText("0 categoria(s)")).toBeVisible();
  });

  test("métricas, gráficos e quebras refletem o mês selecionado", async ({ page, api }) => {
    await seedMonthData(api);
    await gotoAndWaitForTransactions(page, "/reports");

    await expect(metric(page, "Receitas")).toContainText(money(5000));
    await expect(metric(page, "Despesas")).toContainText(money(-1500));
    await expect(metric(page, "Saldo")).toContainText(money(2500));
    await expect(metric(page, "Maior despesa")).toContainText(money(-1200));
    await expect(metric(page, "Maior despesa")).toContainText("Aluguel foi a maior saída do período.");
    await expect(metric(page, "Categoria líder")).toContainText("Moradia");
    // Mês corrente: média pelos dias já decorridos (hoje é dia 15 no relógio do teste).
    await expect(metric(page, "Média diária")).toContainText(money(1500 / 15));
    await expect(metric(page, "Taxa de economia")).toContainText("50% economizado");

    // Gráficos (Recharts): donut por categoria, barras e linha dos últimos 6 meses.
    const donut = section(page, "Despesas por categoria");
    const bars = section(page, "Receitas vs despesas");
    const line = section(page, "Linha do saldo");

    await expect(charts(page)).toHaveCount(3);
    await expect(donut.locator(".recharts-pie-sector")).toHaveCount(2);
    await expect(bars.getByText("out. de 2026")).toBeVisible();
    await expect(bars.locator(".recharts-bar-rectangle path, .recharts-bar-rectangle rect")).not.toHaveCount(0);
    await expect(line.locator(".recharts-line-dot")).toHaveCount(6);

    const breakdown = section(page, "Gastos por categoria");

    await expect(breakdown.getByText("2 categoria(s)")).toBeVisible();
    await expect(breakdown).toContainText("80% das despesas");
    await expect(breakdown).toContainText("20% das despesas");
    await expect(breakdown).toContainText(money(1200));

    const evolution = section(page, "Evolução do saldo").locator("article");

    await expect(evolution).toHaveCount(6);
    await expect(evolution.nth(4)).toContainText("set. de 2026");
    await expect(evolution.nth(4)).toContainText(money(1500));
    await expect(evolution.nth(5)).toContainText("out. de 2026");
    await expect(evolution.nth(5)).toContainText(money(2500));
  });

  test("filtro de período troca o mês analisado", async ({ page, api }) => {
    await seedMonthData(api);
    await gotoAndWaitForTransactions(page, "/reports");
    await expect(metric(page, "Receitas")).toContainText(money(5000));

    await page.getByLabel("Período").fill("2026-09");

    await expect(metric(page, "Receitas")).toContainText(money(2000));
    await expect(metric(page, "Despesas")).toContainText(money(-500));
    await expect(metric(page, "Saldo")).toContainText(money(1500));
    await expect(metric(page, "Categoria líder")).toContainText("Lazer");
    // Mês passado: média pelos 30 dias de setembro.
    await expect(metric(page, "Média diária")).toContainText(money(500 / 30));
    await expect(section(page, "Evolução do saldo").locator("article").last()).toContainText("set. de 2026");

    await page.getByLabel("Período").fill("2026-01");

    await expect(metric(page, "Maior despesa")).toContainText("Sem dados");
    await expect(page.getByText("Nenhuma despesa encontrada neste período.")).toBeVisible();
  });
});

test.describe("Configurações", () => {
  test("perfil mostra os dados da conta e o resumo das transações", async ({ page, api, account }) => {
    await seedMonthData(api);
    await gotoAndWaitForTransactions(page, "/settings");

    await expect(page.getByRole("heading", { name: "Conta e dados", level: 1 })).toBeVisible();
    await expect(metric(page, "Conta")).toContainText(account.name);
    await expect(metric(page, "E-mail")).toContainText(account.email);
    await expect(metric(page, "Moeda padrão")).toContainText("Real brasileiro (BRL)");
    await expect(metric(page, "Transações carregadas")).toContainText("6");
    await expect(metric(page, "Saldo em memória")).toContainText(money(4000));
  });

  test("exporta as transações em JSON", async ({ page, api }) => {
    await seedMonthData(api);
    await gotoAndWaitForTransactions(page, "/settings");
    await expect(metric(page, "Transações carregadas")).toContainText("6");

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
    await expect(metric(page, "Transações carregadas")).toContainText("2");

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
});
