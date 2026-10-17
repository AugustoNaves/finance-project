"use client";

import { getLocalMonthKey } from "@/utils/dates";
import { formatMonthYear } from "@/utils/formatters";
import { Controls, Display, Field, Input, Label, Step } from "./styles";

interface PeriodFilterProps {
  value: string;
  onChange: (value: string) => void;
}

function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split("-").map(Number);

  return getLocalMonthKey(new Date(year, monthNumber - 1 + delta, 1));
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);

  if (!year || !monthNumber) return month;

  return formatMonthYear(new Date(year, monthNumber - 1, 1));
}

function openPicker(input: HTMLInputElement) {
  if ("showPicker" in input) {
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  }
}

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  return (
    <Field>
      <Label htmlFor="reports-period">Período</Label>
      <Controls>
        <Step type="button" aria-label="Mês anterior" onClick={() => onChange(shiftMonth(value, -1))}>
          ‹
        </Step>
        <Display>
          <span aria-hidden="true">{monthLabel(value)}</span>
          <Input
            id="reports-period"
            type="month"
            value={value}
            onClick={(event) => openPicker(event.currentTarget)}
            onChange={(event) => onChange(event.target.value)}
          />
        </Display>
        <Step type="button" aria-label="Próximo mês" onClick={() => onChange(shiftMonth(value, 1))}>
          ›
        </Step>
      </Controls>
    </Field>
  );
}
