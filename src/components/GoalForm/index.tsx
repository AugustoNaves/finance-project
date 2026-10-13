"use client";

import { FormEvent, useState } from "react";
import { FormError } from "@/components/FormError";
import { getErrorMessage } from "@/services/http";
import { GoalPayload } from "@/types/goal";
import { dateKeyToISOString } from "@/utils/dates";
import {
  ColorInput,
  Field,
  Form,
  Input,
  Label,
  SubmitButton,
} from "./styles";

export type GoalFormData = GoalPayload;

interface GoalFormProps {
  initialValues?: GoalFormData;
  submitLabel?: string;
  onSubmit: (data: GoalFormData) => Promise<void> | void;
}

export function GoalForm({
  initialValues,
  submitLabel = "Salvar meta",
  onSubmit,
}: GoalFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [targetAmount, setTargetAmount] = useState(
    initialValues ? String(initialValues.targetAmount) : "",
  );
  const [currentAmount, setCurrentAmount] = useState(
    initialValues ? String(initialValues.currentAmount) : "",
  );
  const [deadline, setDeadline] = useState(
    initialValues?.deadline ? initialValues.deadline.slice(0, 10) : "",
  );
  const [color, setColor] = useState(initialValues?.color ?? "#00c48c");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      await onSubmit({
        name: name.trim(),
        targetAmount: Number(targetAmount),
        currentAmount: Number(currentAmount) || 0,
        deadline: deadline ? dateKeyToISOString(deadline) : null,
        color,
      });
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Não foi possível salvar a meta."));
      setSubmitting(false);
      return;
    }

    setSubmitting(false);

    if (!initialValues) {
      setName("");
      setTargetAmount("");
      setCurrentAmount("");
      setDeadline("");
      setColor("#00c48c");
    }
  }

  return (
    <Form onSubmit={handleSubmit}>
      <Field>
        <Label htmlFor="goal-name">Nome da meta</Label>
        <Input
          id="goal-name"
          type="text"
          placeholder="Ex: Reserva de emergência"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </Field>

      <Field>
        <Label htmlFor="goal-target">Valor alvo</Label>
        <Input
          id="goal-target"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="R$ 0,00"
          value={targetAmount}
          onChange={(event) => setTargetAmount(event.target.value)}
          required
        />
      </Field>

      <Field>
        <Label htmlFor="goal-current">Valor atual</Label>
        <Input
          id="goal-current"
          type="number"
          min="0"
          step="0.01"
          placeholder="R$ 0,00"
          value={currentAmount}
          onChange={(event) => setCurrentAmount(event.target.value)}
        />
      </Field>

      <Field>
        <Label htmlFor="goal-deadline">Prazo (opcional)</Label>
        <Input
          id="goal-deadline"
          type="date"
          value={deadline}
          onChange={(event) => setDeadline(event.target.value)}
        />
      </Field>

      <Field>
        <Label htmlFor="goal-color">Cor</Label>
        <ColorInput
          id="goal-color"
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
        />
      </Field>

      <FormError message={error} />

      <SubmitButton type="submit" disabled={submitting}>
        {submitLabel}
      </SubmitButton>
    </Form>
  );
}
