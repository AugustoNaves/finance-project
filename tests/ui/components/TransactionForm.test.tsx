import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TransactionForm, type TransactionFormData } from "@/components/TransactionForm";
import { mockApi, networkError, reply } from "../helpers/api";
import { categories } from "../helpers/fixtures";
import {
  freezeDate,
  getModalByTitle,
  queryModalByTitle,
  renderUi,
  renderWithProvider,
} from "../helpers/render";

const allCategories = [
  ...categories,
  { id: "c5", name: "Freelance", type: "income" as const, color: null, icon: null },
];

function categoryGroup() {
  return screen.getByRole("radiogroup", { name: "Categoria" });
}

function categoryNames() {
  return within(categoryGroup())
    .queryAllByRole("radio")
    .map((radio) => radio.textContent);
}

function selectedCategory() {
  return within(categoryGroup())
    .queryAllByRole("radio")
    .find((radio) => radio.getAttribute("aria-checked") === "true")?.textContent;
}

async function renderForm(props: Partial<Parameters<typeof TransactionForm>[0]> = {}) {
  const onSubmit = vi.fn<(data: TransactionFormData) => Promise<void>>().mockResolvedValue();
  const utils = renderUi(<TransactionForm onSubmit={onSubmit} {...props} />);

  await waitFor(() => expect(screen.queryByText("Carregando categorias…")).toBeNull());

  return { onSubmit, ...utils };
}

describe("TransactionForm", () => {
  beforeEach(() => {
    freezeDate();
  });

  it("inicia como Gasto, com a data de hoje, Pix e a primeira categoria de gasto selecionada", async () => {
    const api = mockApi({ "GET /api/categories": allCategories });
    await renderForm();

    expect(api.callsTo("GET", "/api/categories")).toHaveLength(1);
    expect(screen.getByRole("radio", { name: "Gasto" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("Descrição")).toHaveValue("");
    expect(screen.getByLabelText("Valor")).toHaveValue("");
    expect(screen.getByLabelText("Data")).toHaveValue("2026-10-15");
    expect(screen.getByLabelText("Forma de pagamento")).toHaveValue("Pix");
    // Só categorias do tipo selecionado (gasto) aparecem.
    expect(categoryNames()).toEqual(["Alimentação", "Moradia"]);
    expect(selectedCategory()).toBe("Alimentação");
  });

  it("mostra 'Carregando categorias…' enquanto a busca não termina", () => {
    mockApi({ "GET /api/categories": () => new Promise(() => {}) });
    renderUi(<TransactionForm onSubmit={vi.fn()} />);

    expect(screen.getByText("Carregando categorias…")).toBeInTheDocument();
  });

  it("ordena as categorias pelas mais usadas no tipo escolhido", async () => {
    mockApi({
      "GET /api/categories": allCategories,
      "GET /api/transactions": [
        { id: "t1", description: "Aluguel", amount: -1500, category: "Moradia", type: "outcome", date: "2026-10-05T00:00:00.000Z" },
        { id: "t2", description: "Condomínio", amount: -400, category: "Moradia", type: "outcome", date: "2026-10-06T00:00:00.000Z" },
        { id: "t3", description: "Feira", amount: -80, category: "Alimentação", type: "outcome", date: "2026-10-07T00:00:00.000Z" },
      ],
    });
    renderWithProvider(<TransactionForm onSubmit={vi.fn()} />);

    await waitFor(() => expect(categoryNames()).toEqual(["Moradia", "Alimentação"]));
    expect(selectedCategory()).toBe("Moradia");
  });

  it("envia gasto com valor NEGATIVO, data yyyy-mm-dd e observação nula", async () => {
    mockApi({ "GET /api/categories": allCategories });
    const { onSubmit, user } = await renderForm();

    await user.type(screen.getByLabelText("Descrição"), "Mercado");
    await user.type(screen.getByLabelText("Valor"), "120.50");
    await user.click(screen.getByRole("radio", { name: "Moradia" }));
    await user.selectOptions(screen.getByLabelText("Forma de pagamento"), "Cartão de crédito");
    fireEvent.change(screen.getByLabelText("Data"), { target: { value: "2026-10-03" } });
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      description: "Mercado",
      amount: -120.5,
      category: "Moradia",
      type: "outcome",
      paymentMethod: "Cartão de crédito",
      date: "2026-10-03",
      notes: null,
    });
  });

  it("aceita o valor no formato brasileiro (1.234,56)", async () => {
    mockApi({ "GET /api/categories": allCategories });
    const { onSubmit, user } = await renderForm();

    await user.type(screen.getByLabelText("Valor"), "1.234,56");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].amount).toBe(-1234.56);
  });

  it("sem descrição, usa o nome da categoria", async () => {
    mockApi({ "GET /api/categories": allCategories });
    const { onSubmit, user } = await renderForm();

    await user.type(screen.getByLabelText("Valor"), "35");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ description: "Alimentação", amount: -35 });
  });

  it("envia receita com valor POSITIVO e troca a categoria para a primeira de receita", async () => {
    mockApi({ "GET /api/categories": allCategories });
    const { onSubmit, user } = await renderForm();

    await user.click(screen.getByRole("radio", { name: "Receita" }));
    expect(categoryNames()).toEqual(["Salário", "Freelance"]);
    expect(selectedCategory()).toBe("Salário");

    await user.type(screen.getByLabelText("Descrição"), "Salário de outubro");
    await user.type(screen.getByLabelText("Valor"), "5000");
    await user.type(screen.getByLabelText("Observação"), "  13º incluso  ");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      description: "Salário de outubro",
      amount: 5000,
      category: "Salário",
      type: "income",
      paymentMethod: "Pix",
      date: "2026-10-15",
      notes: "13º incluso",
    });
  });

  it("envia investimento com valor NEGATIVO e tipo investment", async () => {
    mockApi({ "GET /api/categories": allCategories });
    const { onSubmit, user } = await renderForm();

    await user.click(screen.getByRole("radio", { name: "Investimento" }));
    expect(selectedCategory()).toBe("Renda fixa");
    await user.type(screen.getByLabelText("Descrição"), "CDB");
    await user.type(screen.getByLabelText("Valor"), "1000");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      amount: -1000,
      type: "investment",
      category: "Renda fixa",
    });
  });

  it("não envia sem valor válido nem sem categoria, e explica o motivo", async () => {
    mockApi({ "GET /api/categories": [] });
    const { onSubmit, user } = await renderForm();

    expect(screen.getByLabelText("Data")).toBeRequired();

    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Informe um valor maior que zero.");
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Valor"), "10");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Escolha uma categoria.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("bloqueia valor zero, negativo ou que não é número", async () => {
    mockApi({ "GET /api/categories": allCategories });
    const { onSubmit, user } = await renderForm();

    for (const invalid of ["-50", "0", "abc"]) {
      await user.clear(screen.getByLabelText("Valor"));
      await user.type(screen.getByLabelText("Valor"), invalid);
      await user.click(screen.getByRole("button", { name: "Salvar" }));
      expect(onSubmit).not.toHaveBeenCalled();
    }

    await user.clear(screen.getByLabelText("Valor"));
    await user.type(screen.getByLabelText("Valor"), "0,01");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].amount).toBe(-0.01);
  });

  it("limpa o formulário depois de enviar", async () => {
    mockApi({ "GET /api/categories": allCategories });
    const { onSubmit, user } = await renderForm();

    await user.click(screen.getByRole("radio", { name: "Receita" }));
    await user.type(screen.getByLabelText("Descrição"), "Bônus");
    await user.type(screen.getByLabelText("Valor"), "300");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByLabelText("Descrição")).toHaveValue(""));
    expect(screen.getByLabelText("Valor")).toHaveValue("");
    // Volta para "Gasto" e reseleciona a primeira categoria de gasto.
    expect(screen.getByRole("radio", { name: "Gasto" })).toHaveAttribute("aria-checked", "true");
    expect(selectedCategory()).toBe("Alimentação");
  });

  it("no modo edição preenche os campos com o valor absoluto, tipo, categoria, data e observação", async () => {
    mockApi({ "GET /api/categories": allCategories });
    await renderForm({
      submitLabel: "Salvar alterações",
      initialValues: {
        description: "Aluguel",
        amount: -1500,
        category: "Moradia",
        type: "outcome",
        paymentMethod: "Boleto",
        notes: "Vence dia 6",
        date: "2026-10-06T15:00:00.000Z",
      },
    });

    expect(screen.getByLabelText("Descrição")).toHaveValue("Aluguel");
    expect(screen.getByLabelText("Valor")).toHaveValue("1.500,00");
    expect(screen.getByLabelText("Data")).toHaveValue("2026-10-06");
    expect(selectedCategory()).toBe("Moradia");
    expect(screen.getByLabelText("Forma de pagamento")).toHaveValue("Boleto");
    expect(screen.getByLabelText("Observação")).toHaveValue("Vence dia 6");
    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeInTheDocument();
  });

  it("no modo edição preserva uma categoria que não existe mais na lista", async () => {
    mockApi({ "GET /api/categories": allCategories });
    const { onSubmit, user } = await renderForm({
      initialValues: {
        description: "Cinema",
        amount: -40,
        category: "Categoria antiga",
        type: "outcome",
        date: "2026-10-06T15:00:00.000Z",
      },
    });

    expect(selectedCategory()).toBe("Categoria antiga");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      category: "Categoria antiga",
      amount: -40,
      date: "2026-10-06",
    });
  });

  it("mostra Excluir só quando recebe onDelete", async () => {
    mockApi({ "GET /api/categories": allCategories });
    const onDelete = vi.fn();
    const { user } = await renderForm({ onDelete });

    await user.click(screen.getByRole("button", { name: "Excluir" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("segue utilizável quando a busca de categorias falha", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockApi({ "GET /api/categories": networkError() });
    await renderForm();

    expect(categoryNames()).toEqual([]);
    expect(screen.getByRole("button", { name: "Nova categoria" })).toBeInTheDocument();
  });

  describe("criação rápida de categoria", () => {
    it("cria a categoria com o tipo atual, recarrega a lista e a seleciona", async () => {
      const created = { id: "c9", name: "Pets", type: "outcome", color: "#2f5d50", icon: null };
      const api = mockApi({
        "GET /api/categories": allCategories,
        "POST /api/categories": () => {
          api.on("GET /api/categories", [...allCategories, created]);
          return reply(201, created);
        },
      });
      const { user } = await renderForm();

      await user.click(screen.getByRole("button", { name: "Nova categoria" }));
      const modal = getModalByTitle("Nova categoria");
      await user.type(within(modal).getByLabelText("Nome"), "Pets");
      await user.click(within(modal).getByRole("button", { name: "Criar categoria" }));

      await waitFor(() => expect(queryModalByTitle("Nova categoria")).toBeNull());
      expect(api.callsTo("POST", "/api/categories")[0].body).toMatchObject({
        name: "Pets",
        type: "outcome",
      });
      expect(api.callsTo("GET", "/api/categories")).toHaveLength(2);
      await waitFor(() => expect(selectedCategory()).toBe("Pets"));
    });

    it("quando a criação falha mostra o erro da API no modal, que continua aberto com o nome digitado", async () => {
      mockApi({
        "GET /api/categories": allCategories,
        "POST /api/categories": reply(409, { error: "Categoria já existe." }),
      });
      const { user } = await renderForm();

      await user.click(screen.getByRole("button", { name: "Nova categoria" }));
      const modal = getModalByTitle("Nova categoria");
      await user.type(within(modal).getByLabelText("Nome"), "Moradia");
      await user.click(within(modal).getByRole("button", { name: "Criar categoria" }));

      expect(await within(modal).findByRole("alert")).toHaveTextContent("Categoria já existe.");
      expect(queryModalByTitle("Nova categoria")).not.toBeNull();
      expect(within(modal).getByLabelText("Nome")).toHaveValue("Moradia");
      expect(selectedCategory()).toBe("Alimentação");
    });
  });

  describe("falha no envio", () => {
    it("mostra a mensagem do erro em role=alert, mantém os valores digitados e reabilita o botão", async () => {
      mockApi({ "GET /api/categories": allCategories });
      const { onSubmit, user } = await renderForm();
      onSubmit.mockRejectedValueOnce(new Error("Erro ao salvar os dados."));

      await user.type(screen.getByLabelText("Descrição"), "Mercado");
      await user.type(screen.getByLabelText("Valor"), "120");
      await user.type(screen.getByLabelText("Observação"), "compra do mês");
      await user.click(screen.getByRole("button", { name: "Salvar" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Erro ao salvar os dados.");
      expect(screen.getByLabelText("Descrição")).toHaveValue("Mercado");
      expect(screen.getByLabelText("Valor")).toHaveValue("120");
      expect(screen.getByLabelText("Observação")).toHaveValue("compra do mês");
      expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();

      // Uma nova tentativa bem-sucedida limpa o erro e o formulário.
      await user.click(screen.getByRole("button", { name: "Salvar" }));
      await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
      await waitFor(() => expect(screen.getByLabelText("Descrição")).toHaveValue(""));
      expect(onSubmit).toHaveBeenCalledTimes(2);
    });

    it("usa a mensagem padrão quando a rejeição não traz mensagem", async () => {
      mockApi({ "GET /api/categories": allCategories });
      const { onSubmit, user } = await renderForm();
      onSubmit.mockRejectedValueOnce("falhou");

      await user.type(screen.getByLabelText("Valor"), "120");
      await user.click(screen.getByRole("button", { name: "Salvar" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível salvar o lançamento.");
    });

    it("desabilita o botão de envio enquanto a submissão está pendente", async () => {
      mockApi({ "GET /api/categories": allCategories });
      const { onSubmit, user } = await renderForm();
      let finish: () => void = () => {};
      onSubmit.mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)));

      await user.type(screen.getByLabelText("Valor"), "120");
      await user.click(screen.getByRole("button", { name: "Salvar" }));

      expect(screen.getByRole("button", { name: "Salvando…" })).toBeDisabled();
      finish();
      await waitFor(() => expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled());
    });
  });

  describe("comportamentos documentados", () => {
    it("defaultType define o tipo inicial e o tipo após o reset", async () => {
      mockApi({ "GET /api/categories": allCategories });
      const { onSubmit, user } = await renderForm({ defaultType: "investment" });

      await waitFor(() => expect(selectedCategory()).toBe("Renda fixa"));
      await user.type(screen.getByLabelText("Descrição"), "CDB");
      await user.type(screen.getByLabelText("Valor"), "100");
      await user.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0][0]).toMatchObject({ type: "investment", amount: -100 });
      await waitFor(() => expect(screen.getByLabelText("Descrição")).toHaveValue(""));
      expect(selectedCategory()).toBe("Renda fixa");
    });

    it("[regressão de fuso] às 22h30 de 12/10 (hora local) a data padrão é 12/10, não 13/10", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(2026, 9, 12, 22, 30));
      mockApi({ "GET /api/categories": allCategories });
      await renderForm();

      expect(screen.getByLabelText("Data")).toHaveValue("2026-10-12");
    });

    it("a data padrão é a data LOCAL: às 23h30 de 15/10 (Brasília, já 16/10 em UTC) sugere 15/10", async () => {
      freezeDate("2026-10-16T02:30:00.000Z");
      mockApi({ "GET /api/categories": allCategories });
      await renderForm();

      expect(screen.getByLabelText("Data")).toHaveValue("2026-10-15");
    });

    it("[bug] no modo edição o formulário é zerado após salvar (se o pai não desmontar)", async () => {
      mockApi({ "GET /api/categories": allCategories });
      const { onSubmit, user } = await renderForm({
        initialValues: {
          description: "Aluguel",
          amount: -1500,
          category: "Moradia",
          type: "outcome",
          date: "2026-10-06T15:00:00.000Z",
        },
      });

      await user.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      await waitFor(() => expect(screen.getByLabelText("Descrição")).toHaveValue(""));
      expect(screen.getByLabelText("Data")).toHaveValue("2026-10-15");
    });

    it("[a11y] tipo e categoria são grupos de rádio com o item escolhido em aria-checked", async () => {
      mockApi({ "GET /api/categories": allCategories });
      await renderForm();

      const typeGroup = screen.getByRole("radiogroup", { name: "Tipo" });
      expect(within(typeGroup).getByRole("radio", { name: "Gasto" })).toHaveAttribute("aria-checked", "true");
      expect(within(typeGroup).getByRole("radio", { name: "Receita" })).toHaveAttribute("aria-checked", "false");
      expect(within(categoryGroup()).getByRole("radio", { name: "Alimentação" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });
  });
});
