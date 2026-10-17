import { fireEvent, screen, waitFor, within } from "@testing-library/react";
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
import { mockApi, networkError, reply, type ApiRoutes } from "../helpers/api";
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

    expect(screen.getByRole("heading", { name: "Importar fatura", level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText("Arquivo PDF da fatura")).toHaveAttribute(
      "accept",
      "application/pdf,.pdf",
    );
    expect(await screen.findByText("Nenhuma fatura importada ainda.")).toBeInTheDocument();
    expect(screen.getByText(/lido neste aparelho e não é enviado/)).toBeInTheDocument();
  });

  it("avisa quando as importações anteriores não carregam", async () => {
    await renderPage({ "GET /api/imports": networkError() });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar as importações anteriores.",
    );
    expect(screen.queryByText("Nenhuma fatura importada ainda.")).toBeNull();
  });

  it("aceita o PDF solto na área de envio", async () => {
    const { api } = await renderPage();
    const zone = screen.getByLabelText("Arquivo PDF da fatura").closest("label") as HTMLElement;

    fireEvent.drop(zone, { dataTransfer: { files: [pdfFile()] } });

    expect(await screen.findByRole("heading", { name: "Conferir os lançamentos" })).toBeInTheDocument();
    expect(api.callsTo("POST", "/api/imports/preview")).toHaveLength(1);
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
    await screen.findByRole("heading", { name: "Conferir os lançamentos" });

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
    await screen.findByRole("heading", { name: "Conferir os lançamentos" });

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
    await screen.findByRole("heading", { name: "Conferir os lançamentos" });

    expect(screen.getByText("sem categoria")).toBeInTheDocument();
    expect(screen.getByText(/1 pendência para resolver/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Importar 3 lançamentos" })).toBeDisabled();

    await user.selectOptions(screen.getByLabelText("Categoria da linha 3"), "Transporte");

    expect(screen.queryByText("sem categoria")).toBeNull();
    expect(screen.getByRole("button", { name: "Importar 3 lançamentos" })).toBeEnabled();
  });

  it("edita o valor com vírgula decimal e recalcula a soma selecionada", async () => {
    const { user } = await renderPage();

    await upload(user);
    await screen.findByRole("heading", { name: "Conferir os lançamentos" });

    const amount = screen.getByLabelText("Valor da linha 1");

    expect(amount).toHaveValue("50,00");

    await user.clear(amount);
    await user.type(amount, "45,90");
    await user.tab();

    expect(amount).toHaveValue("45,90");
    expect(screen.getByText(/difere do total impresso na fatura/)).toHaveTextContent("R$ 4,10");
  });

  it("exige aceite explícito quando a soma difere do total impresso", async () => {
    const { user } = await renderPage();

    await upload(user);
    await screen.findByRole("heading", { name: "Conferir os lançamentos" });
    await user.selectOptions(screen.getByLabelText("Categoria da linha 3"), "Transporte");
    await user.click(screen.getByLabelText("Incluir linha 2"));

    expect(screen.getByText(/difere do total impresso na fatura/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Importar 2 lançamentos" })).toBeDisabled();

    await user.click(screen.getByLabelText("Importar mesmo com a diferença"));

    expect(screen.getByRole("button", { name: "Importar 2 lançamentos" })).toBeEnabled();
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
    await screen.findByRole("heading", { name: "Conferir os lançamentos" });
    await user.selectOptions(screen.getByLabelText("Categoria da linha 3"), "Transporte");
    await user.click(screen.getByLabelText("Lembrar para as próximas faturas"));
    await user.click(screen.getByRole("button", { name: "Importar 3 lançamentos" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "3 lançamentos importados de fatura.pdf.",
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
    expect(screen.queryByRole("heading", { name: "Conferir os lançamentos" })).toBeNull();
    expect(await screen.findByText(/fatura\.pdf · 3 lançamentos/)).toBeInTheDocument();
    expect(api.callsTo("GET", "/api/transactions").length).toBeGreaterThanOrEqual(2);
  });

  it("mantém o preview aberto e mostra a mensagem da API quando a confirmação falha", async () => {
    const { user } = await renderPage({
      "POST /api/imports": reply(400, { error: "Lançamento 3 inválido: categoria é obrigatória." }),
    });

    await upload(user);
    await screen.findByRole("heading", { name: "Conferir os lançamentos" });
    await user.selectOptions(screen.getByLabelText("Categoria da linha 3"), "Transporte");
    await user.click(screen.getByRole("button", { name: "Importar 3 lançamentos" }));

    expect(await screen.findByText("Lançamento 3 inválido: categoria é obrigatória.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Conferir os lançamentos" })).toBeInTheDocument();
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
    await screen.findByRole("heading", { name: "Conferir os lançamentos" });

    expect(screen.getByText(/Esta fatura já foi importada em 01\/10\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/Você já registrou esta fatura como um lançamento único/)).toBeInTheDocument();

    await user.click(screen.getByLabelText("Substituir esse lançamento pelo detalhamento"));
    await user.selectOptions(screen.getByLabelText("Categoria da linha 3"), "Transporte");
    await user.click(screen.getByRole("button", { name: "Importar 3 lançamentos" }));
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
    await screen.findByRole("heading", { name: "Conferir os lançamentos" });
    await user.selectOptions(screen.getByLabelText("Categoria da linha 1"), "Alimentação");
    await user.click(screen.getByRole("button", { name: "Aplicar às outras 1 de PADARIA A" }));

    expect(screen.getByLabelText("Categoria da linha 2")).toHaveValue("Alimentação");
    expect(screen.getByRole("button", { name: "Importar 2 lançamentos" })).toBeEnabled();
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
    await screen.findByRole("heading", { name: "Conferir os lançamentos" });

    expect(vi.mocked(extractPdfLines).mock.calls[1][1]).toBe("12345");
  });

  it("desfaz uma importação anterior após confirmação", async () => {
    const { user, api } = await renderPage({
      "GET /api/imports": [batch],
      "DELETE /api/imports/batch-1": { message: "Importação desfeita.", removed: 3 },
    });

    const item = (await screen.findByText(/fatura\.pdf · 3 lançamentos/)).closest("li") as HTMLElement;

    await user.click(within(item).getByRole("button", { name: "Desfazer importação de fatura.pdf" }));

    const dialog = screen.getByRole("dialog", { name: "Desfazer importação" });

    expect(dialog).toHaveTextContent("3 lançamentos importados de fatura.pdf serão excluídos.");

    await user.click(within(dialog).getByRole("button", { name: "Desfazer importação" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Importação desfeita: 3 lançamentos removidos.",
    );
    expect(api.callsTo("DELETE", "/api/imports/batch-1")).toHaveLength(1);
    expect(screen.getByText("Nenhuma fatura importada ainda.")).toBeInTheDocument();
  });

  describe("Criação de Categoria Inline no Preview", () => {
    it("abre o modal de criação pré-preenchido com o tipo da linha ao selecionar '+ Nova categoria...'", async () => {
      const { user } = await renderPage();

      await upload(user);
      await screen.findByRole("heading", { name: "Conferir os lançamentos" });

      const selectRow3 = screen.getByLabelText("Categoria da linha 3");
      expect(within(selectRow3).getByRole("option", { name: "+ Nova categoria..." })).toHaveValue("__new__");

      await user.selectOptions(selectRow3, "+ Nova categoria...");

      const dialog = screen.getByRole("dialog", { name: "Nova categoria" });
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByRole("radio", { name: "Gasto" })).toBeChecked();

      // Fecha o modal
      await user.click(within(dialog).getByRole("button", { name: "Fechar" }));
      expect(screen.queryByRole("dialog", { name: "Nova categoria" })).toBeNull();

      // Muda o tipo da linha 3 para Receita e confere se pré-preenche com income
      await user.selectOptions(screen.getByLabelText("Tipo da linha 3"), "Receita");
      await user.selectOptions(screen.getByLabelText("Categoria da linha 3"), "+ Nova categoria...");

      const dialogIncome = screen.getByRole("dialog", { name: "Nova categoria" });
      expect(within(dialogIncome).getByRole("radio", { name: "Receita" })).toBeChecked();
    });

    it("reverte o valor do select da linha para o anterior ao cancelar ou fechar o modal", async () => {
      const { user } = await renderPage();

      await upload(user);
      await screen.findByRole("heading", { name: "Conferir os lançamentos" });

      // Linha 1 tem categoria "Alimentação"
      const selectRow1 = screen.getByLabelText("Categoria da linha 1");
      expect(selectRow1).toHaveValue("Alimentação");

      await user.selectOptions(selectRow1, "+ Nova categoria...");
      const dialog1 = screen.getByRole("dialog", { name: "Nova categoria" });
      expect(dialog1).toBeInTheDocument();

      // Cancela pelo botão Fechar
      await user.click(within(dialog1).getByRole("button", { name: "Fechar" }));
      expect(screen.queryByRole("dialog", { name: "Nova categoria" })).toBeNull();
      expect(screen.getByLabelText("Categoria da linha 1")).toHaveValue("Alimentação");

      // Linha 3 não tem categoria (valor "")
      const selectRow3 = screen.getByLabelText("Categoria da linha 3");
      expect(selectRow3).toHaveValue("");

      await user.selectOptions(selectRow3, "+ Nova categoria...");
      const dialog3 = screen.getByRole("dialog", { name: "Nova categoria" });
      expect(dialog3).toBeInTheDocument();

      // Cancela pela tecla Escape
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog", { name: "Nova categoria" })).toBeNull();
      expect(screen.getByLabelText("Categoria da linha 3")).toHaveValue("");
    });

    it("cria a categoria com sucesso, atualiza a linha que disparou e mantém as edições de outras linhas", async () => {
      const { user, api } = await renderPage({
        "POST /api/categories": (call) =>
          reply(201, {
            id: "cat-nova",
            name: (call.body as { name: string }).name,
            type: (call.body as { type: string }).type,
            color: "#00c48c",
            icon: null,
          }),
      });

      await upload(user);
      await screen.findByRole("heading", { name: "Conferir os lançamentos" });

      // Edita descrição da linha 2 para conferir que não será perdida
      const descRow2 = screen.getByLabelText("Descrição da linha 2");
      await user.clear(descRow2);
      await user.type(descRow2, "UBER EDITADO");

      // Linha 3 estava sem categoria
      expect(screen.getByLabelText("Categoria da linha 3")).toHaveValue("");
      expect(screen.getByRole("button", { name: /Importar \d+ lançamentos?/ })).toBeDisabled();

      // Seleciona + Nova categoria... na linha 3
      await user.selectOptions(screen.getByLabelText("Categoria da linha 3"), "+ Nova categoria...");

      const dialog = screen.getByRole("dialog", { name: "Nova categoria" });
      await user.type(within(dialog).getByLabelText("Nome"), "Vestuário");
      await user.click(within(dialog).getByRole("button", { name: "Criar categoria" }));

      // Modal fecha
      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: "Nova categoria" })).toBeNull();
      });

      // Linha 3 agora tem "Vestuário" selecionada
      expect(screen.getByLabelText("Categoria da linha 3")).toHaveValue("Vestuário");

      // A linha 2 manteve a descrição editada
      expect(screen.getByLabelText("Descrição da linha 2")).toHaveValue("UBER EDITADO");

      // A nova categoria "Vestuário" foi adicionada à lista e está disponível nas outras linhas
      const selectRow1 = screen.getByLabelText("Categoria da linha 1");
      expect(within(selectRow1).getByRole("option", { name: "Vestuário" })).toBeInTheDocument();

      // Como a pendência foi resolvida, o botão de registrar é habilitado
      expect(screen.getByRole("button", { name: "Importar 3 lançamentos" })).toBeEnabled();

      const [categoryCall] = api.callsTo("POST", "/api/categories");
      expect(categoryCall.body).toMatchObject({
        name: "Vestuário",
        type: "outcome",
      });
    });

    it("mostra erro dentro do modal quando a API de categorias rejeita, mantendo o modal aberto", async () => {
      const { user } = await renderPage({
        "POST /api/categories": reply(400, { error: "Categoria já cadastrada." }),
      });

      await upload(user);
      await screen.findByRole("heading", { name: "Conferir os lançamentos" });

      await user.selectOptions(screen.getByLabelText("Categoria da linha 3"), "+ Nova categoria...");

      const dialog = screen.getByRole("dialog", { name: "Nova categoria" });
      await user.type(within(dialog).getByLabelText("Nome"), "Alimentação");
      await user.click(within(dialog).getByRole("button", { name: "Criar categoria" }));

      expect(await within(dialog).findByRole("alert")).toHaveTextContent("Categoria já cadastrada.");
      expect(screen.getByRole("dialog", { name: "Nova categoria" })).toBeInTheDocument();

      // Ao fechar, reverte a linha para o valor original
      await user.click(within(dialog).getByRole("button", { name: "Fechar" }));
      expect(screen.queryByRole("dialog", { name: "Nova categoria" })).toBeNull();
      expect(screen.getByLabelText("Categoria da linha 3")).toHaveValue("");
    });
  });
});
