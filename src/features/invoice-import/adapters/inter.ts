import type { Candidate } from "./common";
import {
  buildInvoiceResult,
  clean,
  filterFutureSections,
  findAmount,
  fold,
  isIgnoredRow,
  readLeadingDate,
  toAmount,
  toLines,
} from "./common";
import type { InvoiceAdapter, ParseInvoiceOptions } from "./types";

const INTER_ISSUER_REGEX = /\b(?:BANCO INTER|INTER\b.*\bSUPER APP|SUPER APP\b.*\bINTER)\b/;
const INTER_SECTION_REGEX = /\bDESPESAS DA FATURA\b/;
const LEADING_YEAR = /^(\d{4})(?=\s)/;
const INTER_AMOUNT_TAIL = /\s[-–]\s+(\+\s*)?R\$\s*(\d{1,3}(?:\.\d{3})+|\d+),(\d{2})$/;
const SPLIT_FIRST_LETTER = /^([A-Za-zÀ-ÿ])\s(?=[A-Za-zÀ-ÿ]{3,})/;
const TOTAL_LINES = [/^FATURA ATUAL\b/, /^TOTAL CARTAO\b/];

export function findInterTotal(lines: string[]) {
  for (const label of TOTAL_LINES) {
    const line = lines.find((current) => label.test(fold(clean(current))));
    const amount = line ? findAmount(line) : null;

    if (amount !== null) {
      return amount;
    }
  }

  return null;
}

export function isInter(text: string): boolean {
  const folded = fold(text);

  return INTER_SECTION_REGEX.test(folded) && INTER_ISSUER_REGEX.test(folded.replace(/\n/g, " "));
}

export function parseInterCandidate(raw: string): Candidate | null {
  const line = clean(raw);
  const leading = readLeadingDate(line);

  if (!leading) {
    return null;
  }

  let rest = line.slice(leading.length).trimStart();
  const year = LEADING_YEAR.exec(rest);
  const date = year ? { ...leading.date, year: Number(year[1]) } : leading.date;

  if (year) {
    rest = rest.slice(year[0].length).trimStart();
  }

  const tail = INTER_AMOUNT_TAIL.exec(rest);

  if (!tail) {
    return null;
  }

  const description = rest.slice(0, tail.index).trim().replace(SPLIT_FIRST_LETTER, "$1");

  if (!/\p{L}/u.test(description)) {
    return null;
  }

  return {
    raw,
    date,
    description,
    amount: toAmount(tail[2], tail[3]),
    negative: Boolean(tail[1]),
  };
}

export const interAdapter: InvoiceAdapter = {
  name: "inter",
  detect: isInter,
  parse(text: string, options: ParseInvoiceOptions = {}) {
    const today = options.today ?? new Date();
    const allLines = toLines(text);
    const lines = filterFutureSections(allLines, (l) => parseInterCandidate(l) !== null);
    const candidates = lines
      .map(parseInterCandidate)
      .filter((candidate): candidate is Candidate => candidate !== null)
      .filter((candidate) => !isIgnoredRow(candidate.description));

    if (candidates.length === 0) {
      return null;
    }

    const result = buildInvoiceResult(allLines, candidates, today, "Inter");

    return { ...result, statedTotal: findInterTotal(allLines) ?? result.statedTotal };
  },
};
