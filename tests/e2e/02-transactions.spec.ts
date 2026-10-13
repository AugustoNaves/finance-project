import { E2E_MONTH } from "./support/env";
import { expect, test, type SeedTransaction } from "./support/fixtures";
import {
  confirmDeletion,
  createTransactionViaUi,
  fillTransactionForm,
  formError,
  gotoAndWaitForTransactions,
  modal,
  transactionForm,
  transactionRow,
} from "./support/ui";

const day = (dayOfMonth: number) => `${E2E_MONTH}-${String(dayOfMonth).padStart(2, "0")}`;

const SEEDS: SeedTransaction[] = [
  { description: "Salário mensal", value: 5000, type: "income", category: "Salário", date: day(5) },
  { description: "Mercado da semana", value: 300, type: "outcome", category: "Alimentação", date: day(8) },
  { description: "Uber aeroporto", value: 80, type: "outcome", category: "Transporte", date: day(15) },
  { description: "Aporte Tesouro", value: 1000, type: "investment", category: "Renda Fixa", date: day(20) },
  { description: "Mercado atacado", value: 450, type: "outcome", category: "Alimentação", date: day(25) },
];

test.describe("Transações — criação", () => {
  test("cria uma receita pelo modal, lista e mantém após recarregar", async ({ page, api }) => {
    await gotoAndWaitForTransactions(page, "/transactions");
    await expect(page.getByText("Nenhuma transação encontrada com os filtros atuais.")).toBeVisible();
    await expect(page.getByText("0 registro(s) encontrado(s)")).toBeVisible();

    await createTransactionViaUi(page, {
      description: "Salário de outubro",
      amount: "5000",
      type: "income",
      category: "Salário",
      date: day(10),
    });

    const row = transactionRow(page, "Salário de outubro");

    await expect(row).toBeVisible();
    await expect(row).toContainText("+R$ 5.000,00");
    await expect(row).toContainText("Salário");
    await expect(page.getByText("1 registro(s) encontrado(s)")).toBeVisible();

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
    await expect(transactionRow(page, "Salário de outubro")).toContainText("+R$ 5.000,00");
  });

  test("cria uma despesa com forma de pagamento e observação", async ({ page, api }) => {
    await gotoAndWaitForTransactions(page, "/transactions");
    await page.getByRole("button", { name: "+ Nova Transação" }).click();

    const form = transactionForm(page);

    // Padrão do formulário: tipo Saída com a primeira categoria de despesa.
    await expect(form.getByLabel("Categoria", { exact: true })).toHaveValue("Alimentação");
    await expect(form.getByLabel("Forma de pagamento")).toHaveValue("Pix");
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

    await fillTransactionForm(page, {
      description: "Jantar de aniversário",
      amount: "150",
      category: "Lazer",
      date: day(12),
      paymentMethod: "Cartão de crédito",
      notes: "Restaurante com a família",
    });
    await form.getByRole("button", { name: "Salvar Transação" }).click();

    const row = transactionRow(page, "Jantar de aniversário");

    await expect(row).toContainText("-R$ 150,00");
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

  test("cria um investimento com as categorias de investimento", async ({ page, api }) => {
    await gotoAndWaitForTransactions(page, "/transactions");
    await page.getByRole("button", { name: "+ Nova Transação" }).click();

    const form = transactionForm(page);

    await form.getByRole("button", { name: "Investimento", exact: true }).click();
    await expect(form.getByLabel("Categoria", { exact: true }).locator("option")).toHaveText([
      "Selecione uma categoria",
      "Ações",
      "Criptomoedas",
      "Fundos",
      "Outros",
      "Renda Fixa",
    ]);

    await fillTransactionForm(page, {
      description: "Aporte em CDB",
      amount: "800",
      category: "Renda Fixa",
      date: day(14),
    });
    await form.getByRole("button", { name: "Salvar Transação" }).click();

    const row = transactionRow(page, "Aporte em CDB");

    // Investimentos aparecem sem sinal na lista, mas são gravados como saída de caixa.
    await expect(row).toContainText("R$ 800,00");
    await expect(row).not.toContainText("-R$");
    await expect(row).toContainText("Renda Fixa");
    expect((await api.list("transactions"))[0]).toMatchObject({ amount: -800, type: "investment" });
  });

  test("campos obrigatórios impedem o envio e o modal pode ser fechado sem salvar", async ({ page, api }) => {
    await gotoAndWaitForTransactions(page, "/transactions");
    await page.getByRole("button", { name: "+ Nova Transação" }).click();

    const form = transactionForm(page);
    const dialog = modal(page, "Nova Transação");

    await form.getByRole("button", { name: "Salvar Transação" }).click();
    await expect(form.getByLabel("Descrição")).toHaveJSProperty("validity.valueMissing", true);
    await expect(dialog).toBeVisible();

    await form.getByLabel("Descrição").fill("Rascunho descartado");
    await form.getByRole("button", { name: "Salvar Transação" }).click();
    await expect(form.getByLabel("Valor")).toHaveJSProperty("validity.valueMissing", true);

    await dialog.getByRole("button", { name: "Fechar" }).click();
    await expect(dialog).toBeHidden();

    // Esc e clique fora também fecham sem salvar.
    await page.getByRole("button", { name: "+ Nova Transação" }).click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await page.getByRole("button", { name: "+ Nova Transação" }).click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(dialog).toBeHidden();
    expect(await api.list("transactions")).toHaveLength(0);
  });
});

test.describe("Transações — edição e exclusão", () => {
  test("edita descrição, valor, tipo e categoria", async ({ page, api }) => {
    await api.createTransaction({
      description: "Mercado",
      value: 200,
      type: "outcome",
      category: "Alimentação",
      date: day(10),
      notes: "Compra do mês",
    });
    await gotoAndWaitForTransactions(page, "/transactions");

    await transactionRow(page, "Mercado").getByRole("button", { name: "Editar" }).click();

    const dialog = modal(page, "Editar transação");
    const form = transactionForm(page);

    await expect(dialog).toBeVisible();
    await expect(form.getByLabel("Descrição")).toHaveValue("Mercado");
    await expect(form.getByLabel("Valor")).toHaveValue("200");
    await expect(form.getByLabel("Categoria", { exact: true })).toHaveValue("Alimentação");
    await expect(form.getByLabel("Observação")).toHaveValue("Compra do mês");

    await form.getByLabel("Descrição").fill("Reembolso do mercado");
    await form.getByLabel("Valor").fill("250");
    await form.getByRole("button", { name: "Entrada", exact: true }).click();
    await form.getByLabel("Categoria", { exact: true }).selectOption("Outros");
    await form.getByRole("button", { name: "Salvar alterações" }).click();

    await expect(dialog).toBeHidden();
    await expect(transactionRow(page, "Reembolso do mercado")).toContainText("+R$ 250,00");
    await expect(transactionRow(page, "Reembolso do mercado")).toContainText("Outros");
    await expect(page.getByText("1 registro(s) encontrado(s)")).toBeVisible();

    await page.reload();
    await expect(transactionRow(page, "Reembolso do mercado")).toContainText("+R$ 250,00");
    expect(await api.list("transactions")).toHaveLength(1);
    expect((await api.list("transactions"))[0]).toMatchObject({
      description: "Reembolso do mercado",
      amount: 250,
      type: "income",
      category: "Outros",
    });
  });

  test("exclui somente após confirmar no diálogo", async ({ page, api }) => {
    await api.createTransaction({ description: "Assinatura streaming", value: 40, type: "outcome", category: "Lazer", date: day(9) });
    await api.createTransaction({ description: "Conta de luz", value: 180, type: "outcome", category: "Contas", date: day(10) });
    await gotoAndWaitForTransactions(page, "/transactions");

    await transactionRow(page, "Assinatura streaming").getByRole("button", { name: "Excluir" }).click();

    const dialog = modal(page, "Confirmar exclusão");

    await expect(dialog).toContainText('Tem certeza que deseja excluir a transação "Assinatura streaming"?');
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialog).toBeHidden();
    await expect(transactionRow(page, "Assinatura streaming")).toBeVisible();

    await transactionRow(page, "Assinatura streaming").getByRole("button", { name: "Excluir" }).click();
    await confirmDeletion(page);

    await expect(transactionRow(page, "Assinatura streaming")).toHaveCount(0);
    await expect(transactionRow(page, "Conta de luz")).toBeVisible();
    await expect(page.getByText("1 registro(s) encontrado(s)")).toBeVisible();

    await page.reload();
    await expect(transactionRow(page, "Conta de luz")).toBeVisible();
    await expect(transactionRow(page, "Assinatura streaming")).toHaveCount(0);
    expect(await api.list("transactions")).toHaveLength(1);
  });
});

test.describe("Transações — busca, filtros e ordenação", () => {
  test.beforeEach(async ({ page, api }) => {
    for (const seed of SEEDS) {
      await api.createTransaction(seed);
    }

    await gotoAndWaitForTransactions(page, "/transactions");
    await expect(page.getByText("5 registro(s) encontrado(s)")).toBeVisible();
  });

  const rows = (page: import("@playwright/test").Page) => page.getByRole("table").locator("tbody tr");

  test("busca por descrição sem diferenciar maiúsculas", async ({ page }) => {
    await page.getByLabel("Buscar").fill("MERCADO");

    await expect(page.getByText("2 registro(s) encontrado(s)")).toBeVisible();
    await expect(rows(page)).toHaveText([/Mercado atacado/, /Mercado da semana/]);
  });

  test("filtra por tipo", async ({ page }) => {
    const type = page.getByLabel("Tipo", { exact: true });

    await type.selectOption("Receitas");
    await expect(rows(page)).toHaveText([/Salário mensal/]);

    await type.selectOption("Despesas");
    await expect(rows(page)).toHaveText([/Mercado atacado/, /Uber aeroporto/, /Mercado da semana/]);

    await type.selectOption("Investimentos");
    await expect(rows(page)).toHaveText([/Aporte Tesouro/]);
  });

  test("filtra por categoria (opções vêm das transações existentes)", async ({ page }) => {
    const category = page.getByLabel("Categoria", { exact: true });

    await expect(category.locator("option")).toHaveText([
      "Todas",
      "Alimentação",
      "Renda Fixa",
      "Salário",
      "Transporte",
    ]);
    await category.selectOption("Transporte");

    await expect(rows(page)).toHaveText([/Uber aeroporto/]);
  });

  test("filtra por período", async ({ page }) => {
    await page.getByLabel("De", { exact: true }).fill(day(12));
    await page.getByLabel("Até", { exact: true }).fill(day(22));

    await expect(page.getByText("2 registro(s) encontrado(s)")).toBeVisible();
    await expect(rows(page)).toHaveText([/Aporte Tesouro/, /Uber aeroporto/]);
  });

  test("ordena por data e por valor", async ({ page }) => {
    const sort = page.getByLabel("Ordenar");

    await expect(rows(page)).toHaveText([
      /Mercado atacado/,
      /Aporte Tesouro/,
      /Uber aeroporto/,
      /Mercado da semana/,
      /Salário mensal/,
    ]);

    await sort.selectOption("Mais antigas");
    await expect(rows(page).first()).toContainText("Salário mensal");
    await expect(rows(page).last()).toContainText("Mercado atacado");

    await sort.selectOption("Maior valor");
    await expect(rows(page)).toHaveText([
      /Salário mensal/,
      /Aporte Tesouro/,
      /Mercado atacado/,
      /Mercado da semana/,
      /Uber aeroporto/,
    ]);

    await sort.selectOption("Menor valor");
    await expect(rows(page).first()).toContainText("Uber aeroporto");
  });

  test("combina filtros, mostra estado vazio e limpa tudo", async ({ page }) => {
    await page.getByLabel("Buscar").fill("mercado");
    await page.getByLabel("Tipo", { exact: true }).selectOption("Receitas");

    await expect(page.getByText("0 registro(s) encontrado(s)")).toBeVisible();
    await expect(page.getByText("Nenhuma transação encontrada com os filtros atuais.")).toBeVisible();

    await page.getByRole("button", { name: "Limpar filtros" }).click();

    await expect(page.getByLabel("Buscar")).toHaveValue("");
    await expect(page.getByLabel("Tipo", { exact: true })).toHaveValue("all");
    await expect(page.getByText("5 registro(s) encontrado(s)")).toBeVisible();
  });

  test("período inclui o próprio dia inicial e final", async ({ page }) => {
    await page.getByLabel("De", { exact: true }).fill(day(15));
    await page.getByLabel("Até", { exact: true }).fill(day(15));

    await expect(page.getByText("1 registro(s) encontrado(s)")).toBeVisible();
    await expect(rows(page)).toHaveText([/Uber aeroporto/]);
  });
});

test.describe("Transações — validação e erros", () => {
  test("aceita valores com centavos", async ({ page, api }) => {
    await gotoAndWaitForTransactions(page, "/transactions");
    await createTransactionViaUi(page, { description: "Farmácia", amount: "49.90", category: "Saúde", date: day(10) });

    await expect(transactionRow(page, "Farmácia")).toContainText("-R$ 49,90");
    expect((await api.list("transactions"))[0]).toMatchObject({ amount: -49.9 });
  });

  test("valor zero ou negativo é barrado pelo formulário", async ({ page, api }) => {
    await gotoAndWaitForTransactions(page, "/transactions");
    await page.getByRole("button", { name: "+ Nova Transação" }).click();

    const form = await fillTransactionForm(page, {
      description: "Valor inválido",
      amount: "-50",
      type: "income",
      category: "Outros",
      date: day(10),
    });

    await form.getByRole("button", { name: "Salvar Transação" }).click();
    await expect(form.getByLabel("Valor")).toHaveJSProperty("validity.rangeUnderflow", true);

    await form.getByLabel("Valor").fill("0");
    await form.getByRole("button", { name: "Salvar Transação" }).click();
    await expect(form.getByLabel("Valor")).toHaveJSProperty("validity.rangeUnderflow", true);

    await expect(modal(page, "Nova Transação")).toBeVisible();
    expect(await api.list("transactions")).toHaveLength(0);
  });

  test("API recusa transação inválida com 400", async ({ api, context }) => {
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

  test("erro do servidor ao salvar aparece no modal e mantém os dados digitados", async ({ page, account }) => {
    void account;
    await gotoAndWaitForTransactions(page, "/transactions");
    await page.route("**/api/transactions", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 500, json: { error: "Erro ao salvar os dados." } });
        return;
      }

      await route.continue();
    });
    await page.getByRole("button", { name: "+ Nova Transação" }).click();

    const dialog = modal(page, "Nova Transação");
    const form = await fillTransactionForm(page, {
      description: "Não será salva",
      amount: "10",
      category: "Outros",
      date: day(10),
    });

    await form.getByRole("button", { name: "Salvar Transação" }).click();

    await expect(formError(dialog)).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(form.getByLabel("Descrição")).toHaveValue("Não será salva");
    await expect(form.getByLabel("Valor")).toHaveValue("10");
    await expect(page.getByText("0 registro(s) encontrado(s)")).toBeVisible();
  });

  test("falha ao excluir mantém a transação e avisa no diálogo", async ({ page, api }) => {
    await api.createTransaction({ description: "Não some", value: 70, type: "outcome", category: "Outros", date: day(10) });
    await page.route("**/api/transactions/*", async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({ status: 500, json: { error: "Erro ao deletar." } });
        return;
      }

      await route.continue();
    });
    await gotoAndWaitForTransactions(page, "/transactions");
    await transactionRow(page, "Não some").getByRole("button", { name: "Excluir" }).click();

    const dialog = modal(page, "Confirmar exclusão");

    await dialog.getByRole("button", { name: "Confirmar exclusão" }).click();

    await expect(formError(dialog)).toBeVisible();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(transactionRow(page, "Não some")).toBeVisible();
    expect(await api.list("transactions")).toHaveLength(1);
  });
});
