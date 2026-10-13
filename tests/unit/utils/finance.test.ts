import { afterEach, describe, expect, it, vi } from "vitest";
import type { Transaction } from "@/types/transaction";
import {
  calculateInvestments,
  calculateSavingsRate,
  calculateSummary,
  getMonthlyTransactions,
  getTransactionType,
  isSameMonth,
} from "@/utils/finance";

function buildTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "tx-1",
    description: "Transação",
    amount: 100,
    category: "Outros",
    date: "2026-03-15T00:00:00.000Z",
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("isSameMonth", () => {
  it("retorna true para datas no mesmo mês e ano", () => {
    expect(isSameMonth("2026-03-10T00:00:00.000Z", new Date(2026, 2, 25))).toBe(true);
  });

  it("aceita data armazenada como string somente-dia", () => {
    expect(isSameMonth("2026-03-15", new Date(2026, 2, 1))).toBe(true);
  });

  it("aceita data armazenada como objeto Date", () => {
    expect(isSameMonth(new Date(Date.UTC(2026, 2, 15)), new Date(2026, 2, 1))).toBe(true);
  });

  it("retorna false para meses diferentes do mesmo ano", () => {
    expect(isSameMonth("2026-02-28T00:00:00.000Z", new Date(2026, 2, 1))).toBe(false);
  });

  it("retorna false para o mesmo mês em anos diferentes", () => {
    expect(isSameMonth("2025-03-15T00:00:00.000Z", new Date(2026, 2, 15))).toBe(false);
  });

  it("mantém o dia 1 à meia-noite UTC no próprio mês, mesmo em fuso negativo", () => {
    expect(isSameMonth("2026-08-01T00:00:00.000Z", new Date(2026, 7, 15))).toBe(true);
    expect(isSameMonth("2026-08-01T00:00:00.000Z", new Date(2026, 6, 15))).toBe(false);
  });

  it("mantém o último dia do mês no próprio mês", () => {
    expect(isSameMonth("2026-08-31T00:00:00.000Z", new Date(2026, 7, 15))).toBe(true);
    expect(isSameMonth("2026-08-31T00:00:00.000Z", new Date(2026, 8, 15))).toBe(false);
  });

  it("separa 31 de dezembro de 1º de janeiro na virada do ano", () => {
    const dezembro = new Date(2026, 11, 10);
    const janeiro = new Date(2027, 0, 10);

    expect(isSameMonth("2026-12-31T00:00:00.000Z", dezembro)).toBe(true);
    expect(isSameMonth("2026-12-31T00:00:00.000Z", janeiro)).toBe(false);
    expect(isSameMonth("2027-01-01T00:00:00.000Z", janeiro)).toBe(true);
    expect(isSameMonth("2027-01-01T00:00:00.000Z", dezembro)).toBe(false);
  });

  it("usa o mês do calendário local da data de referência", () => {
    const ultimaNoiteDeAgosto = new Date(2026, 7, 31, 23, 30);
    const primeiraManhaDeAgosto = new Date(2026, 7, 1, 0, 0, 0, 0);

    expect(ultimaNoiteDeAgosto.getUTCMonth()).toBe(8);
    expect(isSameMonth("2026-08-31T00:00:00.000Z", ultimaNoiteDeAgosto)).toBe(true);
    expect(isSameMonth("2026-09-01T00:00:00.000Z", ultimaNoiteDeAgosto)).toBe(false);
    expect(isSameMonth("2026-08-01T00:00:00.000Z", primeiraManhaDeAgosto)).toBe(true);
    expect(isSameMonth("2026-07-31T00:00:00.000Z", primeiraManhaDeAgosto)).toBe(false);
  });

  it("usa o mês em UTC da data armazenada quando ela tem horário", () => {
    expect(isSameMonth("2026-08-31T23:59:59.999Z", new Date(2026, 7, 15))).toBe(true);
    expect(isSameMonth("2026-09-01T00:00:00.000Z", new Date(2026, 7, 15))).toBe(false);
  });

  it("trata 29 de fevereiro em ano bissexto", () => {
    expect(isSameMonth("2028-02-29T00:00:00.000Z", new Date(2028, 1, 1))).toBe(true);
    expect(isSameMonth("2028-02-29T00:00:00.000Z", new Date(2028, 2, 1))).toBe(false);
  });
});

describe("getMonthlyTransactions", () => {
  const transactions = [
    buildTransaction({ id: "jan-fim", date: "2026-01-31T00:00:00.000Z" }),
    buildTransaction({ id: "fev-inicio", date: "2026-02-01T00:00:00.000Z" }),
    buildTransaction({ id: "fev-fim", date: "2026-02-28T00:00:00.000Z" }),
    buildTransaction({ id: "mar-inicio", date: "2026-03-01T00:00:00.000Z" }),
    buildTransaction({ id: "fev-outro-ano", date: "2025-02-10T00:00:00.000Z" }),
  ];

  it("filtra apenas as transações do mês de referência, incluindo o primeiro e o último dia", () => {
    const result = getMonthlyTransactions(transactions, new Date(2026, 1, 10));

    expect(result.map((transaction) => transaction.id)).toEqual(["fev-inicio", "fev-fim"]);
  });

  it("não puxa o dia 1 do mês seguinte nem o último dia do mês anterior", () => {
    const result = getMonthlyTransactions(transactions, new Date(2026, 1, 28, 23, 59));

    expect(result.map((transaction) => transaction.id)).not.toContain("jan-fim");
    expect(result.map((transaction) => transaction.id)).not.toContain("mar-inicio");
  });

  it("usa a data atual quando a referência não é informada", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 20, 10, 0, 0));

    const result = getMonthlyTransactions(transactions);

    expect(result.map((transaction) => transaction.id)).toEqual(["mar-inicio"]);
  });

  it("retorna lista vazia quando não há transações no mês", () => {
    expect(getMonthlyTransactions(transactions, new Date(2026, 5, 1))).toEqual([]);
  });

  it("retorna lista vazia para entrada vazia", () => {
    expect(getMonthlyTransactions([], new Date(2026, 1, 1))).toEqual([]);
  });

  it("não altera a lista original", () => {
    const copy = [...transactions];

    getMonthlyTransactions(transactions, new Date(2026, 1, 10));

    expect(transactions).toEqual(copy);
  });
});

describe("getTransactionType", () => {
  it.each(["income", "outcome", "investment"] as const)(
    "retorna o tipo explícito %s",
    (type) => {
      expect(getTransactionType(buildTransaction({ type, amount: -50 }))).toBe(type);
    },
  );

  it("infere income quando o tipo é nulo e o valor é positivo", () => {
    expect(getTransactionType(buildTransaction({ type: null, amount: 10 }))).toBe("income");
  });

  it("infere outcome quando o tipo é indefinido e o valor é negativo", () => {
    expect(getTransactionType(buildTransaction({ type: undefined, amount: -10 }))).toBe(
      "outcome",
    );
  });

  it("infere outcome quando o tipo é nulo e o valor é zero", () => {
    expect(getTransactionType(buildTransaction({ type: null, amount: 0 }))).toBe("outcome");
  });
});

describe("calculateSummary", () => {
  it("retorna zeros para lista vazia", () => {
    expect(calculateSummary([])).toEqual({ income: 0, outcome: 0, investment: 0, total: 0 });
  });

  it("soma entradas, saídas e investimentos separadamente", () => {
    const summary = calculateSummary([
      buildTransaction({ type: "income", amount: 5000 }),
      buildTransaction({ type: "income", amount: 500 }),
      buildTransaction({ type: "outcome", amount: -1200 }),
      buildTransaction({ type: "outcome", amount: -300 }),
      buildTransaction({ type: "investment", amount: -1000 }),
    ]);

    expect(summary).toEqual({ income: 5500, outcome: -1500, investment: -1000, total: 3000 });
  });

  it("usa o sinal do valor quando o tipo é nulo (transações legadas)", () => {
    const summary = calculateSummary([
      buildTransaction({ type: null, amount: 200 }),
      buildTransaction({ type: undefined, amount: -80 }),
    ]);

    expect(summary).toEqual({ income: 200, outcome: -80, investment: 0, total: 120 });
  });

  it("contabiliza investimento independentemente do sinal do valor", () => {
    const summary = calculateSummary([
      buildTransaction({ type: "investment", amount: -400 }),
      buildTransaction({ type: "investment", amount: 150 }),
    ]);

    expect(summary).toEqual({ income: 0, outcome: 0, investment: -250, total: -250 });
  });

  it("comportamento atual: o sinal prevalece sobre o tipo income/outcome", () => {
    const summary = calculateSummary([
      buildTransaction({ type: "outcome", amount: 100 }),
      buildTransaction({ type: "income", amount: -40 }),
    ]);

    expect(summary).toEqual({ income: 100, outcome: -40, investment: 0, total: 60 });
  });

  it("lida com valores decimais", () => {
    const summary = calculateSummary([
      buildTransaction({ type: "income", amount: 10.5 }),
      buildTransaction({ type: "outcome", amount: -0.25 }),
    ]);

    expect(summary.income).toBeCloseTo(10.5);
    expect(summary.outcome).toBeCloseTo(-0.25);
    expect(summary.total).toBeCloseTo(10.25);
  });
});

describe("calculateInvestments", () => {
  it("retorna zero quando não há investimentos", () => {
    expect(
      calculateInvestments([
        buildTransaction({ type: "income", amount: 100 }),
        buildTransaction({ type: "outcome", amount: -50 }),
      ]),
    ).toBe(0);
  });

  it("retorna zero para lista vazia", () => {
    expect(calculateInvestments([])).toBe(0);
  });

  it("soma o valor absoluto dos investimentos", () => {
    expect(
      calculateInvestments([
        buildTransaction({ type: "investment", amount: -1000 }),
        buildTransaction({ type: "investment", amount: 250 }),
        buildTransaction({ type: "outcome", amount: -999 }),
      ]),
    ).toBe(1250);
  });

  it("ignora transações sem tipo mesmo com valor negativo", () => {
    expect(calculateInvestments([buildTransaction({ type: null, amount: -500 })])).toBe(0);
  });
});

describe("calculateSavingsRate", () => {
  it("retorna 'Sem receitas' quando a receita é zero", () => {
    expect(calculateSavingsRate(0, 0)).toBe("Sem receitas");
    expect(calculateSavingsRate(0, -500)).toBe("Sem receitas");
  });

  it("retorna 'Sem receitas' quando a receita é negativa", () => {
    expect(calculateSavingsRate(-100, 50)).toBe("Sem receitas");
  });

  it("calcula o percentual economizado", () => {
    expect(calculateSavingsRate(1000, 250)).toBe("25% economizado");
  });

  it("arredonda o percentual para o inteiro mais próximo", () => {
    expect(calculateSavingsRate(3, 1)).toBe("33% economizado");
    expect(calculateSavingsRate(3, 2)).toBe("67% economizado");
  });

  it("retorna 100% quando todo o valor foi economizado", () => {
    expect(calculateSavingsRate(800, 800)).toBe("100% economizado");
  });

  it("retorna 0% quando o saldo é zero", () => {
    expect(calculateSavingsRate(800, 0)).toBe("0% economizado");
  });

  it("comportamento atual: saldo negativo gera percentual negativo", () => {
    expect(calculateSavingsRate(1000, -200)).toBe("-20% economizado");
  });
});
