import { describe, expect, it } from "vitest";
import {
  isValidDateString,
  MAX_IMPORT_ITEMS,
  validateImportConfirmInput,
  validateImportPreviewInput,
} from "@/lib/importValidators";

const header = {
  fileName: " fatura.pdf ",
  fileHash: "hash-abc",
  issuer: "Nubank",
  referenceMonth: "2026-03",
  dueDate: "2026-04-10",
  statedTotal: 1500,
};

const previewItem = {
  date: "2026-03-05",
  description: " NETFLIX.COM ",
  amount: 39.9,
  kind: "purchase",
  installment: null,
  raw: "05/03 NETFLIX.COM 39,90",
};

const confirmItem = {
  date: "2026-03-05",
  description: " NETFLIX.COM ",
  amount: 39.9,
  type: "outcome",
  category: " Lazer ",
};

describe("isValidDateString", () => {
  it.each(["2026-03-05", "2024-02-29", "2026-12-31"])("aceita %s", (value) => {
    expect(isValidDateString(value)).toBe(true);
  });

  it.each(["2026-02-30", "2026-13-01", "05/03/2026", "2026-3-5", "", null, 20260305])(
    "rejeita %s",
    (value) => {
      expect(isValidDateString(value)).toBe(false);
    },
  );
});

describe("validateImportPreviewInput", () => {
  it("normaliza um corpo válido", () => {
    expect(validateImportPreviewInput({ ...header, items: [previewItem] })).toEqual({
      data: {
        fileName: "fatura.pdf",
        fileHash: "hash-abc",
        issuer: "Nubank",
        referenceMonth: "2026-03",
        dueDate: "2026-04-10",
        statedTotal: 1500,
        useInvoiceMonth: false,
        items: [
          {
            date: "2026-03-05",
            description: "NETFLIX.COM",
            amount: 39.9,
            kind: "purchase",
            installment: null,
          },
        ],
      },
    });
  });

  it("aceita data nula, parcela válida e useInvoiceMonth", () => {
    const { data } = validateImportPreviewInput({
      ...header,
      issuer: null,
      dueDate: "10/04/2026",
      statedTotal: "1500",
      useInvoiceMonth: true,
      items: [{ ...previewItem, date: null, installment: { current: 2, total: 2 } }],
    });

    expect(data).toMatchObject({
      issuer: null,
      dueDate: null,
      statedTotal: null,
      useInvoiceMonth: true,
      items: [{ date: null, installment: { current: 2, total: 2 } }],
    });
  });

  it.each([
    [{ fileName: "" }, "Nome do arquivo é obrigatório."],
    [{ fileHash: null }, "Identificador do arquivo é obrigatório."],
    [{ referenceMonth: "2026-3" }, "Mês de referência deve estar no formato AAAA-MM."],
    [{ referenceMonth: 202603 }, "Mês de referência deve estar no formato AAAA-MM."],
    [{ items: "x" }, "Nenhum lançamento para importar."],
    [{ items: [] }, "Nenhum lançamento para importar."],
  ])("rejeita o cabeçalho %j", (overrides, error) => {
    expect(validateImportPreviewInput({ ...header, items: [previewItem], ...overrides })).toEqual({
      error,
    });
  });

  it("limita a quantidade de lançamentos", () => {
    const atLimit = Array.from({ length: MAX_IMPORT_ITEMS }, () => previewItem);

    expect(validateImportPreviewInput({ ...header, items: atLimit }).data?.items).toHaveLength(500);
    expect(validateImportPreviewInput({ ...header, items: [...atLimit, previewItem] })).toEqual({
      error: "Uma fatura pode ter no máximo 500 lançamentos.",
    });
  });

  it.each([
    [{ description: "" }, "descrição é obrigatória"],
    [{ description: 10 }, "descrição é obrigatória"],
    [{ amount: 0 }, "valor deve ser um número maior que zero"],
    [{ amount: -5 }, "valor deve ser um número maior que zero"],
    [{ amount: "39.9" }, "valor deve ser um número maior que zero"],
    [{ amount: Number.POSITIVE_INFINITY }, "valor deve ser um número maior que zero"],
    [{ date: "2026-02-30" }, "data inválida"],
    [{ date: "05/03" }, "data inválida"],
    [{ kind: "refund" }, "tipo de lançamento inválido"],
    [{ kind: undefined }, "tipo de lançamento inválido"],
    [{ installment: { current: 0, total: 3 } }, "parcela inválida"],
    [{ installment: { current: 4, total: 3 } }, "parcela inválida"],
    [{ installment: { current: 1.5, total: 3 } }, "parcela inválida"],
    [{ installment: "1/3" }, "parcela inválida"],
  ])("rejeita o lançamento %j", (overrides, reason) => {
    const error = `Lançamento 2 inválido: ${reason}.`;

    expect(
      validateImportPreviewInput({
        ...header,
        items: [previewItem, { ...previewItem, ...overrides }],
      }),
    ).toEqual({ error, invalidItems: [{ index: 1, error }] });
  });

  it("rejeita lançamento que não é um objeto", () => {
    const error = "Lançamento 1 inválido: formato inválido.";

    expect(validateImportPreviewInput({ ...header, items: [null] })).toEqual({
      error,
      invalidItems: [{ index: 0, error }],
    });
  });
});

describe("validateImportConfirmInput", () => {
  it("normaliza um corpo válido", () => {
    expect(
      validateImportConfirmInput({
        ...header,
        replaceTransactionId: "lump-1",
        rules: [{ pattern: " NETFLIX ", category: " Lazer ", type: "outcome" }],
        items: [confirmItem, { ...confirmItem, installment: { current: 1, total: 3 } }],
      }),
    ).toEqual({
      data: {
        fileName: "fatura.pdf",
        fileHash: "hash-abc",
        issuer: "Nubank",
        referenceMonth: "2026-03",
        dueDate: "2026-04-10",
        statedTotal: 1500,
        replaceTransactionId: "lump-1",
        rules: [{ pattern: "NETFLIX", category: "Lazer", type: "outcome" }],
        items: [
          {
            date: "2026-03-05",
            purchaseDate: null,
            description: "NETFLIX.COM",
            amount: 39.9,
            type: "outcome",
            category: "Lazer",
            installment: null,
          },
          {
            date: "2026-03-05",
            purchaseDate: null,
            description: "NETFLIX.COM",
            amount: 39.9,
            type: "outcome",
            category: "Lazer",
            installment: { current: 1, total: 3 },
          },
        ],
      },
    });
  });

  it("usa padrões quando regras e substituição não são informadas", () => {
    const { data } = validateImportConfirmInput({ ...header, items: [confirmItem] });

    expect(data).toMatchObject({ replaceTransactionId: null, rules: [] });
  });

  it.each([
    [{ category: undefined }, "categoria é obrigatória"],
    [{ category: "  " }, "categoria é obrigatória"],
    [{ date: null }, "data inválida"],
    [{ date: "2026-02-30" }, "data inválida"],
    [{ type: "investment" }, "tipo inválido"],
    [{ type: undefined }, "tipo inválido"],
    [{ amount: 0 }, "valor deve ser um número maior que zero"],
    [{ description: "" }, "descrição é obrigatória"],
    [{ installment: { current: 2, total: 1 } }, "parcela inválida"],
  ])("rejeita o lançamento %j", (overrides, reason) => {
    const error = `Lançamento 1 inválido: ${reason}.`;

    expect(
      validateImportConfirmInput({ ...header, items: [{ ...confirmItem, ...overrides }] }),
    ).toEqual({ error, invalidItems: [{ index: 0, error }] });
  });

  it("limita a quantidade de lançamentos", () => {
    const items = Array.from({ length: MAX_IMPORT_ITEMS + 1 }, () => confirmItem);

    expect(validateImportConfirmInput({ ...header, items })).toEqual({
      error: "Uma fatura pode ter no máximo 500 lançamentos.",
    });
  });

  it.each([
    ["texto", "NETFLIX"],
    ["item não objeto", ["NETFLIX"]],
    ["padrão vazio", [{ pattern: "", category: "Lazer", type: "outcome" }]],
    ["categoria ausente", [{ pattern: "NETFLIX", type: "outcome" }]],
    ["tipo inválido", [{ pattern: "NETFLIX", category: "Lazer", type: "investment" }]],
  ])("rejeita regras inválidas: %s", (_title, rules) => {
    expect(validateImportConfirmInput({ ...header, items: [confirmItem], rules })).toEqual({
      error: "Regras de categorização inválidas.",
    });
  });

  it.each([123, "", "  ", {}])("rejeita replaceTransactionId inválido: %j", (value) => {
    expect(
      validateImportConfirmInput({
        ...header,
        items: [confirmItem],
        replaceTransactionId: value,
      }),
    ).toEqual({ error: "Transação a substituir inválida." });
  });
});
