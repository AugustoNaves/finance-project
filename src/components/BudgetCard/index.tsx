"use client";

import { ProgressBar } from "@/components/ProgressBar";
import {
  Actions,
  Alert,
  Card,
  Header,
  Metric,
  Metrics,
  OutlineButton,
  Percentage,
  Title,
} from "./styles";

export interface BudgetViewModel {
  id: string;
  category: string;
  amount: string;
  spent: string;
  remaining: string;
  month: string;
  progress: number;
  status: "safe" | "warning" | "danger";
}

interface BudgetCardProps {
  budget: BudgetViewModel;
  onEdit: () => void;
  onDelete: () => void;
}

export function BudgetCard({ budget, onEdit, onDelete }: BudgetCardProps) {
  const alertText =
    budget.status === "danger"
      ? "Limite ultrapassado"
      : budget.status === "warning"
        ? "Atenção: acima de 80%"
        : "Dentro do previsto";

  return (
    <Card $status={budget.status}>
      <Header>
        <div>
          <Title>{budget.category}</Title>
          <span>{budget.month}</span>
        </div>
        <Percentage $status={budget.status}>{Math.round(budget.progress)}%</Percentage>
      </Header>

      <ProgressBar value={budget.progress} />

      <Metrics>
        <Metric>
          <span>Limite</span>
          <strong>{budget.amount}</strong>
        </Metric>
        <Metric>
          <span>Gasto</span>
          <strong>{budget.spent}</strong>
        </Metric>
        <Metric>
          <span>Restante</span>
          <strong>{budget.remaining}</strong>
        </Metric>
      </Metrics>

      <Alert $status={budget.status}>{alertText}</Alert>

      <Actions>
        <OutlineButton type="button" onClick={onEdit}>
          Editar
        </OutlineButton>
        <OutlineButton type="button" $danger onClick={onDelete}>
          Excluir
        </OutlineButton>
      </Actions>
    </Card>
  );
}
