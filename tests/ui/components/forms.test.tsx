import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BudgetForm, type BudgetFormData } from "@/components/BudgetForm";
import { CategoryForm, type CategoryFormData } from "@/components/CategoryForm";
import { colorPalette, defaultColor } from "@/components/ColorSwatches";
import { GoalForm, type GoalFormData } from "@/components/GoalForm";
import { categories } from "../helpers/fixtures";
import { freezeDate, renderUi } from "../helpers/render";

describe("CategoryForm", () => {
  function renderForm(props: Partial<Parameters<typeof CategoryForm>[0]> = {}) {
    const onSubmit = vi.fn<(data: CategoryFormData) => Promise<void>>().mockResolvedValue();

    return { onSubmit, ...renderUi(<CategoryForm onSubmit={onSubmit} {...props} />) };
  }

  it("inicia vazio, como Gasto e com a primeira cor da paleta", () => {
    renderForm();

    expect(screen.getByLabelText("Nome")).toHaveValue("");
    expect(screen.getByLabelText("Nome")).toBeRequired();
    expect(screen.getByRole("radio", { name: "Gasto" })).toBeChecked();
    expect(within(screen.getByRole("radiogroup", { name: "Cor" })).getByRole("radio", { name: "Verde" })).toBeChecked();
    expect(screen.getByLabelText("Cor personalizada")).toHaveValue(defaultColor);
    expect(screen.getByLabelText("Ícone simples")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Salvar categoria" })).toBeInTheDocument();
  });

  it("não envia sem nome", async () => {
    const { onSubmit, user } = renderForm();

    await user.click(screen.getByRole("button", { name: "Salvar categoria" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("envia nome e ícone sem espaços nas pontas, tipo e cor escolhidos", async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText("Nome"), "  Salário  ");
    await user.click(screen.getByRole("radio", { name: "Receita" }));
    fireEvent.change(screen.getByLabelText("Cor personalizada"), { target: { value: "#ff0000" } });
    await user.type(screen.getByLabelText("Ícone simples"), " money ");
    await user.click(screen.getByRole("button", { name: "Salvar categoria" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Salário",
      type: "income",
      color: "#ff0000",
      icon: "money",
    });
  });

  it("oferece os três tipos: Gasto, Receita e Investimento", () => {
    renderForm();

    expect(
      within(screen.getByRole("radiogroup", { name: "Tipo" }))
        .getAllByRole("radio")
        .map((radio) => [radio.parentElement?.textContent, (radio as HTMLInputElement).value]),
    ).toEqual([
      ["Gasto", "outcome"],
      ["Receita", "income"],
      ["Investimento", "investment"],
    ]);
  });

  it("escolhe a cor pela paleta (radiogroup acessível) e envia o valor da amostra", async () => {
    const { onSubmit, user } = renderForm();
    const palette = screen.getByRole("radiogroup", { name: "Cor" });

    expect(within(palette).getAllByRole("radio").map((radio) => radio.getAttribute("aria-label"))).toEqual(
      colorPalette.map((color) => color.name),
    );

    await user.type(screen.getByLabelText("Nome"), "Pets");
    await user.click(within(palette).getByRole("radio", { name: "Azul" }));
    expect(within(palette).getByRole("radio", { name: "Azul" })).toBeChecked();
    expect(within(palette).getByRole("radio", { name: "Verde" })).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "Salvar categoria" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].color).toBe(colorPalette.find((color) => color.name === "Azul")!.value);
  });

  it("aceita o tipo padrão (defaultType) e volta a ele após criar", async () => {
    const { onSubmit, user } = renderForm({ defaultType: "income" });

    expect(screen.getByRole("radio", { name: "Receita" })).toBeChecked();
    await user.type(screen.getByLabelText("Nome"), "Bônus");
    await user.click(screen.getByRole("radio", { name: "Gasto" }));
    await user.click(screen.getByRole("button", { name: "Salvar categoria" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ type: "outcome" })));
    await waitFor(() => expect(screen.getByRole("radio", { name: "Receita" })).toBeChecked());
  });

  it("mostra Excluir só quando recebe onDelete", async () => {
    const onDelete = vi.fn();
    const { user, unmount } = renderForm({ onDelete });

    await user.click(screen.getByRole("button", { name: "Excluir" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    unmount();

    renderForm();
    expect(screen.queryByRole("button", { name: "Excluir" })).toBeNull();
  });

  it("limpa os campos após criar", async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText("Nome"), "Lazer");
    await user.click(screen.getByRole("radio", { name: "Investimento" }));
    fireEvent.change(screen.getByLabelText("Cor personalizada"), { target: { value: "#123456" } });
    await user.click(screen.getByRole("button", { name: "Salvar categoria" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByLabelText("Nome")).toHaveValue(""));
    expect(screen.getByRole("radio", { name: "Gasto" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Verde" })).toBeChecked();
  });

  it("no modo edição preenche os campos e não limpa após salvar", async () => {
    const { onSubmit, user } = renderForm({
      submitLabel: "Salvar alterações",
      initialValues: { name: "Alimentação", type: "outcome", color: "#f75a68", icon: "food" },
    });

    expect(screen.getByLabelText("Nome")).toHaveValue("Alimentação");
    expect(screen.getByRole("radio", { name: "Gasto" })).toBeChecked();
    expect(screen.getByLabelText("Cor personalizada")).toHaveValue("#f75a68");
    expect(
      within(screen.getByRole("radiogroup", { name: "Cor" }))
        .getAllByRole("radio")
        .filter((radio) => (radio as HTMLInputElement).checked),
    ).toHaveLength(0);
    expect(screen.getByLabelText("Ícone simples")).toHaveValue("food");

    await user.clear(screen.getByLabelText("Nome"));
    await user.type(screen.getByLabelText("Nome"), "Comida");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Comida",
      type: "outcome",
      color: "#f75a68",
      icon: "food",
    });
    expect(screen.getByLabelText("Nome")).toHaveValue("Comida");
  });

  it("[bug] nome só com espaços passa pela validação e é enviado como string vazia", async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText("Nome"), "   ");
    await user.click(screen.getByRole("button", { name: "Salvar categoria" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].name).toBe("");
  });

  it("apagar o ícone na edição envia icon null (permite limpar o campo na API)", async () => {
    const { onSubmit, user } = renderForm({
      initialValues: { name: "Alimentação", type: "outcome", color: "#f75a68", icon: "food" },
    });

    await user.clear(screen.getByLabelText("Ícone simples"));
    await user.click(screen.getByRole("button", { name: "Salvar categoria" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].icon).toBeNull();
  });
});

describe("BudgetForm", () => {
  beforeEach(() => {
    freezeDate();
  });

  function renderForm(props: Partial<Parameters<typeof BudgetForm>[0]> = {}) {
    const onSubmit = vi.fn<(data: BudgetFormData) => Promise<void>>().mockResolvedValue();

    return {
      onSubmit,
      ...renderUi(<BudgetForm categories={categories} onSubmit={onSubmit} {...props} />),
    };
  }

  it("lista apenas categorias de despesa e pré-seleciona a primeira e o mês atual", () => {
    renderForm();

    expect(
      within(screen.getByLabelText("Categoria"))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Selecione uma categoria", "Alimentação", "Moradia"]);
    expect(screen.getByLabelText("Categoria")).toHaveValue("Alimentação");
    expect(screen.getByLabelText("Limite mensal")).toHaveValue(null);
    expect(screen.getByLabelText("Mês")).toHaveValue("2026-10");
  });

  it("envia categoria, limite numérico e mês no formato yyyy-mm", async () => {
    const { onSubmit, user } = renderForm();

    await user.selectOptions(screen.getByLabelText("Categoria"), "Moradia");
    await user.type(screen.getByLabelText("Limite mensal"), "1500.75");
    fireEvent.change(screen.getByLabelText("Mês"), { target: { value: "2026-11" } });
    await user.click(screen.getByRole("button", { name: "Salvar orçamento" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ category: "Moradia", amount: 1500.75, month: "2026-11" });
  });

  it("não envia sem limite, com limite zero ou negativo", async () => {
    const { onSubmit, user } = renderForm();

    await user.click(screen.getByRole("button", { name: "Salvar orçamento" }));
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Limite mensal"), "0");
    await user.click(screen.getByRole("button", { name: "Salvar orçamento" }));
    expect(onSubmit).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Limite mensal"));
    await user.type(screen.getByLabelText("Limite mensal"), "-10");
    await user.click(screen.getByRole("button", { name: "Salvar orçamento" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("não envia sem mês", async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText("Limite mensal"), "100");
    fireEvent.change(screen.getByLabelText("Mês"), { target: { value: "" } });
    await user.click(screen.getByRole("button", { name: "Salvar orçamento" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("sem categorias de despesa o select fica vazio e o envio é bloqueado (sem orientação ao usuário)", async () => {
    const { onSubmit, user } = renderForm({
      categories: categories.filter((category) => category.type !== "outcome"),
    });

    expect(within(screen.getByLabelText("Categoria")).getAllByRole("option")).toHaveLength(1);
    await user.type(screen.getByLabelText("Limite mensal"), "100");
    await user.click(screen.getByRole("button", { name: "Salvar orçamento" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("limpa o formulário após criar", async () => {
    const { onSubmit, user } = renderForm();

    await user.selectOptions(screen.getByLabelText("Categoria"), "Moradia");
    await user.type(screen.getByLabelText("Limite mensal"), "900");
    await user.click(screen.getByRole("button", { name: "Salvar orçamento" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByLabelText("Limite mensal")).toHaveValue(null));
    expect(screen.getByLabelText("Categoria")).toHaveValue("Alimentação");
  });

  it("no modo edição preenche os campos, inclusive categoria que não existe mais", async () => {
    const { onSubmit, user } = renderForm({
      submitLabel: "Salvar alterações",
      initialValues: { category: "Lazer", amount: 2000, month: "2026-09" },
    });

    expect(screen.getByLabelText("Categoria")).toHaveValue("Lazer");
    expect(screen.getByLabelText("Limite mensal")).toHaveValue(2000);
    expect(screen.getByLabelText("Mês")).toHaveValue("2026-09");

    await user.clear(screen.getByLabelText("Limite mensal"));
    await user.type(screen.getByLabelText("Limite mensal"), "2500");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith({ category: "Lazer", amount: 2500, month: "2026-09" });
    // Em edição os valores permanecem após salvar.
    expect(screen.getByLabelText("Limite mensal")).toHaveValue(2500);
  });

  it("defaultMonth define o mês inicial e o mês após o reset", async () => {
    const { onSubmit, user } = renderForm({ defaultMonth: "2026-08" });

    expect(screen.getByLabelText("Mês")).toHaveValue("2026-08");
    await user.type(screen.getByLabelText("Limite mensal"), "100");
    await user.click(screen.getByRole("button", { name: "Salvar orçamento" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ category: "Alimentação", amount: 100, month: "2026-08" }));
    await waitFor(() => expect(screen.getByLabelText("Limite mensal")).toHaveValue(null));
    expect(screen.getByLabelText("Mês")).toHaveValue("2026-08");
  });

  it("mostra Excluir só quando recebe onDelete", async () => {
    const onDelete = vi.fn();
    const { user } = renderForm({ onDelete });

    await user.click(screen.getByRole("button", { name: "Excluir" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("o mês padrão é o mês LOCAL: às 22h de 31/10 (Brasília, já novembro em UTC) sugere outubro", () => {
    freezeDate("2026-11-01T01:00:00.000Z");
    renderForm();

    expect(screen.getByLabelText("Mês")).toHaveValue("2026-10");
  });
});

describe("GoalForm", () => {
  function renderForm(props: Partial<Parameters<typeof GoalForm>[0]> = {}) {
    const onSubmit = vi.fn<(data: GoalFormData) => Promise<void>>().mockResolvedValue();

    return { onSubmit, ...renderUi(<GoalForm onSubmit={onSubmit} {...props} />) };
  }

  it("inicia vazio com a primeira cor da paleta; nome e valor alvo são obrigatórios", () => {
    renderForm();

    expect(screen.getByLabelText("Nome da meta")).toBeRequired();
    expect(screen.getByLabelText("Valor alvo")).toBeRequired();
    expect(screen.getByLabelText("Valor atual")).not.toBeRequired();
    expect(screen.getByLabelText("Prazo (opcional)")).not.toBeRequired();
    expect(screen.getByRole("radio", { name: "Verde" })).toBeChecked();
    expect(screen.getByLabelText("Cor personalizada")).toHaveValue(defaultColor);
  });

  it("não envia sem nome ou sem valor alvo, nem com alvo zero", async () => {
    const { onSubmit, user } = renderForm();

    await user.click(screen.getByRole("button", { name: "Salvar meta" }));
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Nome da meta"), "Viagem");
    await user.click(screen.getByRole("button", { name: "Salvar meta" }));
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Valor alvo"), "0");
    await user.click(screen.getByRole("button", { name: "Salvar meta" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("envia apenas o mínimo: valor atual vira 0 e prazo vira null", async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText("Nome da meta"), "  Viagem  ");
    await user.type(screen.getByLabelText("Valor alvo"), "5000");
    await user.click(screen.getByRole("button", { name: "Salvar meta" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Viagem",
      targetAmount: 5000,
      currentAmount: 0,
      deadline: null,
      color: defaultColor,
    });
  });

  it("envia todos os campos; o prazo vai como ISO à meia-noite UTC", async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText("Nome da meta"), "Carro");
    await user.type(screen.getByLabelText("Valor alvo"), "30000.50");
    await user.type(screen.getByLabelText("Valor atual"), "1200");
    fireEvent.change(screen.getByLabelText("Prazo (opcional)"), { target: { value: "2026-12-31" } });
    fireEvent.change(screen.getByLabelText("Cor personalizada"), { target: { value: "#0ea5e9" } });
    await user.click(screen.getByRole("button", { name: "Salvar meta" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Carro",
      targetAmount: 30000.5,
      currentAmount: 1200,
      deadline: "2026-12-31T00:00:00.000Z",
      color: "#0ea5e9",
    });
  });

  it("limpa os campos após criar", async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText("Nome da meta"), "Carro");
    await user.type(screen.getByLabelText("Valor alvo"), "100");
    await user.click(screen.getByRole("button", { name: "Salvar meta" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByLabelText("Nome da meta")).toHaveValue(""));
    expect(screen.getByLabelText("Valor alvo")).toHaveValue(null);
  });

  it("no modo edição preenche os campos (prazo em yyyy-mm-dd) e mantém após salvar", async () => {
    const { onSubmit, user } = renderForm({
      submitLabel: "Salvar alterações",
      initialValues: {
        name: "Reserva",
        targetAmount: 10000,
        currentAmount: 2500,
        deadline: "2026-12-31T00:00:00.000Z",
        color: "#8b5cf6",
      },
    });

    expect(screen.getByLabelText("Nome da meta")).toHaveValue("Reserva");
    expect(screen.getByLabelText("Valor alvo")).toHaveValue(10000);
    expect(screen.getByLabelText("Valor atual")).toHaveValue(2500);
    expect(screen.getByLabelText("Prazo (opcional)")).toHaveValue("2026-12-31");
    expect(screen.getByLabelText("Cor personalizada")).toHaveValue("#8b5cf6");

    await user.clear(screen.getByLabelText("Valor atual"));
    await user.type(screen.getByLabelText("Valor atual"), "3000");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Reserva",
      targetAmount: 10000,
      currentAmount: 3000,
      deadline: "2026-12-31T00:00:00.000Z",
      color: "#8b5cf6",
    });
    expect(screen.getByLabelText("Valor atual")).toHaveValue(3000);
  });

  it("[bug] nome só com espaços passa pela validação e é enviado vazio", async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText("Nome da meta"), "   ");
    await user.type(screen.getByLabelText("Valor alvo"), "10");
    await user.click(screen.getByRole("button", { name: "Salvar meta" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].name).toBe("");
  });

  it("[comportamento atual] permite valor atual maior que o alvo", async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText("Nome da meta"), "Meta estourada");
    await user.type(screen.getByLabelText("Valor alvo"), "100");
    await user.type(screen.getByLabelText("Valor atual"), "500");
    await user.click(screen.getByRole("button", { name: "Salvar meta" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ targetAmount: 100, currentAmount: 500 });
  });
});

describe("Formulários: falha no envio (onSubmit rejeitado)", () => {
  beforeEach(() => {
    freezeDate();
  });

  it("CategoryForm mostra o erro em role=alert, mantém os valores e reabilita o botão", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Categoria já existe."));
    const { user } = renderUi(<CategoryForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Nome"), "Moradia");
    await user.click(screen.getByRole("radio", { name: "Receita" }));
    await user.click(screen.getByRole("button", { name: "Salvar categoria" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Categoria já existe.");
    expect(screen.getByLabelText("Nome")).toHaveValue("Moradia");
    expect(screen.getByRole("radio", { name: "Receita" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Salvar categoria" })).toBeEnabled();
  });

  it("BudgetForm mostra o erro em role=alert, mantém os valores e reabilita o botão", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Já existe orçamento para esta categoria neste mês."));
    const { user } = renderUi(<BudgetForm categories={categories} onSubmit={onSubmit} />);

    await user.selectOptions(screen.getByLabelText("Categoria"), "Moradia");
    await user.type(screen.getByLabelText("Limite mensal"), "900");
    await user.click(screen.getByRole("button", { name: "Salvar orçamento" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Já existe orçamento para esta categoria neste mês.",
    );
    expect(screen.getByLabelText("Categoria")).toHaveValue("Moradia");
    expect(screen.getByLabelText("Limite mensal")).toHaveValue(900);
    expect(screen.getByRole("button", { name: "Salvar orçamento" })).toBeEnabled();
  });

  it("GoalForm mostra o erro em role=alert, mantém os valores e reabilita o botão", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Erro ao salvar meta."));
    const { user } = renderUi(<GoalForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Nome da meta"), "Carro");
    await user.type(screen.getByLabelText("Valor alvo"), "30000");
    await user.click(screen.getByRole("button", { name: "Salvar meta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Erro ao salvar meta.");
    expect(screen.getByLabelText("Nome da meta")).toHaveValue("Carro");
    expect(screen.getByLabelText("Valor alvo")).toHaveValue(30000);
    expect(screen.getByRole("button", { name: "Salvar meta" })).toBeEnabled();
  });

  it.each([
    ["CategoryForm", "Não foi possível salvar a categoria."],
    ["BudgetForm", "Não foi possível salvar o orçamento."],
    ["GoalForm", "Não foi possível salvar a meta."],
  ])("%s usa a mensagem padrão quando a rejeição não traz mensagem", async (form, message) => {
    const onSubmit = vi.fn().mockRejectedValue(undefined);
    const { user } = renderUi(
      form === "CategoryForm" ? (
        <CategoryForm onSubmit={onSubmit} />
      ) : form === "BudgetForm" ? (
        <BudgetForm categories={categories} onSubmit={onSubmit} />
      ) : (
        <GoalForm onSubmit={onSubmit} />
      ),
    );

    if (form === "CategoryForm") await user.type(screen.getByLabelText("Nome"), "X");
    if (form === "BudgetForm") await user.type(screen.getByLabelText("Limite mensal"), "10");
    if (form === "GoalForm") {
      await user.type(screen.getByLabelText("Nome da meta"), "X");
      await user.type(screen.getByLabelText("Valor alvo"), "10");
    }

    await user.click(screen.getByRole("button", { name: /^Salvar/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });

  it("os formulários desabilitam o botão de envio enquanto a submissão está pendente", async () => {
    let finish: () => void = () => {};
    const onSubmit = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const { user } = renderUi(<GoalForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Nome da meta"), "Carro");
    await user.type(screen.getByLabelText("Valor alvo"), "10");
    await user.click(screen.getByRole("button", { name: "Salvar meta" }));

    expect(screen.getByRole("button", { name: "Salvar meta" })).toBeDisabled();
    finish();
    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar meta" })).toBeEnabled());
  });
});
