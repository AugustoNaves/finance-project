import type { ParsedInvoice } from "../types";

export interface ParseInvoiceOptions {
  today?: Date;
}

export interface InvoiceAdapter {
  name: string;
  detect(text: string): boolean;
  parse(text: string, options?: ParseInvoiceOptions): ParsedInvoice | null;
}
