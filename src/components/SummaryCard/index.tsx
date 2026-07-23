// src/components/SummaryCard/index.tsx
"use client";
import { Card, CardTitle, CardAmount, CardIcon } from "./styles";

interface SummaryCardProps {
  title: string;
  amount: string;
  type: "income" | "outcome" | "investment" | "total";
}

const IconIncome = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 17L9 12L13 15L20 7" />
    <path d="M15 7H20V12" />
  </svg>
);

const IconOutcome = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 7L9 12L13 9L20 17" />
    <path d="M15 17H20V12" />
  </svg>
);

const IconTotal = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 3V21" />
    <path d="M17 7.5C16.15 6.55 14.62 6 12.92 6H10.9C8.75 6 7 7.15 7 8.9C7 10.65 8.75 11.8 10.9 11.8H13.1C15.25 11.8 17 12.95 17 14.7C17 16.45 15.25 17.6 13.1 17.6H10.8C9.15 17.6 7.73 17.08 6.88 16.18" />
  </svg>
);

const IconInvestment = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 2v20" />
    <path d="M17 5H12V10H17V5Z" />
    <path d="M7 15H12V20H7V15Z" />
    <path d="M17 12L12 12" />
    <path d="M7 8L12 8" />
  </svg>
);

const ICONS = {
  income: IconIncome,
  outcome: IconOutcome,
  investment: IconInvestment,
  total: IconTotal,
};

export const SummaryCard = ({ title, amount, type }: SummaryCardProps) => {
  const Icon = ICONS[type];

  return (
    <Card $type={type}>
      <CardTitle $type={type}>
        {title}
        <CardIcon $type={type}>
          <Icon />
        </CardIcon>
      </CardTitle>
      <CardAmount $type={type}>{amount}</CardAmount>
    </Card>
  );
};
