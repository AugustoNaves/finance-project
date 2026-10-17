"use client";

import { ProgressBar } from "@/components/ProgressBar";
import { Goal } from "@/types/goal";
import { formatCurrency, formatDate, formatPlainAmount } from "@/utils/formatters";
import {
  Bottom,
  Dot,
  Figures,
  Meta,
  NameButton,
  RowActions,
  RowItem,
  TextButton,
  Top,
} from "./styles";

export interface GoalViewModel extends Goal {
  progress: number;
}

interface GoalRowProps {
  goal: GoalViewModel;
  onEdit: () => void;
  onUpdateProgress: () => void;
  onDelete: () => void;
}

export function GoalRow({ goal, onEdit, onUpdateProgress, onDelete }: GoalRowProps) {
  const remaining = goal.targetAmount - goal.currentAmount;
  const details = [
    `${Math.round(goal.progress)}%`,
    remaining > 0 ? `faltam ${formatCurrency(remaining)}` : "meta alcançada",
    goal.deadline ? `prazo ${formatDate(goal.deadline)}` : null,
  ].filter(Boolean);

  return (
    <RowItem>
      <Top>
        <Dot aria-hidden="true" style={goal.color ? { background: goal.color } : undefined} />
        <NameButton type="button" aria-label={`Editar meta ${goal.name}`} onClick={onEdit}>
          {goal.name}
        </NameButton>
        <Figures>
          {formatPlainAmount(goal.currentAmount)} <small>de</small>{" "}
          {formatPlainAmount(goal.targetAmount)}
        </Figures>
      </Top>

      <ProgressBar value={goal.progress} color="var(--green)" label={goal.name} />

      <Bottom>
        <Meta>{details.join(" · ")}</Meta>
        <RowActions>
          <TextButton
            type="button"
            aria-label={`Atualizar progresso de ${goal.name}`}
            onClick={onUpdateProgress}
          >
            Atualizar progresso
          </TextButton>
          <TextButton type="button" $danger aria-label={`Excluir meta ${goal.name}`} onClick={onDelete}>
            Excluir
          </TextButton>
        </RowActions>
      </Bottom>
    </RowItem>
  );
}
