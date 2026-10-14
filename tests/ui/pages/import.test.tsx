import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ImportPage from "@/app/import/page";
import { parseInvoice } from "@/features/invoice-import/parseInvoice";
import { extractPdfLines, PdfPasswordError } from "@/features/invoice-import/pdfText";
import type {
  ImportBatchSummary,
  ImportPreviewItem,
  ImportPreviewResponse,
  ParsedInvoice,
} from "@/features/invoice-import/types";
import { mockApi, reply, type ApiRoutes } from "../helpers/api";
import { freezeDate, renderWithProvider } from "../helpers/render";

vi.mock("@/features/invoice-import/pdfText", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/invoice-import/pdfText")>();

  return {
    ...actual,
    hashFile: vi.fn(async () => "hash-da-fatura"),
    extractPdfLines: vi.fn(async () => [["linha"]]),
  };
});

vi.mock("@/features/invoice-import/parseInvoice", () => ({
  parseInvoice: vi.fn(),
}));

const categories = [
  { id: "c1", name: "Alimentação", type: "outcome" },
  { id: "c2", name: "Transporte", type: "outcome" },
  { id: "c3", name: "Outros", type: "income" },
];

const invoice: ParsedInvoice = {
  issuer: "Nubank",
  referenceMonth: "2026-10",
  dueDate: "2026-10-10",
  statedTotal: 150,
  warnings: [],
  items: [
    { date: "2026-09-12", description: "IFOOD *RESTAURANTE", amount: 50, kind: "purchase", installment: null, raw: "" },
    { date: "2026-09-13", description: "UBER *TRIP", amount: 30, kind: "purchase", installment: null, raw: "" },
    { date: "2026-08-20", description: "LOJA XPTO", amount: 70, kind: "purchase", installment: { current: 2, total: 5 }, raw: "" },
    { date: "2026-09-05", description: "PAGAMENTO RECEBIDO", amount: 400, kind: "payment", installment: null, raw: "" },
  ],
};

function previewItem(index: number, overrides: Partial<ImportPreviewItem>): ImportPreviewItem {
  return {
    index,
    date: "2026-09-12",
    description: "ITEM",
    merchant: "ITEM",
    amount: 10,
    type: "outcome",
    kind: "purchase",
    installment: null,
    category: null,
    suggestionSource: null,
    include: true,
    duplicateOf: null,
    ...overrides,
  };
}

function previewResponse(overrides: Partial<ImportPreviewResponse> = {}): ImportPreviewResponse {
  return {
    alreadyImported: null,
    lumpCandidate: null,
    items: [
      previewItem(0, {
        description: "IFOOD *RESTAURANTE",
        merchant: "RESTAURANTE",
        amount: 50,
        category: "Alimentação",
        suggestionSource: "keyword",
      }),
      previewItem(1, {
        date: "2026-09-13",
        description: "UBER *TRIP",
        merchant: "UBER TRIP",
        amount: 30,
        category: "Transporte",
        suggestionSource: "rule",
      }),
      previewItem(2, {
        date: "2026-10-20",
        description: "LOJA XPTO",
        merchant: "LOJA XPTO",
        amount: 70,
        installment: { current: 2, total: 5 },
      }),
      previewItem(3, {
        date: "2026-09-05",
        description: "PAGAMENTO RECEBIDO",
        merchant: "PAGAMENTO RECEBIDO",
        amount: 400,
        kind: "payment",
        include: false,
      }),
    ],
    ...overrides,
  };
}

const batch: ImportBatchSummary = {
  id: "batch-1",
  fileName: "fatura.pdf",
  issuer: "Nubank",
  referenceMonth: "2026-10",
  dueDate: "2026-10-10T00:00:00.000Z",
  statedTotal: 150,
  importedTotal: 150,
  itemCount: 3,
  createdAt: "2026-10-12T15:00:00.000Z",
};

function pdfFile(name = "fatura.pdf", type = "application/pdf", size?: number) {
  const file = new File(["%PDF-1.4 conteúdo"], name, { type });

  if (size !== undefined) {
    Object.defineProperty(file, "size", { value: size });
  }

  return file;
}

async function renderPage(routes: ApiRoutes = {}) {
  const api = mockApi({
    "GET /api/categories": categories,
    "GET /api/imports": [],
    "POST /api/imports/preview": previewResponse(),
    ...routes,
  });
  const utils = renderWithProvider(<ImportPage />);

  await waitFor(() => expect(api.callsTo("GET", "/api/imports")).toHaveLength(1));

  return { api, ...utils };
}

async function upload(user: ReturnType<typeof renderWithProvider>["user"], file = pdfFile()) {
  await user.upload(screen.getByLabelText("Arquivo PDF da fatura"), file);
}

describe("Página de importação de fatura", () => {
  beforeEach(() => {
    freezeDate();
    vi.mocked(parseInvoice).mockReturnValue(invoice);
    vi.mocked(extractPdfLines).mockResolvedValue([["linha"]]);
  });

  it("mostra o envio de arquivo e o histórico vazio", async () => {
    await renderPage();

    expect(screen.getByRole("heading", { name: "Fatura por PDF", level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText("Arquivo PDF da fatura")).toHaveAttribute(
      "accept",
      "application/pdf,.pdf",
    );
    expect(screen.getByText("Nenhuma fatura importada ainda.")).toBeInTheDocument();
  });

  it("recusa arquivo maior que 10 MB sem ler o conteúdo", async () => {
    const { user, api } = await renderPage();

    await upload(user, pdfFile("grande.pdf", "application/pdf", 11 * 1024 * 1024));

    expect(await screen.findByRole("alert")).toHaveTextContent("O arquivo é maior que 10 MB.");
    expect(extractPdfLines).not.toHaveBeenCalled();
    expect(api.callsTo("POST", "/api/imports/preview")).toHaveLength(0);
  });

  it("avisa quando nenhum lançamento é reconhecido e não chama a API", async () => {
    vi.mocked(parseInvoice).mockReturnValue({
      ...invoice,
      items: [],
      warnings: ["Nenhum lançamento reconhecido. O PDF pode ser digitalizado (imagem) ou de um layout não suportado."],
    });
    const { user, api } = await renderPage();

    await upload(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("Nenhum lançamento reconhecido.");
    expect(api.callsTo("POST", "/api/imports/preview")).toHaveLength(0);
  });

  it("envia os lançamentos extraídos para o preview, sem o conteúdo do arquivo", async () => {
    const { user, api } = await renderPage();

    await upload(user);
    await screen.findByRole("heading", { name: "2. Conferir lançamentos" });

    const [call] = api.callsTo("POST", "/api/imports/preview");

    expect(call.body).toMatchObject({
      fileName: "fatura.pdf",
      fileHash: "hash-da-fatura",
      issuer: "Nubank",
      referenceMonth: "2026-10",
      dueDate: "2026-10-10",
      statedTotal: 150,
      useInvoiceMonth: false,
    });
    expect((call.body as { items: unknown[] }).items).toHaveLength(4);
    expect((call.body as { items: object[] }).items[0]).not.toHaveProperty("raw");
  });

  it("mostra o cabeçalho da fatura, as sugestões e deixa o pagamento desmarcado", async () => {
    const { user } = await renderPage();

    await upload(user);
    await screen.findByRole("heading", { name: "2. Conferir lançamentos" });

    expect(screen.getByText("Nubank")).toBeInTheDocument();
    expect(screen.getByText("10/10/2026")).toBeInTheDocument();
    expect(screen.getByLabelText("Categoria da linha 1")).toHaveValue("Alimentação");
    expect(screen.getByText("palavra-chave")).toBeInTheDocument();
    expect(screen.getByText("regra sua")).toBeInTheDocument();
    expect(screen.getByText("2/5")).toBeInTheDocument();
    expect(screen.getByLabelText("Data da linha 3")).toHaveValue("2026-10-20");
    expect(screen.getByLabelText("Incluir linha 4")).not.toBeChecked();
    expect(screen.getByText("pagamento da fatura")).toBeInTheDocument();
    expect(
      screen.getByText("A soma das linhas incluídas confere com o total da fatura."),
    ).toBeInTheDocument();
  });

  it("bloqueia a confirmação enquanto houver linha incluída sem categoria", async () => {
    const { user } = await renderPage();

    await upload(user);
    await screen.findByRole("heading", { name: "2. Conferir lançamentos" });

    expect(screen.getByText("sem categoria")).toBeInTheDocument();
    expect(screen.getByText(/1 pendência\(s\) para resolver/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar 3 transação(ões)" })).toBeDisabled();

    await user.selectOptions(screen.getByLabelText("Categoria da linha 3"), "Transporte");

    expect(screen.queryByText("sem categoria")).toBeNull();
    expect(screen.getByRole("button", { name: "Registrar 3 transação(ões)" })).toBeEnabled();
  });

  it("exige aceite explícito quando a soma difere do total impresso", async () => {
    const { user } = await renderPage();

    await upload(user);
    await screen.findByRole("heading", { name: "2. Conferir lançamentos" });
    await user.selectOptions(screen.getByLabelText("Categoria da linha 3"), "Transporte");
    await user.click(screen.getByLabelText("Incluir linha 2"));

    expect(screen.getByText(/difere do total impresso na fatura/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar 2 transação(ões)" })).toBeDisabled();

    await user.click(screen.getByLabelText("Registrar mesmo com a diferença"));

    expect(screen.getByRole("button", { name: "Registrar 2 transação(ões)" })).toBeEnabled();
  });

  it("confirma só as linhas incluídas, com a regra marcada em 'lembrar', e atualiza o histórico", async () => {
    let batches: ImportBatchSummary[] = [];
    const { user, api } = await renderPage({
      "GET /api/imports": () => batches,
      "POST /api/imports": () => {
        batches = [batch];

        return reply(201, { batch, created: 3, replaced: false });
      },
    });

    await upload(user);
    await screen.findByRole("heading", { name: "2. Conferir lançamentos" });
    await user.selectOptions(screen.getByLabelText("Categoria da linha 3"), "Transporte");
    await user.click(screen.getByLabelText("Lembrar para as próximas faturas"));
    await user.click(screen.getByRole("button", { name: "Registrar 3 transação(ões)" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "3 transação(ões) registrada(s) a partir de fatura.pdf.",
    );

    const [call] = api.callsTo("POST", "/api/imports");

    expect(call.body).toEqual({
      fileName: "fatura.pdf",
      fileHash: "hash-da-fatura",
      issuer: "Nubank",
      referenceMonth: "2026-10",
      dueDate: "2026-10-10",
      statedTotal: 150,
      replaceTransactionId: null,
      rules: [{ pattern: "LOJA XPTO", category: "Transporte", type: "outcome" }],
      items: [
        { date: "2026-09-12", description: "IFOOD *RESTAURANTE", amount: 50, type: "outcome", category: "Alimentação", installment: null },
        { date: "2026-09-13", description: "UBER *TRIP", amount: 30, type: "outcome", category: "Transporte", installment: null },
        { date: "2026-10-20", description: "LOJA XPTO", amount: 70, type: "outcome", category: "Transporte", installment: { current: 2, total: 5 } },
      ],
    });
    expect(screen.queryByRole("heading", { name: "2. Conferir lançamentos" })).toBeNull();
    expect(await screen.findByText(/fatura\.pdf • 3 lançamento\(s\)/)).toBeInTheDocument();
    expect(api.callsTo("GET", "/api/transactions").length).toBeGreaterThanOrEqual(2);
  });

  it("mantém o preview aberto e mostra a mensagem da API quando a confirmação falha", async () => {
    const { user } = await renderPage({
      "POST /api/imports": reply(400, { error: "Lançamento 3 inválido: categoria é obrigatória." }),
    });

    await upload(user);
    await screen.findByRole("heading", { name: "2. Conferir lançamentos" });
    await user.selectOptions(screen.getByLabelText("Categoria da linha 3"), "Transporte");
    await user.click(screen.getByRole("button", { name: "Registrar 3 transação(ões)" }));

    expect(await screen.findByText("Lançamento 3 inválido: categoria é obrigatória.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "2. Conferir lançamentos" })).toBeInTheDocument();
  });

  it("avisa sobre fatura já importada e oferece substituir o lançamento único", async () => {
    const { user, api } = await renderPage({
      "POST /api/imports/preview": previewResponse({
        alreadyImported: { id: "batch-0", fileName: "fatura.pdf", createdAt: "2026-10-01T12:00:00.000Z" },
        lumpCandidate: { id: "tx-fatura", description: "Fatura", amount: -150, date: "2026-10-10T00:00:00.000Z" },
      }),
      "POST /api/imports": reply(201, { batch, created: 3, replaced: true }),
    });

    await upload(user);
    await screen.findByRole("heading", { name: "2. Conferir lançamentos" });

    expect(screen.getByText(/Esta fatura já foi importada em 01\/10\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/Você já registrou esta fatura como um lançamento único/)).toBeInTheDocument();

    await user.click(screen.getByLabelText("Substituir esse lançamento pelo detalhamento"));
    await user.selectOptions(screen.getByLabelText("Categoria da linha 3"), "Transporte");
    await user.click(screen.getByRole("button", { name: "Registrar 3 transação(ões)" }));
    await screen.findByRole("status");

    expect(api.callsTo("POST", "/api/imports")[0].body).toMatchObject({
      replaceTransactionId: "tx-fatura",
    });
  });

  it("aplica a categoria escolhida às outras linhas do mesmo estabelecimento", async () => {
    const { user } = await renderPage({
      "POST /api/imports/preview": previewResponse({
        items: [
          previewItem(0, { description: "PADARIA A", merchant: "PADARIA A", amount: 75 }),
          previewItem(1, { description: "PADARIA A 2", merchant: "PADARIA A", amount: 75 }),
        ],
      }),
    });

    await upload(user);
    await screen.findByRole("heading", { name: "2. Conferir lançamentos" });
    await user.selectOptions(screen.getByLabelText("Categoria da linha 1"), "Alimentação");
    await user.click(screen.getByRole("button", { name: "Aplicar às outras 1 de PADARIA A" }));

    expect(screen.getByLabelText("Categoria da linha 2")).toHaveValue("Alimentação");
    expect(screen.getByRole("button", { name: "Registrar 2 transação(ões)" })).toBeEnabled();
  });

  it("pede a senha quando o PDF é protegido e tenta de novo com ela", async () => {
    vi.mocked(extractPdfLines)
      .mockRejectedValueOnce(new PdfPasswordError())
      .mockResolvedValueOnce([["linha"]]);
    const { user } = await renderPage();

    await upload(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("Este PDF é protegido por senha.");

    await user.type(screen.getByLabelText("Senha do PDF"), "12345");
    await user.click(screen.getByRole("button", { name: "Abrir PDF" }));
    await screen.findByRole("heading", { name: "2. Conferir lançamentos" });

    expect(vi.mocked(extractPdfLines).mock.calls[1][1]).toBe("12345");
  });

  it("desfaz uma importação anterior após confirmação", async () => {
    const { user, api } = await renderPage({
      "GET /api/imports": [batch],
      "DELETE /api/imports/batch-1": { message: "Importação desfeita.", removed: 3 },
    });

    const item = (await screen.findByText(/fatura\.pdf • 3 lançamento\(s\)/)).closest("li") as HTMLElement;

    await user.click(within(item).getByRole("button", { name: "Desfazer importação" }));

    const dialog = screen.getByRole("dialog", { name: "Desfazer importação" });

    expect(dialog).toHaveTextContent("Todas as 3 transações importadas de fatura.pdf serão excluídas.");

    await user.click(within(dialog).getByRole("button", { name: "Desfazer importação" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Importação desfeita: 3 transação(ões) removida(s).",
    );
    expect(api.callsTo("DELETE", "/api/imports/batch-1")).toHaveLength(1);
    expect(screen.getByText("Nenhuma fatura importada ainda.")).toBeInTheDocument();
  });
});
