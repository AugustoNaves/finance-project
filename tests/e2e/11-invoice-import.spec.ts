import type { Page } from "@playwright/test";
import { buildPdf } from "../support/pdf";
import { expect, test } from "./support/fixtures";
import { transactionRow } from "./support/ui";

const INVOICE_LINES = [
  "Nubank",
  "Fatura de cartão de crédito",
  "Vencimento 10/10/2026",
  "Total da fatura R$ 230,40",
  "12/09 IFOOD *RESTAURANTE BOM 50,00",
  "13/09 UBER *TRIP 30,40",
  "20/08 LOJA XPTO 2/5 150,00",
  "05/09 PAGAMENTO RECEBIDO -400,00",
];

function invoiceFile(name = "fatura-outubro.pdf", lines = INVOICE_LINES) {
  return { name, mimeType: "application/pdf", buffer: Buffer.from(buildPdf([lines])) };
}

async function uploadInvoice(page: Page, file = invoiceFile()) {
  await page.goto("/import");
  await expect(page.getByRole("heading", { name: "Importar fatura", level: 1 })).toBeVisible();
  await page.getByLabel("Arquivo PDF da fatura").setInputFiles(file);
  await expect(page.getByRole("heading", { name: "Conferir os lançamentos" })).toBeVisible({
    timeout: 30_000,
  });
}

test.describe("Importação de fatura por PDF", () => {
  test("lê o PDF no navegador e mostra o preview com categorias sugeridas", async ({ page, account }) => {
    void account;
    await uploadInvoice(page);

    await expect(page.getByText("Nubank", { exact: true })).toBeVisible();
    await expect(page.getByText("10/10/2026")).toBeVisible();
    await expect(page.getByLabel("Descrição da linha 1")).toHaveValue("IFOOD *RESTAURANTE BOM");
    await expect(page.getByLabel("Categoria da linha 1")).toHaveValue("Alimentação");
    await expect(page.getByLabel("Categoria da linha 2")).toHaveValue("Transporte");
    await expect(page.getByLabel("Categoria da linha 3")).toHaveValue("");
    // Parcela 2/5 de uma compra de agosto vai para o mês da fatura, mantendo o dia.
    await expect(page.getByLabel("Data da linha 3")).toHaveValue("2026-10-20");
    await expect(page.getByText("2/5")).toBeVisible();
    await expect(page.getByLabel("Incluir linha 4")).not.toBeChecked();
    await expect(page.getByText("A soma das linhas incluídas confere com o total da fatura.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Importar 3 lançamentos" })).toBeDisabled();
  });

  test("registra os lançamentos, lembra a categoria, detecta reenvio e desfaz", async ({ page, api }) => {
    await uploadInvoice(page);
    await page.getByLabel("Categoria da linha 3").selectOption("Lazer");
    await page.getByLabel("Lembrar para as próximas faturas").check();
    await page.getByRole("button", { name: "Importar 3 lançamentos" }).click();

    await expect(page.getByRole("status")).toContainText("3 lançamentos importados");
    await expect(page.getByText(/fatura-outubro\.pdf · 3 lançamentos/)).toBeVisible();

    const created = (await api.list("transactions")).filter((transaction) =>
      String(transaction.notes ?? "").startsWith("Importado da fatura"),
    );

    expect(created).toHaveLength(3);
    expect(created.map((transaction) => transaction.amount).sort()).toEqual([-150, -30.4, -50].sort());
    expect(created.every((transaction) => transaction.paymentMethod === "Cartão de crédito")).toBe(true);

    await page.goto("/transactions");
    await expect(page.getByRole("list", { name: "ter., 20 de out." })).toContainText("LOJA XPTO");
    await expect(transactionRow(page, "LOJA XPTO")).toContainText("Lazer");

    await uploadInvoice(page);
    await expect(page.getByText(/Esta fatura já foi importada em/)).toBeVisible();
    await expect(page.getByLabel("Incluir linha 1")).not.toBeChecked();
    await expect(page.getByLabel("Incluir linha 3")).not.toBeChecked();
    await expect(page.getByLabel("Categoria da linha 3")).toHaveValue("Lazer");
    await expect(page.getByText("regra sua")).toBeVisible();
    await page.getByRole("button", { name: "Cancelar" }).click();

    await page.getByRole("button", { name: "Desfazer importação de fatura-outubro.pdf" }).click();
    await page
      .getByRole("dialog", { name: "Desfazer importação" })
      .getByRole("button", { name: "Desfazer importação" })
      .click();

    await expect(page.getByRole("status")).toContainText("3 lançamentos removidos");
    await expect(page.getByText("Nenhuma fatura importada ainda.")).toBeVisible();
    expect(
      (await api.list("transactions")).filter((transaction) =>
        String(transaction.notes ?? "").startsWith("Importado da fatura"),
      ),
    ).toHaveLength(0);
  });

  test("substitui a fatura lançada como valor único pelo detalhamento", async ({ page, api }) => {
    await api.createTransaction({
      description: "Fatura do cartão",
      value: 230.4,
      type: "outcome",
      category: "Contas",
      date: "2026-10-10",
    });

    await uploadInvoice(page);
    await expect(page.getByText(/Você já registrou esta fatura como um lançamento único/)).toBeVisible();
    await page.getByLabel("Substituir esse lançamento pelo detalhamento").check();
    await page.getByLabel("Categoria da linha 3").selectOption("Lazer");
    await page.getByRole("button", { name: "Importar 3 lançamentos" }).click();
    await expect(page.getByRole("status")).toContainText("3 lançamentos importados");

    const transactions = await api.list("transactions");

    expect(transactions.some((transaction) => transaction.description === "Fatura do cartão")).toBe(false);
    expect(transactions.reduce((total, transaction) => total + Number(transaction.amount), 0)).toBeCloseTo(-230.4, 2);
  });

  test("avisa quando o PDF não tem lançamentos reconhecíveis", async ({ page, account }) => {
    void account;
    await page.goto("/import");
    await page
      .getByLabel("Arquivo PDF da fatura")
      .setInputFiles(invoiceFile("outro.pdf", ["Documento qualquer", "sem lançamentos"]));

    await expect(
      page.getByRole("alert").filter({ hasText: "Nenhum lançamento reconhecido" }),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("a API de importações exige sessão", async ({ page, account, playwright, baseURL }) => {
    void account;
    await uploadInvoice(page);
    await page.getByLabel("Categoria da linha 3").selectOption("Lazer");
    await page.getByRole("button", { name: "Importar 3 lançamentos" }).click();
    await expect(page.getByRole("status")).toContainText("importados");

    const anonymous = await playwright.request.newContext({ baseURL });

    expect((await anonymous.get("/api/imports")).status()).toBe(401);
    await anonymous.dispose();
  });
});
