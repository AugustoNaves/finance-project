"use client";

import { CategoryType } from "@/types/category";
import {
  Actions,
  Badge,
  Card,
  ColorMark,
  Header,
  Metric,
  Metrics,
  Name,
  OutlineButton,
  TypeLabel,
} from "./styles";

export interface CategoryViewModel {
  id: string;
  name: string;
  type: CategoryType;
  color?: string | null;
  icon?: string | null;
  transactionCount: number;
  monthlyTotal: string;
}

interface CategoryCardProps {
  category: CategoryViewModel;
  onEdit: () => void;
  onDelete: () => void;
}

export function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  const typeLabel = category.type === "income" ? "Receita" : "Despesa";

  return (
    <Card $accent={category.color ?? undefined}>
      <Header>
        <ColorMark $accent={category.color ?? undefined}>
          {category.icon?.slice(0, 2).toUpperCase() || category.name.slice(0, 1).toUpperCase()}
        </ColorMark>
        <div>
          <Name>{category.name}</Name>
          <TypeLabel>{typeLabel}</TypeLabel>
        </div>
        <Badge $type={category.type}>{typeLabel}</Badge>
      </Header>

      <Metrics>
        <Metric>
          <span>Transações no mês</span>
          <strong>{category.transactionCount}</strong>
        </Metric>
        <Metric>
          <span>Total no mês</span>
          <strong>{category.monthlyTotal}</strong>
        </Metric>
      </Metrics>

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
