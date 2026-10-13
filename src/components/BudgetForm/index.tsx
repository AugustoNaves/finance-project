"use client";

import { FormEvent, useState } from "react";
import { FormError } from "@/components/FormError";
import { getErrorMessage } from "@/services/http";
import { BudgetPayload } from "@/types/budget";
import { Category } from "@/types/category";
import { getLocalMonthKey } from "@/utils/dates";
import { Field, Form, Input, Label, Select, SubmitButton } from "./styles";

export type BudgetFormData = BudgetPayload;

interface BudgetFormProps {
  categories: Category[];
  initialValues?: BudgetFormData;
  defaultMonth?: string;
  submitLabel?: string;
  onSubmit: (data: BudgetFormData) => Promise<void> | void;
}

function getCurrentMonth() {
  return getLocalMonthKey();
}

export function BudgetForm({
  categories,
  initialValues,
  defaultMonth,
  submitLabel = "Salvar orçamento",
  onSubmit,
}: BudgetFormProps) {
  const outcomeCategories = categories.filter((category) => category.type === "outcome");
  const initialCategory = initialValues?.category ?? outcomeCategories[0]?.name ?? "";
  const [category, setCategory] = useState(initialCategory);
  const [amount, setAmount] = useState(initialValues ? String(initialValues.amount) : "");
  const [month, setMonth] = useState(
    initialValues?.month ?? defaultMonth ?? getCurrentMonth(),
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const selectedCategory = category || outcomeCategories[0]?.name || "";
  const hasSelectedCategory = outcomeCategories.some(
    (currentCategory) => currentCategory.name === selectedCategory,
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      await onSubmit({
        category: selectedCategory,
        amount: Number(amount),
        month,
      });
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Não foi possível salvar o orçamento."));
      setSubmitting(false);
      return;
    }

    setSubmitting(false);

    if (!initialValues) {
      setCategory(outcomeCategories[0]?.name ?? "");
      setAmount("");
      setMonth(defaultMonth ?? getCurrentMonth());
    }
  }

  return (
    <Form onSubmit={handleSubmit}>
      <Field>
        <Label htmlFor="budget-category">Categoria</Label>
        <Select
          id="budget-category"
          value={selectedCategory}
          onChange={(event) => setCategory(event.target.value)}
          required
        >
          <option value="">Selecione uma categoria</option>
          {initialValues?.category && !hasSelectedCategory && (
            <option value={initialValues.category}>{initialValues.category}</option>
          )}
          {outcomeCategories.map((currentCategory) => (
            <option key={currentCategory.id} value={currentCategory.name}>
              {currentCategory.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field>
        <Label htmlFor="budget-amount">Limite mensal</Label>
        <Input
          id="budget-amount"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="R$ 0,00"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
      </Field>

      <Field>
        <Label htmlFor="budget-month">Mês</Label>
        <Input
          id="budget-month"
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          required
        />
      </Field>

      <FormError message={error} />

      <SubmitButton type="submit" disabled={submitting}>
        {submitLabel}
      </SubmitButton>
    </Form>
  );
}
