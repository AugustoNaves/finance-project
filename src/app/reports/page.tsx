"use client";

import { useContext, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BalanceLineChart } from "@/components/BalanceLineChart";
import { CategoryBreakdown, CategoryBreakdownItem } from "@/components/CategoryBreakdown";
import { IncomeOutcomeBarChart } from "@/components/IncomeOutcomeBarChart";
import { LedgerSection } from "@/components/LedgerSection";
import { PageHeader } from "@/components/PageHeader";
import { PeriodFilter } from "@/components/PeriodFilter";
import { TransactionsContext } from "@/contexts/TransactionsContenxt";
import { getLocalMonthKey, getMonthKey } from "@/utils/dates";
import { calculateSummary, getTransactionType } from "@/utils/finance";
import { formatPlainAmount } from "@/utils/formatters";
import {
  Caption,
  ChartsGrid,
  EvolutionList,
  Grid,
  Sheet,
  SheetLine,
  SheetTotal,
  Toolbar,
} from "./styles";

const shortMonth = new Intl.DateTimeFormat("pt-BR", { month: "short" });
const longMonth = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" });

function money(value: number) {
  return `${value < 0 ? "−" : ""}R$ ${formatPlainAmount(Math.abs(value))}`;
}

function getPreviousMonths(referenceMonth: string, quantity: number) {
  const [year, month] = referenceMonth.split("-").map(Number);

  return Array.from({ length: quantity }, (_, index) =>
    new Date(year, month - 1 - (quantity - 1 - index), 1),
  );
}

export default function ReportsPage() {
  const { transactions } = useContext(TransactionsContext);
  const [selectedMonth, setSelectedMonth] = useState(getLocalMonthKey());

  const monthlyTransactions = transactions.filter(
    (transaction) => getMonthKey(transaction.date) === selectedMonth,
  );
  const summary = calculateSummary(monthlyTransactions);
  const outcomeTransactions = monthlyTransactions.filter(
    (transaction) => getTransactionType(transaction) === "outcome",
  );
  const biggestExpense = [...outcomeTransactions].sort(
    (transactionA, transactionB) => transactionA.amount - transactionB.amount,
  )[0];
  const categoryTotals = outcomeTransactions.reduce<Record<string, number>>(
    (acc, transaction) => {
      acc[transaction.category] = (acc[transaction.category] ?? 0) + Math.abs(transaction.amount);
      return acc;
    },
    {},
  );
  const totalExpenses = Math.abs(summary.outcome);
  const sortedCategories = Object.entries(categoryTotals).sort(
    ([, amountA], [, amountB]) => amountB - amountA,
  );
  const categoryItems: CategoryBreakdownItem[] = sortedCategories.map(([category, amount]) => ({
    category,
    amount: money(amount),
    percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
  }));
  const topCategory = categoryItems[0];

  const daysInSelectedMonth = new Date(
    Number(selectedMonth.slice(0, 4)),
    Number(selectedMonth.slice(5, 7)),
    0,
  ).getDate();
  const elapsedDays =
    selectedMonth === getLocalMonthKey() ? new Date().getDate() : daysInSelectedMonth;
  const dailyAverage = totalExpenses / elapsedDays;
  const savingsRate =
    summary.income > 0 ? `${Math.round((summary.total / summary.income) * 100)}%` : "Sem receitas";
  const entryCount = monthlyTransactions.length;

  const evolution = getPreviousMonths(selectedMonth, 6).map((date) => {
    const month = getLocalMonthKey(date);
    const monthSummary = calculateSummary(
      transactions.filter((transaction) => getMonthKey(transaction.date) === month),
    );

    return {
      month,
      label: shortMonth.format(date),
      fullLabel: longMonth.format(date),
      income: monthSummary.income,
      outcome: Math.abs(monthSummary.outcome),
      balance: monthSummary.total,
    };
  });

  return (
    <AppShell>
      <PageHeader title="Relatórios" />

      <Toolbar>
        <PeriodFilter
          value={selectedMonth}
          onChange={(value) => setSelectedMonth(value || getLocalMonthKey())}
        />
      </Toolbar>

      <Grid>
        <LedgerSection title="Balanço do período">
          <Sheet>
            <SheetLine>
              <dt>Receitas</dt>
              <dd>{money(summary.income)}</dd>
            </SheetLine>
            <SheetLine>
              <dt>Despesas</dt>
              <dd data-tone={summary.outcome < 0 ? "out" : undefined}>{money(summary.outcome)}</dd>
            </SheetLine>
            <SheetLine>
              <dt>Investimentos</dt>
              <dd>{money(summary.investment)}</dd>
            </SheetLine>
            <SheetTotal $negative={summary.total < 0}>
              <dt>Saldo</dt>
              <dd>
                <span>{money(summary.total)}</span>
              </dd>
            </SheetTotal>
            <SheetLine>
              <dt>Taxa de economia</dt>
              <dd>{savingsRate}</dd>
            </SheetLine>
            <SheetLine>
              <dt>Média diária</dt>
              <dd>{money(dailyAverage)}</dd>
            </SheetLine>
            <SheetLine>
              <dt>Maior despesa</dt>
              <dd data-tone={biggestExpense ? "out" : undefined}>
                {biggestExpense ? money(biggestExpense.amount) : "Sem dados"}
                {biggestExpense && <small>{biggestExpense.description}</small>}
              </dd>
            </SheetLine>
            <SheetLine>
              <dt>Categoria líder</dt>
              <dd>
                {topCategory?.category ?? "Sem dados"}
                {topCategory && (
                  <small>
                    {topCategory.amount} · {Math.round(topCategory.percentage)}%
                  </small>
                )}
              </dd>
            </SheetLine>
            <SheetLine>
              <dt>Movimento do período</dt>
              <dd>{entryCount === 1 ? "1 lançamento" : `${entryCount} lançamentos`}</dd>
            </SheetLine>
          </Sheet>
        </LedgerSection>

        <LedgerSection title="Gastos por categoria">
          <Caption>
            {categoryItems.length === 1 ? "1 categoria" : `${categoryItems.length} categorias`}
          </Caption>
          <CategoryBreakdown items={categoryItems} />
        </LedgerSection>
      </Grid>

      <ChartsGrid>
        <LedgerSection title="Receitas vs despesas">
          <Caption>Últimos 6 meses</Caption>
          <IncomeOutcomeBarChart data={evolution} />
        </LedgerSection>

        <LedgerSection title="Evolução do saldo">
          <Caption>Últimos 6 meses</Caption>
          <BalanceLineChart data={evolution} />
          <EvolutionList aria-label="Saldo por mês">
            {evolution.map((item) => (
              <li key={item.month}>
                <span>{item.fullLabel}</span>
                <span data-tone={item.balance < 0 ? "out" : undefined}>{money(item.balance)}</span>
              </li>
            ))}
          </EvolutionList>
        </LedgerSection>
      </ChartsGrid>
    </AppShell>
  );
}
