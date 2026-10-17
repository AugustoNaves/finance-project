"use client";

import { ProgressBar } from "@/components/ProgressBar";
import { formatCurrency, formatPlainAmount } from "@/utils/formatters";
import { Bottom, Dot, Figures, NameButton, Percent, RowItem, Status, Top } from "./styles";

export type BudgetStatus = "safe" | "warning" | "danger";

export interface BudgetViewModel {
  id: string;
  category: string;
  color?: string | null;
  amount: number;
  spent: number;
  progress: number;
  status: BudgetStatus;
}

interface BudgetRowProps {
  budget: BudgetViewModel;
  onEdit: () => void;
}

function getStatusText(budget: BudgetViewModel) {
  const remaining = budget.amount - budget.spent;

  if (budget.status === "danger") return `Estourou ${formatCurrency(-remaining)}`;
  if (budget.status === "warning") return `Perto do limite · restam ${formatCurrency(remaining)}`;
  return `Dentro do previsto · restam ${formatCurrency(remaining)}`;
}

export function BudgetRow({ budget, onEdit }: BudgetRowProps) {
  return (
    <RowItem>
      <Top>
        <Dot aria-hidden="true" style={budget.color ? { background: budget.color } : undefined} />
        <NameButton type="button" aria-label={`Editar orçamento de ${budget.category}`} onClick={onEdit}>
          {budget.category}
        </NameButton>
        <Figures>
          {formatPlainAmount(budget.spent)} <small>de</small> {formatPlainAmount(budget.amount)}
        </Figures>
      </Top>

      <ProgressBar value={budget.progress} label={budget.category} />

      <Bottom>
        <Status $status={budget.status}>{getStatusText(budget)}</Status>
        <Percent>{Math.round(budget.progress)}%</Percent>
      </Bottom>
    </RowItem>
  );
}
