import type { Installment, InvoiceItemKind, ParsedInvoice, ParsedInvoiceItem } from "../types";

export interface DateParts {
  day: number;
  month: number;
  year: number | null;
}

export interface Candidate {
  raw: string;
  date: DateParts;
  description: string;
  amount: number;
  negative: boolean;
}

export interface InstallmentMatch {
  installment: Installment;
  index: number;
  length: number;
}

export interface LeadingDateResult {
  date: DateParts;
  length: number;
}

export const MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
export const MONTH_GROUP = MONTHS.join("|");
export const SIGN = "[-\\u2212\\u2013+]";
export const MINUS = /[-−–]/;

export const LEADING_NUMERIC_DATE = /^(\d{2})\/(\d{2})(?:\/(\d{4}|\d{2}))?(?=\s|$)/;
export const LEADING_TEXT_DATE = new RegExp(`^(\\d{1,2})[\\s/](?:DE\\s)?(${MONTH_GROUP})[A-Z]*\\.?(?=\\s|$)`, "i");
export const ANY_NUMERIC_DATE = /(?<!\d)(\d{2})\/(\d{2})(?:\/(\d{4}|\d{2}))?(?![\d/])/;
export const ANY_TEXT_DATE = new RegExp(
  `(?<!\\d)(\\d{1,2})[\\s/](?:DE\\s)?(${MONTH_GROUP})[A-Z]*\\.?(?:[\\s/](?:DE\\s)?(\\d{4}))?`,
);
export const AMOUNT_TAIL = new RegExp(
  `(?:^|\\s)((?:${SIGN}\\s?)?R\\$\\s?(?:${SIGN}\\s?)?|${SIGN})?(\\d{1,3}(?:\\.\\d{3})+|\\d+),(\\d{2})\\s?(CR|C|D|${SIGN})?$`,
  "i",
);
export const ANY_AMOUNT = /(?<![\d.,])(\d{1,3}(?:\.\d{3})+|\d+),(\d{2})(?!\d)/;

export const PREFIXED_INSTALLMENT = /\(?\bPARC(?:ELA)?\.?\s*(\d{1,2})\s*(?:\/|DE)\s*(\d{1,2})(?![\d/])\)?/gi;
export const BARE_INSTALLMENT = /(?:^|\s)\(?(\d{1,2})\/(\d{1,2})\)?(?=\s|$)/g;

export const IGNORED_ROW =
  /\b(?:SALDO (?:ANTERIOR|ATUAL|DEVEDOR|FINANCIADO|DA|DE|DO|EM)|TOTAL (?:DA|DE|DO|DESTA|DOS|DAS|A|PARA|GERAL|NACIONAL|INTERNACIONAL|PARCELADO)|SUB-?TOTAL|LIMITE|PAGAMENTO MINIMO|VALOR MINIMO|VALOR TOTAL|VENCIMENTO|FECHAMENTO)\b/;
export const PAYMENT_ROW = /\bPAGAMENTO (?:RECEBIDO|EFETUADO|DE FATURA|DA FATURA|FATURA|EM|ON ?LINE|VIA)\b|\bPAGTO\b/;
export const REFUND_ROW = /\b(?:ESTORNO|DEVOLUCAO|CASHBACK|REEMBOLSO)\b/;
export const FEE_ROW = /\b(?:IOF|JUROS|MULTA|ANUIDADE|ENCARGOS?|TARIFA)\b/;
export const CREDIT_ROW = /^CREDITO\b|\bCREDITO (?:DE|EM|REF|POR|NA|NO)\b/;

export const DUE_DATE_LABEL = /VENCIMENTO/;
export const DUE_DATE_EXCLUDED = /PROXIM|ANTERIOR/;
export const TOTAL_LABEL = /TOTAL (?:DA|DESTA) FATURA|TOTAL A PAGAR|VALOR TOTAL/;
export const TOTAL_EXCLUDED = /ANTERIOR/;

export const ISSUERS: [RegExp, string][] = [
  [/NUBANK|NU PAGAMENTOS/, "Nubank"],
  [/\bITAU/, "Itaú"],
  [/BRADESCO/, "Bradesco"],
  [/SANTANDER/, "Santander"],
  [/\bC6\b/, "C6 Bank"],
  [/BANCO DO BRASIL|OUROCARD/, "Banco do Brasil"],
  [/CAIXA ECONOMICA|\bCAIXA\b(?! POSTAL)/, "Caixa"],
  [/PICPAY/, "PicPay"],
  [/MERCADO ?PAGO/, "Mercado Pago"],
  [/\bXP\b/, "XP"],
  [/\bINTER\b/, "Inter"],
];

export const EMPTY_WARNING =
  "Nenhum lançamento reconhecido. O PDF pode ser digitalizado (imagem) ou de um layout não suportado.";

export const FUTURE_SECTION_HEADER =
  /^(?:PR[OÓ]XIMAS?\s+FATURAS?|PARCELAMENTOS?|PARCELAMENTO\s+(?:DE|DA)\s+(?:FATURA|COMPRAS?)|PARCELAS?\s+A\s+VENCER|LAN[CÇ]AMENTOS?\s+FUTUROS?|COMPRAS?\s+PARCELADAS?(?:\s*-\s*PR[OÓ]XIMAS?\s+FATURAS?|\s+A\s+VENCER|\s+EM\s+FATURAS?\s+FUTURAS?)?|DEMONSTRATIVO\s+DE\s+PARCELAS?(?:\s+A\s+VENCER)?|OP[CÇ][OÓ]ES\s+DE\s+PARCELAMENTO|PLANOS?\s+DE\s+PARCELAMENTO)(?:\s*[:\-\(].*)?$/i;

export const CURRENT_SECTION_HEADER =
  /^(?:TRANSA[CÇ][OÓ]ES(?:\s+DE\s+.+)?|LAN[CÇ]AMENTOS(?:\s*:\s*.+)?|MOVIMENTA[CÇ][OÓ]ES?|DESPESAS|HIST[OÓ]RICO(?:\s+DE\s+TRANSA[CÇ][OÓ]ES)?|COMPRAS\s+E\s+SAQUES)(?:\s*[:\-\(].*)?$/i;

export function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
}

export function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function toYear(value: string | undefined) {
  if (!value) {
    return null;
  }

  return value.length === 2 ? 2000 + Number(value) : Number(value);
}

export function toMonthNumber(abbreviation: string) {
  return MONTHS.indexOf(abbreviation.toUpperCase()) + 1;
}

export function toAmount(integer: string, cents: string) {
  return Number(`${integer.replace(/\./g, "")}.${cents}`);
}

export function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function toIsoDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  const isValid =
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return isValid ? `${year}-${pad(month)}-${pad(day)}` : null;
}

export function readLeadingDate(line: string): LeadingDateResult | null {
  const numeric = LEADING_NUMERIC_DATE.exec(line);

  if (numeric) {
    const date = { day: Number(numeric[1]), month: Number(numeric[2]), year: toYear(numeric[3]) };

    return { date, length: numeric[0].length };
  }

  const text = LEADING_TEXT_DATE.exec(line);

  if (text) {
    const date = { day: Number(text[1]), month: toMonthNumber(text[2]), year: null };

    return { date, length: text[0].length };
  }

  return null;
}

export function findDate(folded: string): DateParts | null {
  const numeric = ANY_NUMERIC_DATE.exec(folded);

  if (numeric) {
    return { day: Number(numeric[1]), month: Number(numeric[2]), year: toYear(numeric[3]) };
  }

  const text = ANY_TEXT_DATE.exec(folded);

  if (text) {
    return { day: Number(text[1]), month: toMonthNumber(text[2]), year: toYear(text[3]) };
  }

  return null;
}

export function findAmount(text: string) {
  const match = ANY_AMOUNT.exec(text);

  return match ? toAmount(match[1], match[2]) : null;
}

export function parseCandidate(raw: string): Candidate | null {
  const line = clean(raw);
  const leading = readLeadingDate(line);

  if (!leading) {
    return null;
  }

  const rest = line.slice(leading.length);
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

export function isValidInstallment(current: number, total: number) {
  return current >= 1 && current <= total && total >= 2 && total <= 48;
}

export function findInstallment(description: string, pattern: RegExp) {
  let found: InstallmentMatch | null = null;

  for (const match of description.matchAll(pattern)) {
    const current = Number(match[1]);
    const total = Number(match[2]);

    if (isValidInstallment(current, total)) {
      found = { installment: { current, total }, index: match.index, length: match[0].length };
    }
  }

  return found;
}

export function splitInstallment(description: string) {
  const match =
    findInstallment(description, PREFIXED_INSTALLMENT) ?? findInstallment(description, BARE_INSTALLMENT);

  if (!match) {
    return { description, installment: null };
  }

  const before = description.slice(0, match.index);
  const after = description.slice(match.index + match.length);
  const stripped = clean(`${before} ${after}`)
    .replace(/\s[-–]$/, "")
    .replace(/^[-–]\s/, "")
    .trim();

  if (!/\p{L}/u.test(stripped)) {
    return { description, installment: null };
  }

  return { description: stripped, installment: match.installment };
}

export function isIgnoredRow(description: string) {
  return IGNORED_ROW.test(fold(description));
}

export function classify(description: string, negative: boolean): InvoiceItemKind {
  const folded = fold(description);

  if (PAYMENT_ROW.test(folded)) {
    return "payment";
  }

  if (negative || REFUND_ROW.test(folded) || CREDIT_ROW.test(folded)) {
    return "credit";
  }

  return FEE_ROW.test(folded) ? "fee" : "purchase";
}

export function inferYear(month: number, referenceMonth: string) {
  const [referenceYear, referenceMonthNumber] = referenceMonth.split("-").map(Number);

  return month > referenceMonthNumber ? referenceYear - 1 : referenceYear;
}

export function resolveDate(date: DateParts, referenceMonth: string) {
  return toIsoDate(date.year ?? inferYear(date.month, referenceMonth), date.month, date.day);
}

export function closestYear(date: DateParts, today: Date) {
  const distance = (year: number) => Math.abs(Date.UTC(year, date.month - 1, date.day) - today.getTime());
  const base = today.getFullYear();

  return [base - 1, base + 1].reduce((best, year) => (distance(year) < distance(best) ? year : best), base);
}

export function isAuxiliaryLine(line: string | undefined): line is string {
  return line !== undefined && parseCandidate(line) === null;
}

export function labelledSegments(lines: string[], index: number, label: RegExp, excluded: RegExp) {
  const folded = fold(clean(lines[index]));
  const match = label.exec(folded);

  if (!match || excluded.test(folded)) {
    return [];
  }

  const next = lines[index + 1];
  const segments = [folded.slice(match.index + match[0].length), folded];

  return isAuxiliaryLine(next) ? [...segments, fold(clean(next))] : segments;
}

export function findDueDate(lines: string[], today: Date) {
  for (let index = 0; index < lines.length; index += 1) {
    for (const segment of labelledSegments(lines, index, DUE_DATE_LABEL, DUE_DATE_EXCLUDED)) {
      const date = findDate(segment);
      const iso = date ? toIsoDate(date.year ?? closestYear(date, today), date.month, date.day) : null;

      if (iso) {
        return iso;
      }
    }
  }

  return null;
}

export function findStatedTotal(lines: string[]) {
  for (let index = 0; index < lines.length; index += 1) {
    const [afterLabel, , nextLine] = labelledSegments(lines, index, TOTAL_LABEL, TOTAL_EXCLUDED);
    const amount = findAmount(afterLabel ?? "") ?? findAmount(nextLine ?? "");

    if (amount !== null) {
      return amount;
    }
  }

  return null;
}

export function findIssuer(lines: string[]) {
  for (const line of lines) {
    if (parseCandidate(line)) {
      continue;
    }

    const folded = fold(line);
    const issuer = ISSUERS.find(([pattern]) => pattern.test(folded));

    if (issuer) {
      return issuer[1];
    }
  }

  return null;
}

export function resolveReferenceMonth(dueDate: string | null, candidates: Candidate[], today: Date) {
  if (dueDate) {
    return dueDate.slice(0, 7);
  }

  const anchor = toMonthKey(today);
  const dates = candidates
    .map((candidate) => resolveDate(candidate.date, anchor))
    .filter((date): date is string => date !== null)
    .sort();

  return dates.length > 0 ? dates[dates.length - 1].slice(0, 7) : anchor;
}

export function toItem(candidate: Candidate, date: string): ParsedInvoiceItem {
  const { description, installment } = splitInstallment(candidate.description);

  return {
    date,
    description,
    amount: candidate.amount,
    kind: classify(description, candidate.negative),
    installment,
    raw: candidate.raw,
  };
}

export function filterFutureSections(
  lines: string[],
  isCandidateFn: (line: string) => boolean = (l) => parseCandidate(l) !== null,
): string[] {
  const result: string[] = [];
  let inFutureSection = false;

  for (const line of lines) {
    const trimmed = clean(line);
    if (!trimmed) {
      if (!inFutureSection) {
        result.push(line);
      }
      continue;
    }

    if (!isCandidateFn(line)) {
      const folded = fold(trimmed);
      if (FUTURE_SECTION_HEADER.test(folded)) {
        inFutureSection = true;
        continue;
      }
      if (CURRENT_SECTION_HEADER.test(folded)) {
        inFutureSection = false;
        result.push(line);
        continue;
      }
    }

    if (!inFutureSection) {
      result.push(line);
    }
  }

  return result;
}

export function buildInvoiceResult(
  allLines: string[],
  candidates: Candidate[],
  today: Date,
  issuerOverride?: string | null,
): ParsedInvoice {
  const dueDate = findDueDate(allLines, today);
  const referenceMonth = resolveReferenceMonth(dueDate, candidates, today);
  const items: ParsedInvoiceItem[] = [];
  const warnings: string[] = [];

  for (const candidate of candidates) {
    const date = resolveDate(candidate.date, referenceMonth);

    if (date) {
      items.push(toItem(candidate, date));
    } else {
      warnings.push(`Linha ignorada por data inválida: "${clean(candidate.raw)}"`);
    }
  }

  if (items.length === 0) {
    warnings.push(EMPTY_WARNING);
  }

  return {
    issuer: issuerOverride !== undefined ? issuerOverride : findIssuer(allLines),
    referenceMonth,
    dueDate,
    statedTotal: findStatedTotal(allLines),
    items,
    warnings,
  };
}

export function toLines(input: string | string[] | string[][]): string[] {
  if (typeof input === "string") {
    return input.split(/\r?\n/);
  }
  if (Array.isArray(input)) {
    if (input.length === 0) {
      return [];
    }
    if (Array.isArray(input[0])) {
      return (input as string[][]).flat();
    }
    return input as string[];
  }
  return [];
}

export function toText(input: string | string[] | string[][]): string {
  if (typeof input === "string") {
    return input;
  }
  return toLines(input).join("\n");
}

