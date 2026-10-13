import { act, render, screen, waitFor } from "@testing-library/react";
import { useContext, useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { TransactionsContext, TransactionsProvider } from "@/contexts/TransactionsContenxt";
import type { TransactionPayload } from "@/types/transaction";
import { mockApi, networkError, reply, replyRaw } from "../helpers/api";
import { transactions } from "../helpers/fixtures";

type ContextValue = React.ContextType<typeof TransactionsContext>;

const payload: TransactionPayload = {
  description: "Padaria",
  amount: -25,
  category: "Alimentação",
  type: "outcome",
  paymentMethod: "Pix",
  notes: null,
  date: "2026-10-15",
};

function renderProvider() {
  const ref: { current: ContextValue | null } = { current: null };

  function Probe() {
    const value = useContext(TransactionsContext);

    useEffect(() => {
      ref.current = value;
    });

    return (
      <ul>
        {value.transactions.map((transaction) => (
          <li key={transaction.id}>
            {transaction.description}: {transaction.amount}
          </li>
        ))}
      </ul>
    );
  }

  render(
    <TransactionsProvider>
      <Probe />
    </TransactionsProvider>,
  );

  return { context: () => ref.current as ContextValue };
}

function descriptions() {
  return screen.queryAllByRole("listitem").map((item) => item.textContent?.split(":")[0]);
}

describe("TransactionsProvider (contexto de transações)", () => {
  it("começa vazio e carrega as transações de GET /api/transactions ao montar", async () => {
    const api = mockApi({ "GET /api/transactions": transactions.slice(0, 3) });
    renderProvider();

    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    await waitFor(() => expect(descriptions()).toEqual(["Salário", "Aluguel", "Mercado"]));
    expect(api.callsTo("GET", "/api/transactions")).toHaveLength(1);
  });

  it("fica com lista vazia quando a API responde 401", async () => {
    const api = mockApi({ "GET /api/transactions": reply(401, { error: "Não autenticado." }) });
    renderProvider();

    await waitFor(() => expect(api.calls).toHaveLength(1));
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("fica com lista vazia e registra o erro no console quando a rede falha", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockApi({ "GET /api/transactions": networkError() });
    renderProvider();

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith("Erro ao buscar transações:", expect.any(TypeError)),
    );
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("trata resposta de erro não-JSON como lista vazia (erro apenas no console)", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockApi({ "GET /api/transactions": replyRaw(500, "<html>erro</html>") });
    renderProvider();

    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("addTransaction envia POST e coloca a transação criada no INÍCIO da lista", async () => {
    const api = mockApi({
      "GET /api/transactions": transactions.slice(0, 2),
      "POST /api/transactions": reply(201, { id: "novo", ...payload, date: "2026-10-15T00:00:00.000Z" }),
    });
    const { context } = renderProvider();
    await waitFor(() => expect(descriptions()).toHaveLength(2));

    await act(() => context().addTransaction(payload));

    expect(api.callsTo("POST", "/api/transactions")[0].body).toEqual(payload);
    expect(descriptions()).toEqual(["Padaria", "Salário", "Aluguel"]);
  });

  it("addTransaction rejeita com a mensagem da API e não altera a lista quando a API recusa", async () => {
    mockApi({
      "GET /api/transactions": transactions.slice(0, 2),
      "POST /api/transactions": reply(500, { error: "Erro ao salvar os dados." }),
    });
    const { context } = renderProvider();
    await waitFor(() => expect(descriptions()).toHaveLength(2));

    await act(async () => {
      await expect(context().addTransaction(payload)).rejects.toMatchObject({
        name: "ApiError",
        message: "Erro ao salvar os dados.",
        status: 500,
      });
    });

    expect(descriptions()).toEqual(["Salário", "Aluguel"]);
  });

  it("addTransaction propaga falha de rede sem alterar a lista", async () => {
    mockApi({
      "GET /api/transactions": transactions.slice(0, 1),
      "POST /api/transactions": networkError(),
    });
    const { context } = renderProvider();
    await waitFor(() => expect(descriptions()).toHaveLength(1));

    await act(async () => {
      await expect(context().addTransaction(payload)).rejects.toThrow("Failed to fetch");
    });

    expect(descriptions()).toEqual(["Salário"]);
  });

  it("updateTransaction envia PATCH e substitui o item mantendo a posição", async () => {
    const api = mockApi({
      "GET /api/transactions": transactions.slice(0, 3),
      "PATCH /api/transactions/t2": { ...transactions[1], description: "Aluguel + condomínio", amount: -1800 },
    });
    const { context } = renderProvider();
    await waitFor(() => expect(descriptions()).toHaveLength(3));

    await act(() => context().updateTransaction("t2", { ...payload, amount: -1800 }));

    expect(api.callsTo("PATCH", "/api/transactions/t2")[0].body).toEqual({ ...payload, amount: -1800 });
    expect(descriptions()).toEqual(["Salário", "Aluguel + condomínio", "Mercado"]);
    expect(screen.getByText("Aluguel + condomínio: -1800")).toBeInTheDocument();
  });

  it("updateTransaction rejeita e mantém a lista quando a API responde 404", async () => {
    mockApi({
      "GET /api/transactions": transactions.slice(0, 2),
      "PATCH /api/transactions/t2": reply(404, { error: "Transação não encontrada." }),
    });
    const { context } = renderProvider();
    await waitFor(() => expect(descriptions()).toHaveLength(2));

    await act(async () => {
      await expect(context().updateTransaction("t2", payload)).rejects.toThrow(
        "Transação não encontrada.",
      );
    });

    expect(descriptions()).toEqual(["Salário", "Aluguel"]);
    expect(screen.getByText("Aluguel: -1500")).toBeInTheDocument();
  });

  it("deleteTransaction envia DELETE e remove o item da lista", async () => {
    const api = mockApi({
      "GET /api/transactions": transactions.slice(0, 3),
      "DELETE /api/transactions/t2": { message: "Transação deletada com sucesso" },
    });
    const { context } = renderProvider();
    await waitFor(() => expect(descriptions()).toHaveLength(3));

    await act(() => context().deleteTransaction("t2"));

    expect(api.callsTo("DELETE", "/api/transactions/t2")).toHaveLength(1);
    expect(descriptions()).toEqual(["Salário", "Mercado"]);
  });

  it("deleteTransaction rejeita e mantém o item quando a API falha", async () => {
    mockApi({
      "GET /api/transactions": transactions.slice(0, 2),
      "DELETE /api/transactions/t2": replyRaw(500, "<html>erro</html>"),
    });
    const { context } = renderProvider();
    await waitFor(() => expect(descriptions()).toHaveLength(2));

    await act(async () => {
      await expect(context().deleteTransaction("t2")).rejects.toThrow(
        "Não foi possível excluir a transação.",
      );
    });

    expect(descriptions()).toEqual(["Salário", "Aluguel"]);
  });

  it("[comportamento atual] fora do provider o contexto é um objeto vazio (transactions indefinido)", () => {
    function Probe() {
      const value = useContext(TransactionsContext);

      return <output>{JSON.stringify(value)}</output>;
    }

    render(<Probe />);

    expect(screen.getByRole("status")).toHaveTextContent("{}");
  });
});
