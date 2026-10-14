import type { Candidate } from "./common";
import {
  buildInvoiceResult,
  clean,
  filterFutureSections,
  findStatedTotal,
  fold,
  isIgnoredRow,
  parseCandidate,
  toAmount,
  toLines,
} from "./common";
import type { InvoiceAdapter, ParseInvoiceOptions } from "./types";

const NUBANK_ISSUER_REGEX = /NUBANK|NU PAGAMENTOS/;
const NUBANK_INLINE_TOTAL = /NO VALOR DE\s+(?:R\$\s*)?(\d{1,3}(?:\.\d{3})+|\d+),(\d{2})/i;

export function isNubank(text: string): boolean {
  const lines = toLines(text);

  for (const line of lines) {
    if (parseCandidate(line)) {
      continue;
    }

    const folded = fold(line);

    if (NUBANK_ISSUER_REGEX.test(folded)) {
      return true;
    }
  }

  return false;
}

function findNubankTotal(lines: string[]): number | null {
  const standard = findStatedTotal(lines);

  if (standard !== null) {
    return standard;
  }

  for (const line of lines) {
    const folded = fold(clean(line));
    const match = NUBANK_INLINE_TOTAL.exec(folded);

    if (match) {
      return toAmount(match[1], match[2]);
    }
  }

  return null;
}

export const nubankAdapter: InvoiceAdapter = {
  name: "nubank",
  detect: isNubank,
  parse(text: string, options: ParseInvoiceOptions = {}) {
    const today = options.today ?? new Date();
    const allLines = toLines(text);
    const lines = filterFutureSections(allLines);
    const candidates = lines
      .map(parseCandidate)
      .filter((candidate): candidate is Candidate => candidate !== null)
      .filter((candidate) => !isIgnoredRow(candidate.description));

    const result = buildInvoiceResult(allLines, candidates, today, "Nubank");

    if (result.statedTotal === null) {
      result.statedTotal = findNubankTotal(allLines);
    }

    return result;
  },
};
