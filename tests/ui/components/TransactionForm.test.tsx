import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TransactionForm, type TransactionFormData } from "@/components/TransactionForm";
import { mockApi, networkError, reply } from "../helpers/api";
import { categories } from "../helpers/fixtures";
import { freezeDate, getModalByTitle, queryModalByTitle, renderUi } from "../helpers/render";

const allCategories = [
  ...categories,
  { id: "c5", name: "Freelance", type: "income" as const, color: null, icon: null },
];

async function renderForm(props: Partial<Parameters<typeof TransactionForm>[0]> = {}) {
  const onSubmit = vi.fn<(data: TransactionFormData) => Promise<void>>().mockResolvedValue();
  const utils = renderUi(<TransactionForm onSubmit={onSubmit} {...props} />);

  // Aguarda o carregamento das categorias terminar.
  await waitFor(() =>
    expect(screen.queryByRole("option", { name: "Carregando categorias..." })).toBeNull(),
  );

  return { onSubmit, ...utils };
}

describe("TransactionForm", () => {
  beforeEach(() => {
    freezeDate();
  });

  it("inicia como Saída, com a data de hoje, Pix e a primeira categoria de despesa selecionada", async () => {
    const api = mockApi({ "GET /api/categories": allCategories });
    await renderForm();

    expect(api.callsTo("GET", "/api/categories")).toHaveLength(1);
    expect(screen.getByLabelText("Descrição")).toHaveValue("");
    expect(screen.getByLabelText("Valor")).toHaveValue(null);
    expect(screen.getByLabelText("Data")).toHaveValue("2026-10-15");
    expect(screen.getByLabelText("Forma de pagamento")).toHaveValue("Pix");
    await waitFor(() => expect(screen.getByLabelText("Categoria")).toHaveValue("Alimentação"));
    // Só categorias do tipo selecionado (despesa) aparecem.
    expect(
      within(screen.getByLabelText("Categoria"))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Selecione uma categoria", "Alimentação", "Moradia"]);
  });

  it("mostra 'Carregando categorias...' enquanto a busca não termina", () => {
    mockApi({ "GET /api/categories": () => new Promise(() => {}) });
    renderUi(<TransactionForm onSubmit={vi.fn()} />);

    expect(screen.getByRole("option", { name: "Carregando categorias..." })).toBeInTheDocument();
  });

  it("envia despesa com valor NEGATIVO, data yyyy-mm-dd e observação nula", async () => {
    mockApi({ "GET /api/categories": allCategories });
    const { onSubmit, user } = await renderForm();

    await user.type(screen.getByLabelText("Descrição"), "Mercado");
    await user.type(screen.getByLabelText("Valor"), "120.50");
    await user.selectOptions(screen.getByLabelText("Categoria"), "Moradia");
    await user.selectOptions(screen.getByLabelText("Forma de pagamento"), "Cartão de crédito");
    fireEvent.change(screen.getByLabelText("Data"), { target: { value: "2026-10-03" } });
    await user.click(screen.getByRole("button", { name: "Salvar Transação" }));

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

  it("envia receita com valor POSITIVO e troca a categoria para a primeira de receita", async () => {
    mockApi({ "GET /api/categories": allCategories });
    const { onSubmit, user } = await renderForm();

    await user.click(screen.getByRole("button", { name: "Entrada" }));
    expect(screen.getByLabelText("Categoria")).toHaveValue("Salário");
    expect(
      within(screen.getByLabelText("Categoria"))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Selecione uma categoria", "Salário", "Freelance"]);

    await user.type(screen.getByLabelText("Descrição"), "Salário de outubro");
    await user.type(screen.getByLabelText("Valor"), "5000");
    await user.type(screen.getByLabelText("Observação"), "  13º incluso  ");
    await user.click(screen.getByRole("button", { name: "Salvar Transação" }));

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

    await user.click(screen.getByRole("button", { name: "Investimento" }));
    expect(screen.getByLabelText("Categoria")).toHaveValue("Renda fixa");
    await user.type(screen.getByLabelText("Descrição"), "CDB");
    await user.type(screen.getByLabelText("Valor"), "1000");
    await user.click(screen.getByRole("button", { name: "Salvar Transação" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      amount: -1000,
      type: "investment",
      category: "Renda fixa",
    });
  });

  it("não envia quando descrição, valor ou categoria obrigatórios estão vazios", async () => {
    mockApi({ "GET /api/categories": [] });
    const { onSubmit, user } = await renderForm();

    expect(screen.getByLabelText("Descrição")).toBeRequired();
    expect(screen.getByLabelText("Valor")).toBeRequired();
    expect(screen.getByLabelText("Data")).toBeRequired();
    expect(screen.getByLabelText("Categoria")).toBeRequired();

    await user.click(screen.getByRole("button", { name: "Salvar Transação" }));
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Descrição"), "Sem categoria");
    await user.type(screen.getByLabelText("Valor"), "10");
    await user.click(screen.getByRole("button", { name: "Salvar Transação" }));
    // Sem categorias cadastradas o select fica vazio e bloqueia o envio.
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("limpa o formulário depois de enviar", async () => {
    mockApi({ "GET /api/categories": allCategories });
    const { onSubmit, user } = await renderForm();

    await user.click(screen.getByRole("button", { name: "Entrada" }));
    await user.type(screen.getByLabelText("Descrição"), "Bônus");
    await user.type(screen.getByLabelText("Valor"), "300");
    await user.click(screen.getByRole("button", { name: "Salvar Transação" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByLabelText("Descrição")).toHaveValue(""));
    expect(screen.getByLabelText("Valor")).toHaveValue(null);
    // Volta para "Saída" e reseleciona a primeira categoria de despesa.
    await waitFor(() => expect(screen.getByLabelText("Categoria")).toHaveValue("Alimentação"));
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
    expect(screen.getByLabelText("Valor")).toHaveValue(1500);
    expect(screen.getByLabelText("Data")).toHaveValue("2026-10-06");
    expect(screen.getByLabelText("Categoria")).toHaveValue("Moradia");
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

    expect(screen.getByLabelText("Categoria")).toHaveValue("Categoria antiga");
    await user.click(screen.getByRole("button", { name: "Salvar Transação" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      category: "Categoria antiga",
      amount: -40,
      date: "2026-10-06",
    });
  });

  it("segue utilizável quando a busca de categorias falha", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockApi({ "GET /api/categories": networkError() });
    await renderForm();

    expect(
      within(screen.getByLabelText("Categoria"))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Selecione uma categoria"]);
  });

  describe("criação rápida de categoria", () => {
    it("cria a categoria com o tipo atual, recarrega a lista e a seleciona", async () => {
      const created = { id: "c9", name: "Pets", type: "outcome", color: "#00c48c", icon: null };
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
      expect(within(modal).getByLabelText("Tipo")).toHaveValue("outcome");
      await user.type(within(modal).getByLabelText("Nome"), "Pets");
      await user.click(within(modal).getByRole("button", { name: "Criar categoria" }));

      await waitFor(() => expect(queryModalByTitle("Nova categoria")).toBeNull());
      expect(api.callsTo("POST", "/api/categories")[0].body).toEqual({
        name: "Pets",
        type: "outcome",
        color: "#00c48c",
        icon: null,
      });
      expect(api.callsTo("GET", "/api/categories")).toHaveLength(2);
      await waitFor(() => expect(screen.getByLabelText("Categoria")).toHaveValue("Pets"));
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
      expect(screen.getByLabelText("Categoria")).toHaveValue("Alimentação");
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
      await user.click(screen.getByRole("button", { name: "Salvar Transação" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Erro ao salvar os dados.");
      expect(screen.getByLabelText("Descrição")).toHaveValue("Mercado");
      expect(screen.getByLabelText("Valor")).toHaveValue(120);
      expect(screen.getByLabelText("Observação")).toHaveValue("compra do mês");
      expect(screen.getByRole("button", { name: "Salvar Transação" })).toBeEnabled();

      // Uma nova tentativa bem-sucedida limpa o erro e o formulário.
      await user.click(screen.getByRole("button", { name: "Salvar Transação" }));
      await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
      await waitFor(() => expect(screen.getByLabelText("Descrição")).toHaveValue(""));
      expect(onSubmit).toHaveBeenCalledTimes(2);
    });

    it("usa a mensagem padrão quando a rejeição não traz mensagem", async () => {
      mockApi({ "GET /api/categories": allCategories });
      const { onSubmit, user } = await renderForm();
      onSubmit.mockRejectedValueOnce("falhou");

      await user.type(screen.getByLabelText("Descrição"), "Mercado");
      await user.type(screen.getByLabelText("Valor"), "120");
      await user.click(screen.getByRole("button", { name: "Salvar Transação" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível salvar a transação.");
    });

    it("desabilita o botão de envio enquanto a submissão está pendente", async () => {
      mockApi({ "GET /api/categories": allCategories });
      const { onSubmit, user } = await renderForm();
      let finish: () => void = () => {};
      onSubmit.mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)));

      await user.type(screen.getByLabelText("Descrição"), "Mercado");
      await user.type(screen.getByLabelText("Valor"), "120");
      await user.click(screen.getByRole("button", { name: "Salvar Transação" }));

      expect(screen.getByRole("button", { name: "Salvar Transação" })).toBeDisabled();
      finish();
      await waitFor(() => expect(screen.getByRole("button", { name: "Salvar Transação" })).toBeEnabled());
    });
  });

  describe("comportamentos questionáveis (documentados)", () => {
    it("bloqueia valor zero ou negativo (min=0.01, step=0.01)", async () => {
      mockApi({ "GET /api/categories": allCategories });
      const { onSubmit, user } = await renderForm();

      expect(screen.getByLabelText("Valor")).toHaveAttribute("min", "0.01");
      expect(screen.getByLabelText("Valor")).toHaveAttribute("step", "0.01");

      await user.type(screen.getByLabelText("Descrição"), "Inválida");
      await user.type(screen.getByLabelText("Valor"), "-50");
      await user.click(screen.getByRole("button", { name: "Salvar Transação" }));
      expect(onSubmit).not.toHaveBeenCalled();

      await user.clear(screen.getByLabelText("Valor"));
      await user.type(screen.getByLabelText("Valor"), "0");
      await user.click(screen.getByRole("button", { name: "Salvar Transação" }));
      expect(onSubmit).not.toHaveBeenCalled();

      await user.clear(screen.getByLabelText("Valor"));
      await user.type(screen.getByLabelText("Valor"), "0.01");
      await user.click(screen.getByRole("button", { name: "Salvar Transação" }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0][0].amount).toBe(-0.01);
    });

    it("defaultType define o tipo inicial e o tipo após o reset", async () => {
      mockApi({ "GET /api/categories": allCategories });
      const { onSubmit, user } = await renderForm({ defaultType: "investment" });

      await waitFor(() => expect(screen.getByLabelText("Categoria")).toHaveValue("Renda fixa"));
      await user.type(screen.getByLabelText("Descrição"), "CDB");
      await user.type(screen.getByLabelText("Valor"), "100");
      await user.click(screen.getByRole("button", { name: "Salvar Transação" }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0][0]).toMatchObject({ type: "investment", amount: -100 });
      await waitFor(() => expect(screen.getByLabelText("Descrição")).toHaveValue(""));
      await waitFor(() => expect(screen.getByLabelText("Categoria")).toHaveValue("Renda fixa"));
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

      await user.click(screen.getByRole("button", { name: "Salvar Transação" }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      await waitFor(() => expect(screen.getByLabelText("Descrição")).toHaveValue(""));
      expect(screen.getByLabelText("Data")).toHaveValue("2026-10-15");
    });

    it("[a11y] expõe o tipo selecionado com aria-pressed nos botões de tipo", async () => {
      mockApi({ "GET /api/categories": allCategories });
      await renderForm();

      expect(screen.getByRole("button", { name: "Saída" })).toHaveAttribute("aria-pressed", "true");
    });
  });
});
