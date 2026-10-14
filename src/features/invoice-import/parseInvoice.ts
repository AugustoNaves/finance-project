import { parseWithAdapters } from "./adapters";
import type { ParseInvoiceOptions } from "./adapters/types";
import type { ParsedInvoice } from "./types";

export type { ParseInvoiceOptions } from "./adapters/types";
export { parseWithAdapters } from "./adapters";

export function parseInvoice(pages: string[][], options: ParseInvoiceOptions = {}): ParsedInvoice {
  return parseWithAdapters(pages, options);
}
