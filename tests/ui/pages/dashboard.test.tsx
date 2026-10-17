import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import Home from "@/app/page";
import { mockApi } from "../helpers/api";
import { budgets, categories, transactions } from "../helpers/fixtures";
import { freezeDate, getModalByTitle, queryModalByTitle, renderWithProvider } from "../helpers/render";

function summary() {
  return screen.getByRole("region", { name: "Sobra do mês" });
}

/** Valor de um item do trio Entrou/Saiu/Investiu. */
function triad(label: "Entrou" | "Saiu" | "Investiu") {
  return within(summary()).getByText(label).nextElementSibling;
}

function ledgerSection(title: string) {
  const section = screen.getByRole("heading", { name: title, level: 2 }).closest("section");

  if (!section) throw new Error(`Seção "${title}" não encontrada`);

  return section;
}

function latestDescriptions() {
  return within(ledgerSection("Últimos lançamentos"))
    .queryAllByRole("button", { name: /Editar$/ })
    .map((row) => row.getAttribute("aria-label")?.split(",")[0]);
}

describe("Mês (página inicial)", () => {
  beforeEach(() => {
    freezeDate();
  });

  it("mostra o mês corrente zerado com convites quando não há lançamentos", async () => {
    const api = mockApi();
    const { user } = renderWithProvider(<Home />);

    await waitFor(() => expect(api.callsTo("GET", "/api/budgets")).toHaveLength(1));

    expect(screen.getByRole("heading", { name: "outubro de 2026", level: 1 })).toBeInTheDocument();
    expect(summary()).toHaveTextContent("R$ 0,00");
    expect(screen.getByText("Nada registrado em outubro.")).toBeInTheDocument();
    expect(screen.getByText("Nenhum orçamento para outubro.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Registrar o primeiro" }));
    expect(getModalByTitle("Registrar")).toBeInTheDocument();
  });

  it("calcula a sobra do mês corrente, o trio entrou/saiu/investiu e o saldo acumulado", async () => {
    mockApi({ "GET /api/transactions": transactions });
    renderWithProvider(<Home />);

    // Outubro: 5.000 de entrada, 2.300 de gastos e 1.000 investidos.
    await waitFor(() => expect(triad("Entrou")).toHaveTextContent("5.000,00"));
    expect(triad("Saiu")).toHaveTextContent("2.300,00");
    expect(triad("Investiu")).toHaveTextContent("1.000,00");
    expect(summary()).toHaveTextContent("R$ 1.700,00");
    // Acumulado de todo o histórico: 7.300 - 3.200 - 1.500.
    expect(within(summary()).getByText("Saldo acumulado")).toHaveTextContent("R$ 2.600,00");
  });

  it("mostra a sobra negativa em vermelho com sinal", async () => {
    mockApi({
      "GET /api/transactions": [{ ...transactions[1], id: "x", date: "2026-10-06T00:00:00.000Z" }],
    });
    renderWithProvider(<Home />);

    await waitFor(() => expect(summary()).toHaveTextContent("−R$ 1.500,00"));
  });

  it("troca de mês pelas setas", async () => {
    mockApi({ "GET /api/transactions": transactions });
    const { user } = renderWithProvider(<Home />);

    await waitFor(() => expect(triad("Entrou")).toHaveTextContent("5.000,00"));
    await user.click(screen.getByRole("button", { name: "Mês anterior" }));

    expect(screen.getByRole("heading", { name: "setembro de 2026", level: 1 })).toBeInTheDocument();
    expect(triad("Entrou")).toHaveTextContent("2.000,00");
    expect(triad("Saiu")).toHaveTextContent("800,00");
    expect(triad("Investiu")).toHaveTextContent("500,00");
    expect(summary()).toHaveTextContent("R$ 700,00");
    expect(latestDescriptions()).toEqual(["Viagem", "Compra de ações", "Freelance"]);

    await user.click(screen.getByRole("button", { name: "Próximo mês" }));
    await user.click(screen.getByRole("button", { name: "Próximo mês" }));
    expect(screen.getByRole("heading", { name: "novembro de 2026", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Nada registrado em novembro.")).toBeInTheDocument();
  });

  it("lista os lançamentos do mês do mais novo para o mais antigo, com categoria e data", async () => {
    mockApi({ "GET /api/transactions": transactions });
    renderWithProvider(<Home />);

    await waitFor(() =>
      expect(latestDescriptions()).toEqual(["Tesouro Direto", "Restaurante", "Mercado", "Aluguel", "Salário"]),
    );
    const aluguel = within(ledgerSection("Últimos lançamentos")).getByRole("button", { name: /^Aluguel,/ });
    expect(aluguel).toHaveTextContent("Moradia · ter., 6 de out.");
    expect(aluguel).toHaveTextContent("−1.500,00");
    expect(within(ledgerSection("Últimos lançamentos")).getByRole("link", { name: "Ver todos" })).toHaveAttribute(
      "href",
      "/transactions",
    );
  });

  it("mostra no máximo 7 lançamentos", async () => {
    const many = Array.from({ length: 9 }, (_, index) => ({
      ...transactions[2],
      id: `m${index}`,
      description: `Compra ${index + 1}`,
      date: `2026-10-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
    }));
    mockApi({ "GET /api/transactions": many });
    renderWithProvider(<Home />);

    await waitFor(() => expect(latestDescriptions()).toHaveLength(7));
    expect(latestDescriptions()[0]).toBe("Compra 9");
    expect(latestDescriptions()).not.toContain("Compra 2");
  });

  it("mostra os orçamentos do mês do mais usado ao menos usado, com estado na barra", async () => {
    mockApi({ "GET /api/transactions": transactions, "GET /api/budgets": budgets });
    renderWithProvider(<Home />);

    const section = ledgerSection("Orçamentos");
    await waitFor(() => expect(within(section).getAllByRole("progressbar")).toHaveLength(3));

    const bars = within(section).getAllByRole("progressbar");
    // Moradia 125% (limitado a 100 na barra), Alimentação 80%, Transporte 0%. Lazer é de setembro.
    expect(bars.map((bar) => bar.getAttribute("aria-label"))).toEqual([
      "Moradia: 100%",
      "Alimentação: 80%",
      "Transporte: 0%",
    ]);
    expect(section).toHaveTextContent("1.500,00 de 1.200,00");
    expect(section).toHaveTextContent("800,00 de 1.000,00");
    expect(section).not.toHaveTextContent("Lazer");
    expect(within(section).getByRole("link", { name: "Planejar" })).toHaveAttribute("href", "/planning");
  });

  it("lembra de importar a fatura do mês corrente enquanto ela não foi importada", async () => {
    mockApi({ "GET /api/imports": [] });
    const { user } = renderWithProvider(<Home />);

    const nudge = await screen.findByRole("link", { name: /A fatura de outubro ainda não foi importada/ });
    expect(nudge).toHaveAttribute("href", "/import");

    await user.click(screen.getByRole("button", { name: "Mês anterior" }));
    expect(screen.queryByRole("link", { name: /ainda não foi importada/ })).toBeNull();
  });

  it("não mostra o lembrete quando a fatura do mês já foi importada", async () => {
    const api = mockApi({
      "GET /api/imports": [
        {
          id: "b1",
          fileName: "fatura.pdf",
          issuer: "Nubank",
          referenceMonth: "2026-10",
          dueDate: null,
          statedTotal: null,
          importedTotal: 100,
          itemCount: 2,
          createdAt: "2026-10-10T12:00:00.000Z",
        },
      ],
    });
    renderWithProvider(<Home />);

    await waitFor(() => expect(api.callsTo("GET", "/api/imports")).toHaveLength(1));
    await screen.findByText("Nenhum orçamento para outubro.");
    expect(screen.queryByRole("link", { name: /ainda não foi importada/ })).toBeNull();
  });

  it("[regressão de fuso] lançamento de 2026-08-01T00:00Z conta em agosto e aparece como 1º de agosto", async () => {
    freezeDate("2026-08-15T15:00:00.000Z");
    mockApi({
      "GET /api/transactions": [{ ...transactions[0], id: "tz", date: "2026-08-01T00:00:00.000Z" }],
    });
    renderWithProvider(<Home />);

    await waitFor(() => expect(triad("Entrou")).toHaveTextContent("5.000,00"));
    expect(screen.getByRole("heading", { name: "agosto de 2026", level: 1 })).toBeInTheDocument();
    expect(within(ledgerSection("Últimos lançamentos")).getByRole("button", { name: /^Salário,/ })).toHaveTextContent(
      "sáb., 1 de ago.",
    );
  });

  it("[regressão de fuso] o mesmo lançamento não conta em julho", async () => {
    freezeDate("2026-07-31T15:00:00.000Z");
    mockApi({
      "GET /api/transactions": [{ ...transactions[0], id: "tz", date: "2026-08-01T00:00:00.000Z" }],
    });
    renderWithProvider(<Home />);

    await waitFor(() => expect(within(summary()).getByText("Saldo acumulado")).toHaveTextContent("R$ 5.000,00"));
    expect(triad("Entrou")).toHaveTextContent("0,00");
    expect(screen.getByText("Nada registrado em julho.")).toBeInTheDocument();
  });

  it("continua renderizando quando a busca de orçamentos falha", async () => {
    mockApi({ "GET /api/budgets": { error: "Não autenticado." } });
    renderWithProvider(<Home />);

    expect(await screen.findByText("Nenhum orçamento para outubro.")).toBeInTheDocument();
  });

  it("Registrar na barra abre a folha e o lançamento criado entra na lista e na sobra", async () => {
    const api = mockApi({
      "GET /api/categories": categories,
      "POST /api/transactions": (call) => ({
        id: "novo",
        ...(call.body as object),
        date: "2026-10-15T00:00:00.000Z",
      }),
    });
    const { user } = renderWithProvider(<Home />);

    expect(queryModalByTitle("Registrar")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Registrar" }));

    const modal = getModalByTitle("Registrar");
    await within(modal).findByRole("radio", { name: "Alimentação" });
    await user.type(within(modal).getByLabelText("Descrição"), "Padaria");
    await user.type(within(modal).getByLabelText("Valor"), "50");
    await user.click(within(modal).getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(queryModalByTitle("Registrar")).toBeNull());
    expect(api.callsTo("POST", "/api/transactions")[0].body).toMatchObject({
      description: "Padaria",
      amount: -50,
      category: "Alimentação",
      type: "outcome",
    });
    expect(latestDescriptions()).toEqual(["Padaria"]);
    expect(triad("Saiu")).toHaveTextContent("50,00");
    expect(summary()).toHaveTextContent("−R$ 50,00");
  });

  it("tocar num lançamento abre a edição", async () => {
    mockApi({ "GET /api/transactions": transactions, "GET /api/categories": categories });
    const { user } = renderWithProvider(<Home />);

    await user.click(await screen.findByRole("button", { name: /^Mercado,/ }));

    expect(within(getModalByTitle("Editar lançamento")).getByLabelText("Descrição")).toHaveValue("Mercado");
  });

  it("marca 'Mês' como item ativo da navegação", async () => {
    mockApi();
    renderWithProvider(<Home />);

    const nav = screen.getByRole("navigation", { name: "Navegação principal" });
    expect(within(nav).getByRole("link", { name: "Mês" })).toHaveAttribute("aria-current", "page");
    await screen.findByText("Nenhum orçamento para outubro.");
  });
});
