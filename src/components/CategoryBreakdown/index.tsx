"use client";

import { Amount, Bar, EmptyText, Fill, Item, List, Main, Name, Share } from "./styles";

export interface CategoryBreakdownItem {
  category: string;
  amount: string;
  percentage: number;
}

interface CategoryBreakdownProps {
  items: CategoryBreakdownItem[];
  tone?: "out" | "neutral";
  shareLabel?: string;
  emptyText?: string;
}

export function CategoryBreakdown({
  items,
  tone = "out",
  shareLabel = "das despesas",
  emptyText = "Nenhuma despesa encontrada neste período.",
}: CategoryBreakdownProps) {
  if (items.length === 0) {
    return <EmptyText>{emptyText}</EmptyText>;
  }

  return (
    <List>
      {items.map((item) => (
        <Item key={item.category}>
          <Main>
            <Name>{item.category}</Name>
            <Share>
              {Math.round(item.percentage)}% {shareLabel}
            </Share>
          </Main>
          <Amount>{item.amount}</Amount>
          <Bar aria-hidden="true">
            <Fill $value={item.percentage} $tone={tone} />
          </Bar>
        </Item>
      ))}
    </List>
  );
}
