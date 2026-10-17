import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BudgetsRedirectPage from "@/app/budgets/page";
import PlanningPage from "@/app/planning/page";
import { mockApi, networkError, reply, type ApiRoutes } from "../helpers/api";
import { defaultColor } from "@/components/ColorSwatches";
import { budgets, categories, goals, transactions } from "../helpers/fixtures";
import { navigationMock } from "../helpers/navigation";
import { freezeDate, getModalByTitle, queryModalByTitle, renderWithProvider } from "../helpers/render";

function budgetRow(category: string) {
  return screen.getByRole("button", { name: `Editar orçamento de ${category}` }).closest("li") as HTMLElement;
}

function goalRow(name: string) {
  return screen.getByRole("button", { name: `Editar meta ${name}` }).closest("li") as HTMLElement;
}

function queryGoalRow(name: string) {
  return screen.queryByRole("button", { name: `Editar meta ${name}` });
}

function monthFilter() {
  return document.getElementById("planning-month-filter") as HTMLInputElement;
}

function budgetSection() {
  return screen.getByRole("heading", { name: "Orçamentos", level: 2 }).closest("section")!;
}

function goalSection() {
  return screen.getByRole("heading", { name: "Metas", level: 2 }).closest("section")!;
}

function budgetNames() {
  return within(budgetSection())
    .queryAllByRole("button", { name: /^Editar orçamento de / })
    .map((button) => button.textContent);
}

function goalNames() {
  return within(goalSection())
    .queryAllByRole("button", { name: /^Editar meta / })
    .map((button) => button.textContent);
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

describe("Página Planejar (orçamentos e metas)", () => {
  beforeEach(() => {
    freezeDate();
  });

  it("mostra estados vazios quando não há orçamentos nem metas", async () => {
    await renderPage({ "GET /api/budgets": [], "GET /api/goals": [] });

    expect(screen.getByRole("heading", { name: "Planejar", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("outubro de 2026")).toBeInTheDocument();
    expect(await within(budgetSection()).findByText(/Nenhum orçamento para outubro de 2026\./)).toBeInTheDocument();
    expect(within(goalSection()).getByText(/Nenhuma meta ainda\./)).toBeInTheDocument();
    expect(budgetNames()).toEqual([]);
    expect(goalNames()).toEqual([]);
  });

  it("lista só os orçamentos do mês atual, em ordem alfabética de categoria", async () => {
    await renderPage();

    await waitFor(() => expect(budgetNames()).toEqual(["Alimentação", "Moradia", "Transporte"]));
    expect(monthFilter()).toHaveValue("2026-10");
    expect(screen.getByRole("list", { name: "Orçamentos de outubro de 2026" })).toBeInTheDocument();
  });

  it("calcula gasto de limite, percentual e estado em texto de cada orçamento a partir das despesas do mês", async () => {
    await renderPage();
    await waitFor(() => expect(budgetNames()).toHaveLength(3));

    // 600 + 200 gastos de um limite de 1.000 => 80% (perto do limite).
    await waitFor(() => expect(budgetRow("Alimentação")).toHaveTextContent("800,00 de 1.000,00"));
    expect(within(budgetRow("Alimentação")).getByText("80%")).toBeInTheDocument();
    expect(budgetRow("Alimentação")).toHaveTextContent("Perto do limite · restam R$ 200,00");
    expect(within(budgetRow("Alimentação")).getByRole("progressbar", { name: "Alimentação: 80%" })).toBeInTheDocument();

    // 1.500 gastos de 1.200 => 125% (estourou R$ 300).
    expect(budgetRow("Moradia")).toHaveTextContent("1.500,00 de 1.200,00");
    expect(within(budgetRow("Moradia")).getByText("125%")).toBeInTheDocument();
    expect(budgetRow("Moradia")).toHaveTextContent("Estourou R$ 300,00");
    expect(within(budgetRow("Moradia")).getByRole("progressbar", { name: "Moradia: 100%" })).toBeInTheDocument();

    // Sem gastos em outubro => 0%.
    expect(budgetRow("Transporte")).toHaveTextContent("0,00 de 500,00");
    expect(within(budgetRow("Transporte")).getByText("0%")).toBeInTheDocument();
    expect(budgetRow("Transporte")).toHaveTextContent("Dentro do previsto · restam R$ 500,00");
  });

  it("soma gasto e limite do mês na linha de total", async () => {
    await renderPage();

    await waitFor(() => expect(within(budgetSection()).getByText("Total").parentElement).toHaveTextContent("2.300,00 de 2.700,00"));
  });

  it("só despesas contam como gasto: receitas e investimentos da mesma categoria são ignorados", async () => {
    await renderPage({
      "GET /api/transactions": [
        transactions[2],
        { ...transactions[0], id: "inc", category: "Alimentação" },
        { ...transactions[4], id: "inv", category: "Alimentação" },
      ],
    });

    await waitFor(() => expect(budgetRow("Alimentação")).toHaveTextContent("600,00 de 1.000,00"));
  });

  it("troca o mês pelo campo e volta ao mês atual quando o campo é limpo", async () => {
    await renderPage();
    await waitFor(() => expect(budgetNames()).toHaveLength(3));

    fireEvent.change(monthFilter(), { target: { value: "2026-09" } });
    expect(screen.getByText("setembro de 2026")).toBeInTheDocument();
    expect(budgetNames()).toEqual(["Lazer"]);
    expect(budgetRow("Lazer")).toHaveTextContent("800,00 de 2.000,00");
    expect(within(budgetRow("Lazer")).getByText("40%")).toBeInTheDocument();
    expect(budgetRow("Lazer")).toHaveTextContent("Dentro do previsto");

    fireEvent.change(monthFilter(), { target: { value: "2026-07" } });
    expect(within(budgetSection()).getByText(/Nenhum orçamento para julho de 2026\./)).toBeInTheDocument();

    fireEvent.change(monthFilter(), { target: { value: "" } });
    expect(monthFilter()).toHaveValue("2026-10");
    expect(budgetNames()).toHaveLength(3);
  });

  it("os botões de mês anterior e próximo mudam o mês exibido, inclusive na virada do ano", async () => {
    const { user } = await renderPage();
    await waitFor(() => expect(budgetNames()).toHaveLength(3));

    await user.click(screen.getByRole("button", { name: "Mês anterior" }));
    expect(monthFilter()).toHaveValue("2026-09");
    expect(budgetNames()).toEqual(["Lazer"]);

    await user.click(screen.getByRole("button", { name: "Próximo mês" }));
    await user.click(screen.getByRole("button", { name: "Próximo mês" }));
    await user.click(screen.getByRole("button", { name: "Próximo mês" }));
    await user.click(screen.getByRole("button", { name: "Próximo mês" }));
    expect(monthFilter()).toHaveValue("2027-01");
    expect(screen.getByText("janeiro de 2027")).toBeInTheDocument();
  });

  it("[regressão de fuso] despesa de 2026-08-01T00:00Z entra no orçamento de agosto", async () => {
    freezeDate("2026-08-15T15:00:00.000Z");
    await renderPage({
      "GET /api/budgets": [{ id: "ba", category: "Moradia", amount: 3000, month: "2026-08" }],
      "GET /api/transactions": [{ ...transactions[1], id: "tz", date: "2026-08-01T00:00:00.000Z" }],
    });

    await waitFor(() => expect(budgetRow("Moradia")).toHaveTextContent("1.500,00 de 3.000,00"));
    expect(within(budgetRow("Moradia")).getByText("50%")).toBeInTheDocument();
  });

  it("cria um orçamento (POST /api/budgets) no mês que está sendo visualizado", async () => {
    const { api, user } = await renderPage({
      "POST /api/budgets": (call) => reply(201, { id: "b9", ...(call.body as object) }),
    });
    await waitFor(() => expect(budgetNames()).toHaveLength(3));
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
    expect(budgetNames()).toEqual(["Lazer", "Moradia"]);
  });

  it("ao criar orçamento para outro mês, a página passa a exibir esse mês", async () => {
    const { user } = await renderPage({
      "POST /api/budgets": (call) => reply(201, { id: "b9", ...(call.body as object) }),
    });
    await waitFor(() => expect(budgetNames()).toHaveLength(3));

    await user.click(screen.getByRole("button", { name: "+ Novo orçamento" }));
    const modal = getModalByTitle("Novo orçamento");
    await user.type(within(modal).getByLabelText("Limite mensal"), "700");
    fireEvent.change(within(modal).getByLabelText("Mês"), { target: { value: "2026-11" } });
    await user.click(within(modal).getByRole("button", { name: "Salvar orçamento" }));

    await waitFor(() => expect(screen.getByText("novembro de 2026")).toBeInTheDocument());
    expect(budgetNames()).toEqual(["Alimentação"]);
    expect(monthFilter()).toHaveValue("2026-11");
  });

  it("orçamento duplicado (409) mostra o erro da API no modal, que continua aberto com os valores", async () => {
    const { user } = await renderPage({
      "POST /api/budgets": reply(409, { error: "Já existe um orçamento para esta categoria neste mês." }),
    });
    await waitFor(() => expect(budgetNames()).toHaveLength(3));

    await user.click(screen.getByRole("button", { name: "+ Novo orçamento" }));
    const modal = getModalByTitle("Novo orçamento");
    await user.type(within(modal).getByLabelText("Limite mensal"), "700");
    await user.click(within(modal).getByRole("button", { name: "Salvar orçamento" }));

    expect(await within(modal).findByRole("alert")).toHaveTextContent(
      "Já existe um orçamento para esta categoria neste mês.",
    );
    expect(within(modal).getByLabelText("Limite mensal")).toHaveValue(700);
    expect(within(modal).getByLabelText("Categoria")).toHaveValue("Alimentação");
    expect(budgetNames()).toHaveLength(3);
  });

  it("tocar no orçamento abre a edição (PATCH /api/budgets/:id) com os campos preenchidos e recalcula a linha", async () => {
    const { api, user } = await renderPage({
      "PATCH /api/budgets/b1": (call) => ({ id: "b1", ...(call.body as object) }),
    });
    await waitFor(() => expect(budgetNames()).toHaveLength(3));

    await user.click(screen.getByRole("button", { name: "Editar orçamento de Alimentação" }));
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
    expect(within(budgetRow("Alimentação")).getByText("50%")).toBeInTheDocument();
    expect(budgetRow("Alimentação")).toHaveTextContent("Dentro do previsto");
  });

  it("falha ao editar orçamento (500) mostra o erro no modal e mantém o valor digitado", async () => {
    const { user } = await renderPage({
      "PATCH /api/budgets/b1": reply(500, { error: "Erro ao atualizar orçamento." }),
    });
    await waitFor(() => expect(budgetNames()).toHaveLength(3));

    await user.click(screen.getByRole("button", { name: "Editar orçamento de Alimentação" }));
    const modal = getModalByTitle("Editar orçamento");
    await user.clear(within(modal).getByLabelText("Limite mensal"));
    await user.type(within(modal).getByLabelText("Limite mensal"), "1600");
    await user.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    expect(await within(modal).findByRole("alert")).toHaveTextContent("Erro ao atualizar orçamento.");
    expect(within(modal).getByLabelText("Limite mensal")).toHaveValue(1600);
    expect(budgetRow("Alimentação")).toHaveTextContent("de 1.000,00");
  });

  it("exclui um orçamento pela edição, após confirmação (DELETE /api/budgets/:id)", async () => {
    const { api, user } = await renderPage({ "DELETE /api/budgets/b4": { message: "ok" } });
    await waitFor(() => expect(budgetNames()).toHaveLength(3));

    await user.click(screen.getByRole("button", { name: "Editar orçamento de Transporte" }));
    await user.click(within(getModalByTitle("Editar orçamento")).getByRole("button", { name: "Excluir" }));
    const dialog = getModalByTitle("Confirmar exclusão");
    expect(dialog).toHaveTextContent("Excluir o orçamento de Transporte?");
    expect(api.mutations()).toHaveLength(0);
    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(budgetNames()).toEqual(["Alimentação", "Moradia"]));
    expect(api.callsTo("DELETE", "/api/budgets/b4")).toHaveLength(1);
    expect(queryModalByTitle("Confirmar exclusão")).toBeNull();
    expect(queryModalByTitle("Editar orçamento")).toBeNull();
  });

  it("falha ao excluir orçamento mostra o erro no diálogo e mantém a linha", async () => {
    const { user } = await renderPage({
      "DELETE /api/budgets/b4": reply(500, { error: "Erro ao deletar orçamento." }),
    });
    await waitFor(() => expect(budgetNames()).toHaveLength(3));

    await user.click(screen.getByRole("button", { name: "Editar orçamento de Transporte" }));
    await user.click(within(getModalByTitle("Editar orçamento")).getByRole("button", { name: "Excluir" }));
    const dialog = getModalByTitle("Confirmar exclusão");
    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Erro ao deletar orçamento.");
    expect(budgetNames()).toContain("Transporte");
  });

  it("lista as metas com atual de alvo, progresso, quanto falta e prazo", async () => {
    await renderPage();
    await waitFor(() => expect(goalNames()).toEqual(["Reserva de emergência", "Notebook novo"]));

    const reserva = goalRow("Reserva de emergência");
    expect(reserva).toHaveTextContent("2.500,00 de 10.000,00");
    expect(reserva).toHaveTextContent("25% · faltam R$ 7.500,00 · prazo 31/12/2026");
    expect(within(reserva).getByRole("progressbar", { name: "Reserva de emergência: 25%" })).toBeInTheDocument();

    const notebook = goalRow("Notebook novo");
    expect(notebook).toHaveTextContent("125% · meta alcançada");
    expect(within(notebook).getByRole("progressbar", { name: "Notebook novo: 100%" })).toBeInTheDocument();
    expect(notebook).not.toHaveTextContent("prazo");
  });

  it("[regressão de fuso] meta com prazo 2026-12-31T00:00Z mostra 'prazo 31/12/2026'", async () => {
    await renderPage({
      "GET /api/goals": [{ ...goals[0], deadline: "2026-12-31T00:00:00.000Z" }],
    });

    await waitFor(() => expect(goalRow("Reserva de emergência")).toHaveTextContent("prazo 31/12/2026"));
  });

  it("cria uma meta (POST /api/goals) e a coloca no início da lista", async () => {
    const { api, user } = await renderPage({
      "POST /api/goals": (call) => reply(201, { id: "g9", ...(call.body as object) }),
    });
    await waitFor(() => expect(goalNames()).toHaveLength(2));

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
      color: defaultColor,
    });
    expect(goalNames()).toEqual(["Viagem", "Reserva de emergência", "Notebook novo"]);
    expect(goalRow("Viagem")).toHaveTextContent("25% · faltam R$ 6.000,00 · prazo 30/06/2027");
  });

  it("falha ao criar meta (500) mostra o erro no modal e mantém os valores", async () => {
    const { user } = await renderPage({ "POST /api/goals": reply(500, { error: "Erro ao salvar meta." }) });
    await waitFor(() => expect(goalNames()).toHaveLength(2));

    await user.click(screen.getByRole("button", { name: "+ Nova meta" }));
    const modal = getModalByTitle("Nova meta");
    await user.type(within(modal).getByLabelText("Nome da meta"), "Viagem");
    await user.type(within(modal).getByLabelText("Valor alvo"), "8000");
    await user.click(within(modal).getByRole("button", { name: "Salvar meta" }));

    expect(await within(modal).findByRole("alert")).toHaveTextContent("Erro ao salvar meta.");
    expect(within(modal).getByLabelText("Nome da meta")).toHaveValue("Viagem");
    expect(goalNames()).toHaveLength(2);
  });

  it("atualiza o progresso de uma meta (PATCH /api/goals/:id)", async () => {
    const { api, user } = await renderPage({
      "PATCH /api/goals/g1": (call) => ({ id: "g1", ...(call.body as object) }),
    });
    await waitFor(() => expect(goalNames()).toHaveLength(2));

    await user.click(
      within(goalRow("Reserva de emergência")).getByRole("button", { name: "Atualizar progresso de Reserva de emergência" }),
    );
    const modal = getModalByTitle("Atualizar progresso");
    expect(within(modal).getByLabelText("Nome da meta")).toHaveValue("Reserva de emergência");
    expect(within(modal).getByLabelText("Valor alvo")).toHaveValue(10000);
    expect(within(modal).getByLabelText("Valor atual")).toHaveValue(2500);
    expect(within(modal).getByLabelText("Prazo (opcional)")).toHaveValue("2026-12-31");

    await user.clear(within(modal).getByLabelText("Valor atual"));
    await user.type(within(modal).getByLabelText("Valor atual"), "5000");
    await user.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(queryModalByTitle("Atualizar progresso")).toBeNull());
    expect(api.callsTo("PATCH", "/api/goals/g1")[0].body).toEqual({
      name: "Reserva de emergência",
      targetAmount: 10000,
      currentAmount: 5000,
      deadline: "2026-12-31T00:00:00.000Z",
      color: "#00c48c",
    });
    expect(goalRow("Reserva de emergência")).toHaveTextContent("50% · faltam R$ 5.000,00");
  });

  it("tocar na meta abre a edição completa", async () => {
    const { api, user } = await renderPage({
      "PATCH /api/goals/g2": (call) => ({ id: "g2", ...(call.body as object) }),
    });
    await waitFor(() => expect(goalNames()).toHaveLength(2));

    await user.click(screen.getByRole("button", { name: "Editar meta Notebook novo" }));
    const modal = getModalByTitle("Editar meta");
    expect(within(modal).getByLabelText("Nome da meta")).toHaveValue("Notebook novo");

    await user.clear(within(modal).getByLabelText("Nome da meta"));
    await user.type(within(modal).getByLabelText("Nome da meta"), "Notebook");
    await user.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(queryModalByTitle("Editar meta")).toBeNull());
    expect(api.callsTo("PATCH", "/api/goals/g2")[0].body).toMatchObject({ name: "Notebook" });
    expect(goalNames()).toEqual(["Reserva de emergência", "Notebook"]);
  });

  it("falha ao atualizar meta (500) mostra o erro no modal, mantém os valores e não altera a linha", async () => {
    const { user } = await renderPage({
      "PATCH /api/goals/g1": reply(500, { error: "Erro ao atualizar meta." }),
    });
    await waitFor(() => expect(goalNames()).toHaveLength(2));

    await user.click(screen.getByRole("button", { name: "Atualizar progresso de Reserva de emergência" }));
    const modal = getModalByTitle("Atualizar progresso");
    await user.clear(within(modal).getByLabelText("Valor atual"));
    await user.type(within(modal).getByLabelText("Valor atual"), "5000");
    await user.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    expect(await within(modal).findByRole("alert")).toHaveTextContent("Erro ao atualizar meta.");
    expect(within(modal).getByLabelText("Valor atual")).toHaveValue(5000);
    expect(goalRow("Reserva de emergência")).toHaveTextContent("25%");
  });

  it("exclui uma meta após confirmação (DELETE /api/goals/:id) e mostra erro quando falha", async () => {
    const { api, user } = await renderPage({
      "DELETE /api/goals/g2": reply(500, { error: "Erro ao deletar meta." }),
    });
    await waitFor(() => expect(goalNames()).toHaveLength(2));

    await user.click(within(goalRow("Notebook novo")).getByRole("button", { name: "Excluir meta Notebook novo" }));
    const dialog = getModalByTitle("Confirmar exclusão");
    expect(dialog).toHaveTextContent("Excluir a meta Notebook novo?");
    expect(api.mutations()).toHaveLength(0);
    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Erro ao deletar meta.");

    api.on("DELETE /api/goals/g2", { message: "ok" });
    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(queryGoalRow("Notebook novo")).toBeNull());
    expect(api.callsTo("DELETE", "/api/goals/g2")).toHaveLength(2);
    expect(goalNames()).toEqual(["Reserva de emergência"]);
  });

  it("se o carregamento falha, avisa o usuário e mostra os estados vazios", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockApi({ "GET /api/budgets": networkError() });
    renderWithProvider(<PlanningPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar orçamentos e metas.");
    expect(consoleError).toHaveBeenCalledWith("Erro ao buscar dados de planejamento:", expect.any(TypeError));
    expect(within(budgetSection()).getByText(/Nenhum orçamento para outubro de 2026\./)).toBeInTheDocument();
  });
});

describe("Página /budgets", () => {
  it("redireciona para /planning", () => {
    BudgetsRedirectPage();

    expect(navigationMock.redirect).toHaveBeenCalledWith("/planning");
  });
});
