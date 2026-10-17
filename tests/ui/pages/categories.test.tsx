import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CategoriesPage from "@/app/categories/page";
import { mockApi, networkError, reply, type ApiRoutes } from "../helpers/api";
import { categories, transactions } from "../helpers/fixtures";
import { freezeDate, getModalByTitle, queryModalByTitle, renderWithProvider } from "../helpers/render";

function tab(label: string) {
  return screen.getByRole("tab", { name: new RegExp(`^${label} \\d+$`) });
}

function panel() {
  return screen.getByRole("tabpanel");
}

function rowPattern(name: string) {
  return new RegExp(`^${name}, `);
}

function row(name: string, scope: HTMLElement = document.body) {
  return within(scope).getByRole("button", { name: rowPattern(name) });
}

function queryRow(name: string, scope: HTMLElement = document.body) {
  return within(scope).queryByRole("button", { name: rowPattern(name) });
}

function rowNames() {
  return within(panel())
    .getAllByRole("listitem")
    .map((item) => item.querySelector("button")?.getAttribute("aria-label")?.split(",")[0]);
}

async function renderPage(routes: ApiRoutes = {}) {
  const api = mockApi({
    "GET /api/transactions": transactions,
    "GET /api/categories": categories,
    ...routes,
  });
  const utils = renderWithProvider(<CategoriesPage />);

  await waitFor(() => expect(api.callsTo("GET", "/api/categories")).toHaveLength(1));
  await waitFor(() => expect(api.callsTo("GET", "/api/transactions")).toHaveLength(1));

  return { api, ...utils };
}

describe("Página de categorias", () => {
  beforeEach(() => {
    freezeDate();
  });

  it("mostra estados vazios por tipo quando não há categorias", async () => {
    const { user } = await renderPage({ "GET /api/categories": [] });

    expect(screen.getByRole("heading", { name: "Categorias e regras", level: 1 })).toBeInTheDocument();
    expect(tab("Gastos")).toHaveAttribute("aria-selected", "true");
    expect(tab("Gastos")).toHaveTextContent("Gastos 0");
    expect(tab("Receitas")).toHaveTextContent("Receitas 0");
    expect(tab("Investimentos")).toHaveTextContent("Investimentos 0");
    expect(panel()).toHaveTextContent("Nenhuma categoria de gasto ainda.");

    await user.click(tab("Receitas"));
    expect(panel()).toHaveTextContent("Nenhuma categoria de receita ainda.");

    await user.click(tab("Investimentos"));
    expect(panel()).toHaveTextContent("Nenhuma categoria de investimento ainda.");
  });

  it("separa as categorias em abas Gastos, Receitas e Investimentos com contagem", async () => {
    const { user } = await renderPage();

    await waitFor(() => expect(tab("Gastos")).toHaveTextContent("Gastos 2"));
    expect(tab("Receitas")).toHaveTextContent("Receitas 1");
    expect(tab("Investimentos")).toHaveTextContent("Investimentos 1");
    expect(panel()).toHaveAttribute("aria-labelledby", tab("Gastos").id);
    expect(within(panel()).getByRole("heading", { name: "Gastos em outubro de 2026", level: 2 })).toBeInTheDocument();
    expect(rowNames()).toEqual(["Alimentação", "Moradia"]);

    await user.click(tab("Receitas"));
    expect(tab("Receitas")).toHaveAttribute("aria-selected", "true");
    expect(tab("Gastos")).toHaveAttribute("aria-selected", "false");
    expect(rowNames()).toEqual(["Salário"]);

    await user.click(tab("Investimentos"));
    expect(rowNames()).toEqual(["Renda fixa"]);
  });

  it("navega entre as abas com as setas do teclado", async () => {
    const { user } = await renderPage();

    tab("Gastos").focus();
    await user.keyboard("{ArrowRight}");
    expect(tab("Receitas")).toHaveFocus();
    expect(tab("Receitas")).toHaveAttribute("aria-selected", "true");
    expect(tab("Receitas")).toHaveAttribute("tabindex", "0");
    expect(tab("Gastos")).toHaveAttribute("tabindex", "-1");

    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(tab("Regras")).toHaveFocus();
    expect(screen.getByRole("heading", { name: "Regras de importação", level: 2 })).toBeInTheDocument();
  });

  it("cada linha tem o ponto com a cor da categoria", async () => {
    await renderPage();

    const dot = row("Alimentação").querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(dot.style.background).toBe("rgb(247, 90, 104)");
  });

  it("calcula quantidade e total dos lançamentos do mês corrente por categoria", async () => {
    const { user } = await renderPage();

    await waitFor(() => expect(row("Alimentação")).toHaveTextContent("R$ 800,00"));
    expect(row("Alimentação")).toHaveTextContent("2 lançamentos");
    expect(row("Moradia")).toHaveTextContent("R$ 1.500,00");
    expect(row("Moradia")).toHaveTextContent("1 lançamento");

    await user.click(tab("Receitas"));
    expect(row("Salário")).toHaveTextContent("R$ 5.000,00");

    await user.click(tab("Investimentos"));
    expect(row("Renda fixa")).toHaveTextContent("R$ 1.000,00");
  });

  it("ignora lançamentos de outros meses nas métricas", async () => {
    freezeDate("2026-11-15T15:00:00.000Z");
    await renderPage();

    await waitFor(() => expect(row("Alimentação")).toBeInTheDocument());
    expect(row("Alimentação")).toHaveTextContent("Nenhum lançamento");
    expect(row("Alimentação")).toHaveTextContent("R$ 0,00");
  });

  it("[regressão de fuso] lançamento de 2026-08-01T00:00Z conta em agosto", async () => {
    freezeDate("2026-08-15T15:00:00.000Z");
    await renderPage({
      "GET /api/transactions": [{ ...transactions[1], id: "tz", date: "2026-08-01T00:00:00.000Z" }],
    });

    await waitFor(() => expect(row("Moradia")).toHaveTextContent("1 lançamento"));
    expect(row("Moradia")).toHaveTextContent("R$ 1.500,00");
  });

  it("[regressão de fuso] o mesmo lançamento NÃO conta em julho", async () => {
    freezeDate("2026-07-31T15:00:00.000Z");
    await renderPage({
      "GET /api/transactions": [{ ...transactions[1], id: "tz", date: "2026-08-01T00:00:00.000Z" }],
    });

    await waitFor(() => expect(row("Moradia")).toBeInTheDocument());
    expect(row("Moradia")).toHaveTextContent("Nenhum lançamento");
  });

  it("as métricas casam por nome E tipo: receita com o mesmo nome não entra na categoria de gasto", async () => {
    const { user } = await renderPage({
      "GET /api/categories": [
        ...categories,
        { id: "c8", name: "Alimentação", type: "income", color: null, icon: null },
      ],
      "GET /api/transactions": [
        transactions[2],
        { ...transactions[0], id: "x", category: "Alimentação", amount: 300 },
      ],
    });

    await waitFor(() => expect(row("Alimentação")).toHaveTextContent("R$ 600,00"));
    expect(row("Alimentação")).toHaveTextContent("1 lançamento");

    await user.click(tab("Receitas"));
    expect(row("Alimentação")).toHaveTextContent("R$ 300,00");
    expect(row("Alimentação")).toHaveTextContent("1 lançamento");
  });

  it("cria uma categoria (POST /api/categories) e mostra a aba do seu tipo", async () => {
    const { api, user } = await renderPage({
      "POST /api/categories": (call) => reply(201, { id: "c9", icon: null, ...(call.body as object) }),
    });

    await user.click(screen.getByRole("button", { name: "Nova categoria" }));
    const modal = getModalByTitle("Nova categoria");
    expect(within(modal).getByRole("radio", { name: "Gasto" })).toBeChecked();
    await user.type(within(modal).getByLabelText("Nome"), "Freelance");
    await user.click(within(modal).getByRole("radio", { name: "Receita" }));
    await user.click(within(modal).getByRole("radio", { name: "Azul" }));
    await user.click(within(modal).getByRole("button", { name: "Salvar categoria" }));

    await waitFor(() => expect(queryModalByTitle("Nova categoria")).toBeNull());
    expect(api.callsTo("POST", "/api/categories")[0].body).toEqual({
      name: "Freelance",
      type: "income",
      color: "#4a78ad",
      icon: null,
    });
    expect(tab("Receitas")).toHaveAttribute("aria-selected", "true");
    expect(tab("Receitas")).toHaveTextContent("Receitas 2");
    expect(row("Freelance", panel())).toBeInTheDocument();
  });

  it("o formulário de nova categoria já vem com o tipo da aba aberta", async () => {
    const { user } = await renderPage();

    await user.click(tab("Investimentos"));
    await user.click(screen.getByRole("button", { name: "Nova categoria" }));

    expect(within(getModalByTitle("Nova categoria")).getByRole("radio", { name: "Investimento" })).toBeChecked();
  });

  it("a aba Regras não oferece criar categoria", async () => {
    const { user } = await renderPage();

    await user.click(tab("Regras"));

    expect(screen.queryByRole("button", { name: "Nova categoria" })).toBeNull();
  });

  it("quando a criação falha (409) mostra o erro da API no modal, que continua aberto com os valores", async () => {
    const { user } = await renderPage({
      "POST /api/categories": reply(409, { error: "Categoria já existe." }),
    });

    await user.click(screen.getByRole("button", { name: "Nova categoria" }));
    const modal = getModalByTitle("Nova categoria");
    await user.type(within(modal).getByLabelText("Nome"), "Moradia");
    await user.click(within(modal).getByRole("button", { name: "Salvar categoria" }));

    expect(await within(modal).findByRole("alert")).toHaveTextContent("Categoria já existe.");
    expect(queryModalByTitle("Nova categoria")).not.toBeNull();
    expect(within(modal).getByLabelText("Nome")).toHaveValue("Moradia");
    expect(tab("Gastos")).toHaveTextContent("Gastos 2");
  });

  it("quando a edição falha (500) mostra o erro da API no modal e mantém os valores", async () => {
    const { user } = await renderPage({
      "PATCH /api/categories/c1": reply(500, { error: "Erro ao atualizar." }),
    });

    await user.click(row("Alimentação"));
    const modal = getModalByTitle("Editar categoria");
    await user.clear(within(modal).getByLabelText("Nome"));
    await user.type(within(modal).getByLabelText("Nome"), "Comida");
    await user.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    expect(await within(modal).findByRole("alert")).toHaveTextContent("Erro ao atualizar.");
    expect(within(modal).getByLabelText("Nome")).toHaveValue("Comida");
    expect(row("Alimentação", panel())).toBeInTheDocument();
  });

  it("tocar na linha abre a edição (PATCH /api/categories/:id) com os campos preenchidos", async () => {
    const { api, user } = await renderPage({
      "PATCH /api/categories/c1": (call) => ({ ...categories[0], ...(call.body as object) }),
    });

    await user.click(row("Alimentação"));

    const modal = getModalByTitle("Editar categoria");
    expect(within(modal).getByLabelText("Nome")).toHaveValue("Alimentação");
    expect(within(modal).getByRole("radio", { name: "Gasto" })).toBeChecked();
    expect(within(modal).getByLabelText("Cor personalizada")).toHaveValue("#f75a68");
    expect(within(modal).getByLabelText("Ícone simples")).toHaveValue("food");

    await user.clear(within(modal).getByLabelText("Nome"));
    await user.type(within(modal).getByLabelText("Nome"), "Comida");
    await user.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(queryModalByTitle("Editar categoria")).toBeNull());
    expect(api.callsTo("PATCH", "/api/categories/c1")[0].body).toEqual({
      name: "Comida",
      type: "outcome",
      color: "#f75a68",
      icon: "food",
    });
    expect(row("Comida")).toBeInTheDocument();
    expect(queryRow("Alimentação")).toBeNull();
  });

  it("mudar o tipo na edição move a categoria para a outra aba", async () => {
    const { user } = await renderPage({
      "PATCH /api/categories/c2": (call) => ({ ...categories[1], ...(call.body as object) }),
    });

    await user.click(row("Moradia"));
    const modal = getModalByTitle("Editar categoria");
    await user.click(within(modal).getByRole("radio", { name: "Receita" }));
    await user.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(queryModalByTitle("Editar categoria")).toBeNull());
    expect(queryRow("Moradia")).toBeNull();
    expect(tab("Gastos")).toHaveTextContent("Gastos 1");
    expect(tab("Receitas")).toHaveTextContent("Receitas 2");
  });

  it("[bug] renomear a categoria zera as métricas: os lançamentos continuam com o nome antigo", async () => {
    const { user } = await renderPage({
      "PATCH /api/categories/c1": (call) => ({ ...categories[0], ...(call.body as object) }),
    });

    await user.click(row("Alimentação"));
    const modal = getModalByTitle("Editar categoria");
    await user.clear(within(modal).getByLabelText("Nome"));
    await user.type(within(modal).getByLabelText("Nome"), "Comida");
    await user.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(row("Comida")).toBeInTheDocument());
    expect(row("Comida")).toHaveTextContent("Nenhum lançamento");
  });

  it("exclui pela edição, após confirmação citando o nome (DELETE /api/categories/:id)", async () => {
    const { api, user } = await renderPage({ "DELETE /api/categories/c2": { message: "ok" } });

    await user.click(row("Moradia"));
    await user.click(within(getModalByTitle("Editar categoria")).getByRole("button", { name: "Excluir" }));

    const dialog = getModalByTitle("Confirmar exclusão");
    expect(dialog).toHaveTextContent("Excluir a categoria Moradia?");
    expect(api.mutations()).toHaveLength(0);

    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(queryRow("Moradia")).toBeNull());
    expect(api.callsTo("DELETE", "/api/categories/c2")).toHaveLength(1);
    expect(tab("Gastos")).toHaveTextContent("Gastos 1");
    expect(queryModalByTitle("Confirmar exclusão")).toBeNull();
    expect(queryModalByTitle("Editar categoria")).toBeNull();
  });

  it("cancelar a exclusão mantém a categoria e a edição aberta", async () => {
    const { api, user } = await renderPage();

    await user.click(row("Moradia"));
    await user.click(within(getModalByTitle("Editar categoria")).getByRole("button", { name: "Excluir" }));
    await user.click(
      within(getModalByTitle("Confirmar exclusão")).getByRole("button", { name: "Cancelar" }),
    );

    expect(queryModalByTitle("Confirmar exclusão")).toBeNull();
    expect(queryModalByTitle("Editar categoria")).not.toBeNull();
    expect(api.mutations()).toHaveLength(0);
    expect(row("Moradia", panel())).toBeInTheDocument();
  });

  it("quando a exclusão falha mostra o erro da API no diálogo, que continua aberto", async () => {
    const { api, user } = await renderPage({
      "DELETE /api/categories/c2": reply(500, { error: "Erro ao deletar." }),
    });

    await user.click(row("Moradia"));
    await user.click(within(getModalByTitle("Editar categoria")).getByRole("button", { name: "Excluir" }));
    const dialog = getModalByTitle("Confirmar exclusão");
    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(api.callsTo("DELETE", "/api/categories/c2")).toHaveLength(1));
    expect(queryModalByTitle("Confirmar exclusão")).not.toBeNull();
    expect(row("Moradia", panel())).toBeInTheDocument();
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Erro ao deletar.");
  });

  it("avisa quando as categorias não carregam", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockApi({ "GET /api/categories": networkError(), "GET /api/transactions": transactions });
    renderWithProvider(<CategoriesPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar as categorias.");
  });
});
