"use client";

import { FormEvent, useContext, useEffect, useState } from "react";
import { fetchCategories, createCategory } from "@/services/categories";
import { Category, CategoryPayload } from "@/types/category";
import { TransactionPayload, TransactionType } from "@/types/transaction";
import { TransactionsContext } from "@/contexts/TransactionsContenxt";
import { Modal as CustomModal } from "@/components/CustomModal";
import { CategoryForm } from "@/components/CategoryForm";
import { defaultColor } from "@/components/ColorSwatches";
import { FormError } from "@/components/FormError";
import { getErrorMessage } from "@/services/http";
import { getDateKey, getLocalDateKey } from "@/utils/dates";
import { getTransactionType } from "@/utils/finance";
import { formatPlainAmount, parseAmountInput } from "@/utils/formatters";
import {
  Actions,
  AmountField,
  CategoryChip,
  CategoryChips,
  DeleteButton,
  Field,
  FieldRow,
  Form,
  Input,
  Label,
  Legend,
  Segment,
  Segmented,
  Select,
  SubmitButton,
  Textarea,
} from "./styles";

export type TransactionFormData = TransactionPayload;

interface TransactionFormProps {
  initialValues?: TransactionFormData;
  defaultType?: TransactionType;
  submitLabel?: string;
  onSubmit: (data: TransactionFormData) => Promise<void> | void;
  onDelete?: () => void;
}

const typeOptions: { value: TransactionType; label: string }[] = [
  { value: "outcome", label: "Gasto" },
  { value: "income", label: "Receita" },
  { value: "investment", label: "Investimento" },
];

const paymentMethods = [
  "Pix",
  "Dinheiro",
  "Cartão de débito",
  "Cartão de crédito",
  "Transferência",
  "Boleto",
  "Outro",
];

export function TransactionForm({
  initialValues,
  defaultType = "outcome",
  submitLabel = "Salvar",
  onSubmit,
  onDelete,
}: TransactionFormProps) {
  const { transactions } = useContext(TransactionsContext);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [type, setType] = useState<TransactionType>(initialValues?.type ?? defaultType);
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [amount, setAmount] = useState(
    initialValues ? formatPlainAmount(Math.abs(initialValues.amount)) : "",
  );
  const [category, setCategory] = useState(initialValues?.category ?? "");
  const [paymentMethod, setPaymentMethod] = useState(initialValues?.paymentMethod ?? "Pix");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState(
    initialValues?.date ? getDateKey(initialValues.date) : getLocalDateKey(),
  );

  useEffect(() => {
    let active = true;

    async function loadCategories() {
      try {
        const data = await fetchCategories();

        if (active) setCategories(data);
      } catch (loadError) {
        console.error("Erro ao buscar categorias:", loadError);
      } finally {
        if (active) setLoadingCategories(false);
      }
    }

    loadCategories();

    return () => {
      active = false;
    };
  }, []);

  const usage = (transactions ?? []).reduce<Record<string, number>>((acc, transaction) => {
    if (getTransactionType(transaction) === type) {
      acc[transaction.category] = (acc[transaction.category] ?? 0) + 1;
    }

    return acc;
  }, {});

  const categoryOptions = categories
    .filter((currentCategory) => currentCategory.type === type)
    .sort((a, b) => (usage[b.name] ?? 0) - (usage[a.name] ?? 0));

  const preservedCategory =
    !!initialValues?.category &&
    category === initialValues.category &&
    !categoryOptions.some((currentCategory) => currentCategory.name === category);

  const selectedCategory = category || categoryOptions[0]?.name || "";

  function handleTypeChange(nextType: TransactionType) {
    setType(nextType);
    setCategory("");
  }

  async function handleCreateCategory(payload: CategoryPayload) {
    const created = await createCategory(payload);
    const data = await fetchCategories();

    setCategories(data);
    setCategory(created.name);
    setShowCategoryModal(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const rawAmount = parseAmountInput(amount);

    if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }

    if (!selectedCategory) {
      setError("Escolha uma categoria.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      await onSubmit({
        description: description.trim() || selectedCategory,
        amount: type === "income" ? rawAmount : -rawAmount,
        category: selectedCategory,
        type,
        paymentMethod,
        date,
        notes: notes.trim() || null,
      });
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Não foi possível salvar o lançamento."));
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setDescription("");
    setAmount("");
    setCategory("");
    setType(defaultType);
    setPaymentMethod("Pix");
    setNotes("");
    setDate(getLocalDateKey());
  }

  return (
    <>
      <Form onSubmit={handleSubmit} noValidate>
        <Segmented role="radiogroup" aria-label="Tipo">
          {typeOptions.map((option) => (
            <Segment
              key={option.value}
              type="button"
              role="radio"
              aria-checked={type === option.value}
              $active={type === option.value}
              onClick={() => handleTypeChange(option.value)}
            >
              {option.label}
            </Segment>
          ))}
        </Segmented>

        <AmountField>
          <span aria-hidden="true">R$</span>
          <input
            id="transaction-amount"
            aria-label="Valor"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            autoFocus={!initialValues}
          />
        </AmountField>

        <div>
          <Legend id="transaction-category-label">Categoria</Legend>
          <CategoryChips role="radiogroup" aria-labelledby="transaction-category-label">
            {loadingCategories && <span>Carregando categorias…</span>}
            {preservedCategory && (
              <CategoryChip type="button" role="radio" aria-checked $active>
                {category}
              </CategoryChip>
            )}
            {categoryOptions.map((currentCategory) => (
              <CategoryChip
                key={currentCategory.id}
                type="button"
                role="radio"
                aria-checked={selectedCategory === currentCategory.name}
                $active={selectedCategory === currentCategory.name}
                onClick={() => setCategory(currentCategory.name)}
              >
                {currentCategory.name}
              </CategoryChip>
            ))}
            <CategoryChip
              type="button"
              $dashed
              aria-label="Nova categoria"
              onClick={() => setShowCategoryModal(true)}
            >
              + Nova
            </CategoryChip>
          </CategoryChips>
        </div>

        <Field>
          <Label htmlFor="transaction-description">Descrição</Label>
          <Input
            id="transaction-description"
            type="text"
            placeholder={selectedCategory || "Mercado, Uber, salário…"}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>

        <FieldRow>
          <Field>
            <Label htmlFor="transaction-date">Data</Label>
            <Input
              id="transaction-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </Field>

          <Field>
            <Label htmlFor="transaction-payment-method">Forma de pagamento</Label>
            <Select
              id="transaction-payment-method"
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
            >
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </Select>
          </Field>
        </FieldRow>

        <Field>
          <Label htmlFor="transaction-notes">Observação</Label>
          <Textarea
            id="transaction-notes"
            placeholder="Opcional"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
          />
        </Field>

        <FormError message={error} />

        <Actions>
          {onDelete && (
            <DeleteButton type="button" onClick={onDelete}>
              Excluir
            </DeleteButton>
          )}
          <SubmitButton type="submit" disabled={submitting}>
            {submitting ? "Salvando…" : submitLabel}
          </SubmitButton>
        </Actions>
      </Form>

      <CustomModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Nova categoria"
        maxWidth="420px"
      >
        <CategoryForm
          submitLabel="Criar categoria"
          initialValues={{ name: "", type, color: defaultColor, icon: "" }}
          onSubmit={handleCreateCategory}
        />
      </CustomModal>
    </>
  );
}
