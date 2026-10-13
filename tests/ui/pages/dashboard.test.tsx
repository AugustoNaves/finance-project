import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import Home from "@/app/page";
import { mockApi } from "../helpers/api";
import { categories, goals, transactions } from "../helpers/fixtures";
import { freezeDate, getModalByTitle, queryModalByTitle, renderWithProvider } from "../helpers/render";

/** Card de resumo (SummaryCard): o título fica dentro de um div irmão do valor. */
function summaryCard(title: string) {
  const main = screen.getByRole("main");
  const titleElement = within(main)
    .getAllByText(title)
    .find((element) => element.tagName === "DIV");

  if (!titleElement?.parentElement) throw new Error(`SummaryCard "${title}" não encontrado`);

  return titleElement.parentElement;
}

function insightCard(title: string) {
  const card = screen.getByRole("heading", { name: title, level: 3 }).closest("article");

  if (!card) throw new Error(`InsightCard "${title}" não encontrado`);

  return card;
}

describe("Página inicial (dashboard)", () => {
  beforeEach(() => {
    freezeDate();
  });

  it("mostra estados vazios quando não há transações nem metas", async () => {
    const api = mockApi();
    renderWithProvider(<Home />);

    await waitFor(() => expect(api.callsTo("GET", "/api/goals")).toHaveLength(1));

    expect(screen.getByRole("heading", { name: "Controle financeiro", level: 1 })).toBeInTheDocument();
    expect(summaryCard("Receitas")).toHaveTextContent("R$ 0,00");
    expect(summaryCard("Saldo Total")).toHaveTextContent("R$ 0,00");
    expect(screen.getByText("Nenhuma transação registrada ainda.")).toBeInTheDocument();
    expect(screen.getByText("Sem receitas")).toBeInTheDocument();
    expect(insightCard("Maior despesa")).toHaveTextContent("Sem dados");
    expect(insightCard("Categoria em destaque")).toHaveTextContent("Sem dados");
    expect(insightCard("Movimento do mês")).toHaveTextContent("0");
    expect(insightCard("Meta mais próxima")).toHaveTextContent("Sem metas");
  });

  it("soma receitas, despesas, investimentos e saldo de TODO o histórico nos cards do topo", async () => {
    mockApi({ "GET /api/transactions": transactions, "GET /api/goals": goals });
    renderWithProvider(<Home />);

    await waitFor(() => expect(summaryCard("Receitas")).toHaveTextContent("R$ 7.300,00"));
    // Despesas aparecem com sinal negativo.
    expect(summaryCard("Despesas")).toHaveTextContent("-R$ 3.200,00");
    // Investimentos são exibidos em valor absoluto...
    expect(summaryCard("Investimentos")).toHaveTextContent("R$ 1.500,00");
    // ...mas são descontados do saldo total (7.300 - 3.200 - 1.500).
    expect(summaryCard("Saldo Total")).toHaveTextContent("R$ 2.600,00");
  });

  it("calcula o resumo do mês corrente (outubro/2026) e a taxa de economia", async () => {
    mockApi({ "GET /api/transactions": transactions });
    renderWithProvider(<Home />);

    const summary = (await screen.findByRole("heading", { name: "Resumo do mês" })).closest("article");
    expect(summary).not.toBeNull();

    await waitFor(() => expect(summary).toHaveTextContent("34% economizado"));
    expect(summary).toHaveTextContent("outubro de 2026");
    expect(within(summary!).getByText("Entradas").parentElement).toHaveTextContent("R$ 5.000,00");
    expect(within(summary!).getByText("Saídas").parentElement).toHaveTextContent("-R$ 2.300,00");
    // Saldo do mês desconta também o investimento de R$ 1.000.
    expect(within(summary!).getByText("Saldo do mês").parentElement).toHaveTextContent("R$ 1.700,00");
  });

  it("mostra os insights do mês: maior despesa, categoria em destaque e quantidade de transações", async () => {
    mockApi({ "GET /api/transactions": transactions });
    renderWithProvider(<Home />);

    await waitFor(() => expect(insightCard("Movimento do mês")).toHaveTextContent("5"));
    expect(insightCard("Maior despesa")).toHaveTextContent("-R$ 1.500,00");
    expect(insightCard("Maior despesa")).toHaveTextContent("Aluguel foi a maior saída deste mês.");
    expect(insightCard("Categoria em destaque")).toHaveTextContent("Moradia");
    expect(insightCard("Categoria em destaque")).toHaveTextContent(
      "R$ 1.500,00 concentrados nesta categoria.",
    );
  });

  it("lista apenas as 5 transações mais recentes, da mais nova para a mais antiga", async () => {
    mockApi({ "GET /api/transactions": [...transactions].reverse() });
    renderWithProvider(<Home />);

    const table = await screen.findByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);

    expect(rows).toHaveLength(5);
    expect(rows.map((row) => within(row).getAllByRole("cell")[0].textContent)).toEqual([
      "Tesouro Direto",
      "Restaurante",
      "Mercado",
      "Aluguel",
      "Salário",
    ]);
    expect(rows[0]).toHaveTextContent("R$ 1.000,00");
    expect(rows[0]).not.toHaveTextContent("-R$ 1.000,00");
    expect(rows[1]).toHaveTextContent("-R$ 200,00");
    expect(rows[4]).toHaveTextContent("+R$ 5.000,00");
    expect(rows[4]).toHaveTextContent("05/10/2026");
  });

  it("mostra a meta com maior progresso em 'Meta mais próxima'", async () => {
    mockApi({ "GET /api/goals": [goals[0]] });
    renderWithProvider(<Home />);

    await waitFor(() => expect(insightCard("Meta mais próxima")).toHaveTextContent("25%"));
    expect(insightCard("Meta mais próxima")).toHaveTextContent(
      "Reserva de emergência: R$ 2.500,00 de R$ 10.000,00.",
    );
  });

  it("ignora metas já concluídas ao escolher a 'Meta mais próxima'", async () => {
    mockApi({ "GET /api/goals": goals });
    renderWithProvider(<Home />);

    // "Notebook novo" está em 125% (concluída); a mais próxima em andamento é a reserva (25%).
    await waitFor(() => expect(insightCard("Meta mais próxima")).toHaveTextContent("25%"));
    expect(insightCard("Meta mais próxima")).toHaveTextContent("Reserva de emergência");
  });

  it("mostra 'Sem metas' quando todas as metas já foram concluídas", async () => {
    const api = mockApi({ "GET /api/goals": [goals[1]] });
    renderWithProvider(<Home />);

    await waitFor(() => expect(api.callsTo("GET", "/api/goals")).toHaveLength(1));
    await waitFor(() => expect(api.callsTo("GET", "/api/transactions")).toHaveLength(1));
    expect(insightCard("Meta mais próxima")).toHaveTextContent("Sem metas");
  });

  it("[regressão de fuso] transação de 2026-08-01T00:00Z conta no resumo de agosto e aparece como 01/08/2026", async () => {
    freezeDate("2026-08-15T15:00:00.000Z");
    mockApi({
      "GET /api/transactions": [{ ...transactions[0], id: "tz", date: "2026-08-01T00:00:00.000Z" }],
    });
    renderWithProvider(<Home />);

    const summary = (await screen.findByRole("heading", { name: "Resumo do mês" })).closest("article")!;
    await waitFor(() =>
      expect(within(summary).getByText("Entradas").parentElement).toHaveTextContent("R$ 5.000,00"),
    );
    expect(summary).toHaveTextContent("agosto de 2026");
    expect(insightCard("Movimento do mês")).toHaveTextContent("1");
    expect(within(screen.getByRole("table")).getByText("01/08/2026")).toBeInTheDocument();
  });

  it("[regressão de fuso] a mesma transação não conta no resumo de julho", async () => {
    freezeDate("2026-07-31T15:00:00.000Z");
    mockApi({
      "GET /api/transactions": [{ ...transactions[0], id: "tz", date: "2026-08-01T00:00:00.000Z" }],
    });
    renderWithProvider(<Home />);

    await screen.findByRole("table");
    expect(insightCard("Movimento do mês")).toHaveTextContent("0");
    expect(screen.getByText("Sem receitas")).toBeInTheDocument();
  });

  it("continua renderizando quando a busca de metas falha", async () => {
    mockApi({ "GET /api/goals": { error: "Não autenticado." } });
    renderWithProvider(<Home />);

    await waitFor(() => expect(insightCard("Meta mais próxima")).toHaveTextContent("Sem metas"));
  });

  it("abre o modal de nova transação e adiciona o registro criado à lista e aos totais", async () => {
    const api = mockApi({
      "GET /api/categories": categories,
      "POST /api/transactions": (call) => ({
        id: "novo",
        ...(call.body as object),
        date: "2026-10-15T00:00:00.000Z",
      }),
    });
    const { user } = renderWithProvider(<Home />);

    expect(queryModalByTitle("Nova Transação")).toBeNull();
    await user.click(screen.getByRole("button", { name: "+ Nova Transação" }));

    const modal = getModalByTitle("Nova Transação");
    await within(modal).findByRole("option", { name: "Alimentação" });
    await user.type(within(modal).getByLabelText("Descrição"), "Padaria");
    await user.type(within(modal).getByLabelText("Valor"), "50");
    await user.click(within(modal).getByRole("button", { name: "Salvar Transação" }));

    await waitFor(() => expect(queryModalByTitle("Nova Transação")).toBeNull());
    expect(api.callsTo("POST", "/api/transactions")[0].body).toMatchObject({
      description: "Padaria",
      amount: -50,
      category: "Alimentação",
      type: "outcome",
    });
    expect(within(screen.getByRole("table")).getByText("Padaria")).toBeInTheDocument();
    expect(summaryCard("Despesas")).toHaveTextContent("-R$ 50,00");
  });

  it("exibe a navegação principal com 'Início' ativo", async () => {
    mockApi();
    renderWithProvider(<Home />);

    const nav = screen.getAllByRole("navigation", { name: "Navegação principal" })[0];
    expect(within(nav).getByRole("link", { name: "Início" })).toHaveAttribute("href", "/");
    await waitFor(() => expect(screen.getByText("Sem receitas")).toBeInTheDocument());
  });
});
