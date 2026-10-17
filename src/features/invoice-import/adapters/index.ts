import type { ParsedInvoice } from "../types";
import { toText } from "./common";
import { genericAdapter } from "./generic";
import { interAdapter } from "./inter";
import { itauAdapter } from "./itau";
import { nubankAdapter } from "./nubank";
import type { InvoiceAdapter, ParseInvoiceOptions } from "./types";

export * from "./types";
export { genericAdapter } from "./generic";
export { interAdapter } from "./inter";
export { itauAdapter } from "./itau";
export { nubankAdapter } from "./nubank";

export const ADAPTERS: InvoiceAdapter[] = [nubankAdapter, itauAdapter, interAdapter];

export function parseWithAdapters(
  input: string | string[] | string[][],
  options: ParseInvoiceOptions = {},
): ParsedInvoice {
  const text = toText(input);

  for (const adapter of ADAPTERS) {
    if (adapter.detect(text)) {
      const parsed = adapter.parse(text, options);

      if (parsed) {
        return parsed;
      }
    }
  }

  const fallback = genericAdapter.parse(text, options);

  if (fallback) {
    return fallback;
  }

  const today = options.today ?? new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  return {
    issuer: null,
    referenceMonth: `${year}-${month}`,
    dueDate: null,
    statedTotal: null,
    items: [],
    warnings: [
      "Nenhum lançamento reconhecido. O PDF pode ser digitalizado (imagem) ou de um layout não suportado.",
    ],
  };
}
