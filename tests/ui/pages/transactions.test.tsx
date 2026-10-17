import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import TransactionsPage from "@/app/transactions/page";
import { mockApi, reply, type ApiRoutes } from "../helpers/api";
import { setPathname } from "../helpers/navigation";
import { categories, transactions } from "../helpers/fixtures";
import { freezeDate, getModalByTitle, queryModalByTitle, renderWithProvider } from "../helpers/render";

function listedDescriptions() {
  return within(screen.getByRole("main"))
    .queryAllByRole("button", { name: /\. Editar$/ })
    .map((row) => row.getAttribute("aria-label")?.split(",")[0]);
}

function rowOf(description: string) {
  return within(screen.getByRole("main")).getByRole("button", { name: new RegExp(`^${description},`) });
}

async function renderPage(routes: ApiRoutes = {}) {
  const api = mockApi({
    "GET /api/transactions": transactions,
    "GET /api/categories": categories,
    ...routes,
  });
  const utils = renderWithProvider(<TransactionsPage />);

  await waitFor(() => expect(api.callsTo("GET", "/api/transactions")).toHaveLength(1));
  await screen.findByText(/^\d+ lançamentos?$/);
  // Abre o painel com Categoria, De, Até, Ordenar e Limpar filtros.
  fireEvent.click(screen.getByRole("button", { name: /^Filtros/ }));

  return { api, ...utils };
}

describe("Página de lançamentos", () => {
  beforeEach(() => {
    freezeDate();
  });

  it("mostra o estado vazio quando não há transações", async () => {
    await renderPage({ "GET /api/transactions": [] });

    expect(screen.getByRole("heading", { name: "Lançamentos", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("0 lançamentos")).toBeInTheDocument();
    expect(screen.getByText("Nenhum lançamento encontrado com esses filtros.")).toBeInTheDocument();
  });

  it("lista todas as transações da mais recente para a mais antiga", async () => {
    await renderPage();

    await waitFor(() => expect(screen.getByText("10 lançamentos")).toBeInTheDocument());
    expect(listedDescriptions()).toEqual([
      "Tesouro Direto",
      "Restaurante",
      "Mercado",
      "Aluguel",
      "Salário",
      "Viagem",
      "Compra de ações",
      "Freelance",
      "Reembolso",
      "Uber",
    ]);
  });

  it("monta o filtro de categorias com as categorias usadas, sem repetição e em ordem alfabética", async () => {
    await renderPage();

    await waitFor(() => expect(listedDescriptions()).toHaveLength(10));
    expect(
      within(screen.getByLabelText("Categoria"))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual([
      "Todas",
      "Ações",
      "Alimentação",
      "Freelance",
      "Lazer",
      "Moradia",
      "Outros",
      "Renda fixa",
      "Salário",
      "Transporte",
    ]);
  });

  it("busca por descrição ignorando maiúsculas e espaços nas pontas", async () => {
    const { user } = await renderPage();
    await waitFor(() => expect(listedDescriptions()).toHaveLength(10));

    await user.type(screen.getByLabelText("Buscar"), "  MERC ");

    expect(listedDescriptions()).toEqual(["Mercado"]);
    expect(screen.getByText("1 lançamento")).toBeInTheDocument();
  });

  it("[comportamento atual] a busca não considera acentos nem a categoria", async () => {
    const { user } = await renderPage();
    await waitFor(() => expect(listedDescriptions()).toHaveLength(10));

    await user.type(screen.getByLabelText("Buscar"), "salario");
    expect(listedDescriptions()).toEqual([]);

    await user.clear(screen.getByLabelText("Buscar"));
    await user.type(screen.getByLabelText("Buscar"), "Moradia");
    expect(listedDescriptions()).toEqual([]);
  });

  it("filtra por tipo, inferindo o tipo pelo sinal em registros sem type", async () => {
    const { user } = await renderPage();
    await waitFor(() => expect(listedDescriptions()).toHaveLength(10));

    await user.click(screen.getByRole("button", { name: "Investimentos" }));
    expect(listedDescriptions()).toEqual(["Tesouro Direto", "Compra de ações"]);

    await user.click(screen.getByRole("button", { name: "Gastos" }));
    expect(listedDescriptions()).toEqual(["Restaurante", "Mercado", "Aluguel", "Viagem", "Uber"]);

    await user.click(screen.getByRole("button", { name: "Receitas" }));
    expect(listedDescriptions()).toEqual(["Salário", "Freelance", "Reembolso"]);
  });

  it("filtra por categoria", async () => {
    const { user } = await renderPage();
    await waitFor(() => expect(listedDescriptions()).toHaveLength(10));

    await user.selectOptions(screen.getByLabelText("Categoria"), "Alimentação");

    expect(listedDescriptions()).toEqual(["Restaurante", "Mercado"]);
  });

  it("filtra por período (De/Até inclusivos)", async () => {
    await renderPage();
    await waitFor(() => expect(listedDescriptions()).toHaveLength(10));

    fireEvent.change(screen.getByLabelText("De"), { target: { value: "2026-09-10" } });
    expect(listedDescriptions()).toHaveLength(8);

    fireEvent.change(screen.getByLabelText("Até"), { target: { value: "2026-09-20" } });
    expect(listedDescriptions()).toEqual(["Viagem", "Compra de ações", "Freelance"]);
  });

  it("[regressão de fuso] lançamento de 2026-08-01T00:00Z aparece em 1º de agosto e casa com De=Até=01/08", async () => {
    await renderPage({
      "GET /api/transactions": [
        ...transactions,
        { ...transactions[2], id: "tz", description: "Primeiro de agosto", date: "2026-08-01T00:00:00.000Z" },
      ],
    });
    await waitFor(() => expect(listedDescriptions()).toHaveLength(11));

    fireEvent.change(screen.getByLabelText("De"), { target: { value: "2026-08-01" } });
    fireEvent.change(screen.getByLabelText("Até"), { target: { value: "2026-08-01" } });

    expect(listedDescriptions()).toEqual(["Primeiro de agosto"]);
    expect(
      within(screen.getByRole("list", { name: "sáb., 1 de ago." })).getByRole("button", { name: /^Primeiro de agosto,/ }),
    ).toBeInTheDocument();

    // Um dia antes não pode capturar a transação.
    fireEvent.change(screen.getByLabelText("De"), { target: { value: "2026-07-31" } });
    fireEvent.change(screen.getByLabelText("Até"), { target: { value: "2026-07-31" } });
    expect(listedDescriptions()).toEqual([]);
  });

  it("combina filtros e mostra o estado vazio quando nada casa", async () => {
    const { user } = await renderPage();
    await waitFor(() => expect(listedDescriptions()).toHaveLength(10));

    await user.click(screen.getByRole("button", { name: "Receitas" }));
    await user.selectOptions(screen.getByLabelText("Categoria"), "Alimentação");

    expect(screen.getByText("0 lançamentos")).toBeInTheDocument();
    expect(screen.getByText("Nenhum lançamento encontrado com esses filtros.")).toBeInTheDocument();
  });

  it("ordena por data crescente e por valor absoluto (maior/menor)", async () => {
    const { user } = await renderPage();
    await waitFor(() => expect(listedDescriptions()).toHaveLength(10));

    await user.selectOptions(screen.getByLabelText("Ordenar"), "Mais antigas");
    expect(listedDescriptions().slice(0, 3)).toEqual(["Uber", "Reembolso", "Freelance"]);

    await user.selectOptions(screen.getByLabelText("Ordenar"), "Maior valor");
    expect(listedDescriptions().slice(0, 4)).toEqual(["Salário", "Freelance", "Aluguel", "Tesouro Direto"]);

    await user.selectOptions(screen.getByLabelText("Ordenar"), "Menor valor");
    expect(listedDescriptions().slice(0, 3)).toEqual(["Uber", "Restaurante", "Reembolso"]);
  });

  it("'Limpar filtros' restaura a listagem completa e os campos", async () => {
    const { user } = await renderPage();
    await waitFor(() => expect(listedDescriptions()).toHaveLength(10));

    await user.type(screen.getByLabelText("Buscar"), "uber");
    await user.selectOptions(screen.getByLabelText("Ordenar"), "Maior valor");
    expect(listedDescriptions()).toEqual(["Uber"]);

    await user.click(screen.getByRole("button", { name: "Limpar filtros" }));

    expect(listedDescriptions()).toHaveLength(10);
    expect(screen.getByLabelText("Buscar")).toHaveValue("");
    expect(screen.getByLabelText("Ordenar")).toHaveValue("dateDesc");
  });

  it("exclui um lançamento após confirmação (DELETE /api/transactions/:id)", async () => {
    const { api, user } = await renderPage({ "DELETE /api/transactions/t3": { message: "ok" } });
    await waitFor(() => expect(listedDescriptions()).toHaveLength(10));

    await user.click(rowOf("Mercado"));
    await user.click(within(getModalByTitle("Editar lançamento")).getByRole("button", { name: "Excluir" }));
    await user.click(
      within(getModalByTitle("Confirmar exclusão")).getByRole("button", { name: "Excluir" }),
    );

    await waitFor(() => expect(listedDescriptions()).not.toContain("Mercado"));
    expect(api.callsTo("DELETE", "/api/transactions/t3")).toHaveLength(1);
    expect(screen.getByText("9 lançamentos")).toBeInTheDocument();
    expect(queryModalByTitle("Confirmar exclusão")).toBeNull();
  });

  it("quando a exclusão falha mostra o erro da API no diálogo, que continua aberto, e mantém o item", async () => {
    const { api, user } = await renderPage({
      "DELETE /api/transactions/t3": reply(500, { error: "Erro ao deletar." }),
    });
    await waitFor(() => expect(listedDescriptions()).toHaveLength(10));

    await user.click(rowOf("Mercado"));
    await user.click(within(getModalByTitle("Editar lançamento")).getByRole("button", { name: "Excluir" }));
    const dialog = getModalByTitle("Confirmar exclusão");
    expect(dialog).toHaveTextContent('Excluir "Mercado"? Essa ação não pode ser desfeita.');
    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Erro ao deletar.");
    expect(api.callsTo("DELETE", "/api/transactions/t3")).toHaveLength(1);
    expect(queryModalByTitle("Confirmar exclusão")).not.toBeNull();
    expect(listedDescriptions()).toContain("Mercado");

    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(queryModalByTitle("Confirmar exclusão")).toBeNull();
  });

  it("edita um lançamento (PATCH /api/transactions/:id) e atualiza a linha", async () => {
    const { api, user } = await renderPage({
      "PATCH /api/transactions/t2": (call) => ({ ...transactions[1], ...(call.body as object), date: transactions[1].date }),
    });
    await waitFor(() => expect(listedDescriptions()).toHaveLength(10));

    await user.click(rowOf("Aluguel"));
    const modal = getModalByTitle("Editar lançamento");
    await user.clear(within(modal).getByLabelText("Descrição"));
    await user.type(within(modal).getByLabelText("Descrição"), "Aluguel e condomínio");
    await user.clear(within(modal).getByLabelText("Valor"));
    await user.type(within(modal).getByLabelText("Valor"), "1800");
    await user.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(queryModalByTitle("Editar lançamento")).toBeNull());
    expect(api.callsTo("PATCH", "/api/transactions/t2")[0].body).toMatchObject({
      description: "Aluguel e condomínio",
      amount: -1800,
      category: "Moradia",
      type: "outcome",
      paymentMethod: "Boleto",
      notes: "Vence dia 6",
    });
    expect(rowOf("Aluguel e condomínio")).toHaveTextContent("−1.800,00");
  });

  it("[regressão] editar mantém a data original no PATCH (não troca para hoje)", async () => {
    const { api, user } = await renderPage({ "PATCH /api/transactions/t9": transactions[8] });
    await waitFor(() => expect(listedDescriptions()).toHaveLength(10));

    // Uber é de 10/08/2026; "hoje" é 15/10/2026.
    await user.click(rowOf("Uber"));
    const modal = getModalByTitle("Editar lançamento");
    expect(within(modal).getByLabelText("Data")).toHaveValue("2026-08-10");
    await user.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(api.callsTo("PATCH", "/api/transactions/t9")).toHaveLength(1));
    expect(api.callsTo("PATCH", "/api/transactions/t9")[0].body).toMatchObject({
      date: "2026-08-10",
      amount: -100,
      type: "outcome",
    });
  });

  it("quando a edição falha mostra o erro da API no modal, mantém os valores e não altera a lista", async () => {
    const { user } = await renderPage({
      "PATCH /api/transactions/t2": reply(500, { error: "Erro ao atualizar." }),
    });
    await waitFor(() => expect(listedDescriptions()).toHaveLength(10));

    await user.click(rowOf("Aluguel"));
    const modal = getModalByTitle("Editar lançamento");
    await user.clear(within(modal).getByLabelText("Valor"));
    await user.type(within(modal).getByLabelText("Valor"), "9999");
    await user.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    expect(await within(modal).findByRole("alert")).toHaveTextContent("Erro ao atualizar.");
    expect(queryModalByTitle("Editar lançamento")).not.toBeNull();
    expect(within(modal).getByLabelText("Valor")).toHaveValue("9999");
    expect(rowOf("Aluguel")).toHaveTextContent("−1.500,00");
  });

  it("quando a criação falha mostra o erro da API no folha Registrar e mantém os valores", async () => {
    const { user } = await renderPage({
      "POST /api/transactions": reply(500, { error: "Erro ao salvar os dados." }),
    });
    await waitFor(() => expect(listedDescriptions()).toHaveLength(10));

    await user.click(within(screen.getByRole("navigation", { name: "Navegação principal" })).getByRole("button", { name: "Registrar" }));
    const modal = getModalByTitle("Registrar");
    await within(modal).findByRole("radio", { name: "Alimentação" });
    await user.type(within(modal).getByLabelText("Descrição"), "Padaria");
    await user.type(within(modal).getByLabelText("Valor"), "25");
    await user.click(within(modal).getByRole("button", { name: "Salvar" }));

    expect(await within(modal).findByRole("alert")).toHaveTextContent("Erro ao salvar os dados.");
    expect(within(modal).getByLabelText("Descrição")).toHaveValue("Padaria");
    expect(listedDescriptions()).toHaveLength(10);
  });

  it("cria um lançamento pelo Registrar da barra e ele entra na lista", async () => {
    const { api, user } = await renderPage({
      "POST /api/transactions": (call) =>
        reply(201, { id: "novo", ...(call.body as object), date: "2026-10-15T00:00:00.000Z" }),
    });
    await waitFor(() => expect(listedDescriptions()).toHaveLength(10));

    await user.click(within(screen.getByRole("navigation", { name: "Navegação principal" })).getByRole("button", { name: "Registrar" }));
    const modal = getModalByTitle("Registrar");
    await user.click(within(modal).getByRole("radio", { name: "Receita" }));
    await user.type(within(modal).getByLabelText("Descrição"), "Décimo terceiro");
    await user.type(within(modal).getByLabelText("Valor"), "2500");
    await user.click(within(modal).getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(queryModalByTitle("Registrar")).toBeNull());
    expect(api.callsTo("POST", "/api/transactions")[0].body).toEqual({
      description: "Décimo terceiro",
      amount: 2500,
      category: "Salário",
      type: "income",
      paymentMethod: "Pix",
      date: "2026-10-15",
      notes: null,
    });
    expect(listedDescriptions()[0]).toBe("Décimo terceiro");
    expect(rowOf("Décimo terceiro")).toHaveTextContent("+2.500,00");
    expect(
      within(screen.getByRole("list", { name: "qui., 15 de out." })).getByRole("button", { name: /^Décimo terceiro,/ }),
    ).toBeInTheDocument();
  });

  it("[a11y] com o folha Registrar aberto não há ids duplicados no documento", async () => {
    const { user } = await renderPage();

    await user.click(within(screen.getByRole("navigation", { name: "Navegação principal" })).getByRole("button", { name: "Registrar" }));
    getModalByTitle("Registrar");

    const ids = Array.from(document.querySelectorAll("[id]")).map((element) => element.id);
    expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
  });

  it("agrupa por dia quando ordena por data e mostra a data na linha quando ordena por valor", async () => {
    const { user } = await renderPage();
    await waitFor(() => expect(listedDescriptions()).toHaveLength(10));

    expect(screen.getByRole("list", { name: "ter., 6 de out." })).toHaveTextContent("Aluguel");

    await user.selectOptions(screen.getByLabelText("Ordenar"), "Maior valor");
    expect(screen.queryByRole("list", { name: "ter., 6 de out." })).toBeNull();
    expect(rowOf("Aluguel")).toHaveTextContent("Moradia · ter., 6 de out.");
  });

  it("marca 'Lançamentos' como item ativo da navegação", async () => {
    setPathname("/transactions");
    await renderPage();

    const nav = screen.getByRole("navigation", { name: "Navegação principal" });
    expect(within(nav).getByRole("link", { name: "Lançamentos" })).toHaveAttribute("aria-current", "page");
  });
});
