import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NewTransactionModal } from "@/components/NewTransactionModal";
import {
  TransactionFilters,
  type TransactionFiltersState,
} from "@/components/TransactionFilters";
import { TransactionList } from "@/components/TransactionList";
import { mockApi, reply } from "../helpers/api";
import { categories, transactions } from "../helpers/fixtures";
import {
  freezeDate,
  getModalByTitle,
  getModalCloseButton,
  queryModalByTitle,
  renderUi,
  renderWithProvider,
} from "../helpers/render";

const baseFilters: TransactionFiltersState = {
  search: "",
  type: "all",
  category: "all",
  startDate: "",
  endDate: "",
  sort: "dateDesc",
};

describe("TransactionFilters", () => {
  function renderFilters(filters: Partial<TransactionFiltersState> = {}) {
    const onChange = vi.fn();
    const onReset = vi.fn();
    const utils = renderUi(
      <TransactionFilters
        filters={{ ...baseFilters, ...filters }}
        categories={["Alimentação", "Moradia"]}
        onChange={onChange}
        onReset={onReset}
      />,
    );

    return { onChange, onReset, ...utils };
  }

  it("exibe os valores atuais dos filtros e as categorias recebidas", () => {
    renderFilters({ search: "merc", type: "outcome", category: "Moradia", sort: "valueDesc" });

    expect(screen.getByLabelText("Buscar")).toHaveValue("merc");
    expect(screen.getByRole("button", { name: "Gastos" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("Categoria")).toHaveValue("Moradia");
    expect(screen.getByLabelText("Ordenar")).toHaveValue("valueDesc");
    expect(
      within(screen.getByLabelText("Categoria"))
        .getAllByRole("option", { hidden: true })
        .map((option) => option.textContent),
    ).toEqual(["Todas", "Alimentação", "Moradia"]);
  });

  it("mostra os filtros extras só ao abrir 'Filtros', com a contagem dos ativos", async () => {
    const { user } = renderFilters({ category: "Moradia", startDate: "2026-10-01" });
    const toggle = screen.getByRole("button", { name: "Filtros (2)" });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("combobox", { name: "Categoria" })).toBeNull();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("combobox", { name: "Categoria" })).toBeVisible();
  });

  it("notifica cada alteração com o estado completo dos filtros", async () => {
    const { onChange, user } = renderFilters();

    await user.type(screen.getByLabelText("Buscar"), "a");
    expect(onChange).toHaveBeenLastCalledWith({ ...baseFilters, search: "a" });

    await user.click(screen.getByRole("button", { name: "Investimentos" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...baseFilters, type: "investment" });

    await user.click(screen.getByRole("button", { name: "Filtros" }));

    await user.selectOptions(screen.getByLabelText("Categoria"), "Alimentação");
    expect(onChange).toHaveBeenLastCalledWith({ ...baseFilters, category: "Alimentação" });

    fireEvent.change(screen.getByLabelText("De"), { target: { value: "2026-10-01" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...baseFilters, startDate: "2026-10-01" });

    fireEvent.change(screen.getByLabelText("Até"), { target: { value: "2026-10-31" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...baseFilters, endDate: "2026-10-31" });

    await user.selectOptions(screen.getByLabelText("Ordenar"), "Menor valor");
    expect(onChange).toHaveBeenLastCalledWith({ ...baseFilters, sort: "valueAsc" });
  });

  it("aciona onReset em 'Limpar filtros'", async () => {
    const { onReset, onChange, user } = renderFilters({ search: "x" });

    await user.click(screen.getByRole("button", { name: "Filtros" }));
    await user.click(screen.getByRole("button", { name: "Limpar filtros" }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("TransactionList", () => {
  beforeEach(() => {
    freezeDate();
  });

  function renderList(items = transactions.slice(0, 5), groupByDay = true, routes = {}) {
    const api = mockApi({ "GET /api/categories": categories, "GET /api/transactions": items, ...routes });
    const utils = renderWithProvider(<TransactionList transactions={items} groupByDay={groupByDay} />);

    return { api, ...utils };
  }

  function rowOf(description: string) {
    return screen.getByRole("button", { name: new RegExp(`^${description},`) });
  }

  it("mostra o estado vazio e a contagem zerada", () => {
    renderList([]);

    expect(screen.getByText("0 lançamentos")).toBeInTheDocument();
    expect(screen.getByText("Nenhum lançamento encontrado com esses filtros.")).toBeInTheDocument();
  });

  it("agrupa por dia, com subtotal, e mostra descrição, categoria e valor com sinal", () => {
    renderList();

    expect(screen.getByText("5 lançamentos")).toBeInTheDocument();
    // Um grupo por dia: 05, 06, 08, 10 e 12/10 (na ordem recebida).
    const days = screen.getAllByRole("list", { name: /out\./ });
    expect(days).toHaveLength(5);
    expect(days[1]).toHaveAccessibleName("ter., 6 de out.");
    // Cabeçalho do dia com o subtotal (visual; o nome do grupo já anuncia o dia).
    expect(days[1].textContent).toContain("ter., 6 de out.−1.500,00");

    expect(rowOf("Aluguel")).toHaveTextContent("Aluguel");
    expect(rowOf("Aluguel")).toHaveTextContent("Moradia");
    expect(rowOf("Aluguel")).toHaveTextContent("−1.500,00");
    expect(rowOf("Aluguel")).toHaveAccessibleName(/^Aluguel, Moradia, -R\$\s1\.500,00\. Editar$/);
    // Receita com "+"; investimento é saída de caixa e leva "−".
    expect(rowOf("Salário")).toHaveTextContent("+5.000,00");
    expect(rowOf("Tesouro Direto")).toHaveTextContent("−1.000,00");
  });

  it("sem agrupamento mostra a data em cada linha", () => {
    renderList(transactions.slice(1, 3), false);

    expect(screen.queryAllByRole("list", { name: /out\./ })).toHaveLength(0);
    expect(rowOf("Aluguel")).toHaveTextContent("Moradia · ter., 6 de out.");
  });

  it("infere o tipo pelo sinal quando a transação não tem type", () => {
    renderList(transactions.slice(8));

    expect(rowOf("Uber")).toHaveTextContent("−100,00");
    expect(rowOf("Reembolso")).toHaveTextContent("+300,00");
  });

  it("tocar na linha abre a edição com os dados e salva pelo contexto (PATCH)", async () => {
    const { api, user } = renderList(transactions.slice(0, 5), true, {
      "PATCH /api/transactions/t2": { ...transactions[1], amount: -1600 },
    });

    await user.click(rowOf("Aluguel"));

    const modal = getModalByTitle("Editar lançamento");
    expect(within(modal).getByLabelText("Descrição")).toHaveValue("Aluguel");
    expect(within(modal).getByLabelText("Valor")).toHaveValue("1.500,00");
    await waitFor(() =>
      expect(within(modal).getByRole("radio", { name: "Moradia" })).toHaveAttribute("aria-checked", "true"),
    );
    expect(within(modal).getByLabelText("Forma de pagamento")).toHaveValue("Boleto");
    expect(within(modal).getByLabelText("Observação")).toHaveValue("Vence dia 6");

    await user.clear(within(modal).getByLabelText("Valor"));
    await user.type(within(modal).getByLabelText("Valor"), "1600");
    await user.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(queryModalByTitle("Editar lançamento")).toBeNull());
    expect(api.callsTo("PATCH", "/api/transactions/t2")[0].body).toEqual(
      expect.objectContaining({
        description: "Aluguel",
        amount: -1600,
        category: "Moradia",
        type: "outcome",
        paymentMethod: "Boleto",
        notes: "Vence dia 6",
        date: "2026-10-06",
      }),
    );
  });

  it("[regressão] a edição mantém a data original: editar em outubro um lançamento de agosto preserva agosto", async () => {
    const august = { ...transactions[1], id: "ago", date: "2026-08-01T00:00:00.000Z" };
    const { api, user } = renderList([august], true, {
      "PATCH /api/transactions/ago": { ...august, amount: -1600 },
    });

    expect(screen.getByRole("list", { name: "sáb., 1 de ago." })).toBeInTheDocument();
    await user.click(rowOf("Aluguel"));
    const modal = getModalByTitle("Editar lançamento");

    expect(within(modal).getByLabelText("Data")).toHaveValue("2026-08-01");

    await user.clear(within(modal).getByLabelText("Valor"));
    await user.type(within(modal).getByLabelText("Valor"), "1600");
    await user.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(api.callsTo("PATCH", "/api/transactions/ago")).toHaveLength(1));
    expect(api.callsTo("PATCH", "/api/transactions/ago")[0].body).toMatchObject({
      date: "2026-08-01",
      amount: -1600,
    });
  });

  it("excluir pede confirmação dentro da edição e chama DELETE", async () => {
    const { api, user } = renderList(transactions.slice(0, 5), true, {
      "DELETE /api/transactions/t3": { message: "ok" },
    });

    await user.click(rowOf("Mercado"));
    await user.click(within(getModalByTitle("Editar lançamento")).getByRole("button", { name: "Excluir" }));

    const dialog = getModalByTitle("Confirmar exclusão");
    expect(dialog).toHaveTextContent('Excluir "Mercado"? Essa ação não pode ser desfeita.');
    expect(api.callsTo("DELETE", "/api/transactions/t3")).toHaveLength(0);

    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(queryModalByTitle("Confirmar exclusão")).toBeNull());
    expect(queryModalByTitle("Editar lançamento")).toBeNull();
    expect(api.callsTo("DELETE", "/api/transactions/t3")).toHaveLength(1);
  });

  it("cancelar a confirmação não exclui e mantém a edição aberta", async () => {
    const { api, user } = renderList();

    await user.click(rowOf("Mercado"));
    await user.click(within(getModalByTitle("Editar lançamento")).getByRole("button", { name: "Excluir" }));
    await user.click(
      within(getModalByTitle("Confirmar exclusão")).getByRole("button", { name: "Cancelar" }),
    );

    expect(queryModalByTitle("Confirmar exclusão")).toBeNull();
    expect(queryModalByTitle("Editar lançamento")).not.toBeNull();
    expect(api.mutations()).toHaveLength(0);
  });

  it("quando a exclusão falha mostra o erro no diálogo de confirmação, que continua aberto", async () => {
    const { user } = renderList(transactions.slice(0, 5), true, {
      "DELETE /api/transactions/t3": reply(500, { error: "Erro ao deletar." }),
    });

    await user.click(rowOf("Mercado"));
    await user.click(within(getModalByTitle("Editar lançamento")).getByRole("button", { name: "Excluir" }));
    const dialog = getModalByTitle("Confirmar exclusão");
    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Erro ao deletar.");
    expect(queryModalByTitle("Confirmar exclusão")).not.toBeNull();
  });

  it("quando a atualização falha mostra o erro na edição e mantém os valores", async () => {
    const { user } = renderList(transactions.slice(0, 5), true, {
      "PATCH /api/transactions/t2": reply(500, { error: "Erro ao atualizar." }),
    });

    await user.click(rowOf("Aluguel"));
    const modal = getModalByTitle("Editar lançamento");
    await user.clear(within(modal).getByLabelText("Valor"));
    await user.type(within(modal).getByLabelText("Valor"), "1600");
    await user.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    expect(await within(modal).findByRole("alert")).toHaveTextContent("Erro ao atualizar.");
    expect(within(modal).getByLabelText("Valor")).toHaveValue("1600");
    expect(within(modal).getByLabelText("Descrição")).toHaveValue("Aluguel");
  });

  it("fechar a edição pelo ✕ não envia nada", async () => {
    const { api, user } = renderList();

    await user.click(rowOf("Aluguel"));
    await user.click(getModalCloseButton(getModalByTitle("Editar lançamento")));

    expect(queryModalByTitle("Editar lançamento")).toBeNull();
    expect(api.mutations()).toHaveLength(0);
  });
});

describe("NewTransactionModal", () => {
  beforeEach(() => {
    freezeDate();
  });

  function Harness({ onClose }: { onClose: () => void }) {
    const [open, setOpen] = useState(true);

    return (
      <NewTransactionModal
        isOpen={open}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
      />
    );
  }

  async function fillAndSubmit(user: ReturnType<typeof renderUi>["user"]) {
    const modal = getModalByTitle("Registrar");
    await within(modal).findByRole("radio", { name: "Alimentação" });
    await user.type(within(modal).getByLabelText("Descrição"), "Padaria");
    await user.type(within(modal).getByLabelText("Valor"), "25");
    await user.click(within(modal).getByRole("button", { name: "Salvar" }));
  }

  it("não renderiza nada quando fechado", () => {
    mockApi();
    renderWithProvider(<NewTransactionModal isOpen={false} onClose={vi.fn()} />);

    expect(queryModalByTitle("Registrar")).toBeNull();
    expect(screen.queryByLabelText("Descrição")).toBeNull();
  });

  it("envia POST /api/transactions com o payload do formulário e fecha", async () => {
    const api = mockApi({
      "GET /api/categories": categories,
      "POST /api/transactions": reply(201, { id: "novo" }),
    });
    const onClose = vi.fn();
    const { user } = renderWithProvider(<Harness onClose={onClose} />);

    await fillAndSubmit(user);

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(api.callsTo("POST", "/api/transactions")[0].body).toEqual({
      description: "Padaria",
      amount: -25,
      category: "Alimentação",
      type: "outcome",
      paymentMethod: "Pix",
      date: "2026-10-15",
      notes: null,
    });
    expect(queryModalByTitle("Registrar")).toBeNull();
  });

  it("quando a API falha mostra o erro no modal, que continua aberto com os dados digitados", async () => {
    mockApi({
      "GET /api/categories": categories,
      "POST /api/transactions": reply(500, { error: "Erro ao salvar os dados." }),
    });
    const onClose = vi.fn();
    const { user } = renderWithProvider(<Harness onClose={onClose} />);

    await fillAndSubmit(user);

    const modal = getModalByTitle("Registrar");
    expect(await within(modal).findByRole("alert")).toHaveTextContent("Erro ao salvar os dados.");
    expect(onClose).not.toHaveBeenCalled();
    expect(within(modal).getByLabelText("Descrição")).toHaveValue("Padaria");
    expect(within(modal).getByLabelText("Valor")).toHaveValue("25");
  });

  it("fecha pelo botão ✕ sem enviar nada", async () => {
    const api = mockApi({ "GET /api/categories": categories });
    const onClose = vi.fn();
    const { user } = renderWithProvider(<Harness onClose={onClose} />);

    await user.click(getModalCloseButton(getModalByTitle("Registrar")));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(api.mutations()).toHaveLength(0);
  });
});
