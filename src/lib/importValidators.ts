import type { JsonBody } from "@/lib/http";
import type {
  ImportEntryType,
  Installment,
  InvoiceItemKind,
} from "@/features/invoice-import/types";

export const MAX_IMPORT_ITEMS = 500;

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ITEM_KINDS: InvoiceItemKind[] = ["purchase", "credit", "payment", "fee"];
const IMPORT_ENTRY_TYPES: ImportEntryType[] = ["outcome", "income"];

export type InvalidImportItem = { index: number; error: string };

type ImportValidation<T> =
  | { data: T; error?: undefined; invalidItems?: undefined }
  | { data?: undefined; error: string; invalidItems?: InvalidImportItem[] };

type ImportHeader = {
  fileName: string;
  fileHash: string;
  issuer: string | null;
  referenceMonth: string;
  dueDate: string | null;
  statedTotal: number | null;
};

export type ImportPreviewItemInput = {
  date: string | null;
  description: string;
  amount: number;
  kind: InvoiceItemKind;
  installment: Installment | null;
};

export type ImportPreviewInput = ImportHeader & {
  useInvoiceMonth: boolean;
  items: ImportPreviewItemInput[];
};

export type ImportConfirmItemInput = {
  date: string;
  description: string;
  amount: number;
  type: ImportEntryType;
  category: string;
  installment: Installment | null;
};

export type ImportRuleInput = {
  pattern: string;
  category: string;
  type: ImportEntryType;
};

export type ImportConfirmInput = ImportHeader & {
  replaceTransactionId: string | null;
  rules: ImportRuleInput[];
  items: ImportConfirmItemInput[];
};

function isFilledString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isPositiveAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function parseInstallment(value: unknown): { installment: Installment | null } | null {
  if (value === undefined || value === null) {
    return { installment: null };
  }

  if (!isRecord(value)) {
    return null;
  }

  const { current, total } = value;

  if (!isPositiveInteger(current) || !isPositiveInteger(total) || current > total) {
    return null;
  }

  return { installment: { current, total } };
}

function validateHeader(body: JsonBody): ImportValidation<ImportHeader> {
  const { fileName, fileHash, issuer, referenceMonth, dueDate, statedTotal } = body;

  if (!isFilledString(fileName)) {
    return { error: "Nome do arquivo é obrigatório." };
  }

  if (!isFilledString(fileHash)) {
    return { error: "Identificador do arquivo é obrigatório." };
  }

  if (typeof referenceMonth !== "string" || !MONTH_PATTERN.test(referenceMonth)) {
    return { error: "Mês de referência deve estar no formato AAAA-MM." };
  }

  return {
    data: {
      fileName: fileName.trim(),
      fileHash: fileHash.trim(),
      issuer: isFilledString(issuer) ? issuer.trim() : null,
      referenceMonth,
      dueDate: isValidDateString(dueDate) ? dueDate : null,
      statedTotal:
        typeof statedTotal === "number" && Number.isFinite(statedTotal) ? statedTotal : null,
    },
  };
}

function validateItems<T>(
  items: unknown,
  parseItem: (item: Record<string, unknown>) => { item: T } | { reason: string },
): ImportValidation<T[]> {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "Nenhum lançamento para importar." };
  }

  if (items.length > MAX_IMPORT_ITEMS) {
    return { error: `Uma fatura pode ter no máximo ${MAX_IMPORT_ITEMS} lançamentos.` };
  }

  const data: T[] = [];
  const invalidItems: InvalidImportItem[] = [];

  items.forEach((raw: unknown, index) => {
    const result = isRecord(raw) ? parseItem(raw) : { reason: "formato inválido" };

    if ("reason" in result) {
      invalidItems.push({
        index,
        error: `Lançamento ${index + 1} inválido: ${result.reason}.`,
      });
      return;
    }

    data.push(result.item);
  });

  if (invalidItems.length > 0) {
    return { error: invalidItems[0].error, invalidItems };
  }

  return { data };
}

function parsePreviewItem(
  item: Record<string, unknown>,
): { item: ImportPreviewItemInput } | { reason: string } {
  const { description, amount, date, kind } = item;

  if (!isFilledString(description)) {
    return { reason: "descrição é obrigatória" };
  }

  if (!isPositiveAmount(amount)) {
    return { reason: "valor deve ser um número maior que zero" };
  }

  if (date !== null && date !== undefined && !isValidDateString(date)) {
    return { reason: "data inválida" };
  }

  if (typeof kind !== "string" || !ITEM_KINDS.includes(kind as InvoiceItemKind)) {
    return { reason: "tipo de lançamento inválido" };
  }

  const parsedInstallment = parseInstallment(item.installment);

  if (!parsedInstallment) {
    return { reason: "parcela inválida" };
  }

  return {
    item: {
      date: date ?? null,
      description: description.trim(),
      amount,
      kind: kind as InvoiceItemKind,
      installment: parsedInstallment.installment,
    },
  };
}

function parseConfirmItem(
  item: Record<string, unknown>,
): { item: ImportConfirmItemInput } | { reason: string } {
  const { description, amount, date, type, category } = item;

  if (!isFilledString(description)) {
    return { reason: "descrição é obrigatória" };
  }

  if (!isPositiveAmount(amount)) {
    return { reason: "valor deve ser um número maior que zero" };
  }

  if (!isValidDateString(date)) {
    return { reason: "data inválida" };
  }

  if (typeof type !== "string" || !IMPORT_ENTRY_TYPES.includes(type as ImportEntryType)) {
    return { reason: "tipo inválido" };
  }

  if (!isFilledString(category)) {
    return { reason: "categoria é obrigatória" };
  }

  const parsedInstallment = parseInstallment(item.installment);

  if (!parsedInstallment) {
    return { reason: "parcela inválida" };
  }

  return {
    item: {
      date,
      description: description.trim(),
      amount,
      type: type as ImportEntryType,
      category: category.trim(),
      installment: parsedInstallment.installment,
    },
  };
}

function parseRules(rules: unknown): ImportRuleInput[] | null {
  if (rules === undefined || rules === null) {
    return [];
  }

  if (!Array.isArray(rules)) {
    return null;
  }

  const parsed: ImportRuleInput[] = [];

  for (const rule of rules as unknown[]) {
    if (!isRecord(rule)) {
      return null;
    }

    const { pattern, category, type } = rule;

    if (
      !isFilledString(pattern) ||
      !isFilledString(category) ||
      typeof type !== "string" ||
      !IMPORT_ENTRY_TYPES.includes(type as ImportEntryType)
    ) {
      return null;
    }

    parsed.push({
      pattern: pattern.trim(),
      category: category.trim(),
      type: type as ImportEntryType,
    });
  }

  return parsed;
}

export function validateImportPreviewInput(body: JsonBody): ImportValidation<ImportPreviewInput> {
  const header = validateHeader(body);

  if (header.error !== undefined) {
    return header;
  }

  const items = validateItems(body.items, parsePreviewItem);

  if (items.error !== undefined) {
    return items;
  }

  return {
    data: {
      ...header.data,
      useInvoiceMonth: body.useInvoiceMonth === true,
      items: items.data,
    },
  };
}

export function validateImportConfirmInput(body: JsonBody): ImportValidation<ImportConfirmInput> {
  const header = validateHeader(body);

  if (header.error !== undefined) {
    return header;
  }

  const items = validateItems(body.items, parseConfirmItem);

  if (items.error !== undefined) {
    return items;
  }

  const rules = parseRules(body.rules);

  if (!rules) {
    return { error: "Regras de categorização inválidas." };
  }

  const { replaceTransactionId } = body;

  if (
    replaceTransactionId !== undefined &&
    replaceTransactionId !== null &&
    !isFilledString(replaceTransactionId)
  ) {
    return { error: "Transação a substituir inválida." };
  }

  return {
    data: {
      ...header.data,
      replaceTransactionId: isFilledString(replaceTransactionId) ? replaceTransactionId : null,
      rules,
      items: items.data,
    },
  };
}
