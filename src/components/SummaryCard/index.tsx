// src/components/SummaryCard/index.tsx
"use client";
import { Card, CardTitle, CardAmount, CardIcon } from "./styles";

interface SummaryCardProps {
  title: string;
  amount: string;
  type: "income" | "outcome" | "total";
}

const ICONS = {
  income: "📈",
  outcome: "📉",
  total: "💰",
};

export const SummaryCard = ({ title, amount, type }: SummaryCardProps) => {
  return (
    <Card $type={type}>
      <CardTitle $type={type}>
        {title}
        <CardIcon>{ICONS[type]}</CardIcon>
      </CardTitle>
      <CardAmount $type={type}>{amount}</CardAmount>
    </Card>
  );
};
