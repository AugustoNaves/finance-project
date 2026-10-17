import { E2E_MONTH, E2E_MONTH_LABEL } from "./support/env";
import { expect, test } from "./support/fixtures";
import {
  confirmDeletion,
  entryCount,
  fillTransactionForm,
  gotoAndWaitForTransactions,
  ledger,
  modal,
  money,
  openTransaction,
  transactionForm,
  transactionRow,
} from "./support/ui";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

const PAGES = ["/", "/transactions", "/import", "/categories", "/investments", "/planning", "/reports", "/settings"];

test.describe("Responsivo (celular 390×844)", () => {
  test("barra inferior navega pelas áreas do dia a dia e 'Mais' pelas demais", async ({ page, account }) => {
    void account;
    await page.goto("/");

    const tabBar = page.getByRole("navigation", { name: "Navegação principal" });

    await expect(tabBar).toBeVisible();
    await expect(tabBar).toBeInViewport();
    // A coluna lateral do desktop some no celular.
    await expect(page.getByRole("navigation", { name: "Dia a dia" })).toBeHidden();

    for (const [label, url, heading] of [
      ["Lançamentos", /\/transactions$/, "Lançamentos"],
      ["Planejar", /\/planning$/, "Planejar"],
      ["Mês", /localhost:\d+\/$/, E2E_MONTH_LABEL],
    ] as const) {
      await tabBar.getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(url);
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
      await expect(tabBar.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
    }

    const more = tabBar.getByRole("button", { name: "Mais" });
    const sheet = page.getByRole("dialog", { name: "Mais" });

    for (const [label, url, heading] of [
      ["Importar fatura", /\/import$/, "Importar fatura"],
      ["Categorias e regras", /\/categories$/, "Categorias e regras"],
      ["Investimentos", /\/investments$/, "Investimentos"],
      ["Relatórios", /\/reports$/, "Relatórios"],
      ["Configurações", /\/settings$/, "Configurações"],
    ] as const) {
      await more.click();
      await expect(more).toHaveAttribute("aria-expanded", "true");
      await sheet.getByRole("link", { name: new RegExp(`^${label}`) }).click();

      await expect(page).toHaveURL(url);
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
      await expect(sheet).toBeHidden();
    }
  });

  test("folha 'Mais' fecha pelo botão Fechar e oferece Sair", async ({ page, account }) => {
    void account;
    await page.goto("/transactions");

    await page.getByRole("button", { name: "Mais" }).click();

    const sheet = page.getByRole("dialog", { name: "Mais" });

    await expect(sheet.getByRole("button", { name: "Sair" })).toBeVisible();
    await sheet.getByRole("button", { name: "Fechar" }).click();

    await expect(sheet).toBeHidden();
    await expect(page).toHaveURL(/\/transactions$/);
  });

  test("lançamentos em linhas no celular: registrar pela barra, editar e excluir tocando na linha", async ({ page, api }) => {
    await api.createTransaction({
      description: "Café da manhã",
      value: 25,
      type: "outcome",
      category: "Alimentação",
      date: `${E2E_MONTH}-09`,
    });
    await gotoAndWaitForTransactions(page, "/transactions");

    const coffee = transactionRow(page, "Café da manhã");

    await expect(coffee).toBeVisible();
    await expect(coffee).toContainText(ledger(-25));
    await expect(page.getByRole("list", { name: "sex., 9 de out." })).toContainText("Café da manhã");

    await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("button", { name: "Registrar" }).click();
    await expect(modal(page, "Registrar")).toBeInViewport();
    await fillTransactionForm(page, {
      description: "Pix recebido",
      amount: "300",
      type: "income",
      category: "Outros",
      date: `${E2E_MONTH}-11`,
    });
    await transactionForm(page).getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(modal(page, "Registrar")).toBeHidden();

    const pix = transactionRow(page, "Pix recebido");

    await expect(pix).toContainText(ledger(300));

    await openTransaction(page, "Pix recebido");
    await transactionForm(page).getByLabel("Valor").fill("350");
    await transactionForm(page).getByRole("button", { name: "Salvar alterações" }).click();
    await expect(pix).toContainText(ledger(350));

    const edit = await openTransaction(page, "Café da manhã");
    await edit.getByRole("button", { name: "Excluir" }).click();
    await confirmDeletion(page);

    await expect(coffee).toHaveCount(0);
    await expect(entryCount(page, 1)).toBeVisible();
    expect(await api.list("transactions")).toHaveLength(1);
  });

  test("mês cabe no celular com a sobra no topo", async ({ page, api }) => {
    await api.createTransaction({ description: "Salário", value: 2500, type: "income", category: "Salário", date: `${E2E_MONTH}-05` });
    await gotoAndWaitForTransactions(page, "/");

    const summary = page.getByRole("region", { name: "Sobra do mês" });

    await expect(summary).toContainText(money(2500));
    await expect(summary).toBeInViewport();
    await expect(transactionRow(page, "Salário")).toContainText("Salário · seg., 5 de out.");
  });

  test("tela de login cabe no celular e esconde a página de caderno decorativa", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Entrar", level: 1 })).toBeVisible();
    await expect(page.getByLabel("E-mail")).toBeVisible();
    await expect(page.locator("form").getByRole("button", { name: "Entrar" })).toBeInViewport();
    await expect(page.getByText("3.682,40")).toBeHidden();
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
