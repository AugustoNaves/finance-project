import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InvestmentsPage from "@/app/investments/page";
import ReportsPage from "@/app/reports/page";
import { mockApi, reply, type ApiRoutes } from "../helpers/api";
import { categories, transactions } from "../helpers/fixtures";
import { freezeDate, getModalByTitle, queryModalByTitle, renderWithProvider } from "../helpers/render";

function metricCard(title: string) {
  const element = screen.getByRole("heading", { name: title, level: 3 }).closest("article");

  if (!element) throw new Error(`Métrica "${title}" não encontrada`);

  return element;
}

function sectionOf(title: string) {
  const element = screen.getByRole("heading", { name: title, level: 2 }).closest("section");

  if (!element) throw new Error(`Seção "${title}" não encontrada`);

  return element;
}

describe("Página de relatórios", () => {
  beforeEach(() => {
    freezeDate();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  async function renderPage(routes: ApiRoutes = {}) {
    const api = mockApi({ "GET /api/transactions": transactions, ...routes });
    const utils = renderWithProvider(<ReportsPage />);

    await waitFor(() => expect(api.callsTo("GET", "/api/transactions")).toHaveLength(1));

    return { api, ...utils };
  }

  it("mostra estados vazios quando não há transações", async () => {
    await renderPage({ "GET /api/transactions": [] });

    expect(screen.getByRole("heading", { name: "Análise do período", level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText("Período")).toHaveValue("2026-10");
    expect(metricCard("Receitas")).toHaveTextContent("R$ 0,00");
    expect(metricCard("Maior despesa")).toHaveTextContent("Sem dados");
    expect(metricCard("Categoria líder")).toHaveTextContent("Sem dados");
    expect(metricCard("Taxa de economia")).toHaveTextContent("Sem receitas");
    expect(screen.getByText("Nenhuma despesa encontrada neste período.")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma despesa para exibir no gráfico.")).toBeInTheDocument();
    expect(sectionOf("Gastos por categoria")).toHaveTextContent("0 categoria(s)");
  });

  it("calcula as métricas do mês atual (outubro/2026)", async () => {
    await renderPage();

    await waitFor(() => expect(metricCard("Receitas")).toHaveTextContent("R$ 5.000,00"));
    expect(metricCard("Despesas")).toHaveTextContent("-R$ 2.300,00");
    // Saldo desconta o investimento de R$ 1.000 (5.000 - 2.300 - 1.000).
    expect(metricCard("Saldo")).toHaveTextContent("R$ 1.700,00");
    expect(metricCard("Maior despesa")).toHaveTextContent("-R$ 1.500,00");
    expect(metricCard("Maior despesa")).toHaveTextContent("Aluguel foi a maior saída do período.");
    expect(metricCard("Categoria líder")).toHaveTextContent("Moradia");
    expect(metricCard("Categoria líder")).toHaveTextContent("R$ 1.500,00 concentrados nesta categoria.");
    expect(metricCard("Taxa de economia")).toHaveTextContent("34% economizado");
  });

  it("no mês corrente a média diária divide pelas despesas pelos dias já decorridos (dia 15)", async () => {
    await renderPage();

    // 2.300 / 15 dias = 153,33
    await waitFor(() => expect(metricCard("Média diária")).toHaveTextContent("R$ 153,33"));
  });

  it("lista os gastos por categoria com valor e participação percentual, do maior para o menor", async () => {
    await renderPage();

    const section = sectionOf("Gastos por categoria");
    await waitFor(() => expect(section).toHaveTextContent("2 categoria(s)"));
    const items = within(section).getAllByRole("article");

    expect(items[0]).toHaveTextContent("Moradia");
    expect(items[0]).toHaveTextContent("R$ 1.500,00");
    expect(items[0]).toHaveTextContent("65% das despesas");
    expect(items[1]).toHaveTextContent("Alimentação");
    expect(items[1]).toHaveTextContent("R$ 800,00");
    expect(items[1]).toHaveTextContent("35% das despesas");
  });

  it("mostra a evolução do saldo dos últimos 6 meses terminando no mês selecionado", async () => {
    await renderPage();

    const section = sectionOf("Evolução do saldo");
    await waitFor(() => expect(section).toHaveTextContent("R$ 1.700,00"));
    const items = within(section).getAllByRole("article");

    expect(items).toHaveLength(6);
    expect(items.map((item) => item.textContent?.replace(/\s/g, " "))).toEqual([
      expect.stringMatching(/^mai\.? de 2026R\$ 0,00$/),
      expect.stringMatching(/^jun\.? de 2026R\$ 0,00$/),
      expect.stringMatching(/^jul\.? de 2026R\$ 0,00$/),
      expect.stringMatching(/^ago\.? de 2026R\$ 200,00$/),
      expect.stringMatching(/^set\.? de 2026R\$ 700,00$/),
      expect.stringMatching(/^out\.? de 2026R\$ 1\.700,00$/),
    ]);
  });

  it("recalcula tudo ao trocar o período (setembro/2026; mês passado usa todos os dias na média)", async () => {
    await renderPage();
    await waitFor(() => expect(metricCard("Receitas")).toHaveTextContent("R$ 5.000,00"));

    fireEvent.change(screen.getByLabelText("Período"), { target: { value: "2026-09" } });

    expect(metricCard("Receitas")).toHaveTextContent("R$ 2.000,00");
    expect(metricCard("Despesas")).toHaveTextContent("-R$ 800,00");
    expect(metricCard("Saldo")).toHaveTextContent("R$ 700,00");
    expect(metricCard("Maior despesa")).toHaveTextContent("Viagem foi a maior saída do período.");
    expect(metricCard("Categoria líder")).toHaveTextContent("Lazer");
    // 800 / 30 dias = 26,67
    expect(metricCard("Média diária")).toHaveTextContent("R$ 26,67");
    expect(metricCard("Taxa de economia")).toHaveTextContent("35% economizado");

    const evolution = within(sectionOf("Evolução do saldo")).getAllByRole("article");
    expect(evolution[0]).toHaveTextContent(/abr\.? de 2026/);
    expect(evolution[5]).toHaveTextContent(/set\.? de 2026/);
  });

  it("mês só com despesas mostra 'Sem receitas' e saldo negativo", async () => {
    await renderPage({ "GET /api/transactions": [transactions[2]] });

    await waitFor(() => expect(metricCard("Saldo")).toHaveTextContent("-R$ 600,00"));
    expect(metricCard("Taxa de economia")).toHaveTextContent("Sem receitas");
  });

  it("limpar o período volta para o mês atual", async () => {
    await renderPage();
    fireEvent.change(screen.getByLabelText("Período"), { target: { value: "2026-09" } });

    fireEvent.change(screen.getByLabelText("Período"), { target: { value: "" } });

    expect(screen.getByLabelText("Período")).toHaveValue("2026-10");
    await waitFor(() => expect(metricCard("Receitas")).toHaveTextContent("R$ 5.000,00"));
  });

  it("[regressão de fuso] transação de 2026-08-01T00:00Z entra no relatório de agosto, não no de julho", async () => {
    await renderPage({
      "GET /api/transactions": [{ ...transactions[2], id: "tz", date: "2026-08-01T00:00:00.000Z" }],
    });

    fireEvent.change(screen.getByLabelText("Período"), { target: { value: "2026-08" } });
    await waitFor(() => expect(metricCard("Despesas")).toHaveTextContent("-R$ 600,00"));
    expect(metricCard("Categoria líder")).toHaveTextContent("Alimentação");

    fireEvent.change(screen.getByLabelText("Período"), { target: { value: "2026-07" } });
    expect(metricCard("Despesas")).toHaveTextContent("R$ 0,00");
    expect(metricCard("Maior despesa")).toHaveTextContent("Sem dados");
  });

  it("[texto desatualizado] o subtítulo diz 'sem gráficos externos', mas a página usa recharts", async () => {
    await renderPage();

    expect(screen.getByText(/sem gráficos externos/)).toBeInTheDocument();
    expect(document.querySelectorAll(".recharts-responsive-container").length).toBeGreaterThan(0);
  });
});

describe("Página de investimentos", () => {
  beforeEach(() => {
    freezeDate();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  function summaryCard(title: string) {
    const titleElement = within(screen.getByRole("main")).getByText(title);

    return titleElement.parentElement as HTMLElement;
  }

  async function renderPage(routes: ApiRoutes = {}) {
    const api = mockApi({
      "GET /api/transactions": transactions,
      "GET /api/categories": categories,
      ...routes,
    });
    const utils = renderWithProvider(<InvestmentsPage />);

    await waitFor(() => expect(api.callsTo("GET", "/api/transactions")).toHaveLength(1));

    return { api, ...utils };
  }

  it("mostra zeros e a lista vazia quando não há investimentos", async () => {
    await renderPage({ "GET /api/transactions": transactions.slice(0, 4) });

    expect(screen.getByRole("heading", { name: "Aportes e patrimônio", level: 1 })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("0 registro(s) encontrado(s)")).toBeInTheDocument());
    expect(summaryCard("Total investido")).toHaveTextContent("R$ 0,00");
    expect(summaryCard("Aportes no mês")).toHaveTextContent("R$ 0,00");
  });

  it("soma o total investido (todo o histórico) e os aportes do mês atual em valor absoluto", async () => {
    await renderPage();

    await waitFor(() => expect(summaryCard("Total investido")).toHaveTextContent("R$ 1.500,00"));
    expect(summaryCard("Aportes no mês")).toHaveTextContent("R$ 1.000,00");
  });

  it("lista apenas as transações do tipo investimento", async () => {
    await renderPage();

    await waitFor(() => expect(screen.getByText("2 registro(s) encontrado(s)")).toBeInTheDocument());
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell")[0].textContent)).toEqual([
      "Tesouro Direto",
      "Compra de ações",
    ]);
    expect(within(rows[0]).getAllByRole("cell")[1]).toHaveTextContent(/^R\$ 1\.000,00$/);
  });

  it("'+ Novo Aporte' abre o formulário já como Investimento e envia valor negativo", async () => {
    const { api, user } = await renderPage({
      "POST /api/transactions": (call) =>
        reply(201, { id: "novo", ...(call.body as object), date: "2026-10-15T00:00:00.000Z" }),
    });
    await waitFor(() => expect(summaryCard("Total investido")).toHaveTextContent("R$ 1.500,00"));

    await user.click(screen.getByRole("button", { name: "+ Novo Aporte" }));
    const modal = getModalByTitle("Novo Aporte");
    await waitFor(() => expect(within(modal).getByLabelText("Categoria")).toHaveValue("Renda fixa"));
    await user.type(within(modal).getByLabelText("Descrição"), "CDB");
    await user.type(within(modal).getByLabelText("Valor"), "500");
    await user.click(within(modal).getByRole("button", { name: "Salvar Transação" }));

    await waitFor(() => expect(queryModalByTitle("Novo Aporte")).toBeNull());
    expect(api.callsTo("POST", "/api/transactions")[0].body).toMatchObject({
      description: "CDB",
      amount: -500,
      type: "investment",
      category: "Renda fixa",
      date: "2026-10-15",
    });
    expect(summaryCard("Total investido")).toHaveTextContent("R$ 2.000,00");
    expect(summaryCard("Aportes no mês")).toHaveTextContent("R$ 1.500,00");
    expect(screen.getByText("3 registro(s) encontrado(s)")).toBeInTheDocument();
  });

  it("exclui um aporte pela lista e atualiza os totais", async () => {
    const { api, user } = await renderPage({ "DELETE /api/transactions/t8": { message: "ok" } });
    await waitFor(() => expect(screen.getByText("2 registro(s) encontrado(s)")).toBeInTheDocument());

    const row = within(screen.getByRole("table")).getByText("Compra de ações").closest("tr")!;
    await user.click(within(row).getByRole("button", { name: "Excluir" }));
    await user.click(
      within(getModalByTitle("Confirmar exclusão")).getByRole("button", { name: "Confirmar exclusão" }),
    );

    await waitFor(() => expect(summaryCard("Total investido")).toHaveTextContent("R$ 1.000,00"));
    expect(api.callsTo("DELETE", "/api/transactions/t8")).toHaveLength(1);
  });

  it("[comportamento atual] a lista de aportes usa o título genérico 'Transações'", async () => {
    await renderPage();

    expect(screen.getByRole("heading", { name: "Transações", level: 2 })).toBeInTheDocument();
  });
});
