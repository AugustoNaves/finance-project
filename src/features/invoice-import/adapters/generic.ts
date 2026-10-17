import type { Candidate } from "./common";
import {
  buildInvoiceResult,
  filterFutureSections,
  isIgnoredRow,
  parseCandidate,
  toLines,
} from "./common";
import type { InvoiceAdapter, ParseInvoiceOptions } from "./types";

export const genericAdapter: InvoiceAdapter = {
  name: "generic",
  detect(): boolean {
    return true;
  },
  parse(text: string, options: ParseInvoiceOptions = {}) {
    const today = options.today ?? new Date();
    const allLines = toLines(text);
    const lines = filterFutureSections(allLines);
    const candidates = lines
      .map(parseCandidate)
      .filter((candidate): candidate is Candidate => candidate !== null)
      .filter((candidate) => !isIgnoredRow(candidate.description));

    return buildInvoiceResult(allLines, candidates, today);
  },
};
