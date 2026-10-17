import { describe, expect, it } from "vitest";
import {
  buildHistoryIndex,
  buildHistoryKey,
  DEFAULT_KEYWORDS,
  suggestCategory,
  type HistoryIndex,
} from "@/features/invoice-import/categorize";

const categories = [
  { name: "Alimentação", type: "outcome" },
  { name: "Transporte", type: "outcome" },
  { name: "Saúde", type: "outcome" },
  { name: "Lazer", type: "outcome" },
  { name: "Educação", type: "outcome" },
  { name: "Vestuário", type: "outcome" },
  { name: "Contas", type: "outcome" },
  { name: "Moradia", type: "outcome" },
  { name: "Salário", type: "income" },
];

const emptyHistory: HistoryIndex = new Map();

function suggest(merchant: string, overrides: Partial<Parameters<typeof suggestCategory>[0]> = {}) {
  return suggestCategory({
    merchant,
    type: "outcome",
    rules: [],
    history: emptyHistory,
    categories,
    ...overrides,
  });
}

describe("DEFAULT_KEYWORDS", () => {
  it("mapeia cada palavra-chave para a categoria padrão", () => {
    expect(DEFAULT_KEYWORDS).toMatchObject({
      IFOOD: "Alimentação",
      SUPERMERCADO: "Alimentação",
      UBER: "Transporte",
      "99 ": "Transporte",
      FARMACIA: "Saúde",
      NETFLIX: "Lazer",
      "PRIME VIDEO": "Lazer",
      UDEMY: "Educação",
      "C&A": "Vestuário",
      IOF: "Contas",
      SABESP: "Moradia",
    });
    expect(Object.keys(DEFAULT_KEYWORDS)).toHaveLength(53);
  });
});

describe("buildHistoryIndex", () => {
  it("conta as categorias por tipo e estabelecimento normalizado", () => {
    const index = buildHistoryIndex([
      { description: "PAG*Padaria São João", category: "Alimentação", type: "outcome", amount: -10 },
      { description: "padaria sao joao", category: "Alimentação", type: null, amount: -12 },
      { description: "PADARIA SAO JOAO", category: "Lazer", type: "outcome", amount: -5 },
      { description: "PADARIA SAO JOAO", category: "Salário", type: null, amount: 50 },
    ]);

    expect(index.get(buildHistoryKey("outcome", "PADARIA SAO JOAO"))).toEqual(
      new Map([
        ["Alimentação", 2],
        ["Lazer", 1],
      ]),
    );
    expect(index.get(buildHistoryKey("income", "PADARIA SAO JOAO"))).toEqual(
      new Map([["Salário", 1]]),
    );
  });

  it("ignora investimentos e descrições vazias", () => {
    const index = buildHistoryIndex([
      { description: "TESOURO DIRETO", category: "Renda fixa", type: "investment", amount: -100 },
      { description: "   ", category: "Lazer", type: "outcome", amount: -1 },
    ]);

    expect(index.size).toBe(0);
  });
});

describe("suggestCategory", () => {
  it("usa a regra do usuário quando o padrão é igual ao estabelecimento", () => {
    const rules = [{ pattern: "NETFLIX COM", category: "Contas", type: "outcome" }];

    expect(suggest("NETFLIX COM", { rules })).toEqual({ category: "Contas", source: "rule" });
  });

  it("usa a regra cujo padrão está contido no estabelecimento, preferindo o mais longo", () => {
    const rules = [
      { pattern: "UBER", category: "Transporte", type: "outcome" },
      { pattern: "uber eats", category: "Alimentação", type: "outcome" },
    ];

    expect(suggest("UBER EATS PEDIDO", { rules })).toEqual({
      category: "Alimentação",
      source: "rule",
    });
    expect(suggest("UBER TRIP", { rules })).toEqual({ category: "Transporte", source: "rule" });
  });

  it("ignora regras de outro tipo", () => {
    const rules = [{ pattern: "NETFLIX", category: "Salário", type: "income" }];

    expect(suggest("NETFLIX COM", { rules })).toEqual({ category: "Lazer", source: "keyword" });
  });

  it("ignora regras com padrão vazio", () => {
    const rules = [{ pattern: "  ", category: "Contas", type: "outcome" }];

    expect(suggest("LOJA QUALQUER", { rules })).toEqual({ category: null, source: null });
  });

  it("cai para o histórico quando a categoria da regra não existe", () => {
    const rules = [{ pattern: "NETFLIX", category: "Assinaturas", type: "outcome" }];
    const history = buildHistoryIndex([
      { description: "NETFLIX.COM", category: "Contas", type: "outcome", amount: -39.9 },
    ]);

    expect(suggest("NETFLIX COM", { rules, history })).toEqual({
      category: "Contas",
      source: "history",
    });
  });

  it("usa a categoria mais frequente do histórico para o mesmo tipo", () => {
    const history = buildHistoryIndex([
      { description: "BAZAR CENTRAL", category: "Lazer", type: "outcome", amount: -1 },
      { description: "BAZAR CENTRAL", category: "Moradia", type: "outcome", amount: -1 },
      { description: "BAZAR CENTRAL", category: "Moradia", type: "outcome", amount: -1 },
      { description: "BAZAR CENTRAL", category: "Salário", type: "income", amount: 1 },
    ]);

    expect(suggest("BAZAR CENTRAL", { history })).toEqual({ category: "Moradia", source: "history" });
    expect(suggest("BAZAR CENTRAL", { history, type: "income" })).toEqual({
      category: "Salário",
      source: "history",
    });
  });

  it("desconsidera no histórico as categorias que o usuário não possui mais", () => {
    const history = buildHistoryIndex([
      { description: "BAZAR CENTRAL", category: "Antiga", type: "outcome", amount: -1 },
      { description: "BAZAR CENTRAL", category: "Antiga", type: "outcome", amount: -1 },
      { description: "BAZAR CENTRAL", category: "Lazer", type: "outcome", amount: -1 },
    ]);

    expect(suggest("BAZAR CENTRAL", { history })).toEqual({ category: "Lazer", source: "history" });
  });

  it.each([
    ["IFOOD", "Alimentação"],
    ["SUPERMERCADO BOM PRECO", "Alimentação"],
    ["Açougue Central", "Alimentação"],
    ["UBER TRIP", "Transporte"],
    ["99 POP", "Transporte"],
    ["99APP CORRIDA", "Transporte"],
    ["DROGASIL 123", "Saúde"],
    ["PRIME VIDEO BR", "Lazer"],
    ["ALURA", "Educação"],
    ["C A MODAS", "Vestuário"],
    ["IOF COMPRA INTERNACIONAL", "Contas"],
    ["CONDOMINIO EDIFICIO SOL", "Moradia"],
  ])("sugere pelo dicionário: %s -> %s", (merchant, category) => {
    expect(suggest(merchant)).toEqual({ category, source: "keyword" });
  });

  it.each(["IMPOSTO DE RENDA", "LOJA 1990", "BIOFARMA", "PENELOPE STORE"])(
    "não confunde palavra-chave no meio de outra palavra: %s",
    (merchant) => {
      expect(suggest(merchant)).toEqual({ category: null, source: null });
    },
  );

  it("não usa o dicionário para receitas", () => {
    expect(suggest("NETFLIX COM", { type: "income" })).toEqual({ category: null, source: null });
  });

  it("retorna nulo quando a categoria do dicionário não existe para o usuário", () => {
    expect(
      suggest("NETFLIX COM", { categories: [{ name: "Lazer", type: "income" }] }),
    ).toEqual({ category: null, source: null });
  });

  it("retorna nulo quando nada combina", () => {
    expect(suggest("LOJA DESCONHECIDA")).toEqual({ category: null, source: null });
  });
});
