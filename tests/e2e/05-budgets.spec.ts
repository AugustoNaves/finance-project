import type { Page } from "@playwright/test";
import { E2E_MONTH, E2E_MONTH_LABEL } from "./support/env";
import { expect, test } from "./support/fixtures";
import { confirmDeletion, formError, gotoAndWaitForTransactions, modal, money, section } from "./support/ui";

const day = (dayOfMonth: number) => `${E2E_MONTH}-${String(dayOfMonth).padStart(2, "0")}`;
const budgetForm = (page: Page) => page.locator("form").filter({ has: page.getByLabel("Limite mensal") });
const budgets = (page: Page) => section(page, "Orçamentos");
const monthField = (page: Page) => page.getByRole("main").locator("#planning-month-filter");
const emptyBudgets = (page: Page, monthLabel = E2E_MONTH_LABEL) =>
  budgets(page).getByText(`Nenhum orçamento para ${monthLabel}.`, { exact: false });

/** Linha de orçamento: o item da lista que contém o botão "Editar orçamento de X". */
function budgetRow(page: Page, category: string) {
  return budgets(page)
    .getByRole("listitem")
    .filter({ has: page.getByRole("button", { name: `Editar orçamento de ${category}`, exact: true }) });
}

function budgetButtons(page: Page) {
  return budgets(page).getByRole("button", { name: /^Editar orçamento de / });
}

test.describe("Orçamentos (Planejar)", () => {
  test("estado vazio do mês corrente", async ({ page, account }) => {
    void account;
    await page.goto("/planning");

    await expect(page.getByRole("heading", { name: "Planejar", level: 1 })).toBeVisible();
    await expect(page.getByRole("main").getByText(E2E_MONTH_LABEL, { exact: true })).toBeVisible();
    await expect(emptyBudgets(page)).toBeVisible();
    await expect(budgetButtons(page)).toHaveCount(0);
    await expect(monthField(page)).toHaveValue(E2E_MONTH);
  });

  test("cria orçamento para categoria de despesa no mês e persiste", async ({ page, api }) => {
    await page.goto("/planning");
    await page.getByRole("button", { name: "+ Novo orçamento" }).click();

    const dialog = modal(page, "Novo orçamento");
    const form = budgetForm(page);

    await expect(dialog).toBeVisible();
    // Só categorias de gasto podem ter orçamento.
    await expect(form.getByLabel("Categoria", { exact: true }).locator("option")).toHaveText([
      "Selecione uma categoria",
      "Alimentação",
      "Contas",
      "Educação",
      "Lazer",
      "Moradia",
      "Outros",
      "Saúde",
      "Transporte",
      "Vestuário",
    ]);
    await expect(form.getByLabel("Mês")).toHaveValue(E2E_MONTH);

    await form.getByLabel("Categoria", { exact: true }).selectOption("Alimentação");
    await form.getByLabel("Limite mensal").fill("500.50");
    await form.getByRole("button", { name: "Salvar orçamento" }).click();

    await expect(dialog).toBeHidden();
    await expect(budgetButtons(page)).toHaveCount(1);

    const budget = budgetRow(page, "Alimentação");

    await expect(budget).toContainText("0,00 de 500,50");
    await expect(budget).toContainText("0%");
    await expect(budget).toContainText(`Dentro do previsto · restam ${money(500.5)}`);

    await page.reload();
    await expect(budgetRow(page, "Alimentação")).toContainText("de 500,50");
    expect(await api.list("budgets")).toEqual([
      expect.objectContaining({ category: "Alimentação", amount: 500.5, month: E2E_MONTH }),
    ]);
  });

  test("progresso reflete as despesas da categoria no mês e muda de faixa", async ({ page, api }) => {
    await api.createBudget({ category: "Alimentação", amount: 500, month: E2E_MONTH });
    await api.createBudget({ category: "Transporte", amount: 1000, month: E2E_MONTH });
    await api.createBudget({ category: "Lazer", amount: 100, month: E2E_MONTH });

    await api.createTransaction({ description: "Mercado", value: 200, type: "outcome", category: "Alimentação", date: day(4) });
    await api.createTransaction({ description: "Padaria", value: 100, type: "outcome", category: "Alimentação", date: day(18) });
    await api.createTransaction({ description: "Combustível", value: 850, type: "outcome", category: "Transporte", date: day(7) });
    await api.createTransaction({ description: "Festival", value: 150, type: "outcome", category: "Lazer", date: day(11) });
    // Não contam: outro mês, receita e investimento.
    await api.createTransaction({ description: "Mercado setembro", value: 400, type: "outcome", category: "Alimentação", date: "2026-09-28" });
    await api.createTransaction({ description: "Salário", value: 5000, type: "income", category: "Salário", date: day(5) });
    await api.createTransaction({ description: "Aporte", value: 700, type: "investment", category: "Ações", date: day(6) });

    await gotoAndWaitForTransactions(page, "/planning");
    await expect(budgetButtons(page)).toHaveText(["Alimentação", "Lazer", "Transporte"]);

    const food = budgetRow(page, "Alimentação");

    await expect(food).toContainText("300,00 de 500,00");
    await expect(food).toContainText("60%");
    await expect(food).toContainText(`Dentro do previsto · restam ${money(200)}`);
    await expect(food.getByRole("progressbar", { name: "Alimentação: 60%" })).toBeVisible();

    const transport = budgetRow(page, "Transporte");

    await expect(transport).toContainText("85%");
    await expect(transport).toContainText("Perto do limite");

    const leisure = budgetRow(page, "Lazer");

    await expect(leisure).toContainText("150%");
    await expect(leisure).toContainText(`Estourou ${money(50)}`);
    await expect(leisure.getByRole("progressbar", { name: "Lazer: 100%" })).toBeVisible();

    await expect(budgets(page).getByText("Total", { exact: true }).locator("xpath=..")).toContainText(
      "1.300,00 de 1.600,00",
    );
  });

  test("tocar no orçamento edita o limite", async ({ page, api }) => {
    await api.createBudget({ category: "Saúde", amount: 300, month: E2E_MONTH });
    await api.createTransaction({ description: "Farmácia", value: 150, type: "outcome", category: "Saúde", date: day(9) });
    await gotoAndWaitForTransactions(page, "/planning");
    await expect(budgetRow(page, "Saúde")).toContainText("50%");

    await budgetRow(page, "Saúde").click();

    const dialog = modal(page, "Editar orçamento");
    const form = budgetForm(page);

    await expect(form.getByLabel("Categoria", { exact: true })).toHaveValue("Saúde");
    await expect(form.getByLabel("Limite mensal")).toHaveValue("300");
    await expect(form.getByLabel("Mês")).toHaveValue(E2E_MONTH);
    await form.getByLabel("Limite mensal").fill("600");
    await form.getByRole("button", { name: "Salvar alterações" }).click();

    await expect(dialog).toBeHidden();
    await expect(budgetRow(page, "Saúde")).toContainText("25%");
    await expect(budgetRow(page, "Saúde")).toContainText("150,00 de 600,00");
    await expect(budgetRow(page, "Saúde")).toContainText(`restam ${money(450)}`);

    await page.reload();
    await expect(budgetRow(page, "Saúde")).toContainText("de 600,00");
    expect(await api.list("budgets")).toEqual([expect.objectContaining({ category: "Saúde", amount: 600 })]);
  });

  test("exclui orçamento pela edição após confirmação", async ({ page, api }) => {
    await api.createBudget({ category: "Vestuário", amount: 250, month: E2E_MONTH });
    await page.goto("/planning");

    await budgetRow(page, "Vestuário").click();
    await modal(page, "Editar orçamento").getByRole("button", { name: "Excluir" }).click();

    const dialog = modal(page, "Confirmar exclusão");

    await expect(dialog).toContainText("Excluir o orçamento de Vestuário?");
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(modal(page, "Editar orçamento")).toBeVisible();

    await modal(page, "Editar orçamento").getByRole("button", { name: "Excluir" }).click();
    await confirmDeletion(page);

    await expect(modal(page, "Editar orçamento")).toBeHidden();
    await expect(emptyBudgets(page)).toBeVisible();
    await page.reload();
    await expect(emptyBudgets(page)).toBeVisible();
    expect(await api.list("budgets")).toHaveLength(0);
  });

  test("não duplica orçamento da mesma categoria no mesmo mês e avisa o usuário", async ({ page, api }) => {
    await api.createBudget({ category: "Moradia", amount: 1500, month: E2E_MONTH });
    await page.goto("/planning");
    await expect(budgetRow(page, "Moradia")).toBeVisible();

    await page.getByRole("button", { name: "+ Novo orçamento" }).click();

    const dialog = modal(page, "Novo orçamento");
    const form = budgetForm(page);
    const duplicate = page.waitForResponse(
      (response) => response.url().endsWith("/api/budgets") && response.request().method() === "POST",
    );

    await form.getByLabel("Categoria", { exact: true }).selectOption("Moradia");
    await form.getByLabel("Limite mensal").fill("2000");
    await form.getByRole("button", { name: "Salvar orçamento" }).click();

    expect((await duplicate).status()).toBe(409);
    await expect(dialog).toBeVisible();
    await expect(formError(dialog)).toBeVisible();
    expect(await api.list("budgets")).toHaveLength(1);

    // A mesma categoria em outro mês é permitida e a tela passa a mostrar esse mês.
    await form.getByLabel("Mês").fill("2026-11");
    await form.getByRole("button", { name: "Salvar orçamento" }).click();

    await expect(dialog).toBeHidden();
    await expect(monthField(page)).toHaveValue("2026-11");
    await expect(page.getByRole("main").getByText("novembro de 2026", { exact: true })).toBeVisible();
    await expect(budgetRow(page, "Moradia")).toContainText("de 2.000,00");
    expect(await api.list("budgets")).toHaveLength(2);
  });

  test("seletor de mês alterna os orçamentos exibidos", async ({ page, api }) => {
    await api.createBudget({ category: "Contas", amount: 400, month: E2E_MONTH });
    await api.createBudget({ category: "Educação", amount: 900, month: "2026-11" });
    await api.createTransaction({ description: "Curso novembro", value: 450, type: "outcome", category: "Educação", date: "2026-11-03" });
    await gotoAndWaitForTransactions(page, "/planning");

    await expect(budgetButtons(page)).toHaveText(["Contas"]);

    await page.getByRole("button", { name: "Próximo mês" }).click();

    await expect(monthField(page)).toHaveValue("2026-11");
    await expect(page.getByRole("main").getByText("novembro de 2026", { exact: true })).toBeVisible();
    await expect(budgetButtons(page)).toHaveText(["Educação"]);
    await expect(budgetRow(page, "Educação")).toContainText("50%");

    await monthField(page).fill("2026-12");
    await expect(emptyBudgets(page, "dezembro de 2026")).toBeVisible();

    // O formulário de novo orçamento já vem no mês selecionado na página.
    await page.getByRole("button", { name: "+ Novo orçamento" }).click();
    await expect(budgetForm(page).getByLabel("Mês")).toHaveValue("2026-12");
    await modal(page, "Novo orçamento").getByRole("button", { name: "Fechar" }).click();

    await page.getByRole("button", { name: "Mês anterior" }).click();
    await page.getByRole("button", { name: "Mês anterior" }).click();
    await expect(budgetButtons(page)).toHaveText(["Contas"]);
  });

  test("valor inválido é barrado pelo formulário", async ({ page, api }) => {
    await page.goto("/planning");
    await page.getByRole("button", { name: "+ Novo orçamento" }).click();

    const form = budgetForm(page);

    await form.getByLabel("Limite mensal").fill("0");
    await form.getByRole("button", { name: "Salvar orçamento" }).click();

    await expect(form.getByLabel("Limite mensal")).toHaveJSProperty("validity.rangeUnderflow", true);
    await expect(modal(page, "Novo orçamento")).toBeVisible();
    expect(await api.list("budgets")).toHaveLength(0);
  });
});
