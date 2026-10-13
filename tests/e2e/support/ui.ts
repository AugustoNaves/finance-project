import { expect, type Locator, type Page } from "@playwright/test";
import type { TransactionKind } from "./fixtures";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Valor em reais como o app exibe (ex.: "R$ 1.234,50", "-R$ 80,00"). */
export function money(value: number) {
  return currency.format(value).replace(/\s/g, " ");
}

/** Modal do app: role="dialog" com aria-label igual ao título. */
export function modal(page: Page, title: string) {
  return page.getByRole("dialog", { name: title, exact: true });
}

/** Mensagem de erro exibida dentro de um formulário/modal (FormError, role="alert"). */
export function formError(scope: Page | Locator) {
  return scope.getByRole("alert").filter({ hasText: /\S/ });
}

/**
 * Bloco de métrica/cartão a partir do rótulo visível (SummaryCard, InsightCard,
 * ReportMetricCard, linhas de MonthSummary, DetailItem...).
 */
export function metric(scope: Page | Locator, title: string) {
  const root = "getByRole" in scope && "goto" in scope ? scope.getByRole("main") : scope;

  return root
    .getByText(title, { exact: true })
    .first()
    .locator("xpath=ancestor::*[self::article or self::div][1]");
}

/** Cartão (categoria, orçamento, meta) identificado pelo título. */
export function card(page: Page, title: string) {
  return page
    .getByRole("main")
    .getByRole("heading", { name: title, exact: true })
    .locator("xpath=ancestor::article[1]");
}

/** Seção da página identificada pelo título (h2). */
export function section(page: Page, heading: string | RegExp) {
  return page
    .getByRole("main")
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: heading, level: 2 }) })
    .last();
}

export function transactionRow(page: Page, description: string) {
  return page.getByRole("row").filter({ hasText: description });
}

export function transactionForm(page: Page) {
  return page.locator("form").filter({ has: page.getByLabel("Descrição") });
}

const TYPE_BUTTON: Record<TransactionKind, string> = {
  income: "Entrada",
  outcome: "Saída",
  investment: "Investimento",
};

export type TransactionInput = {
  description: string;
  amount: string;
  type?: TransactionKind;
  category?: string;
  date?: string;
  paymentMethod?: string;
  notes?: string;
};

export async function fillTransactionForm(page: Page, input: TransactionInput) {
  const form = transactionForm(page);
  const category = form.getByLabel("Categoria", { exact: true });

  // As categorias chegam por fetch; espera o select sair do "Carregando...".
  await expect(category.locator("option", { hasText: "Selecione uma categoria" })).toBeAttached();

  await form.getByLabel("Descrição").fill(input.description);
  await form.getByLabel("Valor").fill(input.amount);

  if (input.date) {
    await form.getByLabel("Data").fill(input.date);
  }

  if (input.type) {
    await form.getByRole("button", { name: TYPE_BUTTON[input.type], exact: true }).click();
  }

  if (input.category) {
    await category.selectOption(input.category);
  }

  if (input.paymentMethod) {
    await form.getByLabel("Forma de pagamento").selectOption(input.paymentMethod);
  }

  if (input.notes) {
    await form.getByLabel("Observação").fill(input.notes);
  }

  return form;
}

/** Abre o modal pelo botão do cabeçalho, preenche e salva uma transação. */
export async function createTransactionViaUi(
  page: Page,
  input: TransactionInput,
  openLabel = "+ Nova Transação",
) {
  await page.getByRole("button", { name: openLabel }).click();
  await expect(modal(page, "Nova Transação")).toBeVisible();

  const form = await fillTransactionForm(page, input);

  await form.getByRole("button", { name: "Salvar Transação" }).click();
  await expect(modal(page, "Nova Transação")).toBeHidden();
}

export async function confirmDeletion(page: Page) {
  const dialog = modal(page, "Confirmar exclusão");

  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Confirmar exclusão" }).click();
  await expect(dialog).toBeHidden();
}

/** Espera o app terminar de carregar as transações do usuário. */
export async function gotoAndWaitForTransactions(page: Page, path: string) {
  const loaded = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/transactions" &&
      response.request().method() === "GET",
    // O `next dev` pode demorar a responder quando recompila sob carga.
    { timeout: 45_000 },
  );

  await page.goto(path);
  await loaded;
}
