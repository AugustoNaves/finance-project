import { describe, expect, it } from "vitest";
import { parseInvoice } from "@/features/invoice-import/parseInvoice";

const EMPTY_WARNING =
  "Nenhum lançamento reconhecido. O PDF pode ser digitalizado (imagem) ou de um layout não suportado.";

const today = new Date(2026, 9, 12, 12, 0);

const nubankPages = [
  [
    "Nu Pagamentos S.A. - Instituição de Pagamento",
    "Olá, Maria. Esta é a sua fatura de outubro, no valor de R$ 1.368,79",
    "Data de vencimento: 10 OUT 2026",
    "Total a pagar R$ 1.368,79",
    "Pagamento mínimo R$ 205,32",
    "Limite total R$ 8.000,00",
  ],
  [
    "TRANSAÇÕES DE 03 SET A 03 OUT",
    "05 SET Pagamento em 05 SET −R$ 1.200,00",
    "12 SET Uber *Trip São Paulo R$ 23,90",
    "12 SET Ifood *Restaurante 3/10 R$ 45,00",
    "15 set Amazon Prime R$ 0,99",
    "28 SET Estorno de compra Netshoes −R$ 89,90",
    "01 OUT IOF de compra internacional R$ 1,37",
    "02 OUT Openai *Chatgpt Subscr R$ 114,21",
    "USD 20,00",
    "Cotação do dólar: R$ 5,71",
    "Página 2 de 2",
  ],
];

const itauPages = [
  [
    "Itaú Unibanco S.A.",
    "Fatura do cartão Itaucard Visa Platinum",
    "Vencimento: 10/01/2026",
    "Total desta fatura 2.580,40",
    "Saldo anterior 1.900,00",
    "Total da fatura anterior 1.900,00",
  ],
  [
    "Lançamentos: compras e saques",
    "DATA ESTABELECIMENTO VALOR EM R$",
    "28/11 PAGAMENTO EFETUADO 1.900,00-",
    "15/12 UBER *TRIP SAO PAULO BR 23,90",
    "20/12 MERCADO LIVRE*2PRODUTOS 02/06 1.234,56",
    "24/12 POSTO 24/7 CENTRO 150,00",
    "02/01 PAG*PADARIAREAL 18,50",
    "05/01 ANUIDADE DIFERENCIADA 03/12 35,00",
    "05/01 TOTAL DOS LANCAMENTOS ATUAIS 1.461,96",
  ],
];

const fullDatePages = [
  [
    "Banco Bradesco S.A. - Cartões",
    "12/09/2026 MERCADO LIVRE*2PRODUTOS PARC 02/06 1.234,56",
    "13/09/26 MAGAZINE LUIZA PARCELA 3 DE 10 R$ 199,90",
    "14/09/2026 Casas Bahia - Parcela 1/12 89,00",
    "03/10/2026 DROGASIL 1234 SAO PAULO 45,00 D",
    "Subtotal 1.568,46",
  ],
];

const creditsPages = [
  [
    "Banco Inter S.A.",
    "Vencimento",
    "10/10/2026",
    "Valor total",
    "R$ 512,34",
    "Limite de crédito 5.000,00",
  ],
  [
    "01/09 SALDO ANTERIOR 830,00",
    "05/09 PAGAMENTO RECEBIDO -830,00",
    "06/09 PAGTO DEBITO AUTOMATICO 100,00 CR",
    "08/09 ESTORNO LOJA RENNER 45,00 CR",
    "09/09 CASHBACK 3,20",
    "10/09 DEVOLUÇÃO AMAZON -45,00",
    "11/09 CREDITO DE CONFIANCA +10,00",
    "12/09 JUROS DE MORA 12,34",
    "12/09 MULTA POR ATRASO 8,00",
    "12/09 ENCARGOS CREDITO ROTATIVO 20,00",
    "13/09 ESTORNO IOF 1,00",
    "14/09 SUPERMERCADO EXTRA R$ 400,00",
    "30/09 TOTAL DE COMPRAS 400,00",
    "30/09 PAGAMENTO MÍNIMO 76,85",
    "30/09 TOTAL A PAGAR 512,34",
  ],
];

function parseLines(lines: string[], reference = today) {
  return parseInvoice([lines], { today: reference });
}

function parseLine(line: string, reference = today) {
  return parseLines([line], reference).items[0];
}

describe("invoice-import/parseInvoice — faturas completas", () => {
  it("interpreta uma fatura no estilo Nubank com datas `12 SET`", () => {
    expect(parseInvoice(nubankPages, { today })).toEqual({
      issuer: "Nubank",
      referenceMonth: "2026-10",
      dueDate: "2026-10-10",
      statedTotal: 1368.79,
      warnings: [],
      items: [
        {
          date: "2026-09-05",
          description: "Pagamento em 05 SET",
          amount: 1200,
          kind: "payment",
          installment: null,
          raw: "05 SET Pagamento em 05 SET −R$ 1.200,00",
        },
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
        {
          date: "2026-09-15",
          description: "Amazon Prime",
          amount: 0.99,
          kind: "purchase",
          installment: null,
          raw: "15 set Amazon Prime R$ 0,99",
        },
        {
          date: "2026-09-28",
          description: "Estorno de compra Netshoes",
          amount: 89.9,
          kind: "credit",
          installment: null,
          raw: "28 SET Estorno de compra Netshoes −R$ 89,90",
        },
        {
          date: "2026-10-01",
          description: "IOF de compra internacional",
          amount: 1.37,
          kind: "fee",
          installment: null,
          raw: "01 OUT IOF de compra internacional R$ 1,37",
        },
        {
          date: "2026-10-02",
          description: "Openai *Chatgpt Subscr",
          amount: 114.21,
          kind: "purchase",
          installment: null,
          raw: "02 OUT Openai *Chatgpt Subscr R$ 114,21",
        },
      ],
    });
  });

  it("interpreta uma fatura no estilo Itaú com datas `12/09` e virada de ano", () => {
    expect(parseInvoice(itauPages, { today: new Date(2026, 0, 20) })).toEqual({
      issuer: "Itaú",
      referenceMonth: "2026-01",
      dueDate: "2026-01-10",
      statedTotal: 2580.4,
      warnings: [],
      items: [
        {
          date: "2025-11-28",
          description: "PAGAMENTO EFETUADO",
          amount: 1900,
          kind: "payment",
          installment: null,
          raw: "28/11 PAGAMENTO EFETUADO 1.900,00-",
        },
        {
          date: "2025-12-15",
          description: "UBER *TRIP SAO PAULO BR",
          amount: 23.9,
          kind: "purchase",
          installment: null,
          raw: "15/12 UBER *TRIP SAO PAULO BR 23,90",
        },
        {
          date: "2025-12-20",
          description: "MERCADO LIVRE*2PRODUTOS",
          amount: 1234.56,
          kind: "purchase",
          installment: { current: 2, total: 6 },
          raw: "20/12 MERCADO LIVRE*2PRODUTOS 02/06 1.234,56",
        },
        {
          date: "2025-12-24",
          description: "POSTO 24/7 CENTRO",
          amount: 150,
          kind: "purchase",
          installment: null,
          raw: "24/12 POSTO 24/7 CENTRO 150,00",
        },
        {
          date: "2026-01-02",
          description: "PAG*PADARIAREAL",
          amount: 18.5,
          kind: "purchase",
          installment: null,
          raw: "02/01 PAG*PADARIAREAL 18,50",
        },
        {
          date: "2026-01-05",
          description: "ANUIDADE DIFERENCIADA",
          amount: 35,
          kind: "fee",
          installment: { current: 3, total: 12 },
          raw: "05/01 ANUIDADE DIFERENCIADA 03/12 35,00",
        },
      ],
    });
  });

  it("interpreta datas completas e parcelas, usando o último lançamento como referência", () => {
    expect(parseInvoice(fullDatePages, { today })).toEqual({
      issuer: "Bradesco",
      referenceMonth: "2026-10",
      dueDate: null,
      statedTotal: null,
      warnings: [],
      items: [
        {
          date: "2026-09-12",
          description: "MERCADO LIVRE*2PRODUTOS",
          amount: 1234.56,
          kind: "purchase",
          installment: { current: 2, total: 6 },
          raw: "12/09/2026 MERCADO LIVRE*2PRODUTOS PARC 02/06 1.234,56",
        },
        {
          date: "2026-09-13",
          description: "MAGAZINE LUIZA",
          amount: 199.9,
          kind: "purchase",
          installment: { current: 3, total: 10 },
          raw: "13/09/26 MAGAZINE LUIZA PARCELA 3 DE 10 R$ 199,90",
        },
        {
          date: "2026-09-14",
          description: "Casas Bahia",
          amount: 89,
          kind: "purchase",
          installment: { current: 1, total: 12 },
          raw: "14/09/2026 Casas Bahia - Parcela 1/12 89,00",
        },
        {
          date: "2026-10-03",
          description: "DROGASIL 1234 SAO PAULO",
          amount: 45,
          kind: "purchase",
          installment: null,
          raw: "03/10/2026 DROGASIL 1234 SAO PAULO 45,00 D",
        },
      ],
    });
  });

  it("classifica pagamentos, estornos, créditos e encargos e ignora linhas de total", () => {
    const invoice = parseInvoice(creditsPages, { today });

    expect(invoice.issuer).toBe("Inter");
    expect(invoice.dueDate).toBe("2026-10-10");
    expect(invoice.referenceMonth).toBe("2026-10");
    expect(invoice.statedTotal).toBe(512.34);
    expect(invoice.warnings).toEqual([]);
    expect(invoice.items.map(({ date, description, amount, kind }) => [date, description, amount, kind])).toEqual([
      ["2026-09-05", "PAGAMENTO RECEBIDO", 830, "payment"],
      ["2026-09-06", "PAGTO DEBITO AUTOMATICO", 100, "payment"],
      ["2026-09-08", "ESTORNO LOJA RENNER", 45, "credit"],
      ["2026-09-09", "CASHBACK", 3.2, "credit"],
      ["2026-09-10", "DEVOLUÇÃO AMAZON", 45, "credit"],
      ["2026-09-11", "CREDITO DE CONFIANCA", 10, "credit"],
      ["2026-09-12", "JUROS DE MORA", 12.34, "fee"],
      ["2026-09-12", "MULTA POR ATRASO", 8, "fee"],
      ["2026-09-12", "ENCARGOS CREDITO ROTATIVO", 20, "fee"],
      ["2026-09-13", "ESTORNO IOF", 1, "credit"],
      ["2026-09-14", "SUPERMERCADO EXTRA", 400, "purchase"],
    ]);
    expect(invoice.items.every((item) => item.installment === null)).toBe(true);
  });

  it("avisa quando nenhum lançamento é reconhecido", () => {
    const garbage = [["", "   ", "Documento digitalizado", "0001 2345 6789", "12/09", "Total 10,00"], []];

    expect(parseInvoice(garbage, { today })).toEqual({
      issuer: null,
      referenceMonth: "2026-10",
      dueDate: null,
      statedTotal: null,
      items: [],
      warnings: [EMPTY_WARNING],
    });
    expect(parseInvoice([], { today }).warnings).toEqual([EMPTY_WARNING]);
  });
});

describe("invoice-import/parseInvoice — datas", () => {
  it("joga para o ano anterior a compra com mês maior que o da referência", () => {
    const invoice = parseLines(["Vencimento 05/01/2026", "15/12 LOJA A 10,00", "03/01 LOJA B 20,00"]);

    expect(invoice.referenceMonth).toBe("2026-01");
    expect(invoice.items.map((item) => item.date)).toEqual(["2025-12-15", "2026-01-03"]);
  });

  it("sem vencimento, usa a data mais recente dos lançamentos como referência", () => {
    const invoice = parseLines(["20/12 LOJA A 10,00", "03/01 LOJA B 20,00"], new Date(2026, 1, 10));

    expect(invoice.referenceMonth).toBe("2026-01");
    expect(invoice.items.map((item) => item.date)).toEqual(["2025-12-20", "2026-01-03"]);
  });

  it("sem vencimento e sem lançamentos, usa o mês de `today`", () => {
    expect(parseLines(["nada aqui"], new Date(2026, 2, 31)).referenceMonth).toBe("2026-03");
  });

  it("infere o ano do vencimento sem ano pelo mais próximo de `today`", () => {
    const invoice = parseLines(["Vencimento 10/12", "01/12 LOJA 10,00"], new Date(2026, 0, 5));

    expect(invoice.dueDate).toBe("2025-12-10");
    expect(invoice.items[0].date).toBe("2025-12-01");
  });

  it("lê vencimento por extenso e ignora o próximo vencimento", () => {
    const invoice = parseLines(["Próximo vencimento 10/11/2026", "Vencimento em 10 de outubro de 2026"]);

    expect(invoice.dueDate).toBe("2026-10-10");
  });

  it("ignora a linha com data inválida e registra um aviso", () => {
    const invoice = parseLines(["Vencimento 10/03/2026", "31/02 LOJA FANTASMA 10,00", "28/02 LOJA REAL 20,00"]);

    expect(invoice.items).toHaveLength(1);
    expect(invoice.items[0].description).toBe("LOJA REAL");
    expect(invoice.warnings).toEqual(['Linha ignorada por data inválida: "31/02 LOJA FANTASMA 10,00"']);
  });

  it("aceita 29/02 apenas em ano bissexto", () => {
    expect(parseLine("29/02/2024 LOJA 10,00").date).toBe("2024-02-29");
    expect(parseLines(["29/02/2026 LOJA 10,00"]).items).toEqual([]);
  });

  it("aceita abreviações de mês sem diferenciar maiúsculas", () => {
    const lines = ["Vencimento 10/12/2026", "01 jan A 1,00", "02 Fev B 1,00", "03 DEZ C 1,00", "4 ago D 1,00"];

    expect(parseLines(lines).items.map((item) => item.date)).toEqual([
      "2026-01-01",
      "2026-02-02",
      "2026-12-03",
      "2026-08-04",
    ]);
  });
});

describe("invoice-import/parseInvoice — valores", () => {
  it.each([
    ["12/09 LOJA 1.234,56", 1234.56, "purchase"],
    ["12/09 LOJA 1.234.567,89", 1234567.89, "purchase"],
    ["12/09 LOJA R$ 0,99", 0.99, "purchase"],
    ["12/09 LOJA R$0,99", 0.99, "purchase"],
    ["12/09 LOJA -45,00", 45, "credit"],
    ["12/09 LOJA - R$ 45,00", 45, "credit"],
    ["12/09 LOJA R$ -45,00", 45, "credit"],
    ["12/09 LOJA 45,00-", 45, "credit"],
    ["12/09 LOJA 45,00 CR", 45, "credit"],
    ["12/09 LOJA 45,00 C", 45, "credit"],
    ["12/09 LOJA 45,00 D", 45, "purchase"],
    ["12/09 LOJA +45,00", 45, "purchase"],
    ["12/09 LOJA 1234,5 7,00", 7, "purchase"],
  ])("lê o valor de `%s`", (line, amount, kind) => {
    const item = parseLine(line);

    expect(item.amount).toBe(amount);
    expect(item.kind).toBe(kind);
  });

  it("mantém o valor negativo de pagamento como pagamento", () => {
    expect(parseLine("05/09 Pagamento recebido -1.000,00").kind).toBe("payment");
  });

  it("ignora linhas sem valor no fim, sem descrição ou sem data no início", () => {
    const lines = [
      "12/09 LOJA SEM VALOR",
      "12/09 45,00",
      "10/10/2026 R$ 1.234,56",
      "LOJA SEM DATA 45,00",
      "12/09 LOJA 45,0",
      "USD 10,00",
      "Cotação do dólar 5,43",
    ];

    expect(parseLines(lines).items).toEqual([]);
  });

  it("mantém o valor em BRL da compra internacional e ignora as linhas auxiliares", () => {
    const invoice = parseLines(["12/09 AMAZON US SEATTLE 54,30", "USD 10,00", "Cotação do dólar 5,43", "13/09 UBER 9,90"]);

    expect(invoice.items.map((item) => [item.description, item.amount])).toEqual([
      ["AMAZON US SEATTLE", 54.3],
      ["UBER", 9.9],
    ]);
  });
});

describe("invoice-import/parseInvoice — parcelas", () => {
  it.each([
    ["12/09 LOJA 3/10 45,00", "LOJA", 3, 10],
    ["12/09 LOJA 03/10 45,00", "LOJA", 3, 10],
    ["12/09 LOJA PARC 03/10 45,00", "LOJA", 3, 10],
    ["12/09 LOJA PARCELA 3 DE 10 45,00", "LOJA", 3, 10],
    ["12/09 Loja Parcela 3/10 45,00", "Loja", 3, 10],
    ["12/09 LOJA (3/10) 45,00", "LOJA", 3, 10],
    ["12/09 LOJA 03/10 SAO PAULO 45,00", "LOJA SAO PAULO", 3, 10],
    ["12/09 LOJA 10/10 45,00", "LOJA", 10, 10],
    ["12/09 LOJA 01/48 45,00", "LOJA", 1, 48],
    ["12/09 POSTO 24/7 PARC 02/03 45,00", "POSTO 24/7", 2, 3],
  ])("detecta a parcela em `%s`", (line, description, current, total) => {
    const item = parseLine(line);

    expect(item.description).toBe(description);
    expect(item.installment).toEqual({ current, total });
  });

  it.each([
    ["12/09 POSTO 24/7 CENTRO 150,00", "POSTO 24/7 CENTRO"],
    ["12/09 LOJA 11/10 45,00", "LOJA 11/10"],
    ["12/09 LOJA 1/1 45,00", "LOJA 1/1"],
    ["12/09 LOJA 0/10 45,00", "LOJA 0/10"],
    ["12/09 LOJA 01/49 45,00", "LOJA 01/49"],
    ["12/09 LOJA 12/09/2026 45,00", "LOJA 12/09/2026"],
    ["12/09 RUA 3/10A 45,00", "RUA 3/10A"],
    ["12/09 LOJA 123/456 45,00", "LOJA 123/456"],
  ])("não confunde `%s` com parcela", (line, description) => {
    const item = parseLine(line);

    expect(item.description).toBe(description);
    expect(item.installment).toBeNull();
  });

  it("não usa a data inicial como parcela", () => {
    const item = parseLine("03/10 LOJA 45,00");

    expect(item.date).toBe("2026-10-03");
    expect(item.installment).toBeNull();
  });
});

describe("invoice-import/parseInvoice — cabeçalho e linhas ignoradas", () => {
  it.each([
    "12/09 SALDO ANTERIOR 100,00",
    "12/09 TOTAL DA FATURA 100,00",
    "12/09 Total a pagar R$ 100,00",
    "12/09 SUBTOTAL 100,00",
    "12/09 TOTAL DE COMPRAS 100,00",
    "12/09 LIMITE DISPONIVEL 100,00",
    "12/09 Pagamento mínimo 100,00",
    "12/09 VALOR MÍNIMO 100,00",
  ])("ignora `%s`", (line) => {
    expect(parseLines([line]).items).toEqual([]);
  });

  it("usa o primeiro total declarado e ignora o total da fatura anterior", () => {
    const lines = ["Total da fatura anterior R$ 900,00", "Total da fatura R$ 1.234,56", "Total a pagar R$ 999,99"];

    expect(parseLines(lines).statedTotal).toBe(1234.56);
  });

  it("lê vencimento e total quando os valores estão na linha seguinte", () => {
    const invoice = parseLines(["Vencimento Total da fatura", "10/10/2026 R$ 1.234,56"]);

    expect(invoice.dueDate).toBe("2026-10-10");
    expect(invoice.statedTotal).toBe(1234.56);
    expect(invoice.items).toEqual([]);
  });

  it.each([
    ["Nu Pagamentos S.A.", "Nubank"],
    ["NUBANK", "Nubank"],
    ["Banco Itaucard S.A.", "Itaú"],
    ["Banco Bradesco", "Bradesco"],
    ["Santander Brasil", "Santander"],
    ["Banco Inter", "Inter"],
    ["C6 Bank", "C6 Bank"],
    ["Ourocard Visa", "Banco do Brasil"],
    ["Banco do Brasil S.A.", "Banco do Brasil"],
    ["Cartões CAIXA", "Caixa"],
    ["XP Visa Infinite", "XP"],
    ["PicPay Card", "PicPay"],
    ["Mercado Pago", "Mercado Pago"],
    ["Compras internacionais - Caixa Postal 1234", null],
  ])("identifica o emissor em `%s`", (line, issuer) => {
    expect(parseLines([line]).issuer).toBe(issuer);
  });

  it("não identifica o emissor a partir de uma linha de lançamento", () => {
    expect(parseLines(["12/09 MERCADO PAGO*LOJA 10,00"]).issuer).toBeNull();
  });

  it("normaliza espaços da descrição e preserva a linha original em `raw`", () => {
    const raw = "  12/09   Padaria   São José  R$ 12,00 ";
    const item = parseLine(raw);

    expect(item.description).toBe("Padaria São José");
    expect(item.raw).toBe(raw);
  });
});
