import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, txMock } = vi.hoisted(() => {
  const tx = {
    transaction: { deleteMany: vi.fn(), create: vi.fn() },
    importBatch: { create: vi.fn(), deleteMany: vi.fn() },
    importBatchItem: { create: vi.fn() },
    categoryRule: { upsert: vi.fn() },
  };

  return {
    txMock: tx,
    prismaMock: {
      user: { findUnique: vi.fn() },
      category: { findMany: vi.fn() },
      categoryRule: { findMany: vi.fn() },
      transaction: { findMany: vi.fn() },
      importBatch: { findFirst: vi.fn(), findMany: vi.fn() },
      $transaction: vi.fn(),
    },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { POST as PREVIEW } from "@/app/api/imports/preview/route";
import { GET, POST } from "@/app/api/imports/route";
import { DELETE } from "@/app/api/imports/[id]/route";
import {
  authUser,
  buildRequest,
  buildSessionCookie,
  invalidSessionCookie,
  routeParams,
} from "./helpers";

type Row = Record<string, unknown>;

const header = {
  fileName: "fatura-marco.pdf",
  fileHash: "hash-abc",
  issuer: "Nubank",
  referenceMonth: "2026-03",
  dueDate: "2026-04-10",
  statedTotal: 1500,
};

const previewItem = {
  date: "2026-03-05",
  description: "NETFLIX.COM",
  amount: 39.9,
  kind: "purchase",
  installment: null,
};

const previewPayload = { ...header, items: [previewItem] };

const confirmItem = {
  date: "2026-03-05",
  description: "  NETFLIX.COM  ",
  amount: 39.9,
  type: "outcome",
  category: "Lazer",
};

const confirmPayload = { ...header, items: [confirmItem] };

const userCategories = [
  { name: "Lazer", type: "outcome" },
  { name: "Alimentação", type: "outcome" },
  { name: "Transporte", type: "outcome" },
  { name: "Salário", type: "income" },
];

const storedBatch = {
  id: "batch-1",
  fileName: header.fileName,
  issuer: header.issuer,
  referenceMonth: header.referenceMonth,
  dueDate: new Date("2026-04-10T00:00:00.000Z"),
  statedTotal: 1500,
  importedTotal: 39.9,
  itemCount: 1,
  createdAt: new Date("2026-04-01T12:00:00.000Z"),
};

const serializedBatch = {
  ...storedBatch,
  dueDate: "2026-04-10T00:00:00.000Z",
  createdAt: "2026-04-01T12:00:00.000Z",
};

const batchSelect = {
  id: true,
  fileName: true,
  issuer: true,
  referenceMonth: true,
  dueDate: true,
  statedTotal: true,
  importedTotal: true,
  itemCount: true,
  createdAt: true,
};

const headerCases: [string, Row, string][] = [
  ["nome do arquivo ausente", { fileName: undefined }, "Nome do arquivo é obrigatório."],
  ["nome do arquivo vazio", { fileName: "  " }, "Nome do arquivo é obrigatório."],
  ["hash ausente", { fileHash: undefined }, "Identificador do arquivo é obrigatório."],
  ["hash não textual", { fileHash: 123 }, "Identificador do arquivo é obrigatório."],
  [
    "mês de referência fora do formato",
    { referenceMonth: "03/2026" },
    "Mês de referência deve estar no formato AAAA-MM.",
  ],
  [
    "mês de referência inexistente",
    { referenceMonth: "2026-13" },
    "Mês de referência deve estar no formato AAAA-MM.",
  ],
  ["lista de lançamentos vazia", { items: [] }, "Nenhum lançamento para importar."],
  ["lista de lançamentos ausente", { items: undefined }, "Nenhum lançamento para importar."],
];

let cookie: string;
let consoleError: ReturnType<typeof vi.spyOn>;
let existingTransactions: Row[];
let lumpTransactions: Row[];

function existing(overrides: Row = {}) {
  return {
    id: "old-1",
    description: "NETFLIX.COM",
    amount: -39.9,
    category: "Lazer",
    type: "outcome",
    date: new Date("2026-03-05T00:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(async () => {
  vi.resetAllMocks();
  existingTransactions = [];
  lumpTransactions = [];
  prismaMock.user.findUnique.mockResolvedValue(authUser);
  prismaMock.category.findMany.mockResolvedValue(userCategories);
  prismaMock.categoryRule.findMany.mockResolvedValue([]);
  prismaMock.importBatch.findFirst.mockResolvedValue(null);
  prismaMock.transaction.findMany.mockImplementation(
    async (args: { where: { importItem?: null } }) =>
      args.where.importItem === null ? lumpTransactions : existingTransactions,
  );
  prismaMock.$transaction.mockImplementation(
    async (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock),
  );
  txMock.transaction.deleteMany.mockResolvedValue({ count: 1 });
  txMock.transaction.create.mockImplementation(async () => ({
    id: `tx-${txMock.transaction.create.mock.calls.length}`,
  }));
  txMock.importBatch.create.mockResolvedValue(storedBatch);
  txMock.importBatch.deleteMany.mockResolvedValue({ count: 1 });
  txMock.importBatchItem.create.mockResolvedValue({});
  txMock.categoryRule.upsert.mockResolvedValue({});
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  cookie = await buildSessionCookie();
});

afterEach(() => {
  consoleError.mockRestore();
});

function preview(body: unknown, options: { cookie?: string; rawBody?: string } = {}) {
  return PREVIEW(buildRequest("/api/imports/preview", { method: "POST", body, ...options }));
}

function confirm(body: unknown, options: { cookie?: string; rawBody?: string } = {}) {
  return POST(buildRequest("/api/imports", { method: "POST", body, ...options }));
}

function undo(cookieValue?: string, id = "batch-1") {
  return DELETE(
    buildRequest(`/api/imports/${id}`, { method: "DELETE", cookie: cookieValue }),
    routeParams(id),
  );
}

async function previewItems(body: unknown) {
  const response = await preview(body, { cookie });

  expect(response.status).toBe(200);

  return (await response.json()) as {
    alreadyImported: Row | null;
    lumpCandidate: Row | null;
    items: Row[];
  };
}

describe("POST /api/imports/preview", () => {
  it("retorna 401 sem cookie de sessão", async () => {
    const response = await preview(previewPayload);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Não autenticado." });
    expect(prismaMock.transaction.findMany).not.toHaveBeenCalled();
  });

  it("retorna 401 com cookie inválido", async () => {
    const response = await preview(previewPayload, { cookie: invalidSessionCookie });

    expect(response.status).toBe(401);
    expect(prismaMock.transaction.findMany).not.toHaveBeenCalled();
  });

  it("retorna 400 para JSON malformado", async () => {
    const response = await preview(undefined, { cookie, rawBody: "{invalido" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Corpo da requisição inválido." });
  });

  it.each(headerCases)("retorna 400 com %s", async (_title, overrides, message) => {
    const response = await preview({ ...previewPayload, ...overrides }, { cookie });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: message });
    expect(prismaMock.transaction.findMany).not.toHaveBeenCalled();
  });

  it("retorna 400 quando a fatura tem mais de 500 lançamentos", async () => {
    const items = Array.from({ length: 501 }, () => previewItem);
    const response = await preview({ ...previewPayload, items }, { cookie });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Uma fatura pode ter no máximo 500 lançamentos.",
    });
  });

  it("aceita exatamente 500 lançamentos", async () => {
    const items = Array.from({ length: 500 }, () => previewItem);
    const body = await previewItems({ ...previewPayload, items });

    expect(body.items).toHaveLength(500);
  });

  it("retorna 400 com a lista de lançamentos inválidos", async () => {
    const items = [
      previewItem,
      { ...previewItem, amount: 0 },
      { ...previewItem, date: "2026-02-30" },
      { ...previewItem, kind: "estorno" },
      { ...previewItem, installment: { current: 4, total: 3 } },
      { ...previewItem, description: " " },
    ];
    const response = await preview({ ...previewPayload, items }, { cookie });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Lançamento 2 inválido: valor deve ser um número maior que zero.",
      invalidItems: [
        { index: 1, error: "Lançamento 2 inválido: valor deve ser um número maior que zero." },
        { index: 2, error: "Lançamento 3 inválido: data inválida." },
        { index: 3, error: "Lançamento 4 inválido: tipo de lançamento inválido." },
        { index: 4, error: "Lançamento 5 inválido: parcela inválida." },
        { index: 5, error: "Lançamento 6 inválido: descrição é obrigatória." },
      ],
    });
    expect(prismaMock.transaction.findMany).not.toHaveBeenCalled();
  });

  it("monta a prévia do lançamento e filtra todas as consultas pelo usuário da sessão", async () => {
    const body = await previewItems({ ...previewPayload, userId: "outro-usuario" });

    expect(body).toEqual({
      alreadyImported: null,
      lumpCandidate: null,
      items: [
        {
          index: 0,
          date: "2026-03-05",
          purchaseDate: "2026-03-05",
          description: "NETFLIX.COM",
          merchant: "NETFLIX COM",
          amount: 39.9,
          type: "outcome",
          kind: "purchase",
          installment: null,
          category: "Lazer",
          suggestionSource: "keyword",
          include: true,
          duplicateOf: null,
        },
      ],
    });
    expect(prismaMock.category.findMany).toHaveBeenCalledWith({
      where: { userId: authUser.id },
      select: { name: true, type: true },
    });
    expect(prismaMock.categoryRule.findMany).toHaveBeenCalledWith({
      where: { userId: authUser.id },
      select: { pattern: true, category: true, type: true },
    });
    expect(prismaMock.importBatch.findFirst).toHaveBeenCalledWith({
      where: { userId: authUser.id, fileHash: "hash-abc" },
      orderBy: { createdAt: "desc" },
      select: { id: true, fileName: true, createdAt: true },
    });
    expect(prismaMock.transaction.findMany).toHaveBeenCalledTimes(2);
    expect(prismaMock.transaction.findMany).toHaveBeenNthCalledWith(1, {
      where: { userId: authUser.id },
      select: {
        id: true,
        description: true,
        amount: true,
        category: true,
        type: true,
        date: true,
      },
    });
    expect(prismaMock.transaction.findMany).toHaveBeenNthCalledWith(2, {
      where: {
        userId: authUser.id,
        importItem: null,
        date: {
          gte: new Date("2026-02-01T00:00:00.000Z"),
          lt: new Date("2026-05-01T00:00:00.000Z"),
        },
      },
      orderBy: { date: "desc" },
      select: { id: true, description: true, amount: true, type: true, date: true },
    });
  });

  it("informa quando o mesmo arquivo já foi importado", async () => {
    prismaMock.importBatch.findFirst.mockResolvedValue({
      id: "batch-0",
      fileName: "fatura-marco.pdf",
      createdAt: new Date("2026-03-20T10:00:00.000Z"),
    });

    const body = await previewItems(previewPayload);

    expect(body.alreadyImported).toEqual({
      id: "batch-0",
      fileName: "fatura-marco.pdf",
      createdAt: "2026-03-20T10:00:00.000Z",
    });
  });

  it("marca como duplicado e não inclui o lançamento que já existe", async () => {
    existingTransactions = [existing()];

    const body = await previewItems(previewPayload);

    expect(body.items[0]).toMatchObject({
      include: false,
      duplicateOf: { id: "old-1", description: "NETFLIX.COM", date: "2026-03-05" },
    });
  });

  it("não considera duplicado quando data ou valor diferem", async () => {
    existingTransactions = [
      existing({ id: "old-1", date: new Date("2026-03-06T00:00:00.000Z") }),
      existing({ id: "old-2", amount: -40 }),
    ];

    const body = await previewItems(previewPayload);

    expect(body.items[0]).toMatchObject({ include: true, duplicateOf: null });
  });

  it("reconhece duplicata pela data da compra quando a fatura anterior foi lançada no modo 'data de cada compra'", async () => {
    existingTransactions = [existing({ id: "old-1", date: new Date("2026-02-20T00:00:00.000Z") })];

    const body = await previewItems({
      ...previewPayload,
      useInvoiceMonth: true,
      items: [{ ...previewItem, date: "2026-02-20" }],
    });

    expect(body.items[0]).toMatchObject({
      date: "2026-03-20",
      purchaseDate: "2026-02-20",
      include: false,
      duplicateOf: { id: "old-1" },
    });
  });

  it("não inclui pagamentos de fatura e trata créditos como receita", async () => {
    const body = await previewItems({
      ...previewPayload,
      items: [
        { ...previewItem, description: "PAGAMENTO RECEBIDO", kind: "payment" },
        { ...previewItem, description: "ESTORNO LOJA", kind: "credit" },
        { ...previewItem, description: "IOF INTERNACIONAL", kind: "fee" },
      ],
    });

    expect(body.items[0]).toMatchObject({ kind: "payment", type: "outcome", include: false });
    expect(body.items[1]).toMatchObject({ kind: "credit", type: "income", include: true });
    expect(body.items[2]).toMatchObject({ kind: "fee", type: "outcome", include: true });
  });

  it("move parcelas a partir da segunda para o mês de referência", async () => {
    const body = await previewItems({
      ...previewPayload,
      items: [
        { ...previewItem, date: "2026-01-15", installment: { current: 3, total: 10 } },
        { ...previewItem, date: "2026-02-15", installment: { current: 1, total: 10 } },
        { ...previewItem, date: null },
      ],
    });

    expect(body.items[0]).toMatchObject({
      date: "2026-03-15",
      installment: { current: 3, total: 10 },
    });
    expect(body.items[1]).toMatchObject({ date: "2026-02-15" });
    expect(body.items[2]).toMatchObject({ date: "2026-03-31" });
  });

  it("compara duplicados pela data efetiva da parcela", async () => {
    existingTransactions = [existing({ date: new Date("2026-03-15T00:00:00.000Z") })];

    const body = await previewItems({
      ...previewPayload,
      items: [{ ...previewItem, date: "2026-01-15", installment: { current: 3, total: 10 } }],
    });

    expect(body.items[0]).toMatchObject({ include: false, duplicateOf: { id: "old-1" } });
  });

  it("usa o mês da fatura para todos os lançamentos com useInvoiceMonth", async () => {
    const body = await previewItems({
      ...previewPayload,
      useInvoiceMonth: true,
      items: [{ ...previewItem, date: "2026-02-20" }],
    });

    expect(body.items[0]).toMatchObject({ date: "2026-03-20", purchaseDate: "2026-02-20" });
  });

  it("sugere a categoria pela regra do usuário antes do histórico e do dicionário", async () => {
    prismaMock.categoryRule.findMany.mockResolvedValue([
      { pattern: "NETFLIX", category: "Alimentação", type: "outcome" },
    ]);
    existingTransactions = [existing({ date: new Date("2025-12-05T00:00:00.000Z") })];

    const body = await previewItems(previewPayload);

    expect(body.items[0]).toMatchObject({ category: "Alimentação", suggestionSource: "rule" });
  });

  it("sugere a categoria pelo histórico do usuário", async () => {
    existingTransactions = [
      existing({ id: "a", category: "Transporte", date: new Date("2025-11-05T00:00:00.000Z") }),
      existing({ id: "b", category: "Transporte", date: new Date("2025-12-05T00:00:00.000Z") }),
      existing({ id: "c", category: "Lazer", date: new Date("2026-01-05T00:00:00.000Z") }),
    ];

    const body = await previewItems(previewPayload);

    expect(body.items[0]).toMatchObject({ category: "Transporte", suggestionSource: "history" });
  });

  it("sugere a categoria pelo dicionário de palavras-chave", async () => {
    const body = await previewItems({
      ...previewPayload,
      items: [{ ...previewItem, description: "UBER *TRIP" }],
    });

    expect(body.items[0]).toMatchObject({ category: "Transporte", suggestionSource: "keyword" });
  });

  it("não sugere categoria que o usuário não possui", async () => {
    prismaMock.category.findMany.mockResolvedValue([{ name: "Salário", type: "income" }]);
    prismaMock.categoryRule.findMany.mockResolvedValue([
      { pattern: "NETFLIX", category: "Assinaturas", type: "outcome" },
    ]);

    const body = await previewItems(previewPayload);

    expect(body.items[0]).toMatchObject({ category: null, suggestionSource: null });
  });

  it("encontra o lançamento único da fatura com o mesmo total", async () => {
    lumpTransactions = [
      {
        id: "other",
        description: "Mercado",
        amount: -300,
        type: "outcome",
        date: new Date("2026-04-02T00:00:00.000Z"),
      },
      {
        id: "income",
        description: "Reembolso",
        amount: 1500,
        type: "income",
        date: new Date("2026-04-05T00:00:00.000Z"),
      },
      {
        id: "lump-1",
        description: "Fatura Nubank",
        amount: -1500.01,
        type: null,
        date: new Date("2026-04-10T00:00:00.000Z"),
      },
    ];

    const body = await previewItems(previewPayload);

    expect(body.lumpCandidate).toEqual({
      id: "lump-1",
      description: "Fatura Nubank",
      amount: -1500.01,
      date: "2026-04-10",
    });
  });

  it("retorna lumpCandidate nulo quando nenhum lançamento bate com o total", async () => {
    lumpTransactions = [
      {
        id: "other",
        description: "Fatura Nubank",
        amount: -1499.5,
        type: "outcome",
        date: new Date("2026-04-10T00:00:00.000Z"),
      },
    ];

    const body = await previewItems(previewPayload);

    expect(body.lumpCandidate).toBeNull();
  });

  it("não procura lançamento único quando a fatura não informa o total", async () => {
    const body = await previewItems({ ...previewPayload, statedTotal: null });

    expect(body.lumpCandidate).toBeNull();
    expect(prismaMock.transaction.findMany).toHaveBeenCalledTimes(1);
  });

  it("retorna 500 quando o prisma falha", async () => {
    prismaMock.transaction.findMany.mockRejectedValue(new Error("db fora do ar"));

    const response = await preview(previewPayload, { cookie });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao analisar a fatura." });
  });
});

describe("POST /api/imports", () => {
  it("retorna 401 sem cookie de sessão", async () => {
    const response = await confirm(confirmPayload);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Não autenticado." });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("retorna 401 com cookie inválido", async () => {
    const response = await confirm(confirmPayload, { cookie: invalidSessionCookie });

    expect(response.status).toBe(401);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("retorna 400 para JSON malformado", async () => {
    const response = await confirm(undefined, { cookie, rawBody: "{invalido" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Corpo da requisição inválido." });
  });

  it.each(headerCases)("retorna 400 com %s", async (_title, overrides, message) => {
    const response = await confirm({ ...confirmPayload, ...overrides }, { cookie });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: message });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("retorna 400 quando a fatura tem mais de 500 lançamentos", async () => {
    const items = Array.from({ length: 501 }, () => confirmItem);
    const response = await confirm({ ...confirmPayload, items }, { cookie });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Uma fatura pode ter no máximo 500 lançamentos.",
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("retorna 400 com a lista de lançamentos inválidos", async () => {
    const items = [
      { ...confirmItem, category: "" },
      confirmItem,
      { ...confirmItem, date: null },
      { ...confirmItem, type: "investment" },
      { ...confirmItem, amount: -10 },
    ];
    const response = await confirm({ ...confirmPayload, items }, { cookie });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Lançamento 1 inválido: categoria é obrigatória.",
      invalidItems: [
        { index: 0, error: "Lançamento 1 inválido: categoria é obrigatória." },
        { index: 2, error: "Lançamento 3 inválido: data inválida." },
        { index: 3, error: "Lançamento 4 inválido: tipo inválido." },
        { index: 4, error: "Lançamento 5 inválido: valor deve ser um número maior que zero." },
      ],
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    ["regras fora de uma lista", { pattern: "NETFLIX" }],
    ["regra sem categoria", [{ pattern: "NETFLIX", type: "outcome" }]],
    ["regra com tipo inválido", [{ pattern: "NETFLIX", category: "Lazer", type: "investment" }]],
    ["regra com padrão vazio", [{ pattern: " ", category: "Lazer", type: "outcome" }]],
  ])("retorna 400 com %s", async (_title, rules) => {
    const response = await confirm({ ...confirmPayload, rules }, { cookie });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Regras de categorização inválidas.",
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("importa os lançamentos em uma única transação com os dados exatos", async () => {
    const response = await confirm(
      {
        ...confirmPayload,
        userId: "outro-usuario",
        items: [
          confirmItem,
          {
            date: "2026-03-10",
            description: "LOJA MAGAZINE",
            amount: 100,
            type: "outcome",
            category: "Alimentação",
            installment: { current: 2, total: 5 },
            userId: "outro-usuario",
          },
          {
            date: "2026-03-12",
            description: "ESTORNO LOJA",
            amount: 20.4,
            type: "income",
            category: "Salário",
            installment: null,
          },
        ],
      },
      { cookie },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      batch: serializedBatch,
      created: 3,
      replaced: false,
    });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(txMock.transaction.deleteMany).not.toHaveBeenCalled();
    expect(txMock.importBatch.create).toHaveBeenCalledWith({
      data: {
        fileName: "fatura-marco.pdf",
        fileHash: "hash-abc",
        issuer: "Nubank",
        referenceMonth: "2026-03",
        dueDate: new Date("2026-04-10T00:00:00.000Z"),
        statedTotal: 1500,
        importedTotal: 119.5,
        itemCount: 3,
        userId: authUser.id,
      },
      select: batchSelect,
    });
    expect(txMock.transaction.create).toHaveBeenCalledTimes(3);
    expect(txMock.transaction.create).toHaveBeenNthCalledWith(1, {
      data: {
        description: "NETFLIX.COM",
        amount: -39.9,
        category: "Lazer",
        type: "outcome",
        date: new Date("2026-03-05T00:00:00.000Z"),
        paymentMethod: "Cartão de crédito",
        notes: "Importado da fatura Nubank 03/2026",
        userId: authUser.id,
      },
    });
    expect(txMock.transaction.create).toHaveBeenNthCalledWith(2, {
      data: {
        description: "LOJA MAGAZINE",
        amount: -100,
        category: "Alimentação",
        type: "outcome",
        date: new Date("2026-03-10T00:00:00.000Z"),
        paymentMethod: "Cartão de crédito",
        notes: "Importado da fatura Nubank 03/2026 — parcela 2/5",
        userId: authUser.id,
      },
    });
    expect(txMock.transaction.create).toHaveBeenNthCalledWith(3, {
      data: {
        description: "ESTORNO LOJA",
        amount: 20.4,
        category: "Salário",
        type: "income",
        date: new Date("2026-03-12T00:00:00.000Z"),
        paymentMethod: "Cartão de crédito",
        notes: "Importado da fatura Nubank 03/2026",
        userId: authUser.id,
      },
    });
    expect(txMock.importBatchItem.create.mock.calls).toEqual([
      [{ data: { batchId: "batch-1", transactionId: "tx-1" } }],
      [{ data: { batchId: "batch-1", transactionId: "tx-2" } }],
      [{ data: { batchId: "batch-1", transactionId: "tx-3" } }],
    ]);
    expect(txMock.categoryRule.upsert).not.toHaveBeenCalled();
  });

  it("usa o texto padrão nas observações e aceita vencimento e total ausentes", async () => {
    const response = await confirm(
      { ...confirmPayload, issuer: null, dueDate: null, statedTotal: null },
      { cookie },
    );

    expect(response.status).toBe(201);
    expect(txMock.importBatch.create.mock.calls[0][0].data).toMatchObject({
      issuer: null,
      dueDate: null,
      statedTotal: null,
      importedTotal: 39.9,
      itemCount: 1,
    });
    expect(txMock.transaction.create.mock.calls[0][0].data.notes).toBe(
      "Importado da fatura de cartão 03/2026",
    );
  });

  it("guarda a data da compra na observação quando o lançamento foi para o mês da fatura", async () => {
    const response = await confirm(
      {
        ...confirmPayload,
        items: [
          { ...confirmItem, date: "2026-03-20", purchaseDate: "2026-02-20" },
          { ...confirmItem, date: "2026-03-20", purchaseDate: "2026-01-20", installment: { current: 3, total: 4 } },
          { ...confirmItem, date: "2026-03-05", purchaseDate: "2026-03-05" },
        ],
      },
      { cookie },
    );

    expect(response.status).toBe(201);
    expect(txMock.transaction.create.mock.calls.map((call) => call[0].data.notes)).toEqual([
      "Importado da fatura Nubank 03/2026 — compra em 20/02/2026",
      "Importado da fatura Nubank 03/2026 — parcela 3/4 — compra em 20/01/2026",
      "Importado da fatura Nubank 03/2026",
    ]);
    expect(txMock.transaction.create.mock.calls[0][0].data.date).toEqual(new Date("2026-03-20T00:00:00.000Z"));
  });

  it("recusa data da compra inválida", async () => {
    const response = await confirm(
      { ...confirmPayload, items: [{ ...confirmItem, purchaseDate: "2026-02-30" }] },
      { cookie },
    );

    expect(response.status).toBe(400);
  });

  it("substitui o lançamento único filtrando pelo usuário da sessão", async () => {
    const response = await confirm(
      { ...confirmPayload, replaceTransactionId: "lump-1" },
      { cookie },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ created: 1, replaced: true });
    expect(txMock.transaction.deleteMany).toHaveBeenCalledWith({
      where: { id: "lump-1", userId: authUser.id },
    });
    expect(txMock.transaction.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
      txMock.importBatch.create.mock.invocationCallOrder[0],
    );
  });

  it("segue a importação quando o lançamento a substituir não pertence ao usuário", async () => {
    txMock.transaction.deleteMany.mockResolvedValue({ count: 0 });

    const response = await confirm(
      { ...confirmPayload, replaceTransactionId: "de-outro-usuario" },
      { cookie },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ created: 1, replaced: false });
    expect(txMock.transaction.create).toHaveBeenCalledTimes(1);
  });

  it("grava as regras com o padrão normalizado e o usuário da sessão", async () => {
    const response = await confirm(
      {
        ...confirmPayload,
        rules: [
          { pattern: "pag*Padaria São João", category: "Alimentação", type: "outcome" },
        ],
      },
      { cookie },
    );

    expect(response.status).toBe(201);
    expect(txMock.categoryRule.upsert).toHaveBeenCalledTimes(1);
    expect(txMock.categoryRule.upsert).toHaveBeenCalledWith({
      where: { userId_pattern: { userId: authUser.id, pattern: "PADARIA SAO JOAO" } },
      update: { category: "Alimentação", type: "outcome" },
      create: {
        pattern: "PADARIA SAO JOAO",
        category: "Alimentação",
        type: "outcome",
        userId: authUser.id,
      },
    });
  });

  it("retorna 500 e não confirma nada quando um lançamento falha", async () => {
    txMock.transaction.create.mockRejectedValue(new Error("falha ao gravar"));

    const response = await confirm(confirmPayload, { cookie });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao importar a fatura." });
    expect(txMock.importBatchItem.create).not.toHaveBeenCalled();
  });

  it("retorna 500 quando a transação do prisma falha", async () => {
    prismaMock.$transaction.mockRejectedValue(new Error("db fora do ar"));

    const response = await confirm(confirmPayload, { cookie });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao importar a fatura." });
  });
});

describe("GET /api/imports", () => {
  it("retorna 401 sem cookie de sessão", async () => {
    const response = await GET(buildRequest("/api/imports"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Não autenticado." });
    expect(prismaMock.importBatch.findMany).not.toHaveBeenCalled();
  });

  it("retorna 401 com cookie inválido", async () => {
    const response = await GET(buildRequest("/api/imports", { cookie: invalidSessionCookie }));

    expect(response.status).toBe(401);
    expect(prismaMock.importBatch.findMany).not.toHaveBeenCalled();
  });

  it("lista as importações do usuário da mais recente para a mais antiga", async () => {
    prismaMock.importBatch.findMany.mockResolvedValue([storedBatch]);

    const response = await GET(buildRequest("/api/imports", { cookie }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([serializedBatch]);
    expect(prismaMock.importBatch.findMany).toHaveBeenCalledWith({
      where: { userId: authUser.id },
      orderBy: { createdAt: "desc" },
      select: batchSelect,
    });
  });

  it("retorna 500 quando o prisma falha", async () => {
    prismaMock.importBatch.findMany.mockRejectedValue(new Error("db fora do ar"));

    const response = await GET(buildRequest("/api/imports", { cookie }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao buscar importações." });
  });
});

describe("DELETE /api/imports/[id]", () => {
  it("retorna 401 sem cookie de sessão", async () => {
    const response = await undo();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Não autenticado." });
    expect(prismaMock.importBatch.findFirst).not.toHaveBeenCalled();
  });

  it("retorna 401 com cookie inválido", async () => {
    const response = await undo(invalidSessionCookie);

    expect(response.status).toBe(401);
    expect(prismaMock.importBatch.findFirst).not.toHaveBeenCalled();
  });

  it("retorna 404 quando a importação é de outro usuário", async () => {
    prismaMock.importBatch.findFirst.mockResolvedValue(null);

    const response = await undo(cookie, "batch-de-outro");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Importação não encontrada." });
    expect(prismaMock.importBatch.findFirst).toHaveBeenCalledWith({
      where: { id: "batch-de-outro", userId: authUser.id },
      include: { items: { select: { transactionId: true } } },
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("desfaz a importação removendo as transações e o lote do usuário", async () => {
    prismaMock.importBatch.findFirst.mockResolvedValue({
      ...storedBatch,
      items: [{ transactionId: "tx-1" }, { transactionId: "tx-2" }],
    });
    txMock.transaction.deleteMany.mockResolvedValue({ count: 2 });

    const response = await undo(cookie);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: "Importação desfeita.",
      removed: 2,
    });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(txMock.transaction.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["tx-1", "tx-2"] }, userId: authUser.id },
    });
    expect(txMock.importBatch.deleteMany).toHaveBeenCalledWith({
      where: { id: "batch-1", userId: authUser.id },
    });
  });

  it("retorna 500 quando o prisma falha", async () => {
    prismaMock.importBatch.findFirst.mockResolvedValue({ ...storedBatch, items: [] });
    prismaMock.$transaction.mockRejectedValue(new Error("db fora do ar"));

    const response = await undo(cookie);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao desfazer a importação." });
  });
});
