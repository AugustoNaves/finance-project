export type InvoiceItemKind = "purchase" | "credit" | "payment" | "fee";

export interface Installment {
  current: number;
  total: number;
}

export interface ParsedInvoiceItem {
  date: string | null;
  description: string;
  amount: number;
  kind: InvoiceItemKind;
  installment: Installment | null;
  raw: string;
}

export interface ParsedInvoice {
  issuer: string | null;
  referenceMonth: string | null;
  dueDate: string | null;
  statedTotal: number | null;
  items: ParsedInvoiceItem[];
  warnings: string[];
}

export type ImportEntryType = "outcome" | "income";
export type SuggestionSource = "rule" | "history" | "keyword";

export interface ImportPreviewRequest {
  fileName: string;
  fileHash: string;
  issuer: string | null;
  referenceMonth: string;
  dueDate: string | null;
  statedTotal: number | null;
  useInvoiceMonth?: boolean;
  items: Omit<ParsedInvoiceItem, "raw">[];
}

export interface ImportPreviewItem {
  index: number;
  date: string;
  purchaseDate: string | null;
  description: string;
  merchant: string;
  amount: number;
  type: ImportEntryType;
  kind: InvoiceItemKind;
  installment: Installment | null;
  category: string | null;
  suggestionSource: SuggestionSource | null;
  include: boolean;
  duplicateOf: { id: string; description: string; date: string } | null;
}

export interface ImportPreviewResponse {
  alreadyImported: { id: string; fileName: string; createdAt: string } | null;
  lumpCandidate: { id: string; description: string; amount: number; date: string } | null;
  items: ImportPreviewItem[];
}

export interface ImportConfirmItem {
  date: string;
  purchaseDate?: string | null;
  description: string;
  amount: number;
  type: ImportEntryType;
  category: string;
  installment?: Installment | null;
}

export interface ImportConfirmRequest {
  fileName: string;
  fileHash: string;
  issuer: string | null;
  referenceMonth: string;
  dueDate: string | null;
  statedTotal: number | null;
  replaceTransactionId?: string | null;
  rules?: { pattern: string; category: string; type: ImportEntryType }[];
  items: ImportConfirmItem[];
}

export interface ImportBatchSummary {
  id: string;
  fileName: string;
  issuer: string | null;
  referenceMonth: string;
  dueDate: string | null;
  statedTotal: number | null;
  importedTotal: number;
  itemCount: number;
  createdAt: string;
}
