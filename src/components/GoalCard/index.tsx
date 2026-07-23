"use client";

import { ProgressBar } from "@/components/ProgressBar";
import { Goal } from "@/types/goal";
import { formatCurrency } from "@/utils/formatters";
import {
  Actions,
  Card,
  Deadline,
  Header,
  Metric,
  Metrics,
  OutlineButton,
  Percentage,
  Title,
} from "./styles";

export interface GoalViewModel extends Goal {
  progress: number;
}

interface GoalCardProps {
  goal: GoalViewModel;
  onEdit: () => void;
  onDelete: () => void;
}

export function GoalCard({ goal, onEdit, onDelete }: GoalCardProps) {
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);

  return (
    <Card $accent={goal.color ?? undefined}>
      <Header>
        <Title>{goal.name}</Title>
        <Percentage>{Math.round(goal.progress)}%</Percentage>
      </Header>

      <ProgressBar value={goal.progress} color={goal.color ?? undefined} />

      <Metrics>
        <Metric>
          <span>Atual</span>
          <strong>{formatCurrency(goal.currentAmount)}</strong>
        </Metric>
        <Metric>
          <span>Alvo</span>
          <strong>{formatCurrency(goal.targetAmount)}</strong>
        </Metric>
        <Metric>
          <span>Restante</span>
          <strong>{formatCurrency(remaining)}</strong>
        </Metric>
      </Metrics>

      {goal.deadline && (
        <Deadline>
          Prazo: {new Date(goal.deadline).toLocaleDateString("pt-BR")}
        </Deadline>
      )}

      <Actions>
        <OutlineButton type="button" onClick={onEdit}>
          Atualizar progresso
        </OutlineButton>
        <OutlineButton type="button" $danger onClick={onDelete}>
          Excluir
        </OutlineButton>
      </Actions>
    </Card>
  );
}
