import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import CategoriesPage from "@/app/categories/page";
import { mockApi, reply, type ApiRoutes } from "../helpers/api";
import { categories, categoryRules, transactions } from "../helpers/fixtures";
import {
  freezeDate,
  getModalByTitle,
  queryModalByTitle,
  renderWithProvider,
} from "../helpers/render";

async function renderPage(routes: ApiRoutes = {}, defaultTab?: "categories" | "rules") {
  const api = mockApi({
    "GET /api/transactions": transactions,
    "GET /api/categories": categories,
    "GET /api/category-rules": categoryRules,
    ...routes,
  });
  const utils = renderWithProvider(<CategoriesPage defaultTab={defaultTab} />);

  await waitFor(() => expect(api.callsTo("GET", "/api/categories")).toHaveLength(1));
  await waitFor(() => expect(api.callsTo("GET", "/api/category-rules")).toHaveLength(1));

  return { api, ...utils };
}

function rulesTab() {
  return screen.getByRole("tab", { name: /^Regras \d+$/ });
}

function rulesList() {
  return screen.getByRole("list", { name: "Regras de importação" });
}

describe("Página de categorias - Aba de regras de categorização", () => {
  beforeEach(() => {
    freezeDate();
  });

  it("navega para a aba Regras e lista as regras do usuário", async () => {
    const { user } = await renderPage();

    await user.click(rulesTab());

    expect(rulesTab()).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("heading", { name: "Regras de importação", level: 2 }),
    ).toBeInTheDocument();
    expect(rulesTab()).toHaveTextContent("Regras 3");

    const table = rulesList();
    expect(within(table).getAllByRole("listitem")).toHaveLength(3);

    // Estabelecimentos
    expect(within(table).getByText("NETFLIX")).toBeInTheDocument();
    expect(within(table).getByText("UBER")).toBeInTheDocument();
    expect(within(table).getByText("EMPRESA XYZ")).toBeInTheDocument();

    // Categorias
    expect(within(table).getByText("Lazer")).toBeInTheDocument();
    expect(within(table).getByText("Transporte")).toBeInTheDocument();
    expect(within(table).getByText("Salário")).toBeInTheDocument();

    // Tipos
    expect(within(table).getAllByText("Gasto")).toHaveLength(2);
    expect(within(table).getByText("Receita")).toBeInTheDocument();

    // Datas formatadas
    expect(within(table).getByText("10/10/2026")).toBeInTheDocument();
    expect(within(table).getByText("11/10/2026")).toBeInTheDocument();
    expect(within(table).getByText("12/10/2026")).toBeInTheDocument();
  });

  it("exibe estado vazio quando não há regras cadastradas", async () => {
    const { user } = await renderPage({ "GET /api/category-rules": [] });

    await user.click(rulesTab());

    expect(
      screen.getByText(
        "Nenhuma regra ainda. Ao importar uma fatura e marcar “Lembrar”, a regra aparece aqui.",
      ),
    ).toBeInTheDocument();
    expect(rulesTab()).toHaveTextContent("Regras 0");
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("filtra as regras pelo nome do estabelecimento no campo de busca", async () => {
    const { user } = await renderPage();

    await user.click(rulesTab());

    const searchInput = screen.getByRole("searchbox", { name: "Buscar regra por estabelecimento" });
    await user.type(searchInput, "uber");

    const table = rulesList();
    expect(within(table).getByText("UBER")).toBeInTheDocument();
    expect(within(table).queryByText("NETFLIX")).toBeNull();
    expect(within(table).queryByText("EMPRESA XYZ")).toBeNull();

    // Busca sem correspondência
    await user.clear(searchInput);
    await user.type(searchInput, "farmacia inexistente");

    expect(
      screen.getByText("Nenhuma regra para essa busca."),
    ).toBeInTheDocument();

    // Limpar busca restaura todas
    await user.clear(searchInput);
    const restoredTable = rulesList();
    expect(within(restoredTable).getByText("NETFLIX")).toBeInTheDocument();
    expect(within(restoredTable).getByText("UBER")).toBeInTheDocument();
    expect(within(restoredTable).getByText("EMPRESA XYZ")).toBeInTheDocument();
  });

  it("exclui uma regra após confirmação citando o estabelecimento (DELETE /api/category-rules/:id)", async () => {
    const { api, user } = await renderPage({
      "DELETE /api/category-rules/cr1": { message: "ok" },
    });

    await user.click(rulesTab());

    await user.click(screen.getByRole("button", { name: "Excluir regra de NETFLIX" }));

    const dialog = getModalByTitle("Confirmar exclusão");
    expect(dialog).toHaveTextContent("Excluir a regra de “NETFLIX”?");
    expect(api.mutations()).toHaveLength(0);

    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(screen.queryAllByText("NETFLIX")).toHaveLength(0));
    expect(api.callsTo("DELETE", "/api/category-rules/cr1")).toHaveLength(1);
    expect(rulesTab()).toHaveTextContent("Regras 2");
    expect(within(rulesList()).getAllByRole("listitem")).toHaveLength(2);
    expect(queryModalByTitle("Confirmar exclusão")).toBeNull();
  });

  it("cancelar a exclusão mantém a regra", async () => {
    const { api, user } = await renderPage();

    await user.click(rulesTab());

    await user.click(screen.getByRole("button", { name: "Excluir regra de NETFLIX" }));
    await user.click(
      within(getModalByTitle("Confirmar exclusão")).getByRole("button", { name: "Cancelar" }),
    );

    expect(queryModalByTitle("Confirmar exclusão")).toBeNull();
    expect(api.mutations()).toHaveLength(0);
    const table = rulesList();
    expect(within(table).getByText("NETFLIX")).toBeInTheDocument();
  });

  it("quando a exclusão falha mostra o erro da API no diálogo, que continua aberto", async () => {
    const { api, user } = await renderPage({
      "DELETE /api/category-rules/cr1": reply(500, { error: "Erro ao deletar regra." }),
    });

    await user.click(rulesTab());

    await user.click(screen.getByRole("button", { name: "Excluir regra de NETFLIX" }));
    await user.click(
      within(getModalByTitle("Confirmar exclusão")).getByRole("button", { name: "Excluir" }),
    );

    await waitFor(() => expect(api.callsTo("DELETE", "/api/category-rules/cr1")).toHaveLength(1));
    expect(queryModalByTitle("Confirmar exclusão")).not.toBeNull();
    const table = rulesList();
    expect(within(table).getByText("NETFLIX")).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("Erro ao deletar regra.");
  });

  it("mostra feedback de erro quando o carregamento das regras falha", async () => {
    const { user } = await renderPage({
      "GET /api/category-rules": reply(500, { error: "Erro ao carregar do servidor." }),
    });

    await user.click(rulesTab());

    expect(await screen.findByRole("alert")).toHaveTextContent("Erro ao carregar do servidor.");
  });

  it("inicia na aba de regras quando defaultTab='rules'", async () => {
    await renderPage({}, "rules");

    expect(rulesTab()).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("heading", { name: "Regras de importação", level: 2 }),
    ).toBeInTheDocument();
    expect(within(rulesList()).getAllByRole("listitem")).toHaveLength(3);
  });
});
