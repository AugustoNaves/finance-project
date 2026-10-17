import { E2E_MONTH } from "./support/env";
import { expect, test, type SeedTransaction } from "./support/fixtures";
import {
  categoryChoices,
  confirmDeletion,
  createTransactionViaUi,
  entryCount,
  fillTransactionForm,
  formError,
  gotoAndWaitForTransactions,
  ledger,
  modal,
  openRegister,
  openTransaction,
  transactionForm,
  transactionRow,
  transactionRows,
} from "./support/ui";

const day = (dayOfMonth: number) => `${E2E_MONTH}-${String(dayOfMonth).padStart(2, "0")}`;

const SEEDS: SeedTransaction[] = [
  { description: "Salário mensal", value: 5000, type: "income", category: "Salário", date: day(5) },
  { description: "Mercado da semana", value: 300, type: "outcome", category: "Alimentação", date: day(8) },
  { description: "Uber aeroporto", value: 80, type: "outcome", category: "Transporte", date: day(15) },
  { description: "Aporte Tesouro", value: 1000, type: "investment", category: "Renda Fixa", date: day(20) },
  { description: "Mercado atacado", value: 450, type: "outcome", category: "Alimentação", date: day(25) },
];

test.describe("Lançamentos — criação", () => {
  test("cria uma receita pela folha Registrar, lista e mantém após recarregar", async ({ page, api }) => {
    await gotoAndWaitForTransactions(page, "/transactions");
    await expect(page.getByRole("heading", { name: "Lançamentos", level: 1 })).toBeVisible();
    await expect(page.getByText("Nenhum lançamento encontrado com esses filtros.")).toBeVisible();
    await expect(entryCount(page, 0)).toBeVisible();

    await createTransactionViaUi(page, {
      description: "Salário de outubro",
      amount: "5000",
      type: "income",
      category: "Salário",
      date: day(10),
    });

    const row = transactionRow(page, "Salário de outubro");

    await expect(row).toBeVisible();
    await expect(row).toContainText(ledger(5000));
    await expect(row).toContainText("Salário");
    await expect(entryCount(page, 1)).toBeVisible();
    await expect(page.getByRole("list", { name: "sáb., 10 de out." })).toContainText("Salário de outubro");

    const [saved] = await api.list("transactions");

    expect(saved).toMatchObject({
      description: "Salário de outubro",
      amount: 5000,
      type: "income",
      category: "Salário",
      paymentMethod: "Pix",
      notes: null,
    });
    expect(String(saved.date)).toContain(day(10));

    await page.reload();
    await expect(transactionRow(page, "Salário de outubro")).toContainText(ledger(5000));
  });

  test("cria um gasto com forma de pagamento e observação", async ({ page, api }) => {
    await gotoAndWaitForTransactions(page, "/transactions");
    await openRegister(page);

    const form = transactionForm(page);

    // Padrão: tipo Gasto, Pix e a primeira categoria de gasto já escolhida.
    await expect(form.getByRole("radio", { name: "Gasto", exact: true })).toHaveAttribute("aria-checked", "true");
    await expect(form.getByLabel("Forma de pagamento")).toHaveValue("Pix");
    // Sem histórico, a ordem é a da API (alfabética).
    await expect(categoryChoices(page)).toHaveText([
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
    await expect(categoryChoices(page).first()).toHaveAttribute("aria-checked", "true");

    await fillTransactionForm(page, {
      description: "Jantar de aniversário",
      amount: "150",
      category: "Lazer",
      date: day(12),
      paymentMethod: "Cartão de crédito",
      notes: "Restaurante com a família",
    });
    await form.getByRole("button", { name: "Salvar", exact: true }).click();

    const row = transactionRow(page, "Jantar de aniversário");

    await expect(row).toContainText(ledger(-150));
    await expect(row).toContainText("Lazer");

    const [saved] = await api.list("transactions");

    expect(saved).toMatchObject({
      amount: -150,
      type: "outcome",
      category: "Lazer",
      paymentMethod: "Cartão de crédito",
      notes: "Restaurante com a família",
    });
  });

  test("categorias mais usadas aparecem primeiro", async ({ page, api }) => {
    await api.createTransaction({ description: "Gasolina", value: 200, type: "outcome", category: "Transporte", date: day(2) });
    await api.createTransaction({ description: "Pedágio", value: 20, type: "outcome", category: "Transporte", date: day(3) });
    await api.createTransaction({ description: "Cinema", value: 40, type: "outcome", category: "Lazer", date: day(4) });
    await gotoAndWaitForTransactions(page, "/transactions");
    await openRegister(page);

    await expect(categoryChoices(page).nth(0)).toHaveText("Transporte");
    await expect(categoryChoices(page).nth(1)).toHaveText("Lazer");
    await expect(categoryChoices(page).nth(0)).toHaveAttribute("aria-checked", "true");
  });

  test("cria um investimento com as categorias de investimento", async ({ page, api }) => {
    await gotoAndWaitForTransactions(page, "/transactions");
    await openRegister(page);

    const form = transactionForm(page);

    await form.getByRole("radio", { name: "Investimento", exact: true }).click();
    await expect(categoryChoices(page)).toHaveText(["Ações", "Criptomoedas", "Fundos", "Outros", "Renda Fixa"]);

    await fillTransactionForm(page, {
      description: "Aporte em CDB",
      amount: "800",
      category: "Renda Fixa",
      date: day(14),
    });
    await form.getByRole("button", { name: "Salvar", exact: true }).click();

    const row = transactionRow(page, "Aporte em CDB");

    // Investimento é saída de caixa: aparece com "−", mas em tinta neutra.
    await expect(row).toContainText(ledger(-800));
    await expect(row).toContainText("Renda Fixa");
    expect((await api.list("transactions"))[0]).toMatchObject({ amount: -800, type: "investment" });
  });

  test("sem descrição usa o nome da categoria; sem valor não envia; a folha fecha sem salvar", async ({ page, api }) => {
    await gotoAndWaitForTransactions(page, "/transactions");
    await openRegister(page);

    const form = transactionForm(page);
    const dialog = modal(page, "Registrar");

    await form.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(formError(dialog)).toHaveText("Informe um valor maior que zero.");
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Fechar" }).click();
    await expect(dialog).toBeHidden();

    // Esc e clique fora também fecham sem salvar.
    await openRegister(page);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await openRegister(page);
    await page.mouse.click(5, 5);
    await expect(dialog).toBeHidden();
    expect(await api.list("transactions")).toHaveLength(0);

    await openRegister(page);
    await form.getByLabel("Valor").fill("12,50");
    await form.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(transactionRow(page, "Alimentação")).toContainText(ledger(-12.5));
  });
});

test.describe("Lançamentos — edição e exclusão", () => {
  test("edita descrição, valor, tipo e categoria tocando na linha", async ({ page, api }) => {
    await api.createTransaction({
      description: "Mercado",
      value: 200,
      type: "outcome",
      category: "Alimentação",
      date: day(10),
      notes: "Compra do mês",
    });
    await gotoAndWaitForTransactions(page, "/transactions");

    const dialog = await openTransaction(page, "Mercado");
    const form = transactionForm(page);

    await expect(form.getByLabel("Descrição")).toHaveValue("Mercado");
    await expect(form.getByLabel("Valor")).toHaveValue("200,00");
    await expect(form.getByRole("radio", { name: "Alimentação", exact: true })).toHaveAttribute("aria-checked", "true");
    await expect(form.getByLabel("Observação")).toHaveValue("Compra do mês");

    await form.getByLabel("Descrição").fill("Reembolso do mercado");
    await form.getByLabel("Valor").fill("250");
    await form.getByRole("radio", { name: "Receita", exact: true }).click();
    await form.getByRole("radio", { name: "Outros", exact: true }).click();
    await form.getByRole("button", { name: "Salvar alterações" }).click();

    await expect(dialog).toBeHidden();
    await expect(transactionRow(page, "Reembolso do mercado")).toContainText(ledger(250));
    await expect(transactionRow(page, "Reembolso do mercado")).toContainText("Outros");
    await expect(entryCount(page, 1)).toBeVisible();

    await page.reload();
    await expect(transactionRow(page, "Reembolso do mercado")).toContainText(ledger(250));
    expect(await api.list("transactions")).toHaveLength(1);
    expect((await api.list("transactions"))[0]).toMatchObject({
      description: "Reembolso do mercado",
      amount: 250,
      type: "income",
      category: "Outros",
    });
  });

  test("exclui pela edição somente após confirmar no diálogo", async ({ page, api }) => {
    await api.createTransaction({ description: "Assinatura streaming", value: 40, type: "outcome", category: "Lazer", date: day(9) });
    await api.createTransaction({ description: "Conta de luz", value: 180, type: "outcome", category: "Contas", date: day(10) });
    await gotoAndWaitForTransactions(page, "/transactions");

    let edit = await openTransaction(page, "Assinatura streaming");
    await edit.getByRole("button", { name: "Excluir" }).click();

    const dialog = modal(page, "Confirmar exclusão");

    await expect(dialog).toContainText('Excluir "Assinatura streaming"? Essa ação não pode ser desfeita.');
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialog).toBeHidden();
    await edit.getByRole("button", { name: "Fechar" }).click();
    await expect(transactionRow(page, "Assinatura streaming")).toBeVisible();

    edit = await openTransaction(page, "Assinatura streaming");
    await edit.getByRole("button", { name: "Excluir" }).click();
    await confirmDeletion(page);
    await expect(edit).toBeHidden();

    await expect(transactionRow(page, "Assinatura streaming")).toHaveCount(0);
    await expect(transactionRow(page, "Conta de luz")).toBeVisible();
    await expect(entryCount(page, 1)).toBeVisible();

    await page.reload();
    await expect(transactionRow(page, "Conta de luz")).toBeVisible();
    await expect(transactionRow(page, "Assinatura streaming")).toHaveCount(0);
    expect(await api.list("transactions")).toHaveLength(1);
  });
});

test.describe("Lançamentos — busca, filtros e ordenação", () => {
  test.beforeEach(async ({ page, api }) => {
    for (const seed of SEEDS) {
      await api.createTransaction(seed);
    }

    await gotoAndWaitForTransactions(page, "/transactions");
    await expect(entryCount(page, 5)).toBeVisible();
  });

  const openFilters = (page: import("@playwright/test").Page) =>
    page.getByRole("button", { name: /^Filtros/ }).click();

  test("busca por descrição sem diferenciar maiúsculas", async ({ page }) => {
    await page.getByLabel("Buscar").fill("MERCADO");

    await expect(entryCount(page, 2)).toBeVisible();
    await expect(transactionRows(page)).toHaveText([/Mercado atacado/, /Mercado da semana/]);
  });

  test("filtra por tipo", async ({ page }) => {
    const types = page.getByRole("group", { name: "Tipo" });

    await types.getByRole("button", { name: "Receitas" }).click();
    await expect(transactionRows(page)).toHaveText([/Salário mensal/]);

    await types.getByRole("button", { name: "Gastos" }).click();
    await expect(transactionRows(page)).toHaveText([/Mercado atacado/, /Uber aeroporto/, /Mercado da semana/]);

    await types.getByRole("button", { name: "Investimentos" }).click();
    await expect(transactionRows(page)).toHaveText([/Aporte Tesouro/]);
    await expect(types.getByRole("button", { name: "Investimentos" })).toHaveAttribute("aria-pressed", "true");
  });

  test("filtra por categoria (opções vêm dos lançamentos existentes)", async ({ page }) => {
    await openFilters(page);

    const category = page.getByLabel("Categoria", { exact: true });

    await expect(category.locator("option")).toHaveText([
      "Todas",
      "Alimentação",
      "Renda Fixa",
      "Salário",
      "Transporte",
    ]);
    await category.selectOption("Transporte");

    await expect(transactionRows(page)).toHaveText([/Uber aeroporto/]);
    await expect(page.getByRole("button", { name: "Filtros (1)" })).toBeVisible();
  });

  test("filtra por período", async ({ page }) => {
    await openFilters(page);
    await page.getByLabel("De", { exact: true }).fill(day(12));
    await page.getByLabel("Até", { exact: true }).fill(day(22));

    await expect(entryCount(page, 2)).toBeVisible();
    await expect(transactionRows(page)).toHaveText([/Aporte Tesouro/, /Uber aeroporto/]);
  });

  test("ordena por data (agrupado por dia) e por valor", async ({ page }) => {
    await expect(transactionRows(page)).toHaveText([
      /Mercado atacado/,
      /Aporte Tesouro/,
      /Uber aeroporto/,
      /Mercado da semana/,
      /Salário mensal/,
    ]);
    await expect(page.getByRole("list", { name: /15 de out\./ })).toContainText(ledger(-80));

    await openFilters(page);

    const sort = page.getByLabel("Ordenar");

    await sort.selectOption("Mais antigas");
    await expect(transactionRows(page).first()).toContainText("Salário mensal");
    await expect(transactionRows(page).last()).toContainText("Mercado atacado");

    await sort.selectOption("Maior valor");
    await expect(transactionRows(page)).toHaveText([
      /Salário mensal/,
      /Aporte Tesouro/,
      /Mercado atacado/,
      /Mercado da semana/,
      /Uber aeroporto/,
    ]);
    await expect(page.getByRole("list", { name: /15 de out\./ })).toHaveCount(0);

    await sort.selectOption("Menor valor");
    await expect(transactionRows(page).first()).toContainText("Uber aeroporto");
  });

  test("combina filtros, mostra estado vazio e limpa tudo", async ({ page }) => {
    await page.getByLabel("Buscar").fill("mercado");
    await page.getByRole("group", { name: "Tipo" }).getByRole("button", { name: "Receitas" }).click();

    await expect(entryCount(page, 0)).toBeVisible();
    await expect(page.getByText("Nenhum lançamento encontrado com esses filtros.")).toBeVisible();

    await openFilters(page);
    await page.getByRole("button", { name: "Limpar filtros" }).click();

    await expect(page.getByLabel("Buscar")).toHaveValue("");
    await expect(page.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");
    await expect(entryCount(page, 5)).toBeVisible();
  });

  test("período inclui o próprio dia inicial e final", async ({ page }) => {
    await openFilters(page);
    await page.getByLabel("De", { exact: true }).fill(day(15));
    await page.getByLabel("Até", { exact: true }).fill(day(15));

    await expect(entryCount(page, 1)).toBeVisible();
    await expect(transactionRows(page)).toHaveText([/Uber aeroporto/]);
  });
});

test.describe("Lançamentos — validação e erros", () => {
  test("aceita valores com centavos, com ponto ou vírgula", async ({ page, api }) => {
    await gotoAndWaitForTransactions(page, "/transactions");
    await createTransactionViaUi(page, { description: "Farmácia", amount: "49.90", category: "Saúde", date: day(10) });
    await createTransactionViaUi(page, { description: "Padaria", amount: "1.234,56", category: "Alimentação", date: day(11) });

    await expect(transactionRow(page, "Farmácia")).toContainText(ledger(-49.9));
    await expect(transactionRow(page, "Padaria")).toContainText(ledger(-1234.56));
    const saved = await api.list("transactions");
    expect(saved.map((item) => item.amount).sort()).toEqual([-1234.56, -49.9]);
  });

  test("valor zero, negativo ou inválido é barrado pelo formulário", async ({ page, api }) => {
    await gotoAndWaitForTransactions(page, "/transactions");
    await openRegister(page);

    const dialog = modal(page, "Registrar");
    const form = await fillTransactionForm(page, {
      description: "Valor inválido",
      amount: "-50",
      type: "income",
      category: "Outros",
      date: day(10),
    });

    for (const invalid of ["-50", "0", "abc"]) {
      await form.getByLabel("Valor").fill(invalid);
      await form.getByRole("button", { name: "Salvar", exact: true }).click();
      await expect(formError(dialog)).toHaveText("Informe um valor maior que zero.");
    }

    await expect(dialog).toBeVisible();
    expect(await api.list("transactions")).toHaveLength(0);
  });

  test("API recusa lançamento inválido com 400", async ({ api, context }) => {
    const invalid = [
      { amount: -10, category: "Outros", type: "outcome" },
      { description: "Sem valor", category: "Outros", type: "outcome" },
      { description: "Zero", amount: 0, category: "Outros", type: "outcome" },
      { description: "Tipo estranho", amount: -10, category: "Outros", type: "roubo" },
      { description: "Data ruim", amount: -10, category: "Outros", type: "outcome", date: "ontem" },
    ];

    for (const data of invalid) {
      const response = await context.request.post("/api/transactions", { data });

      expect(response.status(), JSON.stringify(data)).toBe(400);
    }

    expect(await api.list("transactions")).toHaveLength(0);
  });

  test("erro do servidor ao salvar aparece na folha e mantém os dados digitados", async ({ page, account }) => {
    void account;
    await gotoAndWaitForTransactions(page, "/transactions");
    await page.route("**/api/transactions", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 500, json: { error: "Erro ao salvar os dados." } });
        return;
      }

      await route.continue();
    });
    await openRegister(page);

    const dialog = modal(page, "Registrar");
    const form = await fillTransactionForm(page, {
      description: "Não será salva",
      amount: "10",
      category: "Outros",
      date: day(10),
    });

    await form.getByRole("button", { name: "Salvar", exact: true }).click();

    await expect(formError(dialog)).toHaveText("Erro ao salvar os dados.");
    await expect(dialog).toBeVisible();
    await expect(form.getByLabel("Descrição")).toHaveValue("Não será salva");
    await expect(form.getByLabel("Valor")).toHaveValue("10");
    await expect(entryCount(page, 0)).toBeAttached();
  });

  test("falha ao excluir mantém o lançamento e avisa no diálogo", async ({ page, api }) => {
    await api.createTransaction({ description: "Não some", value: 70, type: "outcome", category: "Outros", date: day(10) });
    await page.route("**/api/transactions/*", async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({ status: 500, json: { error: "Erro ao deletar." } });
        return;
      }

      await route.continue();
    });
    await gotoAndWaitForTransactions(page, "/transactions");

    const edit = await openTransaction(page, "Não some");
    await edit.getByRole("button", { name: "Excluir" }).click();

    const dialog = modal(page, "Confirmar exclusão");

    await dialog.getByRole("button", { name: "Excluir" }).click();

    await expect(formError(dialog)).toBeVisible();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await edit.getByRole("button", { name: "Fechar" }).click();
    await expect(transactionRow(page, "Não some")).toBeVisible();
    expect(await api.list("transactions")).toHaveLength(1);
  });
});
