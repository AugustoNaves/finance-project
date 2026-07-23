"use client";

import { FormEvent, useState } from "react";
import { CategoryPayload, CategoryType } from "@/types/category";
import { Field, Form, Input, Label, Select, SubmitButton } from "./styles";

export type CategoryFormData = CategoryPayload;

interface CategoryFormProps {
  initialValues?: CategoryFormData;
  submitLabel?: string;
  onSubmit: (data: CategoryFormData) => Promise<void> | void;
}

export function CategoryForm({
  initialValues,
  submitLabel = "Salvar categoria",
  onSubmit,
}: CategoryFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [type, setType] = useState<CategoryType>(initialValues?.type ?? "outcome");
  const [color, setColor] = useState(initialValues?.color ?? "#00c48c");
  const [icon, setIcon] = useState(initialValues?.icon ?? "");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    await onSubmit({
      name: name.trim(),
      type,
      color,
      icon: icon.trim() || undefined,
    });

    if (!initialValues) {
      setName("");
      setType("outcome");
      setColor("#00c48c");
      setIcon("");
    }
  }

  return (
    <Form onSubmit={handleSubmit}>
      <Field>
        <Label htmlFor="category-name">Nome</Label>
        <Input
          id="category-name"
          placeholder="Ex: Alimentação"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </Field>

      <Field>
        <Label htmlFor="category-type">Tipo</Label>
        <Select
          id="category-type"
          value={type}
          onChange={(event) => setType(event.target.value as CategoryType)}
        >
          <option value="income">Receita</option>
          <option value="outcome">Despesa</option>
          <option value="investment">Investimento</option>
        </Select>
      </Field>

      <Field>
        <Label htmlFor="category-color">Cor</Label>
        <Input
          id="category-color"
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
        />
      </Field>

      <Field>
        <Label htmlFor="category-icon">Ícone simples</Label>
        <Input
          id="category-icon"
          placeholder="Ex: food, car, home"
          value={icon}
          onChange={(event) => setIcon(event.target.value)}
        />
      </Field>

      <SubmitButton type="submit">{submitLabel}</SubmitButton>
    </Form>
  );
}
