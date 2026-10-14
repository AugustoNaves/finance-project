import { describe, expect, it } from "vitest";
import {
  buildFingerprint,
  formatInstallment,
  getEffectiveDate,
  normalizeMerchant,
} from "@/features/invoice-import/normalize";

describe("invoice-import/normalize — normalizeMerchant", () => {
  it("remove acentos, coloca em maiúsculas e colapsa espaços", () => {
    expect(normalizeMerchant("  Pão   de Açúcar ")).toBe("PAO DE ACUCAR");
    expect(normalizeMerchant("Estação Café")).toBe("ESTACAO CAFE");
  });

  it.each([
    ["PAG*PadariaReal", "PADARIAREAL"],
    ["MP *LOJADOJOAO", "LOJADOJOAO"],
    ["IFD*Restaurante Bom Sabor", "RESTAURANTE BOM SABOR"],
    ["PG *TON MERCEARIA", "TON MERCEARIA"],
    ["MERCADOPAGO*BANCA", "BANCA"],
  ])("remove o prefixo de adquirente de `%s`", (description, merchant) => {
    expect(normalizeMerchant(description)).toBe(merchant);
  });

  it.each([
    ["MAGAZINE LUIZA PARC 03/10", "MAGAZINE LUIZA"],
    ["Casas Bahia - Parcela 3 de 10", "CASAS BAHIA"],
    ["NETFLIX.COM 2/12", "NETFLIX COM"],
    ["PAG*LOJA 01/06", "LOJA"],
  ])("remove o sufixo de parcela de `%s`", (description, merchant) => {
    expect(normalizeMerchant(description)).toBe(merchant);
  });

  it.each([
    ["UBER *TRIP SAO PAULO BR", "UBER TRIP SAO PAULO"],
    ["DROGASIL SAO PAULO BR", "DROGASIL SAO PAULO"],
    ["IFD*IFOOD OSASCO BRA", "IFOOD OSASCO"],
    ["LOJA DO ZE", "LOJA DO ZE"],
  ])("remove só o país do final (cidade e nome ficam) em `%s`", (description, merchant) => {
    expect(normalizeMerchant(description)).toBe(merchant);
  });

  it("mantém o país quando o restante ficaria curto demais", () => {
    expect(normalizeMerchant("AB BR")).toBe("AB BR");
  });

  it("troca pontuação por espaço", () => {
    expect(normalizeMerchant("AMAZON.COM.BR")).toBe("AMAZON COM BR");
    expect(normalizeMerchant("MERCADO LIVRE*2PRODUTOS")).toBe("MERCADO LIVRE 2PRODUTOS");
  });

  it("gera o mesmo estabelecimento para variações da mesma compra", () => {
    expect(normalizeMerchant("Uber *Trip São Paulo BR")).toBe(normalizeMerchant("UBER *TRIP SAO PAULO"));
    expect(normalizeMerchant("Ifood *Restaurante 3/10")).toBe(normalizeMerchant("IFOOD *RESTAURANTE"));
  });
});

describe("invoice-import/normalize — buildFingerprint", () => {
  it("combina dia, estabelecimento normalizado e valor absoluto com duas casas", () => {
    expect(buildFingerprint("2026-09-12", "Uber *Trip São Paulo BR", 23.9)).toBe("2026-09-12|UBER TRIP SAO PAULO|23.90");
  });

  it("ignora a hora da data e o sinal do valor", () => {
    expect(buildFingerprint("2026-09-12T15:30:00.000Z", "PAG*Padaria", -8)).toBe("2026-09-12|PADARIA|8.00");
  });

  it("é igual para a mesma compra com descrições equivalentes", () => {
    expect(buildFingerprint("2026-09-12", "MAGAZINE LUIZA PARC 03/10", 199.9)).toBe(
      buildFingerprint("2026-09-12T00:00:00.000Z", "Magazine Luiza", 199.9),
    );
  });

  it("muda quando data, estabelecimento ou valor mudam", () => {
    const base = buildFingerprint("2026-09-12", "UBER", 10);

    expect(buildFingerprint("2026-09-13", "UBER", 10)).not.toBe(base);
    expect(buildFingerprint("2026-09-12", "CABIFY", 10)).not.toBe(base);
    expect(buildFingerprint("2026-09-12", "UBER", 10.01)).not.toBe(base);
  });
});

describe("invoice-import/normalize — getEffectiveDate", () => {
  it("mantém a data da compra à vista", () => {
    expect(getEffectiveDate("2026-09-12", null, "2026-10")).toBe("2026-09-12");
  });

  it("mantém a data da compra na primeira parcela", () => {
    expect(getEffectiveDate("2026-09-12", { current: 1, total: 6 }, "2026-10")).toBe("2026-09-12");
  });

  it("move a parcela 2 em diante para o mês da fatura mantendo o dia", () => {
    expect(getEffectiveDate("2026-08-12", { current: 2, total: 6 }, "2026-10")).toBe("2026-10-12");
    expect(getEffectiveDate("2025-11-05", { current: 6, total: 6 }, "2026-04")).toBe("2026-04-05");
  });

  it("limita o dia ao tamanho do mês da fatura", () => {
    expect(getEffectiveDate("2026-01-31", { current: 2, total: 3 }, "2026-02")).toBe("2026-02-28");
    expect(getEffectiveDate("2024-01-31", { current: 2, total: 3 }, "2024-02")).toBe("2024-02-29");
    expect(getEffectiveDate("2026-03-31", { current: 2, total: 3 }, "2026-04")).toBe("2026-04-30");
  });

  it("move tudo para o mês da fatura com useInvoiceMonth", () => {
    expect(getEffectiveDate("2026-09-12", null, "2026-10", true)).toBe("2026-10-12");
    expect(getEffectiveDate("2026-09-12", { current: 1, total: 6 }, "2026-10", true)).toBe("2026-10-12");
    expect(getEffectiveDate("2026-01-30", null, "2026-02", true)).toBe("2026-02-28");
  });

  it("usa o último dia do mês da fatura quando não há data de compra", () => {
    expect(getEffectiveDate(null, null, "2026-02")).toBe("2026-02-28");
    expect(getEffectiveDate(null, { current: 1, total: 3 }, "2026-12")).toBe("2026-12-31");
    expect(getEffectiveDate(null, null, "2024-02", true)).toBe("2024-02-29");
  });
});

describe("invoice-import/normalize — formatInstallment", () => {
  it("formata a parcela como atual/total", () => {
    expect(formatInstallment({ current: 3, total: 10 })).toBe("3/10");
  });

  it("devolve texto vazio quando não há parcela", () => {
    expect(formatInstallment(null)).toBe("");
    expect(formatInstallment(undefined)).toBe("");
  });
});
