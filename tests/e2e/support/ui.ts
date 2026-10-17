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

/** Valor como as listas do app exibem: sinal tipográfico e sem "R$" (ex.: "−1.234,50", "+80,00"). */
export function ledger(value: number) {
  const absolute = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Math.abs(value),
  );

  if (value > 0) return `+${absolute}`;
  if (value < 0) return `−${absolute}`;
  return absolute;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Linha de lançamento (botão que abre a edição), localizada pela descrição. */
export function transactionRow(page: Page, description: string) {
  return page
    .getByRole("main")
    .getByRole("button", { name: new RegExp(`^${escapeRegExp(description)},.*Editar$`) });
}

/** Linhas de lançamento visíveis na página, na ordem exibida. */
export function transactionRows(page: Page) {
  return page.getByRole("main").getByRole("button", { name: /\. Editar$/ });
}

/** Conta exibida acima da lista de lançamentos ("3 lançamentos"). */
export function entryCount(page: Page, count: number) {
  return page.getByText(count === 1 ? "1 lançamento" : `${count} lançamentos`, { exact: true });
}

export function transactionForm(page: Page) {
  return page.locator("form").filter({ has: page.getByLabel("Descrição") });
}

/** Abre a folha Registrar (botão "+ Registrar" da coluna ou "Registrar" da barra inferior). */
export async function openRegister(page: Page) {
  await page
    .getByRole("button", { name: /^\+? ?Registrar$/ })
    .filter({ visible: true })
    .first()
    .click();
  await expect(modal(page, "Registrar")).toBeVisible();
}

const TYPE_OPTION: Record<TransactionKind, string> = {
  income: "Receita",
  outcome: "Gasto",
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

/** Nomes das categorias oferecidas no formulário, na ordem exibida. */
export function categoryChoices(page: Page) {
  return transactionForm(page).getByRole("radiogroup", { name: "Categoria" }).getByRole("radio");
}

export async function fillTransactionForm(page: Page, input: TransactionInput) {
  const form = transactionForm(page);

  // As categorias chegam por fetch.
  await expect(form.getByText("Carregando categorias…")).toHaveCount(0);

  if (input.type) {
    await form.getByRole("radio", { name: TYPE_OPTION[input.type], exact: true }).click();
  }

  await form.getByLabel("Valor").fill(input.amount);
  await form.getByLabel("Descrição").fill(input.description);

  if (input.date) {
    await form.getByLabel("Data").fill(input.date);
  }

  if (input.category) {
    await form
      .getByRole("radiogroup", { name: "Categoria" })
      .getByRole("radio", { name: input.category, exact: true })
      .click();
  }

  if (input.paymentMethod) {
    await form.getByLabel("Forma de pagamento").selectOption(input.paymentMethod);
  }

  if (input.notes) {
    await form.getByLabel("Observação").fill(input.notes);
  }

  return form;
}

/** Abre a folha Registrar, preenche e salva um lançamento. */
export async function createTransactionViaUi(page: Page, input: TransactionInput) {
  await openRegister(page);

  const form = await fillTransactionForm(page, input);

  await form.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(modal(page, "Registrar")).toBeHidden();
}

/** Abre a edição de um lançamento tocando na linha. */
export async function openTransaction(page: Page, description: string) {
  await transactionRow(page, description).click();

  const dialog = modal(page, "Editar lançamento");

  await expect(dialog).toBeVisible();
  return dialog;
}

/** Confirma o diálogo "Confirmar exclusão" (botão "Excluir" ou "Confirmar exclusão"). */
export async function confirmDeletion(page: Page) {
  const dialog = modal(page, "Confirmar exclusão");

  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /^(Excluir|Confirmar exclusão)$/ }).click();
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
