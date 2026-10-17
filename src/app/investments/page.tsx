"use client";

import { useContext } from "react";
import { AppShell } from "@/components/AppShell";
import { BalanceLineChart } from "@/components/BalanceLineChart";
import { CategoryBreakdown, CategoryBreakdownItem } from "@/components/CategoryBreakdown";
import { LedgerSection } from "@/components/LedgerSection";
import { PageHeader } from "@/components/PageHeader";
import { TransactionList } from "@/components/TransactionList";
import { EntrySheetContext } from "@/contexts/EntrySheetContext";
import { TransactionsContext } from "@/contexts/TransactionsContenxt";
import { getLocalMonthKey, getMonthKey } from "@/utils/dates";
import { getTransactionType } from "@/utils/finance";
import { formatCurrency } from "@/utils/formatters";
import { Caption, Cents, Figure, Grid, Hero, HeroLabel, MonthLine, Quiet } from "./styles";

const shortMonth = new Intl.DateTimeFormat("pt-BR", { month: "short" });
const longMonth = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

function getPreviousMonths(referenceMonth: string, quantity: number) {
  const [year, month] = referenceMonth.split("-").map(Number);

  return Array.from({ length: quantity }, (_, index) =>
    new Date(year, month - 1 - (quantity - 1 - index), 1),
  );
}

export default function InvestmentsPage() {
  const { transactions } = useContext(TransactionsContext);
  const { openNewEntry } = useContext(EntrySheetContext);

  const investments = transactions
    .filter((transaction) => getTransactionType(transaction) === "investment")
    .sort((transactionA, transactionB) => transactionB.date.localeCompare(transactionA.date));
  const currentMonth = getLocalMonthKey();

  const totalInvested = investments.reduce(
    (acc, transaction) => acc + Math.abs(transaction.amount),
    0,
  );
  const monthInvested = investments
    .filter((transaction) => getMonthKey(transaction.date) === currentMonth)
    .reduce((acc, transaction) => acc + Math.abs(transaction.amount), 0);

  const byCategory = investments.reduce<Record<string, number>>((acc, transaction) => {
    acc[transaction.category] = (acc[transaction.category] ?? 0) + Math.abs(transaction.amount);
    return acc;
  }, {});
  const categoryItems: CategoryBreakdownItem[] = Object.entries(byCategory)
    .sort(([, amountA], [, amountB]) => amountB - amountA)
    .map(([category, amount]) => ({
      category,
      amount: formatCurrency(amount),
      percentage: totalInvested > 0 ? (amount / totalInvested) * 100 : 0,
    }));

  const evolution = getPreviousMonths(currentMonth, 6).map((date) => {
    const month = getLocalMonthKey(date);

    return {
      label: shortMonth.format(date),
      fullLabel: longMonth.format(date),
      balance: investments
        .filter((transaction) => getMonthKey(transaction.date) === month)
        .reduce((acc, transaction) => acc + Math.abs(transaction.amount), 0),
    };
  });

  const [whole, cents] = formatCurrency(totalInvested).split(",");

  return (
    <AppShell>
      <PageHeader
        title="Investimentos"
        actionLabel="Novo aporte"
        onAction={() => openNewEntry("investment")}
      />

      <Hero aria-labelledby="investments-total-label">
        <div>
          <HeroLabel id="investments-total-label">Total investido</HeroLabel>
          <Figure>
            {whole}
            <Cents>,{cents}</Cents>
          </Figure>
        </div>
        <MonthLine>
          <span>Aportes no mês</span>
          <b>{formatCurrency(monthInvested)}</b>
        </MonthLine>
      </Hero>

      <Grid>
        <LedgerSection title="Por categoria">
          <CategoryBreakdown
            items={categoryItems}
            tone="neutral"
            shareLabel="do total"
            emptyText="Nenhum aporte registrado."
          />
        </LedgerSection>

        <LedgerSection title="Evolução dos aportes">
          <Caption>Últimos 6 meses</Caption>
          <BalanceLineChart data={evolution} seriesName="Aportes" />
        </LedgerSection>
      </Grid>

      <LedgerSection title="Aportes">
        {investments.length === 0 ? (
          <Quiet>Nenhum aporte registrado ainda.</Quiet>
        ) : (
          <TransactionList transactions={investments} />
        )}
      </LedgerSection>
    </AppShell>
  );
}
