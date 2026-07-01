"use client";

import {
  Metric,
  MetricLabel,
  MetricValue,
  SummaryCard,
  SummaryHeader,
  SummaryTitle,
  SummaryTrend,
} from "./styles";

interface MonthSummaryProps {
  monthLabel: string;
  income: string;
  outcome: string;
  balance: string;
  savingsRate: string;
}

export function MonthSummary({
  monthLabel,
  income,
  outcome,
  balance,
  savingsRate,
}: MonthSummaryProps) {
  return (
    <SummaryCard>
      <SummaryHeader>
        <div>
          <SummaryTitle>Resumo do mês</SummaryTitle>
          <span>{monthLabel}</span>
        </div>
        <SummaryTrend>{savingsRate}</SummaryTrend>
      </SummaryHeader>

      <Metric>
        <MetricLabel>Entradas</MetricLabel>
        <MetricValue $variant="income">{income}</MetricValue>
      </Metric>
      <Metric>
        <MetricLabel>Saídas</MetricLabel>
        <MetricValue $variant="outcome">{outcome}</MetricValue>
      </Metric>
      <Metric>
        <MetricLabel>Saldo do mês</MetricLabel>
        <MetricValue $variant="total">{balance}</MetricValue>
      </Metric>
    </SummaryCard>
  );
}
