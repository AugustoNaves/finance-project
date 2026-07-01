"use client";

import {
  Amount,
  Bar,
  EmptyText,
  Fill,
  Header,
  Item,
  List,
  Name,
  Percentage,
} from "./styles";

export interface CategoryBreakdownItem {
  category: string;
  amount: string;
  percentage: number;
}

interface CategoryBreakdownProps {
  items: CategoryBreakdownItem[];
}

export function CategoryBreakdown({ items }: CategoryBreakdownProps) {
  if (items.length === 0) {
    return <EmptyText>Nenhuma despesa encontrada neste período.</EmptyText>;
  }

  return (
    <List>
      {items.map((item) => (
        <Item key={item.category}>
          <Header>
            <Name>{item.category}</Name>
            <Amount>{item.amount}</Amount>
          </Header>
          <Bar>
            <Fill $value={item.percentage} />
          </Bar>
          <Percentage>{Math.round(item.percentage)}% das despesas</Percentage>
        </Item>
      ))}
    </List>
  );
}
