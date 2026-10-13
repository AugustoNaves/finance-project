import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BudgetsRedirectPage from "@/app/budgets/page";
import PlanningPage from "@/app/planning/page";
import { mockApi, networkError, reply, type ApiRoutes } from "../helpers/api";
import { budgets, categories, goals, transactions } from "../helpers/fixtures";
import { navigationMock } from "../helpers/navigation";
import { freezeDate, getModalByTitle, queryModalByTitle, renderWithProvider } from "../helpers/render";

function card(name: string) {
  const element = screen.getByRole("heading", { name, level: 3 }).closest("article");

  if (!element) throw new Error(`Card "${name}" não encontrado`);

  return element;
}

function metric(cardElement: HTMLElement, label: string) {
  return within(cardElement).getByText(label).parentElement as HTMLElement;
}

function monthFilter() {
  return document.getElementById("planning-month-filter") as HTMLInputElement;
}

function budgetHeadings() {
  const sectionElement = screen.getByRole("heading", { name: /^Orçamentos —/, level: 2 }).closest("section")!;

  return within(sectionElement)
    .queryAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent);
}

async function renderPage(routes: ApiRoutes = {}) {
  const api = mockApi({
    "GET /api/transactions": transactions,
    "GET /api/categories": categories,
    "GET /api/budgets": budgets,
    "GET /api/goals": goals,
    ...routes,
  });
  const utils = renderWithProvider(<PlanningPage />);

  await waitFor(() => expect(api.callsTo("GET", "/api/goals")).toHaveLength(1));
  await waitFor(() => expect(api.callsTo("GET", "/api/transactions")).toHaveLength(1));

  return { api, ...utils };
}

describe("Página de planejamento (orçamentos e metas)", () => {
  beforeEach(() => {
    freezeDate();
  });

  it("mostra estados vazios quando não há orçamentos nem metas", async () => {
    await renderPage({ "GET /api/budgets": [], "GET /api/goals": [] });

    expect(screen.getByRole("heading", { name: "Orçamentos e metas", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Orçamentos — outubro de 2026" })).toBeInTheDocument();
    expect(screen.getByText("0 orçamento(s) neste mês")).toBeInTheDocument();
    expect(screen.getByText("Nenhum orçamento cadastrado para este mês.")).toBeInTheDocument();
    expect(screen.getByText("0 meta(s) em andamento")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma meta cadastrada ainda.")).toBeInTheDocument();
  });

  it("lista só os orçamentos do mês atual, em ordem alfabética de categoria", async () => {
    await renderPage();

    await waitFor(() => expect(budgetHeadings()).toEqual(["Alimentação", "Moradia", "Transporte"]));
    expect(screen.getByText("3 orçamento(s) neste mês")).toBeInTheDocument();
    expect(monthFilter()).toHaveValue("2026-10");
  });

  it("calcula gasto, restante, percentual e status de cada orçamento a partir das despesas do mês", async () => {
    await renderPage();
    await screen.findByRole("heading", { name: "Alimentação", level: 3 });

    // 600 + 200 gastos de um limite de 1.000 => 80% (atenção).
    await waitFor(() => expect(metric(card("Alimentação"), "Gasto")).toHaveTextContent("R$ 800,00"));
    expect(metric(card("Alimentação"), "Limite")).toHaveTextContent("R$ 1.000,00");
    expect(metric(card("Alimentação"), "Restante")).toHaveTextContent("R$ 200,00");
    expect(within(card("Alimentação")).getByText("80%")).toBeInTheDocument();
    expect(card("Alimentação")).toHaveTextContent("Atenção: acima de 80%");
    expect(card("Alimentação")).toHaveTextContent("outubro de 2026");

    // 1.500 gastos de 1.200 => 125% (estourado, restante negativo).
    expect(metric(card("Moradia"), "Gasto")).toHaveTextContent("R$ 1.500,00");
    expect(metric(card("Moradia"), "Restante")).toHaveTextContent("-R$ 300,00");
    expect(within(card("Moradia")).getByText("125%")).toBeInTheDocument();
    expect(card("Moradia")).toHaveTextContent("Limite ultrapassado");
    expect(within(card("Moradia")).getByLabelText("Progresso de 100%")).toBeInTheDocument();

    // Sem gastos em outubro => 0%.
    expect(metric(card("Transporte"), "Gasto")).toHaveTextContent("R$ 0,00");
    expect(within(card("Transporte")).getByText("0%")).toBeInTheDocument();
    expect(card("Transporte")).toHaveTextContent("Dentro do previsto");
  });

  it("só despesas contam como gasto: receitas e investimentos da mesma categoria são ignorados", async () => {
    await renderPage({
      "GET /api/transactions": [
        transactions[2],
        { ...transactions[0], id: "inc", category: "Alimentação" },
        { ...transactions[4], id: "inv", category: "Alimentação" },
      ],
    });
    await screen.findByRole("heading", { name: "Alimentação", level: 3 });

    await waitFor(() => expect(metric(card("Alimentação"), "Gasto")).toHaveTextContent("R$ 600,00"));
  });

  it("troca o mês pelo filtro e volta ao mês atual quando o campo é limpo", async () => {
    await renderPage();
    await waitFor(() => expect(budgetHeadings()).toHaveLength(3));

    fireEvent.change(monthFilter(), { target: { value: "2026-09" } });
    expect(screen.getByRole("heading", { name: "Orçamentos — setembro de 2026" })).toBeInTheDocument();
    expect(budgetHeadings()).toEqual(["Lazer"]);
    expect(metric(card("Lazer"), "Gasto")).toHaveTextContent("R$ 800,00");
    expect(within(card("Lazer")).getByText("40%")).toBeInTheDocument();
    expect(card("Lazer")).toHaveTextContent("Dentro do previsto");

    fireEvent.change(monthFilter(), { target: { value: "2026-07" } });
    expect(screen.getByText("Nenhum orçamento cadastrado para este mês.")).toBeInTheDocument();

    fireEvent.change(monthFilter(), { target: { value: "" } });
    expect(monthFilter()).toHaveValue("2026-10");
    expect(budgetHeadings()).toHaveLength(3);
  });

  it("[regressão de fuso] despesa de 2026-08-01T00:00Z entra no orçamento de agosto", async () => {
    freezeDate("2026-08-15T15:00:00.000Z");
    await renderPage({
      "GET /api/budgets": [{ id: "ba", category: "Moradia", amount: 3000, month: "2026-08" }],
      "GET /api/transactions": [{ ...transactions[1], id: "tz", date: "2026-08-01T00:00:00.000Z" }],
    });
    await screen.findByRole("heading", { name: "Moradia", level: 3 });

    await waitFor(() => expect(metric(card("Moradia"), "Gasto")).toHaveTextContent("R$ 1.500,00"));
    expect(within(card("Moradia")).getByText("50%")).toBeInTheDocument();
  });

  it("cria um orçamento (POST /api/budgets) no mês que está sendo visualizado", async () => {
    const { api, user } = await renderPage({
      "POST /api/budgets": (call) => reply(201, { id: "b9", ...(call.body as object) }),
    });
    await waitFor(() => expect(budgetHeadings()).toHaveLength(3));
    fireEvent.change(monthFilter(), { target: { value: "2026-09" } });

    await user.click(screen.getByRole("button", { name: "+ Novo orçamento" }));
    const modal = getModalByTitle("Novo orçamento");
    expect(within(modal).getByLabelText("Mês")).toHaveValue("2026-09");
    await user.selectOptions(within(modal).getByLabelText("Categoria"), "Moradia");
    await user.type(within(modal).getByLabelText("Limite mensal"), "1800");
    await user.click(within(modal).getByRole("button", { name: "Salvar orçamento" }));

    await waitFor(() => expect(queryModalByTitle("Novo orçamento")).toBeNull());
    expect(api.callsTo("POST", "/api/budgets")[0].body).toEqual({
      category: "Moradia",
      amount: 1800,
      month: "2026-09",
    });
    expect(budgetHeadings()).toEqual(["Lazer", "Moradia"]);
  });

  it("ao criar orçamento para outro mês, a página passa a exibir esse mês", async () => {
    const { user } = await renderPage({
      "POST /api/budgets": (call) => reply(201, { id: "b9", ...(call.body as object) }),
    });
    await waitFor(() => expect(budgetHeadings()).toHaveLength(3));

    await user.click(screen.getByRole("button", { name: "+ Novo orçamento" }));
    const modal = getModalByTitle("Novo orçamento");
    await user.type(within(modal).getByLabelText("Limite mensal"), "700");
    fireEvent.change(within(modal).getByLabelText("Mês"), { target: { value: "2026-11" } });
    await user.click(within(modal).getByRole("button", { name: "Salvar orçamento" }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Orçamentos — novembro de 2026" })).toBeInTheDocument(),
    );
    expect(budgetHeadings()).toEqual(["Alimentação"]);
    expect(monthFilter()).toHaveValue("2026-11");
  });

  it("orçamento duplicado (409) mostra o erro da API no modal, que continua aberto com os valores", async () => {
    const { user } = await renderPage({
      "POST /api/budgets": reply(409, { error: "Já existe um orçamento para esta categoria neste mês." }),
    });
    await waitFor(() => expect(budgetHeadings()).toHaveLength(3));

    await user.click(screen.getByRole("button", { name: "+ Novo orçamento" }));
    const modal = getModalByTitle("Novo orçamento");
    await user.type(within(modal).getByLabelText("Limite mensal"), "700");
    await user.click(within(modal).getByRole("button", { name: "Salvar orçamento" }));

    expect(await within(modal).findByRole("alert")).toHaveTextContent(
      "Já existe um orçamento para esta categoria neste mês.",
    );
    expect(within(modal).getByLabelText("Limite mensal")).toHaveValue(700);
    expect(within(modal).getByLabelText("Categoria")).toHaveValue("Alimentação");
    expect(budgetHeadings()).toHaveLength(3);
  });

  it("edita um orçamento (PATCH /api/budgets/:id) com os campos preenchidos e recalcula o card", async () => {
    const { api, user } = await renderPage({
      "PATCH /api/budgets/b1": (call) => ({ id: "b1", ...(call.body as object) }),
    });
    await screen.findByRole("heading", { name: "Alimentação", level: 3 });

    await user.click(within(card("Alimentação")).getByRole("button", { name: "Editar" }));
    const modal = getModalByTitle("Editar orçamento");
    expect(within(modal).getByLabelText("Categoria")).toHaveValue("Alimentação");
    expect(within(modal).getByLabelText("Limite mensal")).toHaveValue(1000);
    expect(within(modal).getByLabelText("Mês")).toHaveValue("2026-10");

    await user.clear(within(modal).getByLabelText("Limite mensal"));
    await user.type(within(modal).getByLabelText("Limite mensal"), "1600");
    await user.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(queryModalByTitle("Editar orçamento")).toBeNull());
    expect(api.callsTo("PATCH", "/api/budgets/b1")[0].body).toEqual({
      category: "Alimentação",
      amount: 1600,
      month: "2026-10",
    });
    expect(within(card("Alimentação")).getByText("50%")).toBeInTheDocument();
    expect(card("Alimentação")).toHaveTextContent("Dentro do previsto");
  });

  it("falha ao editar orçamento (500) mostra o erro no modal e mantém o valor digitado", async () => {
    const { user } = await renderPage({
      "PATCH /api/budgets/b1": reply(500, { error: "Erro ao atualizar orçamento." }),
    });
    await screen.findByRole("heading", { name: "Alimentação", level: 3 });

    await user.click(within(card("Alimentação")).getByRole("button", { name: "Editar" }));
    const modal = getModalByTitle("Editar orçamento");
    await user.clear(within(modal).getByLabelText("Limite mensal"));
    await user.type(within(modal).getByLabelText("Limite mensal"), "1600");
    await user.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    expect(await within(modal).findByRole("alert")).toHaveTextContent("Erro ao atualizar orçamento.");
    expect(within(modal).getByLabelText("Limite mensal")).toHaveValue(1600);
    expect(metric(card("Alimentação"), "Limite")).toHaveTextContent("R$ 1.000,00");
  });

  it("exclui um orçamento após confirmação (DELETE /api/budgets/:id)", async () => {
    const { api, user } = await renderPage({ "DELETE /api/budgets/b4": { message: "ok" } });
    await screen.findByRole("heading", { name: "Transporte", level: 3 });

    await user.click(within(card("Transporte")).getByRole("button", { name: "Excluir" }));
    const dialog = getModalByTitle("Confirmar exclusão");
    expect(dialog).toHaveTextContent("Tem certeza que deseja excluir o orçamento de Transporte?");
    expect(api.mutations()).toHaveLength(0);
    await user.click(within(dialog).getByRole("button", { name: "Confirmar exclusão" }));

    await waitFor(() => expect(budgetHeadings()).toEqual(["Alimentação", "Moradia"]));
    expect(api.callsTo("DELETE", "/api/budgets/b4")).toHaveLength(1);
    expect(queryModalByTitle("Confirmar exclusão")).toBeNull();
  });

  it("falha ao excluir orçamento mostra o erro no diálogo e mantém o card", async () => {
    const { user } = await renderPage({
      "DELETE /api/budgets/b4": reply(500, { error: "Erro ao deletar orçamento." }),
    });
    await screen.findByRole("heading", { name: "Transporte", level: 3 });

    await user.click(within(card("Transporte")).getByRole("button", { name: "Excluir" }));
    const dialog = getModalByTitle("Confirmar exclusão");
    await user.click(within(dialog).getByRole("button", { name: "Confirmar exclusão" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Erro ao deletar orçamento.");
    expect(budgetHeadings()).toContain("Transporte");
  });

  it("lista as metas com progresso, valores e prazo", async () => {
    await renderPage();
    await screen.findByRole("heading", { name: "Reserva de emergência", level: 3 });

    expect(screen.getByText("2 meta(s) em andamento")).toBeInTheDocument();
    const reserva = card("Reserva de emergência");
    expect(within(reserva).getByText("25%")).toBeInTheDocument();
    expect(metric(reserva, "Atual")).toHaveTextContent("R$ 2.500,00");
    expect(metric(reserva, "Alvo")).toHaveTextContent("R$ 10.000,00");
    expect(metric(reserva, "Restante")).toHaveTextContent("R$ 7.500,00");
    expect(reserva).toHaveTextContent("Prazo: 31/12/2026");

    const notebook = card("Notebook novo");
    expect(within(notebook).getByText("125%")).toBeInTheDocument();
    expect(metric(notebook, "Restante")).toHaveTextContent("R$ 0,00");
    expect(notebook).not.toHaveTextContent("Prazo:");
  });

  it("[comportamento atual] metas concluídas continuam contando em 'meta(s) em andamento'", async () => {
    await renderPage({ "GET /api/goals": [goals[1]] });

    await screen.findByRole("heading", { name: "Notebook novo", level: 3 });
    expect(screen.getByText("1 meta(s) em andamento")).toBeInTheDocument();
  });

  it("[regressão de fuso] meta com prazo 2026-12-31T00:00Z mostra 'Prazo: 31/12/2026'", async () => {
    await renderPage({
      "GET /api/goals": [{ ...goals[0], deadline: "2026-12-31T00:00:00.000Z" }],
    });

    await screen.findByRole("heading", { name: "Reserva de emergência", level: 3 });
    expect(card("Reserva de emergência")).toHaveTextContent("Prazo: 31/12/2026");
  });

  it("cria uma meta (POST /api/goals) e a coloca no início da lista", async () => {
    const { api, user } = await renderPage({
      "POST /api/goals": (call) => reply(201, { id: "g9", ...(call.body as object) }),
    });
    await screen.findByRole("heading", { name: "Reserva de emergência", level: 3 });

    await user.click(screen.getByRole("button", { name: "+ Nova meta" }));
    const modal = getModalByTitle("Nova meta");
    await user.type(within(modal).getByLabelText("Nome da meta"), "Viagem");
    await user.type(within(modal).getByLabelText("Valor alvo"), "8000");
    await user.type(within(modal).getByLabelText("Valor atual"), "2000");
    fireEvent.change(within(modal).getByLabelText("Prazo (opcional)"), { target: { value: "2027-06-30" } });
    await user.click(within(modal).getByRole("button", { name: "Salvar meta" }));

    await waitFor(() => expect(queryModalByTitle("Nova meta")).toBeNull());
    expect(api.callsTo("POST", "/api/goals")[0].body).toEqual({
      name: "Viagem",
      targetAmount: 8000,
      currentAmount: 2000,
      deadline: "2027-06-30T00:00:00.000Z",
      color: "#00c48c",
    });
    expect(screen.getByText("3 meta(s) em andamento")).toBeInTheDocument();
    expect(within(card("Viagem")).getByText("25%")).toBeInTheDocument();
    expect(card("Viagem")).toHaveTextContent("Prazo: 30/06/2027");
    const goalsSection = screen.getByRole("heading", { name: "Metas financeiras" }).closest("section")!;
    expect(within(goalsSection).getAllByRole("heading", { level: 3 })[0]).toHaveTextContent("Viagem");
  });

  it("falha ao criar meta (500) mostra o erro no modal e mantém os valores", async () => {
    const { user } = await renderPage({ "POST /api/goals": reply(500, { error: "Erro ao salvar meta." }) });
    await screen.findByRole("heading", { name: "Reserva de emergência", level: 3 });

    await user.click(screen.getByRole("button", { name: "+ Nova meta" }));
    const modal = getModalByTitle("Nova meta");
    await user.type(within(modal).getByLabelText("Nome da meta"), "Viagem");
    await user.type(within(modal).getByLabelText("Valor alvo"), "8000");
    await user.click(within(modal).getByRole("button", { name: "Salvar meta" }));

    expect(await within(modal).findByRole("alert")).toHaveTextContent("Erro ao salvar meta.");
    expect(within(modal).getByLabelText("Nome da meta")).toHaveValue("Viagem");
    expect(screen.getByText("2 meta(s) em andamento")).toBeInTheDocument();
  });

  it("atualiza o progresso de uma meta (PATCH /api/goals/:id)", async () => {
    const { api, user } = await renderPage({
      "PATCH /api/goals/g1": (call) => ({ id: "g1", ...(call.body as object) }),
    });
    await screen.findByRole("heading", { name: "Reserva de emergência", level: 3 });

    await user.click(
      within(card("Reserva de emergência")).getByRole("button", { name: "Atualizar progresso" }),
    );
    const modal = getModalByTitle("Atualizar meta");
    expect(within(modal).getByLabelText("Nome da meta")).toHaveValue("Reserva de emergência");
    expect(within(modal).getByLabelText("Valor alvo")).toHaveValue(10000);
    expect(within(modal).getByLabelText("Valor atual")).toHaveValue(2500);
    expect(within(modal).getByLabelText("Prazo (opcional)")).toHaveValue("2026-12-31");

    await user.clear(within(modal).getByLabelText("Valor atual"));
    await user.type(within(modal).getByLabelText("Valor atual"), "5000");
    await user.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(queryModalByTitle("Atualizar meta")).toBeNull());
    expect(api.callsTo("PATCH", "/api/goals/g1")[0].body).toEqual({
      name: "Reserva de emergência",
      targetAmount: 10000,
      currentAmount: 5000,
      deadline: "2026-12-31T00:00:00.000Z",
      color: "#00c48c",
    });
    expect(within(card("Reserva de emergência")).getByText("50%")).toBeInTheDocument();
  });

  it("falha ao atualizar meta (500) mostra o erro no modal, mantém os valores e não altera o card", async () => {
    const { user } = await renderPage({
      "PATCH /api/goals/g1": reply(500, { error: "Erro ao atualizar meta." }),
    });
    await screen.findByRole("heading", { name: "Reserva de emergência", level: 3 });

    await user.click(
      within(card("Reserva de emergência")).getByRole("button", { name: "Atualizar progresso" }),
    );
    const modal = getModalByTitle("Atualizar meta");
    await user.clear(within(modal).getByLabelText("Valor atual"));
    await user.type(within(modal).getByLabelText("Valor atual"), "5000");
    await user.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    expect(await within(modal).findByRole("alert")).toHaveTextContent("Erro ao atualizar meta.");
    expect(within(modal).getByLabelText("Valor atual")).toHaveValue(5000);
    expect(within(card("Reserva de emergência")).getByText("25%")).toBeInTheDocument();
  });

  it("exclui uma meta após confirmação (DELETE /api/goals/:id) e mostra erro quando falha", async () => {
    const { api, user } = await renderPage({
      "DELETE /api/goals/g2": reply(500, { error: "Erro ao deletar meta." }),
    });
    await screen.findByRole("heading", { name: "Notebook novo", level: 3 });

    await user.click(within(card("Notebook novo")).getByRole("button", { name: "Excluir" }));
    const dialog = getModalByTitle("Confirmar exclusão");
    expect(dialog).toHaveTextContent("Tem certeza que deseja excluir a meta Notebook novo?");
    await user.click(within(dialog).getByRole("button", { name: "Confirmar exclusão" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Erro ao deletar meta.");

    api.on("DELETE /api/goals/g2", { message: "ok" });
    await user.click(within(dialog).getByRole("button", { name: "Confirmar exclusão" }));

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Notebook novo", level: 3 })).toBeNull());
    expect(api.callsTo("DELETE", "/api/goals/g2")).toHaveLength(2);
    expect(screen.getByText("1 meta(s) em andamento")).toBeInTheDocument();
  });

  it("[comportamento atual] se o carregamento falha, mostra estados vazios sem avisar o usuário", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockApi({ "GET /api/budgets": networkError() });
    renderWithProvider(<PlanningPage />);

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith("Erro ao buscar dados de planejamento:", expect.any(TypeError)),
    );
    expect(screen.getByText("Nenhum orçamento cadastrado para este mês.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("Página /budgets", () => {
  it("redireciona para /planning", () => {
    BudgetsRedirectPage();

    expect(navigationMock.redirect).toHaveBeenCalledWith("/planning");
  });
});
