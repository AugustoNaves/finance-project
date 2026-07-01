"use client";

import { Field, Input, Wrapper } from "./styles";

interface PeriodFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  return (
    <Wrapper>
      <Field htmlFor="reports-period">
        Período
        <Input
          id="reports-period"
          type="month"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </Field>
    </Wrapper>
  );
}
