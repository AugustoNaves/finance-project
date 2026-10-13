"use client";

import { FormEvent, useEffect, useState } from "react";
import { fetchCategories, createCategory } from "@/services/categories";
import { Category, CategoryPayload } from "@/types/category";
import { TransactionPayload, TransactionType } from "@/types/transaction";
import { Modal as CustomModal } from "@/components/CustomModal";
import { CategoryForm } from "@/components/CategoryForm";
import { FormError } from "@/components/FormError";
import { getErrorMessage } from "@/services/http";
import { getDateKey, getLocalDateKey } from "@/utils/dates";
import {
  Form,
  FormGroup,
  Input,
  Label,
  Select,
  SubmitButton,
  Textarea,
  TypeButton,
  TypeSelector,
  CategoryRow,
  AddCategoryButton,
} from "./styles";

export type TransactionFormData = TransactionPayload;

interface TransactionFormProps {
  initialValues?: TransactionFormData;
  defaultType?: TransactionType;
  submitLabel?: string;
  onSubmit: (data: TransactionFormData) => Promise<void> | void;
}

export function TransactionForm({
  initialValues,
  defaultType = "outcome",
  submitLabel = "Salvar Transação",
  onSubmit,
}: TransactionFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [type, setType] = useState<TransactionType>(
    initialValues?.type ?? defaultType,
  );
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [amount, setAmount] = useState(
    initialValues ? String(Math.abs(initialValues.amount)) : "",
  );
  const [category, setCategory] = useState(initialValues?.category ?? "");
  const [paymentMethod, setPaymentMethod] = useState(
    initialValues?.paymentMethod ?? "Pix",
  );
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

        if (active) {
          setCategories(data);
        }
      } catch (error) {
        console.error("Erro ao buscar categorias:", error);
      } finally {
        if (active) {
          setLoadingCategories(false);
        }
      }
    }

    loadCategories();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (category || categories.length === 0) return;

    const firstCategory = categories.find((currentCategory) => currentCategory.type === type);

    if (firstCategory) {
      setCategory(firstCategory.name);
    }
  }, [categories, category, type]);

  const categoryOptions = categories.filter(
    (currentCategory) => currentCategory.type === type,
  );
  const hasSelectedCategory = categoryOptions.some(
    (currentCategory) => currentCategory.name === category,
  );
  const shouldPreserveInitialCategory =
    !!initialValues?.category &&
    category === initialValues.category &&
    !hasSelectedCategory;

  function handleTypeChange(nextType: TransactionType) {
    setType(nextType);
    setCategory(
      categories.find((currentCategory) => currentCategory.type === nextType)?.name ?? "",
    );
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

    const rawAmount = Number(amount);
    const amountAsNumber = type === "income" ? rawAmount : -rawAmount;

    setError("");
    setSubmitting(true);

    try {
      await onSubmit({
        description,
        amount: amountAsNumber,
        category,
        type,
        paymentMethod,
        date,
        notes: notes.trim() || null,
      });
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Não foi possível salvar a transação."));
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
      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="transaction-description">Descrição</Label>
          <Input
            id="transaction-description"
            type="text"
            placeholder="Ex: Salário, Aluguel..."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="transaction-amount">Valor</Label>
          <Input
            id="transaction-amount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="R$ 0,00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="transaction-date">Data</Label>
          <Input
            id="transaction-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </FormGroup>

        <FormGroup>
          <Label>Tipo</Label>
          <TypeSelector>
            <TypeButton
              $active={type === "income"}
              $variant="income"
              aria-pressed={type === "income"}
              onClick={() => handleTypeChange("income")}
              type="button"
            >
              Entrada
            </TypeButton>
            <TypeButton
              $active={type === "outcome"}
              $variant="outcome"
              aria-pressed={type === "outcome"}
              onClick={() => handleTypeChange("outcome")}
              type="button"
            >
              Saída
            </TypeButton>
            <TypeButton
              $active={type === "investment"}
              $variant="investment"
              aria-pressed={type === "investment"}
              onClick={() => handleTypeChange("investment")}
              type="button"
            >
              Investimento
            </TypeButton>
          </TypeSelector>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="transaction-category">Categoria</Label>
          <CategoryRow>
            <Select
              id="transaction-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              required
              style={{ flex: 1 }}
            >
              {loadingCategories ? (
                <option value="">Carregando categorias...</option>
              ) : (
                <option value="">Selecione uma categoria</option>
              )}
              {shouldPreserveInitialCategory && (
                <option value={category}>{category}</option>
              )}
              {categoryOptions.map((currentCategory) => (
                <option key={currentCategory.id} value={currentCategory.name}>
                  {currentCategory.name}
                </option>
              ))}
            </Select>
            <AddCategoryButton
              type="button"
              onClick={() => setShowCategoryModal(true)}
              title="Nova categoria"
              aria-label="Nova categoria"
            >
              +
            </AddCategoryButton>
          </CategoryRow>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="transaction-payment-method">Forma de pagamento</Label>
          <Select
            id="transaction-payment-method"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
          >
            <option value="Pix">Pix</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Cartão de débito">Cartão de débito</option>
            <option value="Cartão de crédito">Cartão de crédito</option>
            <option value="Transferência">Transferência</option>
            <option value="Boleto">Boleto</option>
            <option value="Outro">Outro</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="transaction-notes">Observação</Label>
          <Textarea
            id="transaction-notes"
            placeholder="Detalhes opcionais sobre esta transação..."
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
          />
        </FormGroup>

        <FormError message={error} />

        <SubmitButton type="submit" disabled={submitting}>
          {submitLabel}
        </SubmitButton>
      </Form>

      <CustomModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Nova categoria"
        maxWidth="420px"
      >
        <CategoryForm
          submitLabel="Criar categoria"
          initialValues={{ name: "", type, color: "#00c48c", icon: "" }}
          onSubmit={handleCreateCategory}
        />
      </CustomModal>
    </>
  );
}
