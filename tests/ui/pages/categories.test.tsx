import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import CategoriesPage from "@/app/categories/page";
import { mockApi, reply, type ApiRoutes } from "../helpers/api";
import { categories, transactions } from "../helpers/fixtures";
import { freezeDate, getModalByTitle, queryModalByTitle, renderWithProvider } from "../helpers/render";

function section(title: string) {
  const element = screen.getByRole("heading", { name: title, level: 2 }).closest("section");

  if (!element) throw new Error(`Seção "${title}" não encontrada`);

  return element;
}

function card(name: string) {
  const element = screen.getByRole("heading", { name, level: 3 }).closest("article");

  if (!element) throw new Error(`Card "${name}" não encontrado`);

  return element;
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
    await renderPage({ "GET /api/categories": [] });

    expect(screen.getByRole("heading", { name: "Organize seus grupos", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Nenhuma categoria de despesa cadastrada.")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma categoria de receita cadastrada.")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma categoria de investimento cadastrada.")).toBeInTheDocument();
    expect(screen.getAllByText("0 categoria(s)")).toHaveLength(3);
  });

  it("agrupa as categorias em Despesas, Receitas e Investimentos com contagem", async () => {
    await renderPage();

    await screen.findByRole("heading", { name: "Alimentação", level: 3 });
    expect(section("Despesas")).toHaveTextContent("2 categoria(s)");
    expect(within(section("Despesas")).getAllByRole("article")).toHaveLength(2);
    expect(section("Receitas")).toHaveTextContent("1 categoria(s)");
    expect(within(section("Receitas")).getByRole("heading", { name: "Salário" })).toBeInTheDocument();
    expect(section("Investimentos")).toHaveTextContent("1 categoria(s)");
    expect(within(section("Investimentos")).getByRole("heading", { name: "Renda fixa" })).toBeInTheDocument();
  });

  it("calcula quantidade e total das transações do mês corrente por categoria", async () => {
    await renderPage();

    await waitFor(() =>
      expect(within(card("Alimentação")).getByText("Total no mês").parentElement).toHaveTextContent("R$ 800,00"),
    );
    expect(within(card("Alimentação")).getByText("Transações no mês").parentElement).toHaveTextContent("2");
    expect(within(card("Moradia")).getByText("Total no mês").parentElement).toHaveTextContent("R$ 1.500,00");
    expect(within(card("Salário")).getByText("Total no mês").parentElement).toHaveTextContent("R$ 5.000,00");
    expect(within(card("Renda fixa")).getByText("Total no mês").parentElement).toHaveTextContent("R$ 1.000,00");
  });

  it("ignora transações de outros meses nas métricas", async () => {
    freezeDate("2026-11-15T15:00:00.000Z");
    await renderPage();

    await screen.findByRole("heading", { name: "Alimentação", level: 3 });
    expect(within(card("Alimentação")).getByText("Transações no mês").parentElement).toHaveTextContent("0");
    expect(within(card("Alimentação")).getByText("Total no mês").parentElement).toHaveTextContent("R$ 0,00");
  });

  it("[regressão de fuso] transação de 2026-08-01T00:00Z conta em agosto", async () => {
    freezeDate("2026-08-15T15:00:00.000Z");
    await renderPage({
      "GET /api/transactions": [{ ...transactions[1], id: "tz", date: "2026-08-01T00:00:00.000Z" }],
    });

    await waitFor(() =>
      expect(within(card("Moradia")).getByText("Transações no mês").parentElement).toHaveTextContent("1"),
    );
    expect(within(card("Moradia")).getByText("Total no mês").parentElement).toHaveTextContent("R$ 1.500,00");
  });

  it("[regressão de fuso] a mesma transação NÃO conta em julho", async () => {
    freezeDate("2026-07-31T15:00:00.000Z");
    await renderPage({
      "GET /api/transactions": [{ ...transactions[1], id: "tz", date: "2026-08-01T00:00:00.000Z" }],
    });

    await screen.findByRole("heading", { name: "Moradia", level: 3 });
    expect(within(card("Moradia")).getByText("Transações no mês").parentElement).toHaveTextContent("0");
  });

  it("as métricas casam por nome E tipo: receita com o mesmo nome não entra na categoria de despesa", async () => {
    await renderPage({
      "GET /api/categories": [
        ...categories,
        { id: "c8", name: "Alimentação", type: "income", color: null, icon: null },
      ],
      "GET /api/transactions": [
        transactions[2],
        { ...transactions[0], id: "x", category: "Alimentação", amount: 300 },
      ],
    });

    await waitFor(() => expect(screen.getAllByRole("heading", { name: "Alimentação", level: 3 })).toHaveLength(2));
    const outcomeCard = within(section("Despesas")).getByRole("heading", { name: "Alimentação" }).closest("article")!;
    const incomeCard = within(section("Receitas")).getByRole("heading", { name: "Alimentação" }).closest("article")!;

    await waitFor(() =>
      expect(within(outcomeCard).getByText("Total no mês").parentElement).toHaveTextContent("R$ 600,00"),
    );
    expect(within(outcomeCard).getByText("Transações no mês").parentElement).toHaveTextContent("1");
    expect(within(incomeCard).getByText("Total no mês").parentElement).toHaveTextContent("R$ 300,00");
    expect(within(incomeCard).getByText("Transações no mês").parentElement).toHaveTextContent("1");
  });

  it("cria uma categoria (POST /api/categories) e a coloca na seção do seu tipo", async () => {
    const { api, user } = await renderPage({
      "POST /api/categories": (call) => reply(201, { id: "c9", icon: null, ...(call.body as object) }),
    });

    await user.click(screen.getByRole("button", { name: "+ Nova Categoria" }));
    const modal = getModalByTitle("Nova categoria");
    await user.type(within(modal).getByLabelText("Nome"), "Freelance");
    await user.selectOptions(within(modal).getByLabelText("Tipo"), "Receita");
    await user.click(within(modal).getByRole("button", { name: "Salvar categoria" }));

    await waitFor(() => expect(queryModalByTitle("Nova categoria")).toBeNull());
    expect(api.callsTo("POST", "/api/categories")[0].body).toEqual({
      name: "Freelance",
      type: "income",
      color: "#00c48c",
      icon: null,
    });
    expect(within(section("Receitas")).getByRole("heading", { name: "Freelance" })).toBeInTheDocument();
    expect(section("Receitas")).toHaveTextContent("2 categoria(s)");
  });

  it("quando a criação falha (409) mostra o erro da API no modal, que continua aberto com os valores", async () => {
    const { user } = await renderPage({
      "POST /api/categories": reply(409, { error: "Categoria já existe." }),
    });

    await user.click(screen.getByRole("button", { name: "+ Nova Categoria" }));
    const modal = getModalByTitle("Nova categoria");
    await user.type(within(modal).getByLabelText("Nome"), "Moradia");
    await user.click(within(modal).getByRole("button", { name: "Salvar categoria" }));

    expect(await within(modal).findByRole("alert")).toHaveTextContent("Categoria já existe.");
    expect(queryModalByTitle("Nova categoria")).not.toBeNull();
    expect(within(modal).getByLabelText("Nome")).toHaveValue("Moradia");
    expect(section("Despesas")).toHaveTextContent("2 categoria(s)");
  });

  it("quando a edição falha (500) mostra o erro da API no modal e mantém os valores", async () => {
    const { user } = await renderPage({
      "PATCH /api/categories/c1": reply(500, { error: "Erro ao atualizar." }),
    });

    await screen.findByRole("heading", { name: "Alimentação", level: 3 });
    await user.click(within(card("Alimentação")).getByRole("button", { name: "Editar" }));
    const modal = getModalByTitle("Editar categoria");
    await user.clear(within(modal).getByLabelText("Nome"));
    await user.type(within(modal).getByLabelText("Nome"), "Comida");
    await user.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    expect(await within(modal).findByRole("alert")).toHaveTextContent("Erro ao atualizar.");
    expect(within(modal).getByLabelText("Nome")).toHaveValue("Comida");
    expect(screen.getByRole("heading", { name: "Alimentação", level: 3 })).toBeInTheDocument();
  });

  it("edita uma categoria (PATCH /api/categories/:id) com os campos preenchidos", async () => {
    const { api, user } = await renderPage({
      "PATCH /api/categories/c1": (call) => ({ ...categories[0], ...(call.body as object) }),
    });

    await screen.findByRole("heading", { name: "Alimentação", level: 3 });
    await user.click(within(card("Alimentação")).getByRole("button", { name: "Editar" }));

    const modal = getModalByTitle("Editar categoria");
    expect(within(modal).getByLabelText("Nome")).toHaveValue("Alimentação");
    expect(within(modal).getByLabelText("Tipo")).toHaveValue("outcome");
    expect(within(modal).getByLabelText("Cor")).toHaveValue("#f75a68");
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
    expect(screen.getByRole("heading", { name: "Comida", level: 3 })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Alimentação", level: 3 })).toBeNull();
  });

  it("[bug] renomear a categoria zera as métricas: as transações continuam com o nome antigo", async () => {
    const { user } = await renderPage({
      "PATCH /api/categories/c1": (call) => ({ ...categories[0], ...(call.body as object) }),
    });

    await screen.findByRole("heading", { name: "Alimentação", level: 3 });
    await user.click(within(card("Alimentação")).getByRole("button", { name: "Editar" }));
    const modal = getModalByTitle("Editar categoria");
    await user.clear(within(modal).getByLabelText("Nome"));
    await user.type(within(modal).getByLabelText("Nome"), "Comida");
    await user.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    await screen.findByRole("heading", { name: "Comida", level: 3 });
    expect(within(card("Comida")).getByText("Transações no mês").parentElement).toHaveTextContent("0");
  });

  it("exclui uma categoria após confirmação citando o nome (DELETE /api/categories/:id)", async () => {
    const { api, user } = await renderPage({ "DELETE /api/categories/c2": { message: "ok" } });

    await screen.findByRole("heading", { name: "Moradia", level: 3 });
    await user.click(within(card("Moradia")).getByRole("button", { name: "Excluir" }));

    const dialog = getModalByTitle("Confirmar exclusão");
    expect(dialog).toHaveTextContent("Tem certeza que deseja excluir a categoria Moradia?");
    expect(api.mutations()).toHaveLength(0);

    await user.click(within(dialog).getByRole("button", { name: "Confirmar exclusão" }));

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Moradia", level: 3 })).toBeNull());
    expect(api.callsTo("DELETE", "/api/categories/c2")).toHaveLength(1);
    expect(section("Despesas")).toHaveTextContent("1 categoria(s)");
    expect(queryModalByTitle("Confirmar exclusão")).toBeNull();
  });

  it("cancelar a exclusão mantém a categoria", async () => {
    const { api, user } = await renderPage();

    await screen.findByRole("heading", { name: "Moradia", level: 3 });
    await user.click(within(card("Moradia")).getByRole("button", { name: "Excluir" }));
    await user.click(
      within(getModalByTitle("Confirmar exclusão")).getByRole("button", { name: "Cancelar" }),
    );

    expect(queryModalByTitle("Confirmar exclusão")).toBeNull();
    expect(api.mutations()).toHaveLength(0);
    expect(screen.getByRole("heading", { name: "Moradia", level: 3 })).toBeInTheDocument();
  });

  it("quando a exclusão falha mostra o erro da API no diálogo, que continua aberto", async () => {
    const { api, user } = await renderPage({
      "DELETE /api/categories/c2": reply(500, { error: "Erro ao deletar." }),
    });

    await screen.findByRole("heading", { name: "Moradia", level: 3 });
    await user.click(within(card("Moradia")).getByRole("button", { name: "Excluir" }));
    await user.click(
      within(getModalByTitle("Confirmar exclusão")).getByRole("button", { name: "Confirmar exclusão" }),
    );

    await waitFor(() => expect(api.callsTo("DELETE", "/api/categories/c2")).toHaveLength(1));
    expect(queryModalByTitle("Confirmar exclusão")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Moradia", level: 3 })).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("Erro ao deletar.");
  });
});
