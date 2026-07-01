"use client";

import { useContext, useState } from "react";
import {
  CategoryBreakdown,
  CategoryBreakdownItem,
} from "@/components/CategoryBreakdown";
import { AppShell } from "@/components/AppShell";
import { BalanceLineChart } from "@/components/BalanceLineChart";
import { ExpenseDonutChart } from "@/components/ExpenseDonutChart";
import { IncomeOutcomeBarChart } from "@/components/IncomeOutcomeBarChart";
import { PageHeader } from "@/components/PageHeader";
import { PeriodFilter } from "@/components/PeriodFilter";
import { ReportMetricCard } from "@/components/ReportMetricCard";
import { TransactionsContext } from "@/contexts/TransactionsContenxt";
import { Transaction } from "@/types/transaction";
import { calculateSavingsRate, calculateSummary, getTransactionType } from "@/utils/finance";
import { formatCurrency } from "@/utils/formatters";
import {
  EvolutionAmount,
  EvolutionBar,
  EvolutionFill,
  EvolutionItem,
  EvolutionList,
  EvolutionMonth,
  FiltersRow,
  ChartGrid,
  MetricsGrid,
  PageContent,
  Section,
  SectionBody,
  SectionHeader,
  SectionsGrid,
} from "./styles";

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function getTransactionMonth(transaction: Transaction) {
  return new Date(transaction.date).toISOString().slice(0, 7);
}

function formatMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);

  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "numeric",
  }).format(new Date(year, monthNumber - 1, 1));
}

function getPreviousMonths(referenceMonth: string, quantity: number) {
  const [year, month] = referenceMonth.split("-").map(Number);
  const referenceDate = new Date(year, month - 1, 1);

  return Array.from({ length: quantity }, (_, index) => {
    const date = new Date(referenceDate);
    date.setMonth(referenceDate.getMonth() - (quantity - 1 - index));

    return date.toISOString().slice(0, 7);
  });
}

export default function ReportsPage() {
  const { transactions } = useContext(TransactionsContext);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const monthlyTransactions = transactions.filter(
    (transaction) => getTransactionMonth(transaction) === selectedMonth,
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
      acc[transaction.category] =
        (acc[transaction.category] ?? 0) + Math.abs(transaction.amount);
      return acc;
    },
    {},
  );
  const totalExpenses = Math.abs(summary.outcome);
  const categoryItems: CategoryBreakdownItem[] = Object.entries(categoryTotals)
    .sort(([, amountA], [, amountB]) => amountB - amountA)
    .map(([category, amount]) => ({
      category,
      amount: formatCurrency(amount),
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
    }));
  const categoryChartItems = Object.entries(categoryTotals)
    .sort(([, amountA], [, amountB]) => amountB - amountA)
    .map(([category, amount]) => ({ category, amount }));
  const topCategory = categoryItems[0];
  const daysInSelectedMonth = new Date(
    Number(selectedMonth.slice(0, 4)),
    Number(selectedMonth.slice(5, 7)),
    0,
  ).getDate();
  const dailyAverage = totalExpenses / daysInSelectedMonth;
  const evolution = getPreviousMonths(selectedMonth, 6).map((month) => {
    const monthTransactions = transactions.filter(
      (transaction) => getTransactionMonth(transaction) === month,
    );
    const monthSummary = calculateSummary(monthTransactions);

    return {
      month,
      label: formatMonthLabel(month),
      income: monthSummary.income,
      outcome: Math.abs(monthSummary.outcome),
      balance: monthSummary.total,
    };
  });
  const maxEvolution = Math.max(
    ...evolution.map((item) => Math.abs(item.balance)),
    1,
  );

  return (
    <AppShell>
      <PageHeader
        eyebrow="Relatórios"
        title="Análise do período"
        subtitle="Veja receitas, despesas, categorias mais fortes e a evolução do saldo sem gráficos externos."
      />

      <PageContent>
        <FiltersRow>
          <PeriodFilter
            value={selectedMonth}
            onChange={(value) => setSelectedMonth(value || getCurrentMonth())}
          />
        </FiltersRow>

        <MetricsGrid>
          <ReportMetricCard
            title="Receitas"
            value={formatCurrency(summary.income)}
            description="Total de entradas registradas no período."
            variant="green"
          />
          <ReportMetricCard
            title="Despesas"
            value={formatCurrency(summary.outcome)}
            description="Total de saídas registradas no período."
            variant="red"
          />
          <ReportMetricCard
            title="Saldo"
            value={formatCurrency(summary.total)}
            description="Diferença entre receitas e despesas do mês."
            variant="blue"
          />
          <ReportMetricCard
            title="Maior despesa"
            value={biggestExpense ? formatCurrency(biggestExpense.amount) : "Sem dados"}
            description={
              biggestExpense
                ? `${biggestExpense.description} foi a maior saída do período.`
                : "Cadastre despesas para visualizar este indicador."
            }
            variant="red"
          />
          <ReportMetricCard
            title="Categoria líder"
            value={topCategory?.category ?? "Sem dados"}
            description={
              topCategory
                ? `${topCategory.amount} concentrados nesta categoria.`
                : "As categorias aparecerão conforme houver despesas."
            }
            variant="blue"
          />
          <ReportMetricCard
            title="Média diária"
            value={formatCurrency(dailyAverage)}
            description="Média de despesas por dia no mês selecionado."
            variant="green"
          />
          <ReportMetricCard
            title="Taxa de economia"
            value={calculateSavingsRate(summary.income, summary.total)}
            description="Proporção estimada do saldo sobre as receitas do mês."
            variant="green"
          />
        </MetricsGrid>

        <ChartGrid>
          <Section>
            <SectionHeader>
              <h2>Despesas por categoria</h2>
              <span>Donut</span>
            </SectionHeader>
            <SectionBody>
              <ExpenseDonutChart data={categoryChartItems} />
            </SectionBody>
          </Section>

          <Section>
            <SectionHeader>
              <h2>Receitas vs despesas</h2>
              <span>Últimos 6 meses</span>
            </SectionHeader>
            <SectionBody>
              <IncomeOutcomeBarChart data={evolution} />
            </SectionBody>
          </Section>

          <Section>
            <SectionHeader>
              <h2>Linha do saldo</h2>
              <span>Últimos 6 meses</span>
            </SectionHeader>
            <SectionBody>
              <BalanceLineChart data={evolution} />
            </SectionBody>
          </Section>
        </ChartGrid>

        <SectionsGrid>
          <Section>
            <SectionHeader>
              <h2>Gastos por categoria</h2>
              <span>{categoryItems.length} categoria(s)</span>
            </SectionHeader>
            <SectionBody>
              <CategoryBreakdown items={categoryItems} />
            </SectionBody>
          </Section>

          <Section>
            <SectionHeader>
              <h2>Evolução do saldo</h2>
              <span>Últimos 6 meses</span>
            </SectionHeader>
            <SectionBody>
              <EvolutionList>
                {evolution.map((item) => (
                  <EvolutionItem key={item.month}>
                    <EvolutionMonth>{item.label}</EvolutionMonth>
                    <EvolutionBar>
                      <EvolutionFill
                        $positive={item.balance >= 0}
                        $value={(Math.abs(item.balance) / maxEvolution) * 100}
                      />
                    </EvolutionBar>
                    <EvolutionAmount $positive={item.balance >= 0}>
                      {formatCurrency(item.balance)}
                    </EvolutionAmount>
                  </EvolutionItem>
                ))}
              </EvolutionList>
            </SectionBody>
          </Section>
        </SectionsGrid>
      </PageContent>
    </AppShell>
  );
}
