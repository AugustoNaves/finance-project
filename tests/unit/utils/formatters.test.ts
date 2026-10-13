import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, formatMonthYear } from "@/utils/formatters";

function normalizeSpaces(value: string) {
  return value.replace(/[  ]/g, " ");
}

describe("formatCurrency", () => {
  it("formata valores positivos em reais no padrão pt-BR", () => {
    expect(normalizeSpaces(formatCurrency(1234.56))).toBe("R$ 1.234,56");
  });

  it("usa espaço não separável entre o símbolo e o valor", () => {
    expect(formatCurrency(10)).toBe("R$ 10,00");
  });

  it("formata zero", () => {
    expect(normalizeSpaces(formatCurrency(0))).toBe("R$ 0,00");
  });

  it("formata valores negativos com sinal antes do símbolo", () => {
    expect(normalizeSpaces(formatCurrency(-1500))).toBe("-R$ 1.500,00");
  });

  it("arredonda para duas casas decimais", () => {
    expect(normalizeSpaces(formatCurrency(1.005))).toBe("R$ 1,01");
    expect(normalizeSpaces(formatCurrency(2.994))).toBe("R$ 2,99");
  });

  it("usa separador de milhar para valores grandes", () => {
    expect(normalizeSpaces(formatCurrency(1234567.8))).toBe("R$ 1.234.567,80");
  });
});

describe("formatDate", () => {
  it("formata data ISO armazenada à meia-noite UTC como dd/mm/aaaa", () => {
    expect(formatDate("2026-10-13T00:00:00.000Z")).toBe("13/10/2026");
  });

  it("formata string somente-dia sem deslocar para o dia anterior", () => {
    expect(formatDate("2026-01-15")).toBe("15/01/2026");
  });

  it("mantém o dia 1 do mês no próprio mês, mesmo em fuso negativo", () => {
    expect(formatDate("2026-03-01T00:00:00.000Z")).toBe("01/03/2026");
    expect(formatDate("2026-03-01")).toBe("01/03/2026");
  });

  it("mantém o último dia do mês e do ano", () => {
    expect(formatDate("2026-01-31T00:00:00.000Z")).toBe("31/01/2026");
    expect(formatDate("2028-02-29T00:00:00.000Z")).toBe("29/02/2028");
    expect(formatDate("2026-12-31T00:00:00.000Z")).toBe("31/12/2026");
  });

  it("mantém 1º de janeiro no ano correto", () => {
    expect(formatDate("2027-01-01T00:00:00.000Z")).toBe("01/01/2027");
  });

  it("formata objetos Date pelo dia em UTC", () => {
    expect(formatDate(new Date(Date.UTC(2026, 11, 31)))).toBe("31/12/2026");
  });

  it("usa o dia em UTC e não o dia local quando a data tem horário", () => {
    const noiteLocalDeAnoNovo = new Date(2026, 11, 31, 23, 59);

    expect(noiteLocalDeAnoNovo.getDate()).toBe(31);
    expect(formatDate(noiteLocalDeAnoNovo)).toBe("01/01/2027");
  });

  it("preenche dia e mês com zero à esquerda", () => {
    expect(formatDate("2026-03-05T00:00:00.000Z")).toBe("05/03/2026");
  });

  it("retorna 'Invalid Date' para valor inválido", () => {
    expect(formatDate("nao-e-data")).toBe("Invalid Date");
  });
});

describe("formatMonthYear", () => {
  it("formata mês por extenso e ano em português", () => {
    expect(formatMonthYear(new Date(2026, 0, 15))).toBe("janeiro de 2026");
  });

  it("formata dezembro", () => {
    expect(formatMonthYear(new Date(2025, 11, 1))).toBe("dezembro de 2025");
  });

  it("formata março com cedilha", () => {
    expect(formatMonthYear(new Date(2026, 2, 31))).toBe("março de 2026");
  });
});
