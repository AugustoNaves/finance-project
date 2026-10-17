import { describe, expect, it } from "vitest";
import {
  genericAdapter,
  interAdapter,
  itauAdapter,
  nubankAdapter,
  parseWithAdapters,
} from "@/features/invoice-import/adapters";
import { parseInvoice } from "@/features/invoice-import/parseInvoice";

const referenceToday = new Date(2026, 9, 12, 12, 0);

describe("invoice-import/adapters/nubank", () => {
  it("detecta faturas do Nubank pelo cabeçalho institucional", () => {
    expect(nubankAdapter.detect("Nu Pagamentos S.A. - Instituição de Pagamento\nOlá, Maria.")).toBe(true);
    expect(nubankAdapter.detect("NUBANK FATURA DO CARTÃO")).toBe(true);
  });

  it("não detecta Nubank a partir de linhas de lançamento", () => {
    expect(nubankAdapter.detect("12/09 NUBANK RECARGA 10,00")).toBe(false);
  });

  it("não detecta outros emissores como Nubank", () => {
    expect(nubankAdapter.detect("Itaú Unibanco S.A.\nFatura Itaucard")).toBe(false);
    expect(nubankAdapter.detect("Banco Bradesco Cartões")).toBe(false);
  });

  it("descarta seções de parcelamentos futuros que causam divergência na conferência do total", () => {
    const rawNubank = [
      "Nu Pagamentos S.A. - Instituição de Pagamento",
      "Olá, Maria. Esta é a sua fatura de outubro, no valor de R$ 68,90",
      "Data de vencimento: 10 OUT 2026",
      "Total a pagar R$ 68,90",
      "TRANSAÇÕES DE 03 SET A 03 OUT",
      "12 SET Uber *Trip São Paulo R$ 23,90",
      "12 SET Ifood *Restaurante 3/10 R$ 45,00",
      "Próximas faturas",
      "12 OUT Ifood *Restaurante 4/10 R$ 45,00",
      "12 NOV Ifood *Restaurante 5/10 R$ 45,00",
      "Parcelamento",
      "05 OUT Parcela 1 de 12 R$ 100,00",
      "05 NOV Parcela 2 de 12 R$ 100,00",
    ].join("\n");

    const parsed = nubankAdapter.parse(rawNubank, { today: referenceToday });

    expect(parsed).not.toBeNull();
    expect(parsed?.issuer).toBe("Nubank");
    expect(parsed?.statedTotal).toBe(68.9);
    expect(parsed?.items).toHaveLength(2);

    expect(parsed?.items).toEqual([
      {
        date: "2026-09-12",
        description: "Uber *Trip São Paulo",
        amount: 23.9,
        kind: "purchase",
        installment: null,
        raw: "12 SET Uber *Trip São Paulo R$ 23,90",
      },
      {
        date: "2026-09-12",
        description: "Ifood *Restaurante",
        amount: 45,
        kind: "purchase",
        installment: { current: 3, total: 10 },
        raw: "12 SET Ifood *Restaurante 3/10 R$ 45,00",
      },
    ]);

    const itemsSum = parsed?.items.reduce((sum, item) => sum + item.amount, 0) ?? 0;
    expect(Math.round(itemsSum * 100) / 100).toBe(parsed?.statedTotal);
  });

  it("descarta lançamentos sob seções 'Parcelas a vencer' e 'Parcelamento de fatura'", () => {
    const rawNubank = [
      "Nu Pagamentos S.A.",
      "Total a pagar R$ 50,00",
      "Data de vencimento: 10 OUT 2026",
      "TRANSAÇÕES",
      "01 OUT FARMACIA DROGASIL R$ 50,00",
      "Parcelamento de fatura",
      "05 OUT Entrada parcelamento R$ 200,00",
      "05 NOV Parcela 1/6 R$ 150,00",
      "Parcelas a vencer",
      "10 NOV LOJA XYZ 2/3 R$ 80,00",
    ].join("\n");

    const parsed = nubankAdapter.parse(rawNubank, { today: referenceToday });

    expect(parsed?.items).toHaveLength(1);
    expect(parsed?.items[0].description).toBe("FARMACIA DROGASIL");
    expect(parsed?.items[0].amount).toBe(50);
  });

  it("trata datas em formato textual Nubank com virada de ano", () => {
    const rawNubank = [
      "Nu Pagamentos S.A.",
      "Data de vencimento: 10 JAN 2026",
      "Total a pagar R$ 120,00",
      "15 dez COMPRA DE NATAL R$ 100,00",
      "02 jan COMPRA DE ANO NOVO R$ 20,00",
    ].join("\n");

    const parsed = nubankAdapter.parse(rawNubank, { today: new Date(2026, 0, 15) });

    expect(parsed?.items.map((i) => [i.date, i.description, i.amount])).toEqual([
      ["2025-12-15", "COMPRA DE NATAL", 100],
      ["2026-01-02", "COMPRA DE ANO NOVO", 20],
    ]);
  });
});

describe("invoice-import/adapters/itau", () => {
  it("detecta faturas do Itaú pelo cabeçalho institucional", () => {
    expect(itauAdapter.detect("Itaú Unibanco S.A.\nFatura")).toBe(true);
    expect(itauAdapter.detect("Banco Itaucard S.A. - Demonstrativo")).toBe(true);
    expect(itauAdapter.detect("Fatura do cartão Itaucard Visa Platinum")).toBe(true);
  });

  it("não detecta Itaú a partir de linhas de lançamento", () => {
    expect(itauAdapter.detect("12/09 ITAU CINEMA 20,00")).toBe(false);
  });

  it("trata coluna dupla (data de compra vs data de lançamento) evitando ler a data de lançamento como parcela", () => {
    const rawItau = [
      "Itaú Unibanco S.A.",
      "Vencimento: 10/01/2026",
      "Total desta fatura 250,00",
      "Lançamentos: compras e saques",
      "15/12 02/06 FARMACIA POPULAR 50,00",
      "16/12 03/10 SUPERMERCADO EXTRA 80,00",
      "18/12 01/12 RESTAURANTE SABOR 120,00",
    ].join("\n");

    const parsed = itauAdapter.parse(rawItau, { today: new Date(2026, 0, 20) });

    expect(parsed).not.toBeNull();
    expect(parsed?.issuer).toBe("Itaú");
    expect(parsed?.items).toHaveLength(3);

    // Nenhuma das datas de lançamento (02/06, 03/10, 01/12) deve ser lida como parcela
    expect(parsed?.items[0]).toEqual({
      date: "2025-12-15",
      description: "FARMACIA POPULAR",
      amount: 50,
      kind: "purchase",
      installment: null,
      raw: "15/12 02/06 FARMACIA POPULAR 50,00",
    });

    expect(parsed?.items[1]).toEqual({
      date: "2025-12-16",
      description: "SUPERMERCADO EXTRA",
      amount: 80,
      kind: "purchase",
      installment: null,
      raw: "16/12 03/10 SUPERMERCADO EXTRA 80,00",
    });

    expect(parsed?.items[2]).toEqual({
      date: "2025-12-18",
      description: "RESTAURANTE SABOR",
      amount: 120,
      kind: "purchase",
      installment: null,
      raw: "18/12 01/12 RESTAURANTE SABOR 120,00",
    });
  });

  it("preserva a parcela real quando a coluna dupla de data e a parcela coexistem", () => {
    const rawItau = [
      "Itaú Unibanco S.A.",
      "Vencimento: 10/01/2026",
      "Total desta fatura 1.234,56",
      "20/12 21/12 MERCADO LIVRE*2PRODUTOS 02/06 1.234,56",
    ].join("\n");

    const parsed = itauAdapter.parse(rawItau, { today: new Date(2026, 0, 20) });

    expect(parsed?.items[0]).toEqual({
      date: "2025-12-20",
      description: "MERCADO LIVRE*2PRODUTOS",
      amount: 1234.56,
      kind: "purchase",
      installment: { current: 2, total: 6 },
      raw: "20/12 21/12 MERCADO LIVRE*2PRODUTOS 02/06 1.234,56",
    });
  });

  it("trata coluna dupla com ano completo dd/mm/aaaa", () => {
    const rawItau = [
      "Banco Itaucard S.A.",
      "Vencimento: 10/01/2026",
      "Total desta fatura 150,00",
      "15/12/2025 16/12/2025 POSTO 24/7 CENTRO 150,00",
    ].join("\n");

    const parsed = itauAdapter.parse(rawItau, { today: new Date(2026, 0, 20) });

    expect(parsed?.items[0]).toEqual({
      date: "2025-12-15",
      description: "POSTO 24/7 CENTRO",
      amount: 150,
      kind: "purchase",
      installment: null,
      raw: "15/12/2025 16/12/2025 POSTO 24/7 CENTRO 150,00",
    });
  });

  it("descarta seções de lançamentos futuros no Itaú", () => {
    const rawItau = [
      "Itaú Unibanco S.A.",
      "Vencimento: 10/01/2026",
      "Total desta fatura 100,00",
      "15/12 UBER 100,00",
      "Lançamentos futuros",
      "15/01 UBER FUTURO 100,00",
      "Próximas faturas",
      "15/02 LOJA XYZ 03/10 50,00",
    ].join("\n");

    const parsed = itauAdapter.parse(rawItau, { today: new Date(2026, 0, 20) });

    expect(parsed?.items).toHaveLength(1);
    expect(parsed?.items[0].description).toBe("UBER");
    expect(parsed?.items[0].amount).toBe(100);
  });
});

describe("invoice-import/adapters/inter", () => {
  const rawInter = [
    "Resumo da fatura",
    "Olá, Maria ! A sua fatura chegou!",
    "Limite de crédito total",
    "Total da sua fatura",
    "R$ 2.000,00",
    "R$ 297,10",
    "Data de Vencimento",
    "Este é o valor que você precisa pagar nesse mês 07/10/2026",
    "Pagamento mínimo: R$ 44,56",
    "Encargos rotativos 16,60 % am Valor total financiado R$ 252,54",
    "Faça o pagamento pela conta do Inter ou via Pix.",
    "Você pode acessar sua fatura no Super App.",
    "Despesas do mês R$ 297,10",
    "Fatura atual R$ 297,10",
    "Despesas da fatura",
    "CARTÃO 1234****9876",
    "Data Movimentação Beneficiário Valor",
    "03 de jul. 2026 LOJA EXEMPLO (Parcela 03 de 04) - R$ 57,25",
    "30 de ago. 2026 PADARIA CENTRAL - R$ 24,40",
    "05 de set. 2026 P AGAMENTO ON LINE - + R$ 399,65",
    "06 de set. 2026 Cidade - MG 05 - P - R$ 36,73",
    "12 de set. 2026 ESTORNO LOJA EXEMPLO - + R$ 10,00",
    "26 de set. 2026 RESTAURANTE BOM - R$ 188,72",
    "Total CARTÃO 1234****9876 R$ 297,10",
    "Próxima fatura",
    "Movimentação Valor",
    "LOJA EXEMPLO (Parcela 04 de 04) R$ 57,25",
  ].join("\n");

  it("detecta a fatura do Inter pelo título da seção e pela marca", () => {
    expect(interAdapter.detect(rawInter)).toBe(true);
    expect(interAdapter.detect("Despesas da fatura\n12/09 PADARIA 10,00")).toBe(false);
    expect(interAdapter.detect("Nu Pagamentos S.A.\nFatura do cartão")).toBe(false);
  });

  it("lê o \" - \" antes do valor como separador: compras viram gasto, não crédito", () => {
    const parsed = interAdapter.parse(rawInter, { today: referenceToday });

    expect(parsed?.issuer).toBe("Inter");
    expect(parsed?.items.filter((item) => item.kind === "purchase").map((item) => item.description)).toEqual([
      "LOJA EXEMPLO",
      "PADARIA CENTRAL",
      "Cidade - MG 05 - P",
      "RESTAURANTE BOM",
    ]);
    expect(parsed?.items.find((item) => item.description === "PADARIA CENTRAL")).toMatchObject({
      amount: 24.4,
      date: "2026-08-30",
    });
  });

  it("\"+\" marca crédito: pagamento da fatura é pagamento e estorno é crédito", () => {
    const parsed = interAdapter.parse(rawInter, { today: referenceToday });

    expect(parsed?.items.find((item) => item.description === "PAGAMENTO ON LINE")?.kind).toBe("payment");
    expect(parsed?.items.find((item) => item.description === "ESTORNO LOJA EXEMPLO")?.kind).toBe("credit");
  });

  it("usa o ano impresso na data, lê a parcela e ignora a seção Próxima fatura", () => {
    const parsed = interAdapter.parse(rawInter, { today: referenceToday });
    const installment = parsed?.items.find((item) => item.description === "LOJA EXEMPLO");

    expect(installment?.installment).toEqual({ current: 3, total: 4 });
    expect(parsed?.items).toHaveLength(6);
    expect(parsed?.items.some((item) => item.installment?.current === 4)).toBe(false);
  });

  it("lê vencimento e o total de \"Fatura atual\", não o valor financiado do rotativo", () => {
    const parsed = interAdapter.parse(rawInter, { today: referenceToday });

    expect(parsed?.dueDate).toBe("2026-10-07");
    expect(parsed?.referenceMonth).toBe("2026-10");
    expect(parsed?.statedTotal).toBe(297.1);
  });

  it("parseWithAdapters escolhe o adaptador do Inter", () => {
    const parsed = parseWithAdapters(rawInter, { today: referenceToday });

    expect(parsed.issuer).toBe("Inter");
    expect(parsed.items.filter((item) => item.kind === "credit")).toHaveLength(1);
  });
});

describe("invoice-import/adapters/classify", () => {
  it("\"CREDITO\" só indica crédito no início ou como \"crédito de/em/ref\"; compra com a palavra no nome segue gasto", () => {
    const parsed = parseInvoice([
      [
        "Vencimento 10/10/2026",
        "12/09 SEGURO CREDITO E CIA 80,00",
        "13/09 CREDITO DE ANUIDADE 30,00",
        "14/09 CREDITO 15,00",
      ],
    ]);

    expect(parsed.items.map((item) => [item.description, item.kind])).toEqual([
      ["SEGURO CREDITO E CIA", "purchase"],
      ["CREDITO DE ANUIDADE", "credit"],
      ["CREDITO", "credit"],
    ]);
  });
});

describe("invoice-import/adapters/generic", () => {
  it("funciona como fallback para outros bancos", () => {
    const raw = [
      "Banco Bradesco Cartões",
      "12/09/2026 MERCADO LIVRE PARC 02/06 100,00",
      "13/09/2026 FARMACIA 50,00",
    ].join("\n");

    expect(genericAdapter.detect(raw)).toBe(true);

    const parsed = genericAdapter.parse(raw, { today: referenceToday });

    expect(parsed?.issuer).toBe("Bradesco");
    expect(parsed?.items).toHaveLength(2);
    expect(parsed?.items[0].installment).toEqual({ current: 2, total: 6 });
  });
});

describe("invoice-import/adapters/index — parseWithAdapters e integração", () => {
  it("redireciona para o adaptador Nubank quando detectado", () => {
    const raw = "Nu Pagamentos S.A.\nVencimento 10 OUT 2026\n12 SET UBER 20,00";
    const result = parseWithAdapters(raw, { today: referenceToday });

    expect(result.issuer).toBe("Nubank");
    expect(result.items).toHaveLength(1);
  });

  it("redireciona para o adaptador Itaú quando detectado", () => {
    const raw = "Itaú Unibanco S.A.\nVencimento: 10/01/2026\n15/12 02/06 PADARIA 15,00";
    const result = parseWithAdapters(raw, { today: new Date(2026, 0, 20) });

    expect(result.issuer).toBe("Itaú");
    expect(result.items[0].description).toBe("PADARIA");
    expect(result.items[0].installment).toBeNull();
  });

  it("usa o fallback genérico quando nenhum adaptador específico der match", () => {
    const raw = "Banco Santander Brasil S.A.\n12/09 POSTO COMBUSTIVEL 100,00";
    const result = parseWithAdapters(raw, { today: referenceToday });

    expect(result.issuer).toBe("Santander");
    expect(result.items[0].description).toBe("POSTO COMBUSTIVEL");
  });

  it("mantém retrocompatibilidade total com parseInvoice(pages)", () => {
    const pages = [
      ["Nu Pagamentos S.A."],
      ["12 SET UBER 20,00", "Total a pagar R$ 20,00"],
    ];

    const result = parseInvoice(pages, { today: referenceToday });

    expect(result.issuer).toBe("Nubank");
    expect(result.items).toHaveLength(1);
    expect(result.statedTotal).toBe(20);
  });
});
