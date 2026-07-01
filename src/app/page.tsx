"use client";
import { useState, useContext } from "react";
import { TransactionsContext } from "@/contexts/TransactionsContenxt"; // <-- Importação do contexto
import { AppShell } from "@/components/AppShell";
import { InsightCard } from "@/components/InsightCard";
import { LatestTransactions } from "@/components/LatestTransactions";
import { MonthSummary } from "@/components/MonthSummary";
import { PageHeader } from "@/components/PageHeader";
import { SummaryCard } from "@/components/SummaryCard";
import { NewTransactionModal } from "@/components/NewTransactionModal";
import {
  calculateSavingsRate,
  calculateSummary,
  getMonthlyTransactions,
} from "@/utils/finance";
import { formatCurrency, formatMonthYear } from "@/utils/formatters";
import { DashboardGrid, InsightsGrid, MainColumn, SummaryGrid } from "./styles";

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const { transactions } = useContext(TransactionsContext);

  const now = new Date();
  const summary = calculateSummary(transactions);
  const currentMonthTransactions = getMonthlyTransactions(transactions, now);
  const monthSummary = calculateSummary(currentMonthTransactions);

  const biggestExpense = currentMonthTransactions
    .filter((transaction) => transaction.amount < 0)
    .sort((a, b) => a.amount - b.amount)[0];

  const categoryTotals = currentMonthTransactions
    .filter((transaction) => transaction.amount < 0)
    .reduce<Record<string, number>>((acc, transaction) => {
      acc[transaction.category] =
        (acc[transaction.category] ?? 0) + Math.abs(transaction.amount);
      return acc;
    }, {});

  const topCategory = Object.entries(categoryTotals).sort(
    ([, amountA], [, amountB]) => amountB - amountA,
  )[0];

  const savingsRate = calculateSavingsRate(monthSummary.income, monthSummary.total);

  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const monthLabel = formatMonthYear(now);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Visão geral"
        title="Controle financeiro"
        subtitle="Acompanhe suas receitas, despesas e saldo total em um painel simples para o dia a dia."
        actionLabel="+ Nova Transação"
        onAction={() => setModalOpen(true)}
      />

      <SummaryGrid>
        <SummaryCard
          title="Receitas"
          amount={formatCurrency(summary.income)}
          type="income"
        />
        <SummaryCard
          title="Despesas"
          amount={formatCurrency(summary.outcome)}
          type="outcome"
        />
        <SummaryCard
          title="Saldo Total"
          amount={formatCurrency(summary.total)}
          type="total"
        />
      </SummaryGrid>

      <DashboardGrid>
        <MainColumn>
          <LatestTransactions transactions={sortedTransactions} />
        </MainColumn>

        <MonthSummary
          monthLabel={monthLabel}
          income={formatCurrency(monthSummary.income)}
          outcome={formatCurrency(monthSummary.outcome)}
          balance={formatCurrency(monthSummary.total)}
          savingsRate={savingsRate}
        />
      </DashboardGrid>

      <InsightsGrid>
        <InsightCard
          title="Maior despesa"
          value={biggestExpense ? formatCurrency(biggestExpense.amount) : "Sem dados"}
          description={
            biggestExpense
              ? `${biggestExpense.description} foi a maior saída deste mês.`
              : "Cadastre despesas para visualizar este indicador."
          }
          variant="red"
        />
        <InsightCard
          title="Categoria em destaque"
          value={topCategory ? topCategory[0] : "Sem dados"}
          description={
            topCategory
              ? `${formatCurrency(topCategory[1])} concentrados nesta categoria.`
              : "As categorias aparecerão conforme você registrar transações."
          }
          variant="blue"
        />
        <InsightCard
          title="Movimento do mês"
          value={`${currentMonthTransactions.length}`}
          description="Total de transações registradas no mês atual."
          variant="green"
        />
      </InsightsGrid>

      <NewTransactionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </AppShell>
  );
}
