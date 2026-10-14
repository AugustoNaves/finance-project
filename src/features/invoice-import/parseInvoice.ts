import type { Installment, InvoiceItemKind, ParsedInvoice, ParsedInvoiceItem } from "./types";

export interface ParseInvoiceOptions {
  today?: Date;
}

interface DateParts {
  day: number;
  month: number;
  year: number | null;
}

interface Candidate {
  raw: string;
  date: DateParts;
  description: string;
  amount: number;
  negative: boolean;
}

interface InstallmentMatch {
  installment: Installment;
  index: number;
  length: number;
}

const MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const MONTH_GROUP = MONTHS.join("|");
const SIGN = "[-\\u2212\\u2013+]";
const MINUS = /[-−–]/;

const LEADING_NUMERIC_DATE = /^(\d{2})\/(\d{2})(?:\/(\d{4}|\d{2}))?(?=\s|$)/;
const LEADING_TEXT_DATE = new RegExp(`^(\\d{1,2})[\\s/](?:DE\\s)?(${MONTH_GROUP})\\.?(?=\\s|$)`, "i");
const ANY_NUMERIC_DATE = /(?<!\d)(\d{2})\/(\d{2})(?:\/(\d{4}|\d{2}))?(?![\d/])/;
const ANY_TEXT_DATE = new RegExp(
  `(?<!\\d)(\\d{1,2})[\\s/](?:DE\\s)?(${MONTH_GROUP})[A-Z]*\\.?(?:[\\s/](?:DE\\s)?(\\d{4}))?`,
);
const AMOUNT_TAIL = new RegExp(
  `(?:^|\\s)((?:${SIGN}\\s?)?R\\$\\s?(?:${SIGN}\\s?)?|${SIGN})?(\\d{1,3}(?:\\.\\d{3})+|\\d+),(\\d{2})\\s?(CR|C|D|${SIGN})?$`,
  "i",
);
const ANY_AMOUNT = /(?<![\d.,])(\d{1,3}(?:\.\d{3})+|\d+),(\d{2})(?!\d)/;

const PREFIXED_INSTALLMENT = /\(?\bPARC(?:ELA)?\.?\s*(\d{1,2})\s*(?:\/|DE)\s*(\d{1,2})(?![\d/])\)?/gi;
const BARE_INSTALLMENT = /(?:^|\s)\(?(\d{1,2})\/(\d{1,2})\)?(?=\s|$)/g;

const IGNORED_ROW =
  /\b(?:SALDO (?:ANTERIOR|ATUAL|DEVEDOR|FINANCIADO|DA|DE|DO|EM)|TOTAL (?:DA|DE|DO|DESTA|DOS|DAS|A|PARA|GERAL|NACIONAL|INTERNACIONAL|PARCELADO)|SUB-?TOTAL|LIMITE|PAGAMENTO MINIMO|VALOR MINIMO|VALOR TOTAL|VENCIMENTO|FECHAMENTO)\b/;
const PAYMENT_ROW = /\bPAGAMENTO (?:RECEBIDO|EFETUADO|DE FATURA|DA FATURA|FATURA|EM)\b|\bPAGTO\b/;
const REFUND_ROW = /\b(?:ESTORNO|DEVOLUCAO|CASHBACK|REEMBOLSO)\b/;
const FEE_ROW = /\b(?:IOF|JUROS|MULTA|ANUIDADE|ENCARGOS?|TARIFA)\b/;
const CREDIT_ROW = /\bCREDITO\b/;

const DUE_DATE_LABEL = /VENCIMENTO/;
const DUE_DATE_EXCLUDED = /PROXIM|ANTERIOR/;
const TOTAL_LABEL = /TOTAL (?:DA|DESTA) FATURA|TOTAL A PAGAR|VALOR TOTAL/;
const TOTAL_EXCLUDED = /ANTERIOR/;

const ISSUERS: [RegExp, string][] = [
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

const EMPTY_WARNING =
  "Nenhum lançamento reconhecido. O PDF pode ser digitalizado (imagem) ou de um layout não suportado.";

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toYear(value: string | undefined) {
  if (!value) {
    return null;
  }

  return value.length === 2 ? 2000 + Number(value) : Number(value);
}

function toMonthNumber(abbreviation: string) {
  return MONTHS.indexOf(abbreviation.toUpperCase()) + 1;
}

function toAmount(integer: string, cents: string) {
  return Number(`${integer.replace(/\./g, "")}.${cents}`);
}

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function toIsoDate(year: number, month: number, day: number) {
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

function readLeadingDate(line: string) {
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

function findDate(folded: string): DateParts | null {
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

function findAmount(text: string) {
  const match = ANY_AMOUNT.exec(text);

  return match ? toAmount(match[1], match[2]) : null;
}

function parseCandidate(raw: string): Candidate | null {
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

function isValidInstallment(current: number, total: number) {
  return current >= 1 && current <= total && total >= 2 && total <= 48;
}

function findInstallment(description: string, pattern: RegExp) {
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

function splitInstallment(description: string) {
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

function isIgnoredRow(description: string) {
  return IGNORED_ROW.test(fold(description));
}

function classify(description: string, negative: boolean): InvoiceItemKind {
  const folded = fold(description);

  if (PAYMENT_ROW.test(folded)) {
    return "payment";
  }

  if (negative || REFUND_ROW.test(folded)) {
    return "credit";
  }

  if (FEE_ROW.test(folded)) {
    return "fee";
  }

  return CREDIT_ROW.test(folded) ? "credit" : "purchase";
}

function inferYear(month: number, referenceMonth: string) {
  const [referenceYear, referenceMonthNumber] = referenceMonth.split("-").map(Number);

  return month > referenceMonthNumber ? referenceYear - 1 : referenceYear;
}

function resolveDate(date: DateParts, referenceMonth: string) {
  return toIsoDate(date.year ?? inferYear(date.month, referenceMonth), date.month, date.day);
}

function closestYear(date: DateParts, today: Date) {
  const distance = (year: number) => Math.abs(Date.UTC(year, date.month - 1, date.day) - today.getTime());
  const base = today.getFullYear();

  return [base - 1, base + 1].reduce((best, year) => (distance(year) < distance(best) ? year : best), base);
}

function isAuxiliaryLine(line: string | undefined): line is string {
  return line !== undefined && parseCandidate(line) === null;
}

function labelledSegments(lines: string[], index: number, label: RegExp, excluded: RegExp) {
  const folded = fold(clean(lines[index]));
  const match = label.exec(folded);

  if (!match || excluded.test(folded)) {
    return [];
  }

  const next = lines[index + 1];
  const segments = [folded.slice(match.index + match[0].length), folded];

  return isAuxiliaryLine(next) ? [...segments, fold(clean(next))] : segments;
}

function findDueDate(lines: string[], today: Date) {
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

function findStatedTotal(lines: string[]) {
  for (let index = 0; index < lines.length; index += 1) {
    const [afterLabel, , nextLine] = labelledSegments(lines, index, TOTAL_LABEL, TOTAL_EXCLUDED);
    const amount = findAmount(afterLabel ?? "") ?? findAmount(nextLine ?? "");

    if (amount !== null) {
      return amount;
    }
  }

  return null;
}

function findIssuer(lines: string[]) {
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

function resolveReferenceMonth(dueDate: string | null, candidates: Candidate[], today: Date) {
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

function toItem(candidate: Candidate, date: string): ParsedInvoiceItem {
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

export function parseInvoice(pages: string[][], options: ParseInvoiceOptions = {}): ParsedInvoice {
  const today = options.today ?? new Date();
  const lines = pages.flat();
  const candidates = lines
    .map(parseCandidate)
    .filter((candidate): candidate is Candidate => candidate !== null)
    .filter((candidate) => !isIgnoredRow(candidate.description));
  const dueDate = findDueDate(lines, today);
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
    issuer: findIssuer(lines),
    referenceMonth,
    dueDate,
    statedTotal: findStatedTotal(lines),
    items,
    warnings,
  };
}
