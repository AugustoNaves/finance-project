"use client";

import { CategoryType } from "@/types/category";
import { Amount, Count, Dot, Figures, Name, RowButton, RowItem } from "./styles";

export interface CategoryViewModel {
  id: string;
  name: string;
  type: CategoryType;
  color?: string | null;
  icon?: string | null;
  transactionCount: number;
  monthlyTotal: string;
}

interface CategoryRowProps {
  category: CategoryViewModel;
  onEdit: () => void;
}

function formatCount(count: number) {
  if (count === 0) return "Nenhum lançamento";
  if (count === 1) return "1 lançamento";
  return `${count} lançamentos`;
}

export function CategoryRow({ category, onEdit }: CategoryRowProps) {
  const count = formatCount(category.transactionCount);

  return (
    <RowItem>
      <RowButton
        type="button"
        aria-label={`${category.name}, ${count}, ${category.monthlyTotal} no mês. Editar`}
        onClick={onEdit}
      >
        <Dot aria-hidden="true" style={category.color ? { background: category.color } : undefined} />
        <Name>{category.name}</Name>
        <Figures>
          <Amount $muted={category.transactionCount === 0}>{category.monthlyTotal}</Amount>
          <Count>{count}</Count>
        </Figures>
      </RowButton>
    </RowItem>
  );
}
