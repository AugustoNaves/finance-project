import { describe, expect, it } from "vitest";
import {
  validateBudgetInput,
  validateCategoryInput,
  validateGoalInput,
  validateTransactionInput,
} from "@/lib/validators";

const validTransaction = {
  description: "Mercado",
  amount: -150.5,
  category: "Alimentação",
  type: "outcome",
  paymentMethod: "Pix",
  notes: null,
  date: "2026-03-10",
};

describe("validateTransactionInput", () => {
  it("aceita o payload enviado pelo formulário e converte a data", () => {
    expect(validateTransactionInput(validTransaction)).toEqual({
      data: { ...validTransaction, date: new Date("2026-03-10") },
    });
  });

  it("remove espaços extras de descrição e categoria", () => {
    const { data } = validateTransactionInput({
      ...validTransaction,
      description: "  Mercado  ",
      category: " Alimentação ",
    });

    expect(data).toMatchObject({ description: "Mercado", category: "Alimentação" });
  });

  it("ignora campos desconhecidos como userId e id", () => {
    const { data } = validateTransactionInput({
      ...validTransaction,
      userId: "outro-usuario",
      id: "tx-forjado",
    });

    expect(data).not.toHaveProperty("userId");
    expect(data).not.toHaveProperty("id");
  });

  it("aceita valores positivos (entrada) e negativos (saída/investimento)", () => {
    expect(validateTransactionInput({ ...validTransaction, amount: 10 }).error).toBeUndefined();
    expect(validateTransactionInput({ ...validTransaction, amount: -10 }).error).toBeUndefined();
  });

  it("aceita tipo nulo ou ausente", () => {
    expect(validateTransactionInput({ ...validTransaction, type: null }).data?.type).toBeNull();
    expect(
      validateTransactionInput({ ...validTransaction, type: undefined }).data,
    ).not.toHaveProperty("type");
  });

  it("não define data quando ela está ausente, nula ou vazia", () => {
    for (const date of [undefined, null, ""]) {
      expect(validateTransactionInput({ ...validTransaction, date }).data).not.toHaveProperty(
        "date",
      );
    }
  });

  it.each([
    ["descrição ausente", { description: undefined }, "Descrição é obrigatória."],
    ["descrição vazia", { description: "   " }, "Descrição é obrigatória."],
    ["descrição não textual", { description: 123 }, "Descrição é obrigatória."],
    ["valor ausente", { amount: undefined }, "Informe um valor numérico diferente de zero."],
    ["valor zero", { amount: 0 }, "Informe um valor numérico diferente de zero."],
    ["valor em string", { amount: "100" }, "Informe um valor numérico diferente de zero."],
    ["valor nulo", { amount: null }, "Informe um valor numérico diferente de zero."],
    ["valor infinito", { amount: Infinity }, "Informe um valor numérico diferente de zero."],
    ["valor NaN", { amount: NaN }, "Informe um valor numérico diferente de zero."],
    ["categoria ausente", { category: undefined }, "Categoria é obrigatória."],
    ["categoria vazia", { category: "" }, "Categoria é obrigatória."],
    ["tipo desconhecido", { type: "transfer" }, "Tipo de transação inválido."],
    ["tipo não textual", { type: 1 }, "Tipo de transação inválido."],
    ["forma de pagamento não textual", { paymentMethod: 5 }, "Forma de pagamento inválida."],
    ["observação não textual", { notes: { a: 1 } }, "Observação inválida."],
    ["data inválida", { date: "31/02/2026x" }, "Data inválida."],
    ["data em tipo inesperado", { date: { dia: 1 } }, "Data inválida."],
  ])("rejeita %s", (_caso, overrides, message) => {
    expect(validateTransactionInput({ ...validTransaction, ...overrides })).toEqual({
      error: message,
    });
  });

  describe("modo parcial", () => {
    it("aceita atualização de um único campo", () => {
      expect(validateTransactionInput({ notes: "ajuste" }, { partial: true })).toEqual({
        data: { notes: "ajuste" },
      });
    });

    it("retorna dados vazios quando nenhum campo é enviado", () => {
      expect(validateTransactionInput({}, { partial: true })).toEqual({ data: {} });
    });

    it("continua validando os campos presentes", () => {
      expect(validateTransactionInput({ amount: 0 }, { partial: true }).error).toBe(
        "Informe um valor numérico diferente de zero.",
      );
      expect(validateTransactionInput({ description: "" }, { partial: true }).error).toBe(
        "Descrição é obrigatória.",
      );
      expect(validateTransactionInput({ category: null }, { partial: true }).error).toBe(
        "Categoria é obrigatória.",
      );
      expect(validateTransactionInput({ type: "x" }, { partial: true }).error).toBe(
        "Tipo de transação inválido.",
      );
      expect(validateTransactionInput({ date: "abc" }, { partial: true }).error).toBe(
        "Data inválida.",
      );
    });
  });
});

const validGoal = {
  name: "Reserva de emergência",
  targetAmount: 10000,
  currentAmount: 2500,
  deadline: "2026-12-31T00:00:00.000Z",
  color: "#00c48c",
};

describe("validateGoalInput", () => {
  it("aceita o payload enviado pelo formulário e converte o prazo", () => {
    expect(validateGoalInput(validGoal)).toEqual({
      data: { ...validGoal, deadline: new Date("2026-12-31T00:00:00.000Z") },
    });
  });

  it("remove espaços extras do nome", () => {
    expect(validateGoalInput({ ...validGoal, name: "  Viagem " }).data?.name).toBe("Viagem");
  });

  it("converte prazo nulo ou vazio em null", () => {
    expect(validateGoalInput({ ...validGoal, deadline: null }).data?.deadline).toBeNull();
    expect(validateGoalInput({ ...validGoal, deadline: "" }).data?.deadline).toBeNull();
  });

  it("não define prazo nem valor atual quando ausentes", () => {
    const { data } = validateGoalInput({ name: "Viagem", targetAmount: 100 });

    expect(data).toEqual({ name: "Viagem", targetAmount: 100 });
  });

  it("aceita valor atual zero", () => {
    expect(validateGoalInput({ ...validGoal, currentAmount: 0 }).data?.currentAmount).toBe(0);
  });

  it.each([
    ["nome ausente", { name: undefined }, "Nome da meta é obrigatório."],
    ["nome vazio", { name: "  " }, "Nome da meta é obrigatório."],
    ["valor alvo ausente", { targetAmount: undefined }, "Valor alvo deve ser um número maior que zero."],
    ["valor alvo zero", { targetAmount: 0 }, "Valor alvo deve ser um número maior que zero."],
    ["valor alvo negativo", { targetAmount: -1 }, "Valor alvo deve ser um número maior que zero."],
    ["valor alvo em string", { targetAmount: "100" }, "Valor alvo deve ser um número maior que zero."],
    ["valor alvo nulo (NaN serializado)", { targetAmount: null }, "Valor alvo deve ser um número maior que zero."],
    ["valor atual negativo", { currentAmount: -0.01 }, "Valor atual deve ser um número maior ou igual a zero."],
    ["valor atual em string", { currentAmount: "10" }, "Valor atual deve ser um número maior ou igual a zero."],
    ["valor atual infinito", { currentAmount: Infinity }, "Valor atual deve ser um número maior ou igual a zero."],
    ["prazo inválido", { deadline: "amanhã" }, "Prazo inválido."],
    ["prazo em tipo inesperado", { deadline: true }, "Prazo inválido."],
    ["cor não textual", { color: 123 }, "Cor inválida."],
  ])("rejeita %s", (_caso, overrides, message) => {
    expect(validateGoalInput({ ...validGoal, ...overrides })).toEqual({ error: message });
  });

  describe("modo parcial", () => {
    it("aceita atualizar apenas o valor atual", () => {
      expect(validateGoalInput({ currentAmount: 300 }, { partial: true })).toEqual({
        data: { currentAmount: 300 },
      });
    });

    it("permite limpar o prazo com null", () => {
      expect(validateGoalInput({ deadline: null }, { partial: true })).toEqual({
        data: { deadline: null },
      });
    });

    it("continua validando os campos presentes", () => {
      expect(validateGoalInput({ targetAmount: 0 }, { partial: true }).error).toBe(
        "Valor alvo deve ser um número maior que zero.",
      );
      expect(validateGoalInput({ name: "" }, { partial: true }).error).toBe(
        "Nome da meta é obrigatório.",
      );
      expect(validateGoalInput({ currentAmount: -5 }, { partial: true }).error).toBe(
        "Valor atual deve ser um número maior ou igual a zero.",
      );
    });
  });
});

describe("validateCategoryInput", () => {
  it.each(["income", "outcome", "investment"])("aceita o tipo %s", (type) => {
    expect(validateCategoryInput({ name: "Pets", type, color: "#fff", icon: "paw" })).toEqual({
      data: { name: "Pets", type, color: "#fff", icon: "paw" },
    });
  });

  it("remove espaços extras do nome", () => {
    expect(validateCategoryInput({ name: "  Pets  ", type: "outcome" }).data?.name).toBe("Pets");
  });

  it("aceita cor e ícone ausentes ou nulos", () => {
    expect(validateCategoryInput({ name: "Pets", type: "outcome" }).error).toBeUndefined();
    expect(
      validateCategoryInput({ name: "Pets", type: "outcome", color: null, icon: null }).error,
    ).toBeUndefined();
  });

  it.each([
    ["nome ausente", { type: "outcome" }, "Nome e tipo são obrigatórios."],
    ["nome só com espaços", { name: "   ", type: "outcome" }, "Nome e tipo são obrigatórios."],
    ["nome não textual", { name: 10, type: "outcome" }, "Nome e tipo são obrigatórios."],
    ["tipo ausente", { name: "Pets" }, "Nome e tipo são obrigatórios."],
    ["tipo desconhecido", { name: "Pets", type: "despesa" }, "Tipo de categoria inválido."],
    ["cor não textual", { name: "Pets", type: "outcome", color: 1 }, "Cor inválida."],
    ["ícone não textual", { name: "Pets", type: "outcome", icon: [] }, "Ícone inválido."],
  ])("rejeita %s", (_caso, body, message) => {
    expect(validateCategoryInput(body)).toEqual({ error: message });
  });
});

describe("validateBudgetInput", () => {
  it("aceita categoria, valor e mês válidos", () => {
    expect(validateBudgetInput({ category: "Lazer", amount: 500, month: "2026-03" })).toEqual({
      data: { category: "Lazer", amount: 500, month: "2026-03" },
    });
  });

  it("converte valor numérico em string", () => {
    expect(
      validateBudgetInput({ category: "Lazer", amount: "350.75", month: "2026-12" }).data?.amount,
    ).toBe(350.75);
  });

  it("remove espaços extras da categoria", () => {
    expect(
      validateBudgetInput({ category: " Lazer ", amount: 1, month: "2026-01" }).data?.category,
    ).toBe("Lazer");
  });

  it.each([
    ["categoria ausente", { amount: 100, month: "2026-03" }],
    ["categoria vazia", { category: "", amount: 100, month: "2026-03" }],
    ["mês ausente", { category: "Lazer", amount: 100 }],
    ["valor ausente", { category: "Lazer", month: "2026-03" }],
    ["valor zero", { category: "Lazer", amount: 0, month: "2026-03" }],
    ["valor negativo", { category: "Lazer", amount: -10, month: "2026-03" }],
    ["valor não numérico", { category: "Lazer", amount: "abc", month: "2026-03" }],
    ["valor booleano", { category: "Lazer", amount: true, month: "2026-03" }],
    ["valor nulo", { category: "Lazer", amount: null, month: "2026-03" }],
  ])("rejeita %s", (_caso, body) => {
    expect(validateBudgetInput(body)).toEqual({
      error: "Categoria, valor válido e mês são obrigatórios.",
    });
  });

  it.each(["2026-13", "2026-00", "2026-3", "03-2026", "2026/03", "2026-03-01", "março"])(
    "rejeita mês fora do formato AAAA-MM (%s)",
    (month) => {
      expect(validateBudgetInput({ category: "Lazer", amount: 100, month })).toEqual({
        error: "Mês deve estar no formato AAAA-MM.",
      });
    },
  );
});
