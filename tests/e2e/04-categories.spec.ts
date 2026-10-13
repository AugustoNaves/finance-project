import { E2E_MONTH } from "./support/env";
import { Api, expect, knownBug, registerAccount, signIn, test } from "./support/fixtures";
import {
  card,
  confirmDeletion,
  fillTransactionForm,
  formError,
  gotoAndWaitForTransactions,
  metric,
  modal,
  money,
  section,
  transactionForm,
  transactionRow,
} from "./support/ui";

const day = (dayOfMonth: number) => `${E2E_MONTH}-${String(dayOfMonth).padStart(2, "0")}`;

function categoryForm(page: import("@playwright/test").Page) {
  return page.locator("form").filter({ has: page.getByLabel("Ícone simples") });
}

test.describe("Categorias", () => {
  test("conta cadastrada pela API começa com as 18 categorias padrão", async ({ page, context }) => {
    // Cadastro real (/api/register), sem o atalho de clonagem das fixtures.
    await signIn(context, await registerAccount(context.request));

    const api = new Api(context.request);

    await page.goto("/categories");

    const outcome = section(page, "Despesas");
    const income = section(page, "Receitas");
    const investment = section(page, "Investimentos");

    await expect(outcome.getByText("9 categoria(s)")).toBeVisible();
    await expect(income.getByText("4 categoria(s)")).toBeVisible();
    await expect(investment.getByText("5 categoria(s)")).toBeVisible();
    await expect(outcome.getByRole("heading", { level: 3 })).toHaveText([
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
    await expect(income.getByRole("heading", { level: 3 })).toHaveText([
      "Freelance",
      "Investimentos",
      "Outros",
      "Salário",
    ]);
    await expect(investment.getByRole("heading", { level: 3 })).toHaveText([
      "Ações",
      "Criptomoedas",
      "Fundos",
      "Outros",
      "Renda Fixa",
    ]);
    expect(await api.list("categories")).toHaveLength(18);
  });

  test("cria categoria pelo modal e ela persiste", async ({ page, api }) => {
    await page.goto("/categories");
    await expect(section(page, "Despesas").getByText("9 categoria(s)")).toBeVisible();

    await page.getByRole("button", { name: "+ Nova Categoria" }).click();

    const dialog = modal(page, "Nova categoria");
    const form = categoryForm(page);

    await expect(dialog).toBeVisible();
    await expect(form.getByLabel("Tipo")).toHaveValue("outcome");
    await form.getByLabel("Nome").fill("Pets");
    await form.getByLabel("Cor").fill("#ff8800");
    await form.getByLabel("Ícone simples").fill("pet");
    await form.getByRole("button", { name: "Salvar categoria" }).click();

    await expect(dialog).toBeHidden();
    await expect(section(page, "Despesas").getByText("10 categoria(s)")).toBeVisible();

    const pets = card(page, "Pets");

    await expect(pets).toContainText("Despesa");
    await expect(pets).toContainText("PE");
    await expect(metric(pets, "Transações no mês")).toContainText("0");
    await expect(metric(pets, "Total no mês")).toContainText(money(0));

    await page.reload();
    await expect(card(page, "Pets")).toBeVisible();
    expect(await api.list("categories")).toContainEqual(
      expect.objectContaining({ name: "Pets", type: "outcome", color: "#ff8800", icon: "pet" }),
    );
  });

  test("edita nome e tipo de uma categoria", async ({ page, api }) => {
    await api.createCategory({ name: "Bicos", type: "outcome" });
    await page.goto("/categories");

    await card(page, "Bicos").getByRole("button", { name: "Editar" }).click();

    const dialog = modal(page, "Editar categoria");
    const form = categoryForm(page);

    await expect(form.getByLabel("Nome")).toHaveValue("Bicos");
    await expect(form.getByLabel("Tipo")).toHaveValue("outcome");
    await form.getByLabel("Nome").fill("Renda extra");
    await form.getByLabel("Tipo").selectOption("Receita");
    await form.getByRole("button", { name: "Salvar alterações" }).click();

    await expect(dialog).toBeHidden();
    await expect(section(page, "Receitas").getByRole("heading", { name: "Renda extra" })).toBeVisible();
    await expect(section(page, "Receitas").getByText("5 categoria(s)")).toBeVisible();
    await expect(section(page, "Despesas").getByText("9 categoria(s)")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bicos" })).toHaveCount(0);

    await page.reload();
    await expect(card(page, "Renda extra")).toContainText("Receita");
  });

  test("exclui categoria somente após confirmação", async ({ page, api }) => {
    await api.createCategory({ name: "Descartável", type: "investment" });
    await page.goto("/categories");
    await expect(section(page, "Investimentos").getByText("6 categoria(s)")).toBeVisible();

    await card(page, "Descartável").getByRole("button", { name: "Excluir" }).click();

    const dialog = modal(page, "Confirmar exclusão");

    await expect(dialog).toContainText("Tem certeza que deseja excluir a categoria Descartável?");
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(card(page, "Descartável")).toBeVisible();

    await card(page, "Descartável").getByRole("button", { name: "Excluir" }).click();
    await confirmDeletion(page);

    await expect(page.getByRole("heading", { name: "Descartável" })).toHaveCount(0);
    await expect(section(page, "Investimentos").getByText("5 categoria(s)")).toBeVisible();

    await page.reload();
    await expect(section(page, "Investimentos").getByText("5 categoria(s)")).toBeVisible();
    expect(await api.list("categories")).toHaveLength(18);
  });

  test("não duplica categoria com mesmo nome e tipo, mas permite tipos diferentes", async ({ page, api }) => {
    await page.goto("/categories");
    await expect(section(page, "Despesas").getByText("9 categoria(s)")).toBeVisible();

    await page.getByRole("button", { name: "+ Nova Categoria" }).click();

    const dialog = modal(page, "Nova categoria");
    const form = categoryForm(page);
    const duplicate = page.waitForResponse(
      (response) => response.url().endsWith("/api/categories") && response.request().method() === "POST",
    );

    await form.getByLabel("Nome").fill("Alimentação");
    await form.getByRole("button", { name: "Salvar categoria" }).click();

    expect((await duplicate).status()).toBe(409);
    await expect(dialog).toBeVisible();
    await expect(formError(dialog)).toBeVisible();
    await expect(section(page, "Despesas").getByText("9 categoria(s)")).toBeVisible();
    expect(await api.list("categories")).toHaveLength(18);

    // Mesmo nome em outro tipo é permitido.
    await form.getByLabel("Tipo").selectOption("Receita");
    await form.getByRole("button", { name: "Salvar categoria" }).click();

    await expect(dialog).toBeHidden();
    await expect(section(page, "Receitas").getByText("5 categoria(s)")).toBeVisible();
    await expect(section(page, "Receitas").getByRole("heading", { name: "Alimentação" })).toBeVisible();
  });

  test("categoria criada fica disponível no formulário de transação e soma no mês", async ({ page, account }) => {
    void account;
    await gotoAndWaitForTransactions(page, "/categories");
    await page.getByRole("button", { name: "+ Nova Categoria" }).click();
    await categoryForm(page).getByLabel("Nome").fill("Pets");
    await categoryForm(page).getByRole("button", { name: "Salvar categoria" }).click();
    await expect(card(page, "Pets")).toBeVisible();

    await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Transações" }).click();
    await expect(page).toHaveURL(/\/transactions$/);
    await page.getByRole("button", { name: "+ Nova Transação" }).click();

    const form = await fillTransactionForm(page, {
      description: "Ração",
      amount: "120",
      category: "Pets",
      date: day(9),
    });

    await form.getByRole("button", { name: "Salvar Transação" }).click();
    await expect(transactionRow(page, "Ração")).toContainText("Pets");

    await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Categorias" }).click();

    const pets = card(page, "Pets");

    await expect(metric(pets, "Transações no mês")).toContainText("1");
    await expect(metric(pets, "Total no mês")).toContainText(money(120));
  });

  test("botão + do formulário de transação cria a categoria e já a seleciona", async ({ page, api }) => {
    await gotoAndWaitForTransactions(page, "/transactions");
    await page.getByRole("button", { name: "+ Nova Transação" }).click();

    const form = transactionForm(page);

    await form.getByRole("button", { name: "Investimento", exact: true }).click();
    await form.getByRole("button", { name: "Nova categoria" }).click();

    const dialog = modal(page, "Nova categoria");

    await expect(dialog).toBeVisible();
    // O tipo vem do tipo selecionado na transação.
    await expect(dialog.getByLabel("Tipo")).toHaveValue("investment");
    await dialog.getByLabel("Nome").fill("Previdência");
    await dialog.getByRole("button", { name: "Criar categoria" }).click();

    await expect(dialog).toBeHidden();
    await expect(modal(page, "Nova Transação")).toBeVisible();
    await expect(form.getByLabel("Categoria", { exact: true })).toHaveValue("Previdência");

    await form.getByLabel("Descrição").fill("PGBL mensal");
    await form.getByLabel("Valor").fill("400");
    await form.getByRole("button", { name: "Salvar Transação" }).click();

    await expect(transactionRow(page, "PGBL mensal")).toContainText("Previdência");
    expect(await api.list("categories")).toContainEqual(
      expect.objectContaining({ name: "Previdência", type: "investment" }),
    );
  });

  test("métricas do cartão consideram apenas o mês corrente", async ({ page, api }) => {
    await api.createTransaction({ description: "Mercado 1", value: 200, type: "outcome", category: "Alimentação", date: day(3) });
    await api.createTransaction({ description: "Mercado 2", value: 150.5, type: "outcome", category: "Alimentação", date: day(20) });
    await api.createTransaction({ description: "Mercado antigo", value: 999, type: "outcome", category: "Alimentação", date: "2026-09-20" });
    await gotoAndWaitForTransactions(page, "/categories");

    const food = card(page, "Alimentação");

    await expect(metric(food, "Transações no mês")).toContainText("2");
    await expect(metric(food, "Total no mês")).toContainText(money(350.5));
    await expect(metric(card(page, "Moradia"), "Transações no mês")).toContainText("0");
  });

  test("categorias homônimas de tipos diferentes têm métricas separadas", async ({ page, api }) => {
    await api.createTransaction({ description: "Presente", value: 80, type: "outcome", category: "Outros", date: day(4) });
    await api.createTransaction({ description: "Venda usada", value: 300, type: "income", category: "Outros", date: day(5) });
    await api.createTransaction({ description: "Cashback", value: 20, type: "income", category: "Outros", date: day(6) });
    await gotoAndWaitForTransactions(page, "/categories");

    const outcomeOthers = section(page, "Despesas").getByRole("article").filter({ hasText: "Outros" });
    const incomeOthers = section(page, "Receitas").getByRole("article").filter({ hasText: "Outros" });
    const investmentOthers = section(page, "Investimentos").getByRole("article").filter({ hasText: "Outros" });

    await expect(metric(outcomeOthers, "Transações no mês")).toContainText("1");
    await expect(metric(outcomeOthers, "Total no mês")).toContainText(money(80));
    await expect(metric(incomeOthers, "Transações no mês")).toContainText("2");
    await expect(metric(incomeOthers, "Total no mês")).toContainText(money(320));
    await expect(metric(investmentOthers, "Transações no mês")).toContainText("0");
  });

  test("ícone da categoria pode ser removido na edição", async ({ page, api }) => {
    await api.createCategory({ name: "Academia", type: "outcome", icon: "gym" });
    await page.goto("/categories");
    await expect(card(page, "Academia")).toContainText("GY");

    await card(page, "Academia").getByRole("button", { name: "Editar" }).click();
    await categoryForm(page).getByLabel("Ícone simples").fill("");
    await categoryForm(page).getByRole("button", { name: "Salvar alterações" }).click();
    await expect(modal(page, "Editar categoria")).toBeHidden();

    expect(await api.list("categories")).toContainEqual(
      expect.objectContaining({ name: "Academia", icon: null }),
    );
  });

  test("renomear categoria mantém as transações vinculadas a ela", async ({ page, api }) => {
    knownBug(
      "transações/orçamentos guardam o NOME da categoria (prisma/schema.prisma Transaction.category String); PATCH /api/categories/[id] não propaga o novo nome",
    );
    await api.createTransaction({ description: "Cinema", value: 60, type: "outcome", category: "Lazer", date: day(6) });
    await gotoAndWaitForTransactions(page, "/categories");

    await card(page, "Lazer").getByRole("button", { name: "Editar" }).click();
    await categoryForm(page).getByLabel("Nome").fill("Diversão");
    await categoryForm(page).getByRole("button", { name: "Salvar alterações" }).click();
    await expect(card(page, "Diversão")).toBeVisible();

    await expect(metric(card(page, "Diversão"), "Transações no mês")).toContainText("1", { timeout: 3000 });
    expect((await api.list("transactions"))[0]).toMatchObject({ category: "Diversão" });
  });

  test("excluir categoria em uso avisa ou trata as transações que a utilizam", async ({ page, api }) => {
    knownBug(
      "DELETE /api/categories/[id] remove a categoria sem checar uso; a transação fica com uma categoria que não existe mais",
    );
    await api.createTransaction({ description: "Curso", value: 300, type: "outcome", category: "Educação", date: day(6) });
    await gotoAndWaitForTransactions(page, "/categories");

    await card(page, "Educação").getByRole("button", { name: "Excluir" }).click();
    await modal(page, "Confirmar exclusão").getByRole("button", { name: "Confirmar exclusão" }).click();
    await expect(page.getByRole("heading", { name: "Educação" })).toHaveCount(0, { timeout: 3000 });

    const categories = (await api.list("categories")).map((category) => category.name);
    const [transaction] = await api.list("transactions");

    expect(categories).toContain(transaction.category);
  });
});
