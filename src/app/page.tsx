"use client";
import { useState, useContext, useEffect } from "react";
import { TransactionsContext } from "@/contexts/TransactionsContenxt"; // <-- Importação do contexto
import { AppShell } from "@/components/AppShell";
import { InsightCard } from "@/components/InsightCard";
import { LatestTransactions } from "@/components/LatestTransactions";
import { MonthSummary } from "@/components/MonthSummary";
import { PageHeader } from "@/components/PageHeader";
import { SummaryCard } from "@/components/SummaryCard";
import { fetchGoals } from "@/services/goals";
import { Goal } from "@/types/goal";
import { NewTransactionModal } from "@/components/NewTransactionModal";
import {
  calculateInvestments,
  calculateSavingsRate,
  calculateSummary,
  getMonthlyTransactions,
  getTransactionType,
} from "@/utils/finance";
import { formatCurrency, formatMonthYear } from "@/utils/formatters";
import { DashboardGrid, InsightsGrid, MainColumn, SummaryGrid } from "./styles";

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const { transactions } = useContext(TransactionsContext);

  useEffect(() => {
    async function loadGoals() {
      try {
        const data = await fetchGoals();
        setGoals(data);
      } catch (error) {
        console.error("Erro ao buscar metas:", error);
      }
    }

    loadGoals();
  }, []);

  const now = new Date();
  const summary = calculateSummary(transactions);
  const currentMonthTransactions = getMonthlyTransactions(transactions, now);
  const monthSummary = calculateSummary(currentMonthTransactions);

  const biggestExpense = currentMonthTransactions
    .filter((transaction) => getTransactionType(transaction) === "outcome")
    .sort((a, b) => a.amount - b.amount)[0];

  const categoryTotals = currentMonthTransactions
    .filter((transaction) => getTransactionType(transaction) === "outcome")
    .reduce<Record<string, number>>((acc, transaction) => {
      acc[transaction.category] =
        (acc[transaction.category] ?? 0) + Math.abs(transaction.amount);
      return acc;
    }, {});

  const topCategory = Object.entries(categoryTotals).sort(
    ([, amountA], [, amountB]) => amountB - amountA,
  )[0];

  const savingsRate = calculateSavingsRate(monthSummary.income, monthSummary.total);

  const closestGoal = goals
    .filter((goal) => goal.targetAmount > 0)
    .sort((goalA, goalB) => {
      const progressA = goalA.currentAmount / goalA.targetAmount;
      const progressB = goalB.currentAmount / goalB.targetAmount;

      return progressB - progressA;
    })[0];

  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const monthLabel = formatMonthYear(now);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Visão geral"
        title="Controle financeiro"
        subtitle="Acompanhe receitas, despesas, investimentos e saldo total em um painel simples para o dia a dia."
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
          title="Investimentos"
          amount={formatCurrency(calculateInvestments(transactions))}
          type="investment"
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
        <InsightCard
          title="Meta mais próxima"
          value={
            closestGoal
              ? `${Math.round((closestGoal.currentAmount / closestGoal.targetAmount) * 100)}%`
              : "Sem metas"
          }
          description={
            closestGoal
              ? `${closestGoal.name}: ${formatCurrency(closestGoal.currentAmount)} de ${formatCurrency(closestGoal.targetAmount)}.`
              : "Cadastre metas em Planejamento para acompanhar o progresso."
          }
          variant="blue"
        />
      </InsightsGrid>

      <NewTransactionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </AppShell>
  );
}
