import { E2E_MONTH, E2E_MONTH_LABEL } from "./support/env";
import { expect, test } from "./support/fixtures";
import { createTransactionViaUi, gotoAndWaitForTransactions, metric, money, section } from "./support/ui";

const day = (dayOfMonth: number) => `${E2E_MONTH}-${String(dayOfMonth).padStart(2, "0")}`;

test.describe("Dashboard", () => {
  test("usuário novo vê o painel zerado com estados vazios", async ({ page, account }) => {
    void account;
    await gotoAndWaitForTransactions(page, "/");

    await expect(page.getByRole("heading", { name: "Controle financeiro" })).toBeVisible();

    for (const title of ["Receitas", "Despesas", "Investimentos", "Saldo Total"]) {
      await expect(metric(page, title)).toContainText(money(0));
    }

    await expect(page.getByText("Nenhuma transação registrada ainda.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Resumo do mês" })).toBeVisible();
    await expect(page.getByText(E2E_MONTH_LABEL)).toBeVisible();
    await expect(page.getByText("Sem receitas")).toBeVisible();
    await expect(metric(page, "Maior despesa")).toContainText("Sem dados");
    await expect(metric(page, "Categoria em destaque")).toContainText("Sem dados");
    await expect(metric(page, "Movimento do mês")).toContainText("0");
    await expect(metric(page, "Meta mais próxima")).toContainText("Sem metas");
  });

  test("cartões, resumo do mês e indicadores refletem as transações", async ({ page, api }) => {
    await api.createTransaction({ description: "Salário", value: 5000, type: "income", category: "Salário", date: day(10) });
    await api.createTransaction({ description: "Aluguel", value: 1200, type: "outcome", category: "Moradia", date: day(5) });
    await api.createTransaction({ description: "Feira", value: 300, type: "outcome", category: "Alimentação", date: day(8) });
    await api.createTransaction({ description: "Aporte ações", value: 1000, type: "investment", category: "Ações", date: day(12) });
    // Mês anterior: entra nos totais gerais, não no resumo do mês.
    await api.createTransaction({ description: "Freela setembro", value: 2000, type: "income", category: "Freelance", date: "2026-09-10" });
    await api.createTransaction({ description: "Show setembro", value: 500, type: "outcome", category: "Lazer", date: "2026-09-12" });

    await gotoAndWaitForTransactions(page, "/");

    // Cartões do topo: acumulado de todas as transações.
    await expect(metric(page, "Receitas")).toContainText(money(7000));
    await expect(metric(page, "Despesas")).toContainText(money(-2000));
    await expect(metric(page, "Investimentos")).toContainText(money(1000));
    await expect(metric(page, "Saldo Total")).toContainText(money(4000));

    // Resumo do mês corrente.
    await expect(page.getByText(E2E_MONTH_LABEL)).toBeVisible();
    await expect(metric(page, "Entradas")).toContainText(money(5000));
    await expect(metric(page, "Saídas")).toContainText(money(-1500));
    await expect(metric(page, "Saldo do mês")).toContainText(money(2500));
    await expect(page.getByText("50% economizado")).toBeVisible();

    await expect(metric(page, "Maior despesa")).toContainText(money(-1200));
    await expect(metric(page, "Maior despesa")).toContainText("Aluguel foi a maior saída deste mês.");
    await expect(metric(page, "Categoria em destaque")).toContainText("Moradia");
    await expect(metric(page, "Categoria em destaque")).toContainText(`${money(1200)} concentrados nesta categoria.`);
    await expect(metric(page, "Movimento do mês")).toContainText("4");
  });

  test("últimas transações mostra as 5 mais recentes em ordem", async ({ page, api }) => {
    for (const [index, description] of ["Um", "Dois", "Três", "Quatro", "Cinco", "Seis"].entries()) {
      await api.createTransaction({
        description: `Compra ${description}`,
        value: 10 * (index + 1),
        type: "outcome",
        category: "Outros",
        date: day(index + 2),
      });
    }

    await gotoAndWaitForTransactions(page, "/");

    const latest = section(page, "Últimas transações");
    const rows = latest.getByRole("table").locator("tbody tr");

    await expect(rows).toHaveText([/Compra Seis/, /Compra Cinco/, /Compra Quatro/, /Compra Três/, /Compra Dois/]);
    await expect(rows.first()).toContainText(money(-60));
    await expect(rows.first()).toContainText("Outros");
    await expect(rows.first()).toContainText("07/10/2026");
    await expect(latest.getByText("Compra Um")).toHaveCount(0);
  });

  test("nova transação criada no painel atualiza os números sem recarregar", async ({ page, api }) => {
    await api.createTransaction({ description: "Salário", value: 3000, type: "income", category: "Salário", date: day(5) });
    await gotoAndWaitForTransactions(page, "/");
    await expect(metric(page, "Saldo Total")).toContainText(money(3000));

    await createTransactionViaUi(page, {
      description: "Conta de internet",
      amount: "120",
      category: "Contas",
      date: day(14),
    });

    await expect(metric(page, "Despesas")).toContainText(money(-120));
    await expect(metric(page, "Saldo Total")).toContainText(money(2880));
    await expect(metric(page, "Saídas")).toContainText(money(-120));
    await expect(metric(page, "Saldo do mês")).toContainText(money(2880));
    await expect(page.getByText("96% economizado")).toBeVisible();
    await expect(metric(page, "Movimento do mês")).toContainText("2");
    await expect(metric(page, "Categoria em destaque")).toContainText("Contas");
    await expect(
      section(page, "Últimas transações").getByRole("table").locator("tbody tr").first(),
    ).toContainText("Conta de internet");

    await page.reload();
    await expect(metric(page, "Saldo Total")).toContainText(money(2880));
  });

  test("indicador Meta mais próxima usa a meta com maior progresso", async ({ page, api }) => {
    await api.createGoal({ name: "Reserva", targetAmount: 10000, currentAmount: 2500 });
    await api.createGoal({ name: "Viagem", targetAmount: 5000, currentAmount: 4000 });
    // Metas já concluídas não contam como "mais próxima".
    await api.createGoal({ name: "Celular", targetAmount: 3000, currentAmount: 3000 });

    await page.goto("/");

    await expect(metric(page, "Meta mais próxima")).toContainText("80%");
    await expect(metric(page, "Meta mais próxima")).toContainText(
      `Viagem: ${money(4000)} de ${money(5000)}.`,
    );
  });

  test("navegação principal leva a todas as áreas do app", async ({ page, account }) => {
    void account;
    await page.goto("/");

    const nav = page.getByRole("navigation", { name: "Navegação principal" });
    const destinations: Array<[string, RegExp, string]> = [
      ["Transações", /\/transactions$/, "Todas as movimentações"],
      ["Categorias", /\/categories$/, "Organize seus grupos"],
      ["Investimentos", /\/investments$/, "Aportes e patrimônio"],
      ["Planejamento", /\/planning$/, "Orçamentos e metas"],
      ["Relatórios", /\/reports$/, "Análise do período"],
      ["Configurações", /\/settings$/, "Conta e dados"],
      ["Início", /localhost:\d+\/$/, "Controle financeiro"],
    ];

    for (const [label, url, heading] of destinations) {
      await nav.getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(url);
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    }
  });
});
