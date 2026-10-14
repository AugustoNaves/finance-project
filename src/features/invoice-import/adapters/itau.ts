import type { Candidate } from "./common";
import {
  AMOUNT_TAIL,
  buildInvoiceResult,
  clean,
  filterFutureSections,
  fold,
  isIgnoredRow,
  MINUS,
  parseCandidate,
  readLeadingDate,
  toAmount,
  toLines,
} from "./common";
import type { InvoiceAdapter, ParseInvoiceOptions } from "./types";

const ITAU_ISSUER_REGEX = /\bITAU|\bITAUCARD/;
const SECOND_DATE_REGEX = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?(?=\s|$)/;

export function isItau(text: string): boolean {
  const lines = toLines(text);

  for (const line of lines) {
    if (parseCandidate(line)) {
      continue;
    }

    const folded = fold(line);

    if (ITAU_ISSUER_REGEX.test(folded)) {
      return true;
    }
  }

  return false;
}

export function parseItauCandidate(raw: string): Candidate | null {
  const line = clean(raw);
  const leading = readLeadingDate(line);

  if (!leading) {
    return null;
  }

  let rest = line.slice(leading.length).trimStart();

  // Tratamento de coluna dupla (data de compra vs data de lançamento).
  // Se a linha contiver uma segunda data imediatamente após a primeira,
  // descartamos a data de lançamento para evitar que seja lida como parcela (ex: 02/06, 03/10).
  const secondNumeric = SECOND_DATE_REGEX.exec(rest);

  if (secondNumeric) {
    const day = Number(secondNumeric[1]);
    const month = Number(secondNumeric[2]);

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      rest = rest.slice(secondNumeric[0].length).trimStart();
    }
  }

  const tail = AMOUNT_TAIL.exec(rest);

  if (!tail) {
    return null;
  }

  const description = rest.slice(0, tail.index).trim();

  if (!/\p{L}/u.test(description)) {
    return null;
  }

  const suffix = (tail[4] ?? "").toUpperCase();
  const negative = MINUS.test(tail[1] ?? "") || suffix === "CR" || suffix === "C" || MINUS.test(suffix);

  return { raw, date: leading.date, description, amount: toAmount(tail[2], tail[3]), negative };
}

export const itauAdapter: InvoiceAdapter = {
  name: "itau",
  detect: isItau,
  parse(text: string, options: ParseInvoiceOptions = {}) {
    const today = options.today ?? new Date();
    const allLines = toLines(text);
    const lines = filterFutureSections(allLines, (l) => parseItauCandidate(l) !== null);
    const candidates = lines
      .map(parseItauCandidate)
      .filter((candidate): candidate is Candidate => candidate !== null)
      .filter((candidate) => !isIgnoredRow(candidate.description));

    return buildInvoiceResult(allLines, candidates, today, "Itaú");
  },
};
