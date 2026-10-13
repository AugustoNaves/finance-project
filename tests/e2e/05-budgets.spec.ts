import type { Page } from "@playwright/test";
import { E2E_MONTH, E2E_MONTH_LABEL } from "./support/env";
import { expect, test } from "./support/fixtures";
import {
  card,
  confirmDeletion,
  formError,
  gotoAndWaitForTransactions,
  metric,
  modal,
  money,
  section,
} from "./support/ui";

const day = (dayOfMonth: number) => `${E2E_MONTH}-${String(dayOfMonth).padStart(2, "0")}`;
const budgetForm = (page: Page) => page.locator("form").filter({ has: page.getByLabel("Limite mensal") });
const budgets = (page: Page) => section(page, /^Orçamentos/);

test.describe("Orçamentos (Planejamento)", () => {
  test("estado vazio do mês corrente", async ({ page, account }) => {
    void account;
    await page.goto("/planning");

    await expect(page.getByRole("heading", { name: "Orçamentos e metas", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: `Orçamentos — ${E2E_MONTH_LABEL}` })).toBeVisible();
    await expect(budgets(page).getByText("0 orçamento(s) neste mês")).toBeVisible();
    await expect(page.getByText("Nenhum orçamento cadastrado para este mês.")).toBeVisible();
    await expect(budgets(page).getByLabel("Mês")).toHaveValue(E2E_MONTH);
  });

  test("cria orçamento para categoria de despesa no mês e persiste", async ({ page, api }) => {
    await page.goto("/planning");
    await page.getByRole("button", { name: "+ Novo orçamento" }).click();

    const dialog = modal(page, "Novo orçamento");
    const form = budgetForm(page);

    await expect(dialog).toBeVisible();
    // Só categorias de despesa podem ter orçamento.
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
    await expect(budgets(page).getByText("1 orçamento(s) neste mês")).toBeVisible();

    const budget = card(page, "Alimentação");

    await expect(budget).toContainText(E2E_MONTH_LABEL);
    await expect(budget).toContainText("0%");
    await expect(metric(budget, "Limite")).toContainText(money(500.5));
    await expect(metric(budget, "Gasto")).toContainText(money(0));
    await expect(metric(budget, "Restante")).toContainText(money(500.5));
    await expect(budget).toContainText("Dentro do previsto");

    await page.reload();
    await expect(metric(card(page, "Alimentação"), "Limite")).toContainText(money(500.5));
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
    await expect(budgets(page).getByText("3 orçamento(s) neste mês")).toBeVisible();

    const food = card(page, "Alimentação");

    await expect(food).toContainText("60%");
    await expect(metric(food, "Gasto")).toContainText(money(300));
    await expect(metric(food, "Restante")).toContainText(money(200));
    await expect(food).toContainText("Dentro do previsto");
    await expect(food.getByLabel("Progresso de 60%")).toBeVisible();

    const transport = card(page, "Transporte");

    await expect(transport).toContainText("85%");
    await expect(transport).toContainText("Atenção: acima de 80%");

    const leisure = card(page, "Lazer");

    await expect(leisure).toContainText("150%");
    await expect(metric(leisure, "Restante")).toContainText(money(-50));
    await expect(leisure).toContainText("Limite ultrapassado");
    await expect(leisure.getByLabel("Progresso de 100%")).toBeVisible();
  });

  test("edita limite e categoria de um orçamento", async ({ page, api }) => {
    await api.createBudget({ category: "Saúde", amount: 300, month: E2E_MONTH });
    await api.createTransaction({ description: "Farmácia", value: 150, type: "outcome", category: "Saúde", date: day(9) });
    await gotoAndWaitForTransactions(page, "/planning");
    await expect(card(page, "Saúde")).toContainText("50%");

    await card(page, "Saúde").getByRole("button", { name: "Editar" }).click();

    const dialog = modal(page, "Editar orçamento");
    const form = budgetForm(page);

    await expect(form.getByLabel("Categoria", { exact: true })).toHaveValue("Saúde");
    await expect(form.getByLabel("Limite mensal")).toHaveValue("300");
    await expect(form.getByLabel("Mês")).toHaveValue(E2E_MONTH);
    await form.getByLabel("Limite mensal").fill("600");
    await form.getByRole("button", { name: "Salvar alterações" }).click();

    await expect(dialog).toBeHidden();
    await expect(card(page, "Saúde")).toContainText("25%");
    await expect(metric(card(page, "Saúde"), "Limite")).toContainText(money(600));
    await expect(metric(card(page, "Saúde"), "Restante")).toContainText(money(450));

    await page.reload();
    await expect(metric(card(page, "Saúde"), "Limite")).toContainText(money(600));
    expect(await api.list("budgets")).toEqual([expect.objectContaining({ category: "Saúde", amount: 600 })]);
  });

  test("exclui orçamento após confirmação", async ({ page, api }) => {
    await api.createBudget({ category: "Vestuário", amount: 250, month: E2E_MONTH });
    await page.goto("/planning");

    await card(page, "Vestuário").getByRole("button", { name: "Excluir" }).click();

    const dialog = modal(page, "Confirmar exclusão");

    await expect(dialog).toContainText("Tem certeza que deseja excluir o orçamento de Vestuário?");
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(card(page, "Vestuário")).toBeVisible();

    await card(page, "Vestuário").getByRole("button", { name: "Excluir" }).click();
    await confirmDeletion(page);

    await expect(page.getByText("Nenhum orçamento cadastrado para este mês.")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Nenhum orçamento cadastrado para este mês.")).toBeVisible();
    expect(await api.list("budgets")).toHaveLength(0);
  });

  test("não duplica orçamento da mesma categoria no mesmo mês e avisa o usuário", async ({ page, api }) => {
    await api.createBudget({ category: "Moradia", amount: 1500, month: E2E_MONTH });
    await page.goto("/planning");
    await expect(card(page, "Moradia")).toBeVisible();

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
    await expect(page.getByRole("heading", { name: "Orçamentos — novembro de 2026" })).toBeVisible();
    await expect(metric(card(page, "Moradia"), "Limite")).toContainText(money(2000));
    expect(await api.list("budgets")).toHaveLength(2);
  });

  test("filtro de mês alterna os orçamentos exibidos", async ({ page, api }) => {
    await api.createBudget({ category: "Contas", amount: 400, month: E2E_MONTH });
    await api.createBudget({ category: "Educação", amount: 900, month: "2026-11" });
    await api.createTransaction({ description: "Curso novembro", value: 450, type: "outcome", category: "Educação", date: "2026-11-03" });
    await gotoAndWaitForTransactions(page, "/planning");

    await expect(card(page, "Contas")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Educação" })).toHaveCount(0);

    await budgets(page).getByLabel("Mês").fill("2026-11");

    await expect(page.getByRole("heading", { name: "Orçamentos — novembro de 2026" })).toBeVisible();
    await expect(card(page, "Educação")).toContainText("50%");
    await expect(page.getByRole("heading", { name: "Contas" })).toHaveCount(0);

    await budgets(page).getByLabel("Mês").fill("2026-12");
    await expect(page.getByText("Nenhum orçamento cadastrado para este mês.")).toBeVisible();

    // O formulário de novo orçamento já vem no mês selecionado na página.
    await page.getByRole("button", { name: "+ Novo orçamento" }).click();
    await expect(budgetForm(page).getByLabel("Mês")).toHaveValue("2026-12");
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
