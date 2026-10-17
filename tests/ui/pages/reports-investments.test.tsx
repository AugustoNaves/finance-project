import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InvestmentsPage from "@/app/investments/page";
import ReportsPage from "@/app/reports/page";
import { mockApi, reply, type ApiRoutes } from "../helpers/api";
import { categories, transactions } from "../helpers/fixtures";
import { freezeDate, getModalByTitle, queryModalByTitle, renderWithProvider } from "../helpers/render";

function sectionOf(title: string) {
  const element = screen.getByRole("heading", { name: title, level: 2 }).closest("section");

  if (!element) throw new Error(`Seção "${title}" não encontrada`);

  return element;
}

function sheetLine(label: string) {
  const term = within(sectionOf("Balanço do período")).getByText(label, { selector: "dt" });

  return term.parentElement as HTMLElement;
}

function value(label: string) {
  return sheetLine(label).querySelector("dd") as HTMLElement;
}

function evolutionRows() {
  return within(screen.getByRole("list", { name: "Saldo por mês" })).getAllByRole("listitem");
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

  it("mostra estados vazios quando não há lançamentos", async () => {
    await renderPage({ "GET /api/transactions": [] });

    expect(screen.getByRole("heading", { name: "Relatórios", level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText("Período")).toHaveValue("2026-10");
    expect(value("Receitas")).toHaveTextContent(/^R\$ 0,00$/);
    expect(value("Maior despesa")).toHaveTextContent(/^Sem dados$/);
    expect(value("Categoria líder")).toHaveTextContent(/^Sem dados$/);
    expect(value("Taxa de economia")).toHaveTextContent("Sem receitas");
    expect(value("Movimento do período")).toHaveTextContent("0 lançamentos");
    expect(screen.getByText("Nenhuma despesa encontrada neste período.")).toBeInTheDocument();
    expect(sectionOf("Gastos por categoria")).toHaveTextContent("0 categorias");
  });

  it("monta a folha de balanço do mês atual (outubro/2026)", async () => {
    await renderPage();

    await waitFor(() => expect(value("Receitas")).toHaveTextContent(/^R\$ 5\.000,00$/));
    expect(value("Despesas")).toHaveTextContent(/^−R\$ 2\.300,00$/);
    expect(value("Investimentos")).toHaveTextContent(/^−R\$ 1\.000,00$/);
    // Saldo desconta o investimento de R$ 1.000 (5.000 - 2.300 - 1.000).
    expect(value("Saldo")).toHaveTextContent(/^R\$ 1\.700,00$/);
    expect(value("Maior despesa")).toHaveTextContent("−R$ 1.500,00");
    expect(value("Maior despesa")).toHaveTextContent("Aluguel");
    expect(value("Categoria líder")).toHaveTextContent("Moradia");
    expect(value("Categoria líder")).toHaveTextContent("R$ 1.500,00 · 65%");
    expect(value("Taxa de economia")).toHaveTextContent(/^34%$/);
    expect(value("Movimento do período")).toHaveTextContent("5 lançamentos");
  });

  it("despesas e maior despesa aparecem em vermelho; receitas não", async () => {
    await renderPage();

    await waitFor(() => expect(value("Despesas")).toHaveAttribute("data-tone", "out"));
    expect(value("Maior despesa")).toHaveAttribute("data-tone", "out");
    expect(value("Receitas")).not.toHaveAttribute("data-tone");
  });

  it("no mês corrente a média diária divide as despesas pelos dias já decorridos (dia 15)", async () => {
    await renderPage();

    // 2.300 / 15 dias = 153,33
    await waitFor(() => expect(value("Média diária")).toHaveTextContent("R$ 153,33"));
  });

  it("lista os gastos por categoria com valor e participação percentual, do maior para o menor", async () => {
    await renderPage();

    const section = sectionOf("Gastos por categoria");
    await waitFor(() => expect(section).toHaveTextContent("2 categorias"));
    const items = within(section).getAllByRole("listitem");

    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Moradia");
    expect(items[0]).toHaveTextContent("R$ 1.500,00");
    expect(items[0]).toHaveTextContent("65% das despesas");
    expect(items[1]).toHaveTextContent("Alimentação");
    expect(items[1]).toHaveTextContent("R$ 800,00");
    expect(items[1]).toHaveTextContent("35% das despesas");
  });

  it("mostra a evolução do saldo dos últimos 6 meses terminando no mês selecionado", async () => {
    await renderPage();

    await waitFor(() => expect(evolutionRows()[5]).toHaveTextContent("R$ 1.700,00"));
    const items = evolutionRows();

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
    await waitFor(() => expect(value("Receitas")).toHaveTextContent("R$ 5.000,00"));

    fireEvent.change(screen.getByLabelText("Período"), { target: { value: "2026-09" } });

    expect(value("Receitas")).toHaveTextContent(/^R\$ 2\.000,00$/);
    expect(value("Despesas")).toHaveTextContent(/^−R\$ 800,00$/);
    expect(value("Saldo")).toHaveTextContent(/^R\$ 700,00$/);
    expect(value("Maior despesa")).toHaveTextContent("Viagem");
    expect(value("Categoria líder")).toHaveTextContent("Lazer");
    // 800 / 30 dias = 26,67
    expect(value("Média diária")).toHaveTextContent("R$ 26,67");
    expect(value("Taxa de economia")).toHaveTextContent(/^35%$/);
    expect(value("Movimento do período")).toHaveTextContent("3 lançamentos");

    const evolution = evolutionRows();
    expect(evolution[0]).toHaveTextContent(/abr\.? de 2026/);
    expect(evolution[5]).toHaveTextContent(/set\.? de 2026/);
  });

  it("as setas do período voltam e avançam um mês", async () => {
    const { user } = await renderPage();
    await waitFor(() => expect(value("Receitas")).toHaveTextContent("R$ 5.000,00"));

    await user.click(screen.getByRole("button", { name: "Mês anterior" }));

    expect(screen.getByLabelText("Período")).toHaveValue("2026-09");
    expect(value("Receitas")).toHaveTextContent(/^R\$ 2\.000,00$/);

    await user.click(screen.getByRole("button", { name: "Próximo mês" }));

    expect(screen.getByLabelText("Período")).toHaveValue("2026-10");
    expect(value("Receitas")).toHaveTextContent(/^R\$ 5\.000,00$/);
  });

  it("mês só com despesas mostra 'Sem receitas' e saldo negativo em vermelho", async () => {
    await renderPage({ "GET /api/transactions": [transactions[2]] });

    await waitFor(() => expect(value("Saldo")).toHaveTextContent(/^−R\$ 600,00$/));
    expect(value("Taxa de economia")).toHaveTextContent("Sem receitas");
    expect(evolutionRows()[5].querySelector("[data-tone='out']")).toHaveTextContent("−R$ 600,00");
  });

  it("limpar o período volta para o mês atual", async () => {
    await renderPage();
    fireEvent.change(screen.getByLabelText("Período"), { target: { value: "2026-09" } });

    fireEvent.change(screen.getByLabelText("Período"), { target: { value: "" } });

    expect(screen.getByLabelText("Período")).toHaveValue("2026-10");
    await waitFor(() => expect(value("Receitas")).toHaveTextContent("R$ 5.000,00"));
  });

  it("[regressão de fuso] lançamento de 2026-08-01T00:00Z entra no relatório de agosto, não no de julho", async () => {
    await renderPage({
      "GET /api/transactions": [{ ...transactions[2], id: "tz", date: "2026-08-01T00:00:00.000Z" }],
    });

    fireEvent.change(screen.getByLabelText("Período"), { target: { value: "2026-08" } });
    await waitFor(() => expect(value("Despesas")).toHaveTextContent(/^−R\$ 600,00$/));
    expect(value("Categoria líder")).toHaveTextContent("Alimentação");

    fireEvent.change(screen.getByLabelText("Período"), { target: { value: "2026-07" } });
    expect(value("Despesas")).toHaveTextContent(/^R\$ 0,00$/);
    expect(value("Maior despesa")).toHaveTextContent("Sem dados");
  });

  it("desenha os gráficos de receitas vs despesas e da linha do saldo (sem donut)", async () => {
    await renderPage();

    expect(within(sectionOf("Receitas vs despesas")).getByText("Receitas")).toBeInTheDocument();
    expect(within(sectionOf("Receitas vs despesas")).getByText("Despesas")).toBeInTheDocument();
    expect(sectionOf("Receitas vs despesas").querySelector(".recharts-responsive-container")).not.toBeNull();
    expect(sectionOf("Evolução do saldo").querySelector(".recharts-responsive-container")).not.toBeNull();
    expect(document.querySelectorAll(".recharts-responsive-container")).toHaveLength(2);
  });
});

describe("Página de investimentos", () => {
  beforeEach(() => {
    freezeDate();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  function figure(label: string) {
    return within(screen.getByRole("main")).getByText(label).parentElement as HTMLElement;
  }

  function entryButtons() {
    return within(sectionOf("Aportes")).getAllByRole("button");
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

  it("mostra zeros e o aviso de lista vazia quando não há investimentos", async () => {
    await renderPage({ "GET /api/transactions": transactions.slice(0, 4) });

    expect(screen.getByRole("heading", { name: "Investimentos", level: 1 })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Nenhum aporte registrado ainda.")).toBeInTheDocument());
    expect(screen.getByText("Nenhum aporte registrado.")).toBeInTheDocument();
    expect(figure("Total investido")).toHaveTextContent("R$ 0,00");
    expect(figure("Aportes no mês")).toHaveTextContent("R$ 0,00");
  });

  it("soma o total investido (todo o histórico) e os aportes do mês atual em valor absoluto", async () => {
    await renderPage();

    await waitFor(() => expect(figure("Total investido")).toHaveTextContent("R$ 1.500,00"));
    expect(figure("Aportes no mês")).toHaveTextContent("R$ 1.000,00");
  });

  it("distribui o total por categoria com participação percentual", async () => {
    await renderPage();

    const section = sectionOf("Por categoria");
    await waitFor(() => expect(within(section).getAllByRole("listitem")).toHaveLength(2));
    const items = within(section).getAllByRole("listitem");

    expect(items[0]).toHaveTextContent("Renda fixa");
    expect(items[0]).toHaveTextContent("R$ 1.000,00");
    expect(items[0]).toHaveTextContent("67% do total");
    expect(items[1]).toHaveTextContent("Ações");
    expect(items[1]).toHaveTextContent("33% do total");
  });

  it("lista apenas os lançamentos de investimento, do mais recente para o mais antigo", async () => {
    await renderPage();

    await waitFor(() => expect(sectionOf("Aportes")).toHaveTextContent("2 lançamentos"));
    const buttons = entryButtons();

    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveAccessibleName(/^Tesouro Direto, Renda fixa, -R\$\s1\.000,00\. Editar$/);
    expect(buttons[1]).toHaveAccessibleName(/^Compra de ações, Ações,/);
    expect(buttons[0]).toHaveTextContent("−1.000,00");
    expect(screen.getByRole("heading", { name: "Evolução dos aportes", level: 2 })).toBeInTheDocument();
  });

  it("'Novo aporte' abre a folha já como Investimento e envia valor negativo", async () => {
    const { api, user } = await renderPage({
      "POST /api/transactions": (call) =>
        reply(201, { id: "novo", ...(call.body as object), date: "2026-10-15T00:00:00.000Z" }),
    });
    await waitFor(() => expect(figure("Total investido")).toHaveTextContent("R$ 1.500,00"));

    await user.click(screen.getByRole("button", { name: "Novo aporte" }));
    const modal = getModalByTitle("Novo aporte");
    expect(within(modal).getByRole("radio", { name: "Investimento" })).toHaveAttribute("aria-checked", "true");
    await waitFor(() =>
      expect(within(modal).getByRole("radio", { name: "Renda fixa" })).toHaveAttribute("aria-checked", "true"),
    );
    await user.type(within(modal).getByLabelText("Descrição"), "CDB");
    await user.type(within(modal).getByLabelText("Valor"), "500");
    await user.click(within(modal).getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(queryModalByTitle("Novo aporte")).toBeNull());
    expect(api.callsTo("POST", "/api/transactions")[0].body).toMatchObject({
      description: "CDB",
      amount: -500,
      type: "investment",
      category: "Renda fixa",
      date: "2026-10-15",
    });
    expect(figure("Total investido")).toHaveTextContent("R$ 2.000,00");
    expect(figure("Aportes no mês")).toHaveTextContent("R$ 1.500,00");
    expect(sectionOf("Aportes")).toHaveTextContent("3 lançamentos");
  });

  it("tocar num aporte abre a edição; excluir pede confirmação e atualiza os totais", async () => {
    const { api, user } = await renderPage({ "DELETE /api/transactions/t8": { message: "ok" } });
    await waitFor(() => expect(entryButtons()).toHaveLength(2));

    await user.click(within(sectionOf("Aportes")).getByRole("button", { name: /^Compra de ações,/ }));
    await user.click(within(getModalByTitle("Editar lançamento")).getByRole("button", { name: "Excluir" }));
    await user.click(within(getModalByTitle("Confirmar exclusão")).getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(figure("Total investido")).toHaveTextContent("R$ 1.000,00"));
    expect(api.callsTo("DELETE", "/api/transactions/t8")).toHaveLength(1);
    expect(entryButtons()).toHaveLength(1);
  });

  it("editar um aporte envia PATCH e recalcula o total", async () => {
    const { api, user } = await renderPage({
      "PATCH /api/transactions/t5": (call) =>
        reply(200, { ...transactions[4], ...(call.body as object), date: "2026-10-12T00:00:00.000Z" }),
    });
    await waitFor(() => expect(entryButtons()).toHaveLength(2));

    await user.click(within(sectionOf("Aportes")).getByRole("button", { name: /^Tesouro Direto,/ }));
    const modal = getModalByTitle("Editar lançamento");
    await user.clear(within(modal).getByLabelText("Valor"));
    await user.type(within(modal).getByLabelText("Valor"), "1200");
    await user.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(figure("Total investido")).toHaveTextContent("R$ 1.700,00"));
    expect(api.callsTo("PATCH", "/api/transactions/t5")[0].body).toMatchObject({
      amount: -1200,
      type: "investment",
    });
  });
});
