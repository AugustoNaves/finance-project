import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NewTransactionModal } from "@/components/NewTransactionModal";
import {
  TransactionFilters,
  type TransactionFiltersState,
} from "@/components/TransactionFilters";
import { TransactionList } from "@/components/TransactionList";
import { TransactionTable } from "@/components/TransactionTable";
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
    expect(screen.getByLabelText("Tipo")).toHaveValue("outcome");
    expect(screen.getByLabelText("Categoria")).toHaveValue("Moradia");
    expect(screen.getByLabelText("Ordenar")).toHaveValue("valueDesc");
    expect(
      within(screen.getByLabelText("Categoria"))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Todas", "Alimentação", "Moradia"]);
  });

  it("notifica cada alteração com o estado completo dos filtros", async () => {
    const { onChange, user } = renderFilters();

    await user.type(screen.getByLabelText("Buscar"), "a");
    expect(onChange).toHaveBeenLastCalledWith({ ...baseFilters, search: "a" });

    await user.selectOptions(screen.getByLabelText("Tipo"), "Investimentos");
    expect(onChange).toHaveBeenLastCalledWith({ ...baseFilters, type: "investment" });

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

    await user.click(screen.getByRole("button", { name: "Limpar filtros" }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("TransactionList", () => {
  beforeEach(() => {
    freezeDate();
  });

  function renderList(items = transactions.slice(0, 5)) {
    const onDelete = vi.fn<(id: string) => Promise<void>>().mockResolvedValue();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const utils = renderUi(
      <TransactionList transactions={items} onDelete={onDelete} onUpdate={onUpdate} />,
    );

    return { onDelete, onUpdate, ...utils };
  }

  function rowOf(description: string) {
    const row = within(screen.getByRole("table")).getAllByText(description)[0].closest("tr");

    if (!row) throw new Error(`Linha "${description}" não encontrada`);

    return row;
  }

  it("mostra o estado vazio e a contagem zerada", () => {
    renderList([]);

    expect(screen.getByText("0 registro(s) encontrado(s)")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma transação encontrada com os filtros atuais.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("lista descrição, valor formatado, categoria e data de cada transação", () => {
    mockApi();
    renderList();

    expect(screen.getByText("5 registro(s) encontrado(s)")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(6);

    const cells = within(rowOf("Aluguel")).getAllByRole("cell");
    expect(cells.map((cell) => cell.textContent?.replace(/\s/g, " ")).slice(0, 4)).toEqual([
      "Aluguel",
      "-R$ 1.500,00",
      "Moradia",
      "06/10/2026",
    ]);
    // Receita com "+", investimento em valor absoluto e sem sinal.
    expect(rowOf("Salário")).toHaveTextContent("+R$ 5.000,00");
    expect(within(rowOf("Tesouro Direto")).getAllByRole("cell")[1]).toHaveTextContent(/^R\$ 1\.000,00$/);
  });

  it("infere o tipo pelo sinal quando a transação não tem type", () => {
    renderList(transactions.slice(8));

    expect(rowOf("Uber")).toHaveTextContent("-R$ 100,00");
    expect(rowOf("Reembolso")).toHaveTextContent("+R$ 300,00");
  });

  it("renderiza tabela (desktop) e cards (mobile) juntos; o CSS esconde os cards fora do mobile", () => {
    renderList();

    expect(screen.getAllByText("Aluguel")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Excluir" })).toHaveLength(5);
    expect(screen.getAllByRole("button", { name: "Excluir", hidden: true })).toHaveLength(10);
  });

  it("pede confirmação antes de excluir e chama onDelete com o id", async () => {
    const { onDelete, user } = renderList();

    await user.click(within(rowOf("Mercado")).getByRole("button", { name: "Excluir" }));

    const dialog = getModalByTitle("Confirmar exclusão");
    expect(dialog).toHaveTextContent('Tem certeza que deseja excluir a transação "Mercado"?');
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Confirmar exclusão" }));

    await waitFor(() => expect(queryModalByTitle("Confirmar exclusão")).toBeNull());
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith("t3");
  });

  it("cancelar a confirmação não exclui", async () => {
    const { onDelete, user } = renderList();

    await user.click(within(rowOf("Mercado")).getByRole("button", { name: "Excluir" }));
    await user.click(
      within(getModalByTitle("Confirmar exclusão")).getByRole("button", { name: "Cancelar" }),
    );

    expect(queryModalByTitle("Confirmar exclusão")).toBeNull();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("abre a edição com os dados da transação e envia as alterações para onUpdate", async () => {
    mockApi({ "GET /api/categories": categories });
    const { onUpdate, user } = renderList();

    await user.click(within(rowOf("Aluguel")).getByRole("button", { name: "Editar" }));

    const modal = getModalByTitle("Editar transação");
    expect(within(modal).getByLabelText("Descrição")).toHaveValue("Aluguel");
    expect(within(modal).getByLabelText("Valor")).toHaveValue(1500);
    expect(within(modal).getByLabelText("Categoria")).toHaveValue("Moradia");
    expect(within(modal).getByLabelText("Forma de pagamento")).toHaveValue("Boleto");
    expect(within(modal).getByLabelText("Observação")).toHaveValue("Vence dia 6");

    await user.clear(within(modal).getByLabelText("Valor"));
    await user.type(within(modal).getByLabelText("Valor"), "1600");
    await user.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1));
    expect(onUpdate).toHaveBeenCalledWith(
      "t2",
      expect.objectContaining({
        description: "Aluguel",
        amount: -1600,
        category: "Moradia",
        type: "outcome",
        paymentMethod: "Boleto",
        notes: "Vence dia 6",
      }),
    );
    await waitFor(() => expect(queryModalByTitle("Editar transação")).toBeNull());
  });

  it("[regressão] a edição mantém a data original: editar em outubro uma transação de agosto preserva agosto", async () => {
    mockApi({ "GET /api/categories": categories });
    const { onUpdate, user } = renderList([
      { ...transactions[1], id: "ago", date: "2026-08-01T00:00:00.000Z" },
    ]);

    expect(rowOf("Aluguel")).toHaveTextContent("01/08/2026");
    await user.click(within(rowOf("Aluguel")).getByRole("button", { name: "Editar" }));
    const modal = getModalByTitle("Editar transação");

    expect(within(modal).getByLabelText("Data")).toHaveValue("2026-08-01");

    await user.clear(within(modal).getByLabelText("Valor"));
    await user.type(within(modal).getByLabelText("Valor"), "1600");
    await user.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    expect(onUpdate.mock.calls[0][0]).toBe("ago");
    expect(onUpdate.mock.calls[0][1]).toMatchObject({ date: "2026-08-01", amount: -1600 });
  });

  it("quando onDelete rejeita mostra o erro no diálogo de confirmação, que continua aberto", async () => {
    const { onDelete, user } = renderList();
    onDelete.mockRejectedValueOnce(new Error("Erro ao deletar."));

    await user.click(within(rowOf("Mercado")).getByRole("button", { name: "Excluir" }));
    const dialog = getModalByTitle("Confirmar exclusão");
    await user.click(within(dialog).getByRole("button", { name: "Confirmar exclusão" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Erro ao deletar.");
    expect(queryModalByTitle("Confirmar exclusão")).not.toBeNull();
  });

  it("quando onUpdate rejeita mostra o erro no modal de edição e mantém os valores", async () => {
    mockApi({ "GET /api/categories": categories });
    const { onUpdate, user } = renderList();
    onUpdate.mockRejectedValueOnce(new Error("Erro ao atualizar."));

    await user.click(within(rowOf("Aluguel")).getByRole("button", { name: "Editar" }));
    const modal = getModalByTitle("Editar transação");
    await user.clear(within(modal).getByLabelText("Valor"));
    await user.type(within(modal).getByLabelText("Valor"), "1600");
    await user.click(within(modal).getByRole("button", { name: "Salvar alterações" }));

    expect(await within(modal).findByRole("alert")).toHaveTextContent("Erro ao atualizar.");
    expect(within(modal).getByLabelText("Valor")).toHaveValue(1600);
    expect(within(modal).getByLabelText("Descrição")).toHaveValue("Aluguel");
  });

  it("fechar o modal de edição pelo ✕ não chama onUpdate", async () => {
    mockApi({ "GET /api/categories": categories });
    const { onUpdate, user } = renderList();

    await user.click(within(rowOf("Aluguel")).getByRole("button", { name: "Editar" }));
    await user.click(getModalCloseButton(getModalByTitle("Editar transação")));

    expect(queryModalByTitle("Editar transação")).toBeNull();
    expect(onUpdate).not.toHaveBeenCalled();
  });
});

describe("TransactionTable (componente legado, não usado por nenhuma página)", () => {
  it("lista as transações do contexto com valor formatado e data", async () => {
    mockApi({ "GET /api/transactions": transactions.slice(0, 2) });
    renderWithProvider(<TransactionTable />);

    const rows = await waitFor(() => {
      const found = screen.getAllByRole("row");
      expect(found).toHaveLength(3);
      return found;
    });

    expect(rows[1]).toHaveTextContent("Salário");
    expect(rows[1]).toHaveTextContent("+R$ 5.000,00");
    expect(rows[1]).toHaveTextContent("05/10/2026");
    expect(rows[2]).toHaveTextContent("-R$ 1.500,00");
  });

  it("exclui pelo contexto após confirmar no modal", async () => {
    const api = mockApi({
      "GET /api/transactions": transactions.slice(0, 2),
      "DELETE /api/transactions/t2": { message: "ok" },
    });
    const { user } = renderWithProvider(<TransactionTable />);

    await screen.findByText("Aluguel");
    await user.click(screen.getAllByRole("button", { name: "Excluir transação" })[1]);
    await user.click(
      within(getModalByTitle("Confirmar exclusão")).getByRole("button", { name: "Confirmar" }),
    );

    await waitFor(() => expect(screen.queryByText("Aluguel")).toBeNull());
    expect(api.callsTo("DELETE", "/api/transactions/t2")).toHaveLength(1);
    expect(queryModalByTitle("Confirmar exclusão")).toBeNull();
  });

  it("[comportamento atual] não tem estado vazio: sem transações mostra só o cabeçalho", async () => {
    const api = mockApi();
    renderWithProvider(<TransactionTable />);

    await waitFor(() => expect(api.calls).toHaveLength(1));
    expect(screen.getAllByRole("row")).toHaveLength(1);
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
    const modal = getModalByTitle("Nova Transação");
    await within(modal).findByRole("option", { name: "Alimentação" });
    await user.type(within(modal).getByLabelText("Descrição"), "Padaria");
    await user.type(within(modal).getByLabelText("Valor"), "25");
    await user.click(within(modal).getByRole("button", { name: "Salvar Transação" }));
  }

  it("não renderiza nada quando fechado", () => {
    mockApi();
    renderWithProvider(<NewTransactionModal isOpen={false} onClose={vi.fn()} />);

    expect(queryModalByTitle("Nova Transação")).toBeNull();
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
    expect(queryModalByTitle("Nova Transação")).toBeNull();
  });

  it("quando a API falha mostra o erro no modal, que continua aberto com os dados digitados", async () => {
    mockApi({
      "GET /api/categories": categories,
      "POST /api/transactions": reply(500, { error: "Erro ao salvar os dados." }),
    });
    const onClose = vi.fn();
    const { user } = renderWithProvider(<Harness onClose={onClose} />);

    await fillAndSubmit(user);

    const modal = getModalByTitle("Nova Transação");
    expect(await within(modal).findByRole("alert")).toHaveTextContent("Erro ao salvar os dados.");
    expect(onClose).not.toHaveBeenCalled();
    expect(within(modal).getByLabelText("Descrição")).toHaveValue("Padaria");
    expect(within(modal).getByLabelText("Valor")).toHaveValue(25);
  });

  it("fecha pelo botão ✕ sem enviar nada", async () => {
    const api = mockApi({ "GET /api/categories": categories });
    const onClose = vi.fn();
    const { user } = renderWithProvider(<Harness onClose={onClose} />);

    await user.click(getModalCloseButton(getModalByTitle("Nova Transação")));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(api.mutations()).toHaveLength(0);
  });
});
