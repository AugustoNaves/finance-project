import { E2E_MONTH } from "./support/env";
import { expect, test } from "./support/fixtures";
import { fillTransactionForm, gotoAndWaitForTransactions, metric, modal, money, transactionForm } from "./support/ui";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

const PAGES = ["/", "/transactions", "/import", "/categories", "/investments", "/planning", "/reports", "/settings"];

test.describe("Responsivo (celular 390×844)", () => {
  test("menu lateral abre, navega por todas as páginas e fecha", async ({ page, account }) => {
    void account;
    await page.goto("/");

    const menuButton = page.getByRole("button", { name: "Menu" });
    const drawer = page.getByRole("dialog", { name: "Navegação principal" });

    await expect(menuButton).toBeVisible();
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    // A navegação de desktop some no celular.
    await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeHidden();

    const destinations: Array<[string, RegExp, string]> = [
      ["Transações", /\/transactions$/, "Todas as movimentações"],
      ["Importar", /\/import$/, "Fatura por PDF"],
      ["Categorias", /\/categories$/, "Organize seus grupos"],
      ["Investimentos", /\/investments$/, "Aportes e patrimônio"],
      ["Planejamento", /\/planning$/, "Orçamentos e metas"],
      ["Relatórios", /\/reports$/, "Análise do período"],
      ["Configurações", /\/settings$/, "Conta e dados"],
      ["Início", /localhost:\d+\/$/, "Controle financeiro"],
    ];

    for (const [label, url, heading] of destinations) {
      await menuButton.click();
      await expect(menuButton).toHaveAttribute("aria-expanded", "true");
      await drawer.getByRole("link", { name: label, exact: true }).click();

      await expect(page).toHaveURL(url);
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
      await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    }
  });

  test("menu lateral fecha pelo botão Fechar", async ({ page, account }) => {
    void account;
    await page.goto("/transactions");

    const menuButton = page.getByRole("button", { name: "Menu" });

    await menuButton.click();
    await expect(page.getByRole("dialog", { name: "Navegação principal" })).toBeVisible();
    await page.getByRole("dialog", { name: "Navegação principal" }).getByRole("button", { name: "Fechar" }).click();

    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await expect(page).toHaveURL(/\/transactions$/);
  });

  test("transações usam cartões no celular: criar, editar e excluir", async ({ page, api }) => {
    await api.createTransaction({
      description: "Café da manhã",
      value: 25,
      type: "outcome",
      category: "Alimentação",
      date: `${E2E_MONTH}-09`,
    });
    await gotoAndWaitForTransactions(page, "/transactions");

    await expect(page.getByRole("table")).toBeHidden();

    const coffee = page.getByRole("article").filter({ hasText: "Café da manhã" });

    await expect(coffee).toBeVisible();
    await expect(coffee).toContainText(money(-25));
    await expect(coffee).toContainText("Alimentação • 09/10/2026");

    await page.getByRole("button", { name: "+ Nova Transação" }).click();
    await fillTransactionForm(page, {
      description: "Pix recebido",
      amount: "300",
      type: "income",
      category: "Outros",
      date: `${E2E_MONTH}-11`,
    });
    await transactionForm(page).getByRole("button", { name: "Salvar Transação" }).click();
    await expect(modal(page, "Nova Transação")).toBeHidden();

    const pix = page.getByRole("article").filter({ hasText: "Pix recebido" });

    await expect(pix).toContainText(`+${money(300)}`);

    await pix.getByRole("button", { name: "Editar" }).click();
    await transactionForm(page).getByLabel("Valor").fill("350");
    await transactionForm(page).getByRole("button", { name: "Salvar alterações" }).click();
    await expect(pix).toContainText(`+${money(350)}`);

    await coffee.getByRole("button", { name: "Excluir" }).click();
    await modal(page, "Confirmar exclusão").getByRole("button", { name: "Confirmar exclusão" }).click();

    await expect(coffee).toHaveCount(0);
    await expect(page.getByText("1 registro(s) encontrado(s)")).toBeVisible();
    expect(await api.list("transactions")).toHaveLength(1);
  });

  test("painel mostra cartões e últimas transações no celular", async ({ page, api }) => {
    await api.createTransaction({ description: "Salário", value: 2500, type: "income", category: "Salário", date: `${E2E_MONTH}-05` });
    await gotoAndWaitForTransactions(page, "/");

    await expect(metric(page, "Saldo Total")).toContainText(money(2500));
    await expect(page.getByRole("table")).toBeHidden();
    await expect(page.getByRole("article").filter({ hasText: "Salário • 05/10/2026" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Resumo do mês" })).toBeVisible();
  });

  test("tela de login cabe no celular e esconde o painel decorativo", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Bem-vindo" })).toBeVisible();
    await expect(page.getByLabel("E-mail")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar na conta" })).toBeInViewport();
    await expect(page.getByText("Gerencie receitas, despesas e saldo com clareza e segurança.")).toBeHidden();
  });

  for (const route of PAGES) {
    test(`${route} não gera rolagem horizontal`, async ({ page, api }) => {
      await api.createTransaction({
        description: "Compra com uma descrição bem longa para testar quebra de linha",
        value: 123456.78,
        type: "outcome",
        category: "Alimentação",
        date: `${E2E_MONTH}-09`,
      });
      await api.createBudget({ category: "Alimentação", amount: 100, month: E2E_MONTH });
      await api.createGoal({ name: "Meta com nome razoavelmente comprido", targetAmount: 1000000, currentAmount: 250000 });
      await gotoAndWaitForTransactions(page, route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );

      expect(overflow, "largura do conteúdo além da viewport (px)").toBeLessThanOrEqual(1);
    });
  }
});
