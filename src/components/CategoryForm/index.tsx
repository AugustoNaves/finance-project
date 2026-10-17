"use client";

import { FormEvent, useId, useState } from "react";
import { ColorSwatches, defaultColor } from "@/components/ColorSwatches";
import { FormError } from "@/components/FormError";
import { getErrorMessage } from "@/services/http";
import { CategoryPayload, CategoryType } from "@/types/category";
import {
  Actions,
  DeleteButton,
  Field,
  Form,
  Input,
  Label,
  Legend,
  Segment,
  Segmented,
  SubmitButton,
} from "./styles";

export type CategoryFormData = CategoryPayload;

const typeOptions: { value: CategoryType; label: string }[] = [
  { value: "outcome", label: "Gasto" },
  { value: "income", label: "Receita" },
  { value: "investment", label: "Investimento" },
];

interface CategoryFormProps {
  initialValues?: CategoryFormData;
  defaultType?: CategoryType;
  submitLabel?: string;
  onSubmit: (data: CategoryFormData) => Promise<void> | void;
  onDelete?: () => void;
}

export function CategoryForm({
  initialValues,
  defaultType = "outcome",
  submitLabel = "Salvar categoria",
  onSubmit,
  onDelete,
}: CategoryFormProps) {
  const id = useId();
  const [name, setName] = useState(initialValues?.name ?? "");
  const [type, setType] = useState<CategoryType>(initialValues?.type ?? defaultType);
  const [color, setColor] = useState(initialValues?.color ?? defaultColor);
  const [icon, setIcon] = useState(initialValues?.icon ?? "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      await onSubmit({
        name: name.trim(),
        type,
        color,
        icon: icon.trim() || null,
      });
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Não foi possível salvar a categoria."));
      setSubmitting(false);
      return;
    }

    setSubmitting(false);

    if (!initialValues) {
      setName("");
      setType(defaultType);
      setColor(defaultColor);
      setIcon("");
    }
  }

  return (
    <Form onSubmit={handleSubmit}>
      <Field>
        <Label htmlFor="category-name">Nome</Label>
        <Input
          id="category-name"
          placeholder="Ex.: Mercado"
          autoComplete="off"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </Field>

      <Field>
        <Legend id={`${id}-type`}>Tipo</Legend>
        <Segmented role="radiogroup" aria-labelledby={`${id}-type`}>
          {typeOptions.map((option) => (
            <Segment key={option.value}>
              <input
                type="radio"
                name={`${id}-type`}
                value={option.value}
                checked={type === option.value}
                onChange={() => setType(option.value)}
              />
              {option.label}
            </Segment>
          ))}
        </Segmented>
      </Field>

      <ColorSwatches value={color} onChange={setColor} />

      <Field>
        <Label htmlFor="category-icon">Ícone simples</Label>
        <Input
          id="category-icon"
          placeholder="Opcional. Ex.: food, car, home"
          autoComplete="off"
          value={icon}
          onChange={(event) => setIcon(event.target.value)}
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
          {submitLabel}
        </SubmitButton>
      </Actions>
    </Form>
  );
}
