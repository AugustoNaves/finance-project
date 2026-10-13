import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import TransactionsPage from "@/app/transactions/page";
import { mockApi, reply, type ApiRoutes } from "../helpers/api";
import { categories, transactions } from "../helpers/fixtures";
import { freezeDate, getModalByTitle, queryModalByTitle, renderWithProvider } from "../helpers/render";

function listedDescriptions() {
  const table = screen.queryByRole("table");

  if (!table) return [];

  return within(table)
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0].textContent);
}

function rowOf(description: string) {
  const row = within(screen.getByRole("table")).getAllByText(description)[0].closest("tr");

  if (!row) throw new Error(`Linha "${description}" não encontrada`);

  return row;
}

async function renderPage(routes: ApiRoutes = {}) {
  const api = mockApi({
    "GET /api/transactions": transactions,
    "GET /api/categories": categories,
    ...routes,
  });
  const utils = renderWithProvider(<TransactionsPage />);

  await waitFor(() => expect(api.callsTo("GET", "/api/transactions")).toHaveLength(1));
  await screen.findByText(/registro\(s\) encontrado\(s\)/);

  return { api, ...utils };
}

describe("Página de transações", () => {
  beforeEach(() => {
    freezeDate();
  });

  it("mostra o estado vazio quando não há transações", async () => {
    await renderPage({ "GET /api/transactions": [] });

    expect(screen.getByRole("heading", { name: "Todas as movimentações", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("0 registro(s) encontrado(s)")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma transação encontrada com os filtros atuais.")).toBeInTheDocument();
  });

  it("lista todas as transações da mais recente para a mais antiga", async () => {
    await renderPage();

    await waitFor(() => expect(screen.getByText("10 registro(s) encontrado(s)")).toBeInTheDocument());
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
    expect(screen.getByText("1 registro(s) encontrado(s)")).toBeInTheDocument();
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

    await user.selectOptions(screen.getByLabelText("Tipo"), "Investimentos");
    expect(listedDescriptions()).toEqual(["Tesouro Direto", "Compra de ações"]);

    await user.selectOptions(screen.getByLabelText("Tipo"), "Despesas");
    expect(listedDescriptions()).toEqual(["Restaurante", "Mercado", "Aluguel", "Viagem", "Uber"]);

    await user.selectOptions(screen.getByLabelText("Tipo"), "Receitas");
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

  it("[regressão de fuso] transação de 2026-08-01T00:00Z aparece como 01/08/2026 e casa com De=Até=01/08", async () => {
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
    expect(rowOf("Primeiro de agosto")).toHaveTextContent("01/08/2026");

    // Um dia antes não pode capturar a transação.
    fireEvent.change(screen.getByLabelText("De"), { target: { value: "2026-07-31" } });
    fireEvent.change(screen.getByLabelText("Até"), { target: { value: "2026-07-31" } });
    expect(listedDescriptions()).toEqual([]);
  });

  it("combina filtros e mostra o estado vazio quando nada casa", async () => {
    const { user } = await renderPage();
    await waitFor(() => expect(listedDescriptions()).toHaveLength(10));

    await user.selectOptions(screen.getByLabelText("Tipo"), "Receitas");
    await user.selectOptions(screen.getByLabelText("Categoria"), "Alimentação");

    expect(screen.getByText("0 registro(s) encontrado(s)")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma transação encontrada com os filtros atuais.")).toBeInTheDocument();
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

  it("exclui uma transação após confirmação (DELETE /api/transactions/:id)", async () => {
    const { api, user } = await renderPage({ "DELETE /api/transactions/t3": { message: "ok" } });
    await waitFor(() => expect(listedDescriptions()).toHaveLength(10));

    await user.click(within(rowOf("Mercado")).getByRole("button", { name: "Excluir" }));
    await user.click(
      within(getModalByTitle("Confirmar exclusão")).getByRole("button", { name: "Confirmar exclusão" }),
    );

    await waitFor(() => expect(listedDescriptions()).not.toContain("Mercado"));
    expect(api.callsTo("DELETE", "/api/transactions/t3")).toHaveLength(1);
    expect(screen.getByText("9 registro(s) encontrado(s)")).toBeInTheDocument();
    expect(queryModalByTitle("Confirmar exclusão")).toBeNull();
  });

  it("quando a exclusão falha mostra o erro da API no diálogo, que continua aberto, e mantém o item", async () => {
    const { api, user } = await renderPage({
      "DELETE /api/transactions/t3": reply(500, { error: "Erro ao deletar." }),
    });
    await waitFor(() => expect(listedDescriptions()).toHaveLength(10));

    await user.click(within(rowOf("Mercado")).getByRole("button", { name: "Excluir" }));
    const dialog = getModalByTitle("Confirmar exclusão");
    expect(dialog).toHaveTextContent('Tem certeza que deseja excluir a transação "Mercado"?');
    await user.click(within(dialog).getByRole("button", { name: "Confirmar exclusão" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Erro ao deletar.");
    expect(api.callsTo("DELETE", "/api/transactions/t3")).toHaveLength(1);
    expect(queryModalByTitle("Confirmar exclusão")).not.toBeNull();
    expect(listedDescriptions()).toContain("Mercado");

    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(queryModalByTitle("Confirmar exclusão")).toBeNull();
  });

  it("edita uma transação (PATCH /api/transactions/:id) e atualiza a linha", async () => {
    const { api, user } = await renderPage({
      "PATCH /api/transactions/t2": (call) => ({ ...transactions[1], ...(call.body as object), date: transactions[1].date }),
    });
    await waitFor(() => expect(listedDescriptions()).toHaveLength(10));

    await user.click(within(rowOf("Aluguel")).getByRole("button", { name: "Editar" }));
    const modal = getModalByTitle("Editar transação");
    await user.clear(within(modal).getByLabelText("Descrição"));
    await user.type(within(modal).getByLabelText("Descrição"), "Aluguel e condomínio");
    await user.clear(within(modal).getByLabelText("Valor"));
    await user.type(within(modal).getByLabelText("Valor"), "1800");
    await user.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(queryModalByTitle("Editar transação")).toBeNull());
    expect(api.callsTo("PATCH", "/api/transactions/t2")[0].body).toMatchObject({
      description: "Aluguel e condomínio",
      amount: -1800,
      category: "Moradia",
      type: "outcome",
      paymentMethod: "Boleto",
      notes: "Vence dia 6",
    });
    expect(rowOf("Aluguel e condomínio")).toHaveTextContent("-R$ 1.800,00");
  });

  it("[regressão] editar mantém a data original no PATCH (não troca para hoje)", async () => {
    const { api, user } = await renderPage({ "PATCH /api/transactions/t9": transactions[8] });
    await waitFor(() => expect(listedDescriptions()).toHaveLength(10));

    // Uber é de 10/08/2026; "hoje" é 15/10/2026.
    await user.click(within(rowOf("Uber")).getByRole("button", { name: "Editar" }));
    const modal = getModalByTitle("Editar transação");
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

    await user.click(within(rowOf("Aluguel")).getByRole("button", { name: "Editar" }));
    const modal = getModalByTitle("Editar transação");
    await user.clear(within(modal).getByLabelText("Valor"));
    await user.type(within(modal).getByLabelText("Valor"), "9999");
    await user.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    expect(await within(modal).findByRole("alert")).toHaveTextContent("Erro ao atualizar.");
    expect(queryModalByTitle("Editar transação")).not.toBeNull();
    expect(within(modal).getByLabelText("Valor")).toHaveValue(9999);
    expect(rowOf("Aluguel")).toHaveTextContent("-R$ 1.500,00");
  });

  it("quando a criação falha mostra o erro da API no modal de nova transação e mantém os valores", async () => {
    const { user } = await renderPage({
      "POST /api/transactions": reply(500, { error: "Erro ao salvar os dados." }),
    });
    await waitFor(() => expect(listedDescriptions()).toHaveLength(10));

    await user.click(screen.getByRole("button", { name: "+ Nova Transação" }));
    const modal = getModalByTitle("Nova Transação");
    await within(modal).findByRole("option", { name: "Alimentação" });
    await user.type(within(modal).getByLabelText("Descrição"), "Padaria");
    await user.type(within(modal).getByLabelText("Valor"), "25");
    await user.click(within(modal).getByRole("button", { name: "Salvar Transação" }));

    expect(await within(modal).findByRole("alert")).toHaveTextContent("Erro ao salvar os dados.");
    expect(within(modal).getByLabelText("Descrição")).toHaveValue("Padaria");
    expect(listedDescriptions()).toHaveLength(10);
  });

  it("cria uma transação pelo botão '+ Nova Transação' e ela entra na lista", async () => {
    const { api, user } = await renderPage({
      "POST /api/transactions": (call) =>
        reply(201, { id: "novo", ...(call.body as object), date: "2026-10-15T00:00:00.000Z" }),
    });
    await waitFor(() => expect(listedDescriptions()).toHaveLength(10));

    await user.click(screen.getByRole("button", { name: "+ Nova Transação" }));
    const modal = getModalByTitle("Nova Transação");
    await user.click(within(modal).getByRole("button", { name: "Entrada" }));
    await user.type(within(modal).getByLabelText("Descrição"), "Décimo terceiro");
    await user.type(within(modal).getByLabelText("Valor"), "2500");
    await user.click(within(modal).getByRole("button", { name: "Salvar Transação" }));

    await waitFor(() => expect(queryModalByTitle("Nova Transação")).toBeNull());
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
    expect(rowOf("Décimo terceiro")).toHaveTextContent("+R$ 2.500,00");
    expect(rowOf("Décimo terceiro")).toHaveTextContent("15/10/2026");
  });

  it("[a11y] com o modal de nova transação aberto não há ids duplicados no documento", async () => {
    const { user } = await renderPage();

    await user.click(screen.getByRole("button", { name: "+ Nova Transação" }));
    getModalByTitle("Nova Transação");

    const ids = Array.from(document.querySelectorAll("[id]")).map((element) => element.id);
    expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
  });

  it("marca 'Transações' como item ativo da navegação", async () => {
    await renderPage();

    const nav = screen.getAllByRole("navigation", { name: "Navegação principal" })[0];
    expect(within(nav).getByRole("link", { name: "Transações" })).toHaveAttribute("href", "/transactions");
  });
});
