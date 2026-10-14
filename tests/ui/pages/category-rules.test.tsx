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

describe("Página de categorias - Aba de regras de categorização", () => {
  beforeEach(() => {
    freezeDate();
  });

  it("navega para a aba de Regras de Importação e lista as regras do usuário", async () => {
    const { user } = await renderPage();

    const rulesTab = screen.getByRole("tab", { name: /Regras de Importação/i });
    await user.click(rulesTab);

    expect(
      screen.getByRole("heading", { name: "Regras de Importação", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText("3 regra(s) cadastrada(s)")).toBeInTheDocument();

    const table = screen.getByRole("table");

    // Estabelecimentos
    expect(within(table).getByText("NETFLIX")).toBeInTheDocument();
    expect(within(table).getByText("UBER")).toBeInTheDocument();
    expect(within(table).getByText("EMPRESA XYZ")).toBeInTheDocument();

    // Categorias
    expect(within(table).getByText("Lazer")).toBeInTheDocument();
    expect(within(table).getByText("Transporte")).toBeInTheDocument();
    expect(within(table).getByText("Salário")).toBeInTheDocument();

    // Tipos
    expect(within(table).getAllByText("Despesa")).toHaveLength(2);
    expect(within(table).getByText("Receita")).toBeInTheDocument();

    // Datas formatadas
    expect(within(table).getByText("10/10/2026")).toBeInTheDocument();
    expect(within(table).getByText("11/10/2026")).toBeInTheDocument();
    expect(within(table).getByText("12/10/2026")).toBeInTheDocument();
  });

  it("exibe estado vazio quando não há regras cadastradas", async () => {
    const { user } = await renderPage({ "GET /api/category-rules": [] });

    await user.click(screen.getByRole("tab", { name: /Regras de Importação/i }));

    expect(
      screen.getByText(
        "Nenhuma regra cadastrada. Ao importar faturas e marcar 'Lembrar', as regras aparecerão aqui",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("0 regra(s) cadastrada(s)")).toBeInTheDocument();
  });

  it("filtra as regras pelo nome do estabelecimento no campo de busca", async () => {
    const { user } = await renderPage();

    await user.click(screen.getByRole("tab", { name: /Regras de Importação/i }));

    const searchInput = screen.getByPlaceholderText("Buscar por estabelecimento...");
    await user.type(searchInput, "uber");

    const table = screen.getByRole("table");
    expect(within(table).getByText("UBER")).toBeInTheDocument();
    expect(within(table).queryByText("NETFLIX")).toBeNull();
    expect(within(table).queryByText("EMPRESA XYZ")).toBeNull();

    // Busca sem correspondência
    await user.clear(searchInput);
    await user.type(searchInput, "farmacia inexistente");

    expect(
      screen.getByText("Nenhuma regra encontrada para a busca."),
    ).toBeInTheDocument();

    // Limpar busca restaura todas
    await user.clear(searchInput);
    const restoredTable = screen.getByRole("table");
    expect(within(restoredTable).getByText("NETFLIX")).toBeInTheDocument();
    expect(within(restoredTable).getByText("UBER")).toBeInTheDocument();
    expect(within(restoredTable).getByText("EMPRESA XYZ")).toBeInTheDocument();
  });

  it("exclui uma regra após confirmação citando o estabelecimento (DELETE /api/category-rules/:id)", async () => {
    const { api, user } = await renderPage({
      "DELETE /api/category-rules/cr1": { message: "ok" },
    });

    await user.click(screen.getByRole("tab", { name: /Regras de Importação/i }));

    const deleteBtn = screen.getAllByRole("button", { name: "Excluir regra de NETFLIX" })[0];
    await user.click(deleteBtn);

    const dialog = getModalByTitle("Confirmar exclusão");
    expect(dialog).toHaveTextContent(
      'Tem certeza que deseja excluir a regra para o estabelecimento "NETFLIX"?',
    );
    expect(api.mutations()).toHaveLength(0);

    await user.click(within(dialog).getByRole("button", { name: "Confirmar exclusão" }));

    await waitFor(() => expect(screen.queryAllByText("NETFLIX")).toHaveLength(0));
    expect(api.callsTo("DELETE", "/api/category-rules/cr1")).toHaveLength(1);
    expect(screen.getByText("2 regra(s) cadastrada(s)")).toBeInTheDocument();
    expect(queryModalByTitle("Confirmar exclusão")).toBeNull();
  });

  it("cancelar a exclusão mantém a regra", async () => {
    const { api, user } = await renderPage();

    await user.click(screen.getByRole("tab", { name: /Regras de Importação/i }));

    await user.click(screen.getAllByRole("button", { name: "Excluir regra de NETFLIX" })[0]);
    await user.click(
      within(getModalByTitle("Confirmar exclusão")).getByRole("button", { name: "Cancelar" }),
    );

    expect(queryModalByTitle("Confirmar exclusão")).toBeNull();
    expect(api.mutations()).toHaveLength(0);
    const table = screen.getByRole("table");
    expect(within(table).getByText("NETFLIX")).toBeInTheDocument();
  });

  it("quando a exclusão falha mostra o erro da API no diálogo, que continua aberto", async () => {
    const { api, user } = await renderPage({
      "DELETE /api/category-rules/cr1": reply(500, { error: "Erro ao deletar regra." }),
    });

    await user.click(screen.getByRole("tab", { name: /Regras de Importação/i }));

    await user.click(screen.getAllByRole("button", { name: "Excluir regra de NETFLIX" })[0]);
    await user.click(
      within(getModalByTitle("Confirmar exclusão")).getByRole("button", {
        name: "Confirmar exclusão",
      }),
    );

    await waitFor(() => expect(api.callsTo("DELETE", "/api/category-rules/cr1")).toHaveLength(1));
    expect(queryModalByTitle("Confirmar exclusão")).not.toBeNull();
    const table = screen.getByRole("table");
    expect(within(table).getByText("NETFLIX")).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("Erro ao deletar regra.");
  });

  it("mostra feedback de erro quando o carregamento das regras falha", async () => {
    const { user } = await renderPage({
      "GET /api/category-rules": reply(500, { error: "Erro ao carregar do servidor." }),
    });

    await user.click(screen.getByRole("tab", { name: /Regras de Importação/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Erro ao carregar do servidor.");
  });

  it("inicia na aba de regras quando defaultTab='rules'", async () => {
    await renderPage({}, "rules");

    expect(
      screen.getByRole("heading", { name: "Regras de Importação", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText("3 regra(s) cadastrada(s)")).toBeInTheDocument();
  });
});
