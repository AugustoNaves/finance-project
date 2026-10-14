import { normalizeMerchant } from "./normalize";
import type { ImportEntryType, SuggestionSource } from "./types";

const KEYWORDS_BY_CATEGORY: Record<string, string[]> = {
  Alimentação: [
    "IFOOD",
    "RESTAURANTE",
    "LANCHONETE",
    "PADARIA",
    "MERCADO",
    "SUPERMERCADO",
    "ACOUGUE",
    "PIZZA",
    "BURGER",
    "CAFE",
  ],
  Transporte: [
    "UBER",
    "99APP",
    "99 ",
    "POSTO",
    "COMBUSTIVEL",
    "ESTACIONAMENTO",
    "PEDAGIO",
    "METRO",
  ],
  Saúde: ["FARMACIA", "DROGARIA", "DROGA", "HOSPITAL", "CLINICA", "LABORATORIO"],
  Lazer: ["NETFLIX", "SPOTIFY", "CINEMA", "STEAM", "PRIME VIDEO", "DISNEY", "HBO"],
  Educação: ["UDEMY", "ALURA", "CURSO", "LIVRARIA", "ESCOLA"],
  Vestuário: ["RENNER", "C&A", "RIACHUELO", "ZARA", "NIKE", "ADIDAS"],
  Contas: ["IOF", "JUROS", "MULTA", "ANUIDADE", "ENCARGOS", "TARIFA"],
  Moradia: ["ALUGUEL", "CONDOMINIO", "ENERGIA", "ENEL", "SABESP"],
};

export const DEFAULT_KEYWORDS: Record<string, string> = Object.fromEntries(
  Object.entries(KEYWORDS_BY_CATEGORY).flatMap(([category, keywords]) =>
    keywords.map((keyword) => [keyword, category]),
  ),
);

const WHOLE_WORD_MAX_LENGTH = 3;

function toSearchable(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const KEYWORD_NEEDLES = Object.entries(DEFAULT_KEYWORDS)
  .map(([keyword, category]) => {
    const searchable = toSearchable(keyword);
    const wholeWord = searchable.length <= WHOLE_WORD_MAX_LENGTH;

    return {
      needle: wholeWord ? ` ${searchable} ` : ` ${searchable}`,
      length: searchable.length,
      category,
    };
  })
  .sort((a, b) => b.length - a.length);

export type CategoryRuleInput = {
  pattern: string;
  category: string;
  type: string;
};

export type CategoryOption = {
  name: string;
  type: string;
};

export type HistoryTransaction = {
  description: string;
  category: string;
  type?: string | null;
  amount: number;
};

export type CategoryCountByName = Map<string, number>;

export type HistoryIndex = Map<string, CategoryCountByName>;

export type CategorySuggestion = {
  category: string | null;
  source: SuggestionSource | null;
};

export type SuggestCategoryInput = {
  merchant: string;
  type: ImportEntryType;
  rules: CategoryRuleInput[];
  history: HistoryIndex;
  categories: CategoryOption[];
};

export function buildHistoryKey(type: string, normalizedMerchant: string) {
  return `${type}|${normalizedMerchant}`;
}

export function buildHistoryIndex(transactions: HistoryTransaction[]): HistoryIndex {
  const index: HistoryIndex = new Map();

  for (const transaction of transactions) {
    const type = transaction.type ?? (transaction.amount > 0 ? "income" : "outcome");

    if (type !== "income" && type !== "outcome") {
      continue;
    }

    const merchant = normalizeMerchant(transaction.description);

    if (!merchant || !transaction.category) {
      continue;
    }

    const key = buildHistoryKey(type, merchant);
    const counts = index.get(key) ?? new Map<string, number>();

    counts.set(transaction.category, (counts.get(transaction.category) ?? 0) + 1);
    index.set(key, counts);
  }

  return index;
}

function suggestFromRules(
  merchant: string,
  type: ImportEntryType,
  rules: CategoryRuleInput[],
  categoryExists: (name: string) => boolean,
) {
  const matches = rules
    .filter((rule) => rule.type === type)
    .map((rule) => ({ pattern: normalizeMerchant(rule.pattern), category: rule.category }))
    .filter((rule) => rule.pattern.length > 0 && merchant.includes(rule.pattern))
    .sort((a, b) => b.pattern.length - a.pattern.length);

  return matches.find((rule) => categoryExists(rule.category))?.category ?? null;
}

function suggestFromHistory(
  merchant: string,
  type: ImportEntryType,
  history: HistoryIndex,
  categoryExists: (name: string) => boolean,
) {
  const counts = history.get(buildHistoryKey(type, merchant));

  if (!counts) {
    return null;
  }

  let best: string | null = null;
  let bestCount = 0;

  for (const [category, count] of counts) {
    if (count > bestCount && categoryExists(category)) {
      best = category;
      bestCount = count;
    }
  }

  return best;
}

function suggestFromKeywords(merchant: string, categoryExists: (name: string) => boolean) {
  const haystack = ` ${toSearchable(merchant)} `;

  return (
    KEYWORD_NEEDLES.find(
      (keyword) => haystack.includes(keyword.needle) && categoryExists(keyword.category),
    )?.category ?? null
  );
}

export function suggestCategory({
  merchant,
  type,
  rules,
  history,
  categories,
}: SuggestCategoryInput): CategorySuggestion {
  const names = new Set(
    categories.filter((category) => category.type === type).map((category) => category.name),
  );
  const categoryExists = (name: string) => names.has(name);

  const fromRule = suggestFromRules(merchant, type, rules, categoryExists);

  if (fromRule) {
    return { category: fromRule, source: "rule" };
  }

  const fromHistory = suggestFromHistory(merchant, type, history, categoryExists);

  if (fromHistory) {
    return { category: fromHistory, source: "history" };
  }

  if (type === "outcome") {
    const fromKeyword = suggestFromKeywords(merchant, categoryExists);

    if (fromKeyword) {
      return { category: fromKeyword, source: "keyword" };
    }
  }

  return { category: null, source: null };
}
