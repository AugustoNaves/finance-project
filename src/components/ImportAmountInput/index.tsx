"use client";

import { useState } from "react";
import { formatPlainAmount, parseAmountInput } from "@/utils/formatters";
import { Field } from "./styles";

interface ImportAmountInputProps {
  value: number;
  label: string;
  onChange: (value: number) => void;
}

export function ImportAmountInput({ value, label, onChange }: ImportAmountInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <Field
      type="text"
      inputMode="decimal"
      autoComplete="off"
      aria-label={label}
      value={draft ?? (Number.isFinite(value) && value > 0 ? formatPlainAmount(value) : "")}
      onFocus={() => setDraft(formatPlainAmount(value))}
      onBlur={() => setDraft(null)}
      onChange={(event) => {
        setDraft(event.target.value);
        onChange(parseAmountInput(event.target.value));
      }}
    />
  );
}
