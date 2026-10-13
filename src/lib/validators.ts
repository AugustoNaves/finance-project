import type { JsonBody } from "@/lib/http";

const ENTRY_TYPES = ["income", "outcome", "investment"];
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

type Validation<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

function isMissing(value: unknown) {
  return value === undefined || value === null || value === "";
}

function isFilledString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function parseDate(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export type TransactionInput = {
  description?: string;
  amount?: number;
  category?: string;
  type?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  date?: Date;
};

type RequiredTransactionInput = TransactionInput &
  Required<Pick<TransactionInput, "description" | "amount" | "category">>;

export function validateTransactionInput(body: JsonBody): Validation<RequiredTransactionInput>;
export function validateTransactionInput(
  body: JsonBody,
  options: { partial: boolean },
): Validation<TransactionInput>;
export function validateTransactionInput(
  body: JsonBody,
  { partial = false } = {},
): Validation<TransactionInput> {
  const { description, amount, category, type, paymentMethod, notes, date } = body;
  const data: TransactionInput = {};

  if (!(partial && description === undefined)) {
    if (!isFilledString(description)) {
      return { error: "Descrição é obrigatória." };
    }

    data.description = description.trim();
  }

  if (!(partial && amount === undefined)) {
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount === 0) {
      return { error: "Informe um valor numérico diferente de zero." };
    }

    data.amount = amount;
  }

  if (!(partial && category === undefined)) {
    if (!isFilledString(category)) {
      return { error: "Categoria é obrigatória." };
    }

    data.category = category.trim();
  }

  if (type !== undefined) {
    if (type !== null && (typeof type !== "string" || !ENTRY_TYPES.includes(type))) {
      return { error: "Tipo de transação inválido." };
    }

    data.type = type;
  }

  if (!isOptionalString(paymentMethod)) {
    return { error: "Forma de pagamento inválida." };
  }

  if (!isOptionalString(notes)) {
    return { error: "Observação inválida." };
  }

  if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;
  if (notes !== undefined) data.notes = notes;

  if (!isMissing(date)) {
    const parsedDate = parseDate(date);

    if (!parsedDate) {
      return { error: "Data inválida." };
    }

    data.date = parsedDate;
  }

  return { data };
}

export type GoalInput = {
  name?: string;
  targetAmount?: number;
  currentAmount?: number;
  deadline?: Date | null;
  color?: string | null;
};

type RequiredGoalInput = GoalInput & Required<Pick<GoalInput, "name" | "targetAmount">>;

export function validateGoalInput(body: JsonBody): Validation<RequiredGoalInput>;
export function validateGoalInput(
  body: JsonBody,
  options: { partial: boolean },
): Validation<GoalInput>;
export function validateGoalInput(
  body: JsonBody,
  { partial = false } = {},
): Validation<GoalInput> {
  const { name, targetAmount, currentAmount, deadline, color } = body;
  const data: GoalInput = {};

  if (!(partial && name === undefined)) {
    if (!isFilledString(name)) {
      return { error: "Nome da meta é obrigatório." };
    }

    data.name = name.trim();
  }

  if (!(partial && targetAmount === undefined)) {
    if (
      typeof targetAmount !== "number" ||
      !Number.isFinite(targetAmount) ||
      targetAmount <= 0
    ) {
      return { error: "Valor alvo deve ser um número maior que zero." };
    }

    data.targetAmount = targetAmount;
  }

  if (currentAmount !== undefined && currentAmount !== null) {
    if (
      typeof currentAmount !== "number" ||
      !Number.isFinite(currentAmount) ||
      currentAmount < 0
    ) {
      return { error: "Valor atual deve ser um número maior ou igual a zero." };
    }

    data.currentAmount = currentAmount;
  }

  if (deadline !== undefined) {
    if (isMissing(deadline)) {
      data.deadline = null;
    } else {
      const parsedDeadline = parseDate(deadline);

      if (!parsedDeadline) {
        return { error: "Prazo inválido." };
      }

      data.deadline = parsedDeadline;
    }
  }

  if (!isOptionalString(color)) {
    return { error: "Cor inválida." };
  }

  if (color !== undefined) data.color = color;

  return { data };
}

export type CategoryInput = {
  name: string;
  type: string;
  color?: string | null;
  icon?: string | null;
};

export function validateCategoryInput(body: JsonBody): Validation<CategoryInput> {
  const { name, type, color, icon } = body;

  if (!isFilledString(name) || !isFilledString(type)) {
    return { error: "Nome e tipo são obrigatórios." };
  }

  if (!ENTRY_TYPES.includes(type)) {
    return { error: "Tipo de categoria inválido." };
  }

  if (!isOptionalString(color)) {
    return { error: "Cor inválida." };
  }

  if (!isOptionalString(icon)) {
    return { error: "Ícone inválido." };
  }

  return { data: { name: name.trim(), type, color, icon } };
}

export type BudgetInput = {
  category: string;
  amount: number;
  month: string;
};

export function validateBudgetInput(body: JsonBody): Validation<BudgetInput> {
  const { category, amount, month } = body;
  const budgetAmount =
    typeof amount === "number" || typeof amount === "string" ? Number(amount) : NaN;

  if (
    !isFilledString(category) ||
    !isFilledString(month) ||
    !Number.isFinite(budgetAmount) ||
    budgetAmount <= 0
  ) {
    return { error: "Categoria, valor válido e mês são obrigatórios." };
  }

  if (!MONTH_PATTERN.test(month)) {
    return { error: "Mês deve estar no formato AAAA-MM." };
  }

  return { data: { category: category.trim(), amount: budgetAmount, month } };
}
