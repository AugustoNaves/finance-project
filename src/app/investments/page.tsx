"use client";

import { useContext, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BalanceLineChart } from "@/components/BalanceLineChart";
import { NewTransactionModal } from "@/components/NewTransactionModal";
import { PageHeader } from "@/components/PageHeader";
import { SummaryCard } from "@/components/SummaryCard";
import { TransactionList } from "@/components/TransactionList";
import { TransactionsContext } from "@/contexts/TransactionsContenxt";
import { Transaction } from "@/types/transaction";
import { getTransactionType } from "@/utils/finance";
import { formatCurrency } from "@/utils/formatters";
import { ChartSection, InvestmentGrid, PageContent, Section } from "./styles";

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

export default function InvestmentsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { transactions, deleteTransaction, updateTransaction } =
    useContext(TransactionsContext);

  const investments = useMemo(
    () => transactions.filter((transaction) => getTransactionType(transaction) === "investment"),
    [transactions],
  );

  const totalInvested = investments.reduce(
    (acc, transaction) => acc + Math.abs(transaction.amount),
    0,
  );

  const currentMonth = new Date().toISOString().slice(0, 7);
  const evolution = getPreviousMonths(currentMonth, 6).map((month) => {
    const monthInvestments = investments.filter(
      (transaction) => getTransactionMonth(transaction) === month,
    );
    const monthTotal = monthInvestments.reduce(
      (acc, transaction) => acc + Math.abs(transaction.amount),
      0,
    );

    return {
      label: formatMonthLabel(month),
      balance: monthTotal,
    };
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Investimentos"
        title="Aportes e patrimônio"
        subtitle="Acompanhe para onde seus investimentos estão indo e a evolução dos aportes ao longo do tempo."
        actionLabel="+ Novo Aporte"
        onAction={() => setModalOpen(true)}
      />

      <PageContent>
        <InvestmentGrid>
          <SummaryCard
            title="Total investido"
            amount={formatCurrency(totalInvested)}
            type="investment"
          />
          <SummaryCard
            title="Aportes no mês"
            amount={formatCurrency(
              investments
                .filter(
                  (transaction) =>
                    getTransactionMonth(transaction) === currentMonth,
                )
                .reduce((acc, transaction) => acc + Math.abs(transaction.amount), 0),
            )}
            type="investment"
          />
        </InvestmentGrid>

        <ChartSection>
          <h2>Evolução dos aportes</h2>
          <span>Últimos 6 meses</span>
          <BalanceLineChart data={evolution} />
        </ChartSection>

        <Section>
          <TransactionList
            transactions={investments}
            onDelete={deleteTransaction}
            onUpdate={updateTransaction}
          />
        </Section>
      </PageContent>

      <NewTransactionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </AppShell>
  );
}
