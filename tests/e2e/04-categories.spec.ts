import type { Page } from "@playwright/test";
import { E2E_MONTH } from "./support/env";
import { Api, expect, knownBug, registerAccount, signIn, test } from "./support/fixtures";
import {
  confirmDeletion,
  createTransactionViaUi,
  formError,
  gotoAndWaitForTransactions,
  modal,
  money,
  openRegister,
  transactionForm,
  transactionRow,
} from "./support/ui";

const day = (dayOfMonth: number) => `${E2E_MONTH}-${String(dayOfMonth).padStart(2, "0")}`;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function categoryForm(page: Page) {
  return page.locator("form").filter({ has: page.getByLabel("Ícone simples") });
}

function tab(page: Page, label: "Gastos" | "Receitas" | "Investimentos" | "Regras") {
  return page.getByRole("tab", { name: new RegExp(`^${label} \\d+$`) });
}

function panel(page: Page) {
  return page.getByRole("tabpanel");
}

/** Linha de categoria: botão cujo nome acessível começa com "Nome, ". */
function categoryRow(page: Page, name: string) {
  return panel(page).getByRole("button", { name: new RegExp(`^${escapeRegExp(name)}, `) });
}

function rowTexts(names: string[]) {
  return names.map((name) => new RegExp(`^${escapeRegExp(name)}(R\\$|\\s)`));
}

async function openTab(page: Page, label: "Gastos" | "Receitas" | "Investimentos" | "Regras") {
  await tab(page, label).click();
  await expect(tab(page, label)).toHaveAttribute("aria-selected", "true");
}

test.describe("Categorias", () => {
  test("conta cadastrada pela API começa com as 18 categorias padrão", async ({ page, context }) => {
    // Cadastro real (/api/register), sem o atalho de clonagem das fixtures.
    await signIn(context, await registerAccount(context.request));

    const api = new Api(context.request);

    await page.goto("/categories");

    await expect(page.getByRole("heading", { name: "Categorias e regras", level: 1 })).toBeVisible();
    await expect(tab(page, "Gastos")).toHaveText("Gastos 9");
    await expect(tab(page, "Receitas")).toHaveText("Receitas 4");
    await expect(tab(page, "Investimentos")).toHaveText("Investimentos 5");

    await expect(panel(page).getByRole("listitem")).toHaveText(
      rowTexts(["Alimentação", "Contas", "Educação", "Lazer", "Moradia", "Outros", "Saúde", "Transporte", "Vestuário"]),
    );

    await openTab(page, "Receitas");
    await expect(panel(page).getByRole("listitem")).toHaveText(
      rowTexts(["Freelance", "Investimentos", "Outros", "Salário"]),
    );

    await openTab(page, "Investimentos");
    await expect(panel(page).getByRole("listitem")).toHaveText(
      rowTexts(["Ações", "Criptomoedas", "Fundos", "Outros", "Renda Fixa"]),
    );
    expect(await api.list("categories")).toHaveLength(18);
  });

  test("cria categoria pelo modal e ela persiste", async ({ page, api }) => {
    await page.goto("/categories");
    await expect(tab(page, "Gastos")).toHaveText("Gastos 9");

    await page.getByRole("button", { name: "Nova categoria" }).click();

    const dialog = modal(page, "Nova categoria");
    const form = categoryForm(page);

    await expect(dialog).toBeVisible();
    await expect(form.getByRole("radio", { name: "Gasto" })).toBeChecked();
    await form.getByLabel("Nome").fill("Pets");
    await form.getByLabel("Cor personalizada").fill("#ff8800");
    await form.getByLabel("Ícone simples").fill("pet");
    await form.getByRole("button", { name: "Salvar categoria" }).click();

    await expect(dialog).toBeHidden();
    await expect(tab(page, "Gastos")).toHaveText("Gastos 10");

    const pets = categoryRow(page, "Pets");

    await expect(pets).toContainText("Nenhum lançamento");
    await expect(pets).toContainText(money(0));

    await page.reload();
    await expect(categoryRow(page, "Pets")).toBeVisible();
    expect(await api.list("categories")).toContainEqual(
      expect.objectContaining({ name: "Pets", type: "outcome", color: "#ff8800", icon: "pet" }),
    );
  });

  test("a cor pode ser escolhida pela paleta de amostras", async ({ page, api }) => {
    await page.goto("/categories");
    await page.getByRole("button", { name: "Nova categoria" }).click();

    const form = categoryForm(page);
    const palette = form.getByRole("radiogroup", { name: "Cor" });

    await form.getByLabel("Nome").fill("Jardim");
    await palette.getByRole("radio", { name: "Verde" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(palette.getByRole("radio", { name: "Petróleo" })).toBeChecked();
    await form.getByRole("button", { name: "Salvar categoria" }).click();
    await expect(modal(page, "Nova categoria")).toBeHidden();

    expect(await api.list("categories")).toContainEqual(
      expect.objectContaining({ name: "Jardim", color: "#3a8790" }),
    );
  });

  test("edita nome e tipo de uma categoria", async ({ page, api }) => {
    await api.createCategory({ name: "Bicos", type: "outcome" });
    await page.goto("/categories");

    await categoryRow(page, "Bicos").click();

    const dialog = modal(page, "Editar categoria");
    const form = categoryForm(page);

    await expect(form.getByLabel("Nome")).toHaveValue("Bicos");
    await expect(form.getByRole("radio", { name: "Gasto" })).toBeChecked();
    await form.getByLabel("Nome").fill("Renda extra");
    await form.getByRole("radio", { name: "Receita" }).check();
    await form.getByRole("button", { name: "Salvar alterações" }).click();

    await expect(dialog).toBeHidden();
    await expect(tab(page, "Gastos")).toHaveText("Gastos 9");
    await expect(tab(page, "Receitas")).toHaveText("Receitas 5");
    await expect(categoryRow(page, "Bicos")).toHaveCount(0);

    await openTab(page, "Receitas");
    await expect(categoryRow(page, "Renda extra")).toBeVisible();

    await page.reload();
    await openTab(page, "Receitas");
    await expect(categoryRow(page, "Renda extra")).toBeVisible();
  });

  test("exclui categoria pela edição somente após confirmação", async ({ page, api }) => {
    await api.createCategory({ name: "Descartável", type: "investment" });
    await page.goto("/categories");
    await expect(tab(page, "Investimentos")).toHaveText("Investimentos 6");
    await openTab(page, "Investimentos");

    await categoryRow(page, "Descartável").click();
    await modal(page, "Editar categoria").getByRole("button", { name: "Excluir" }).click();

    const dialog = modal(page, "Confirmar exclusão");

    await expect(dialog).toContainText("Excluir a categoria Descartável?");
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialog).toBeHidden();
    await expect(modal(page, "Editar categoria")).toBeVisible();

    await modal(page, "Editar categoria").getByRole("button", { name: "Excluir" }).click();
    await confirmDeletion(page);

    await expect(modal(page, "Editar categoria")).toBeHidden();
    await expect(categoryRow(page, "Descartável")).toHaveCount(0);
    await expect(tab(page, "Investimentos")).toHaveText("Investimentos 5");

    await page.reload();
    await expect(tab(page, "Investimentos")).toHaveText("Investimentos 5");
    expect(await api.list("categories")).toHaveLength(18);
  });

  test("não duplica categoria com mesmo nome e tipo, mas permite tipos diferentes", async ({ page, api }) => {
    await page.goto("/categories");
    await expect(tab(page, "Gastos")).toHaveText("Gastos 9");

    await page.getByRole("button", { name: "Nova categoria" }).click();

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
    await expect(tab(page, "Gastos")).toHaveText("Gastos 9");
    expect(await api.list("categories")).toHaveLength(18);

    // Mesmo nome em outro tipo é permitido.
    await form.getByRole("radio", { name: "Receita" }).check();
    await form.getByRole("button", { name: "Salvar categoria" }).click();

    await expect(dialog).toBeHidden();
    await expect(tab(page, "Receitas")).toHaveText("Receitas 5");
    await expect(tab(page, "Receitas")).toHaveAttribute("aria-selected", "true");
    await expect(categoryRow(page, "Alimentação")).toBeVisible();
  });

  test("categoria criada fica disponível no formulário de lançamento e soma no mês", async ({ page, account }) => {
    void account;
    await gotoAndWaitForTransactions(page, "/categories");
    await page.getByRole("button", { name: "Nova categoria" }).click();
    await categoryForm(page).getByLabel("Nome").fill("Pets");
    await categoryForm(page).getByRole("button", { name: "Salvar categoria" }).click();
    await expect(categoryRow(page, "Pets")).toBeVisible();

    await createTransactionViaUi(page, {
      description: "Ração",
      amount: "120",
      category: "Pets",
      date: day(9),
    });

    const pets = categoryRow(page, "Pets");

    await expect(pets).toContainText("1 lançamento");
    await expect(pets).toContainText(money(120));
  });

  test("botão Nova do formulário de lançamento cria a categoria e já a seleciona", async ({ page, api }) => {
    await gotoAndWaitForTransactions(page, "/transactions");
    await openRegister(page);

    const form = transactionForm(page);

    await form.getByRole("radio", { name: "Investimento", exact: true }).click();
    await form.getByRole("button", { name: "Nova categoria" }).click();

    const dialog = modal(page, "Nova categoria");

    await expect(dialog).toBeVisible();
    // O tipo vem do tipo selecionado no lançamento.
    await expect(dialog.getByRole("radio", { name: "Investimento" })).toBeChecked();
    await dialog.getByLabel("Nome").fill("Previdência");
    await dialog.getByRole("button", { name: "Criar categoria" }).click();

    await expect(dialog).toBeHidden();
    await expect(
      form.getByRole("radiogroup", { name: "Categoria" }).getByRole("radio", { name: "Previdência", exact: true }),
    ).toHaveAttribute("aria-checked", "true");

    await form.getByLabel("Descrição").fill("PGBL mensal");
    await form.getByLabel("Valor").fill("400");
    await form.getByRole("button", { name: "Salvar", exact: true }).click();

    await expect(transactionRow(page, "PGBL mensal")).toContainText("Previdência");
    expect(await api.list("categories")).toContainEqual(
      expect.objectContaining({ name: "Previdência", type: "investment" }),
    );
  });

  test("métricas da linha consideram apenas o mês corrente", async ({ page, api }) => {
    await api.createTransaction({ description: "Mercado 1", value: 200, type: "outcome", category: "Alimentação", date: day(3) });
    await api.createTransaction({ description: "Mercado 2", value: 150.5, type: "outcome", category: "Alimentação", date: day(20) });
    await api.createTransaction({ description: "Mercado antigo", value: 999, type: "outcome", category: "Alimentação", date: "2026-09-20" });
    await gotoAndWaitForTransactions(page, "/categories");

    const food = categoryRow(page, "Alimentação");

    await expect(food).toContainText("2 lançamentos");
    await expect(food).toContainText(money(350.5));
    await expect(categoryRow(page, "Moradia")).toContainText("Nenhum lançamento");
  });

  test("categorias homônimas de tipos diferentes têm métricas separadas", async ({ page, api }) => {
    await api.createTransaction({ description: "Presente", value: 80, type: "outcome", category: "Outros", date: day(4) });
    await api.createTransaction({ description: "Venda usada", value: 300, type: "income", category: "Outros", date: day(5) });
    await api.createTransaction({ description: "Cashback", value: 20, type: "income", category: "Outros", date: day(6) });
    await gotoAndWaitForTransactions(page, "/categories");

    await expect(categoryRow(page, "Outros")).toContainText("1 lançamento");
    await expect(categoryRow(page, "Outros")).toContainText(money(80));

    await openTab(page, "Receitas");
    await expect(categoryRow(page, "Outros")).toContainText("2 lançamentos");
    await expect(categoryRow(page, "Outros")).toContainText(money(320));

    await openTab(page, "Investimentos");
    await expect(categoryRow(page, "Outros")).toContainText("Nenhum lançamento");
  });

  test("ícone da categoria pode ser removido na edição", async ({ page, api }) => {
    await api.createCategory({ name: "Academia", type: "outcome", icon: "gym" });
    await page.goto("/categories");

    await categoryRow(page, "Academia").click();
    await expect(categoryForm(page).getByLabel("Ícone simples")).toHaveValue("gym");
    await categoryForm(page).getByLabel("Ícone simples").fill("");
    await categoryForm(page).getByRole("button", { name: "Salvar alterações" }).click();
    await expect(modal(page, "Editar categoria")).toBeHidden();

    expect(await api.list("categories")).toContainEqual(
      expect.objectContaining({ name: "Academia", icon: null }),
    );
  });

  test("renomear categoria mantém os lançamentos vinculados a ela", async ({ page, api }) => {
    knownBug(
      "transações/orçamentos guardam o NOME da categoria (prisma/schema.prisma Transaction.category String); PATCH /api/categories/[id] não propaga o novo nome",
    );
    await api.createTransaction({ description: "Cinema", value: 60, type: "outcome", category: "Lazer", date: day(6) });
    await gotoAndWaitForTransactions(page, "/categories");

    await categoryRow(page, "Lazer").click();
    await categoryForm(page).getByLabel("Nome").fill("Diversão");
    await categoryForm(page).getByRole("button", { name: "Salvar alterações" }).click();
    await expect(categoryRow(page, "Diversão")).toBeVisible();

    await expect(categoryRow(page, "Diversão")).toContainText("1 lançamento", { timeout: 3000 });
    expect((await api.list("transactions"))[0]).toMatchObject({ category: "Diversão" });
  });

  test("excluir categoria em uso avisa ou trata os lançamentos que a utilizam", async ({ page, api }) => {
    knownBug(
      "DELETE /api/categories/[id] remove a categoria sem checar uso; o lançamento fica com uma categoria que não existe mais",
    );
    await api.createTransaction({ description: "Curso", value: 300, type: "outcome", category: "Educação", date: day(6) });
    await gotoAndWaitForTransactions(page, "/categories");

    await categoryRow(page, "Educação").click();
    await modal(page, "Editar categoria").getByRole("button", { name: "Excluir" }).click();
    await confirmDeletion(page);
    await expect(categoryRow(page, "Educação")).toHaveCount(0, { timeout: 3000 });

    const categories = (await api.list("categories")).map((category) => category.name);
    const [transaction] = await api.list("transactions");

    expect(categories).toContain(transaction.category);
  });
});

test.describe("Regras de importação", () => {
  test("aba Regras mostra o estado vazio sem busca", async ({ page, account }) => {
    void account;
    await page.goto("/categories");

    await openTab(page, "Regras");

    await expect(page.getByRole("heading", { name: "Regras de importação", level: 2 })).toBeVisible();
    await expect(panel(page)).toContainText("Nenhuma regra ainda.");
    await expect(page.getByRole("searchbox")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Nova categoria" })).toHaveCount(0);
  });
});
