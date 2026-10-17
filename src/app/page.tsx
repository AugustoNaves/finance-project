"use client";

import Link from "next/link";
import { useContext, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EntryRow } from "@/components/EntryRow";
import { LedgerSection } from "@/components/LedgerSection";
import { MonthSummary } from "@/components/MonthSummary";
import { MonthSwitcher } from "@/components/MonthSwitcher";
import { ProgressBar } from "@/components/ProgressBar";
import { EntrySheetContext } from "@/contexts/EntrySheetContext";
import { TransactionsContext } from "@/contexts/TransactionsContenxt";
import { ImportBatchSummary } from "@/features/invoice-import/types";
import { fetchBudgets } from "@/services/budgets";
import { fetchImportBatches } from "@/services/imports";
import { Budget } from "@/types/budget";
import { getLocalMonthKey } from "@/utils/dates";
import { calculateSummary, getMonthlyTransactions, getTransactionType } from "@/utils/finance";
import { formatMonthYear, formatPlainAmount } from "@/utils/formatters";
import {
  BudgetItem,
  BudgetList,
  Column,
  EmptyMonth,
  EntryList,
  Grid,
  InvoiceNudge,
  Quiet,
  RegisterFirst,
} from "./styles";

function monthName(date: Date) {
  return date.toLocaleDateString("pt-BR", { month: "long" });
}

export default function Home() {
  const { transactions } = useContext(TransactionsContext);
  const { openNewEntry } = useContext(EntrySheetContext);
  const [monthOffset, setMonthOffset] = useState(0);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [batches, setBatches] = useState<ImportBatchSummary[] | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([fetchBudgets(), fetchImportBatches()])
      .then(([budgetData, batchData]) => {
        if (!active) return;
        setBudgets(budgetData);
        setBatches(batchData);
      })
      .catch((error) => console.error("Erro ao carregar o mês:", error));

    return () => {
      active = false;
    };
  }, []);

  const now = new Date();
  const reference = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const monthKey = getLocalMonthKey(reference);
  const monthTransactions = getMonthlyTransactions(transactions, reference);
  const month = calculateSummary(monthTransactions);
  const overall = calculateSummary(transactions);
  const latest = [...monthTransactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);

  const spentByCategory = monthTransactions
    .filter((transaction) => getTransactionType(transaction) === "outcome")
    .reduce<Record<string, number>>((acc, transaction) => {
      acc[transaction.category] = (acc[transaction.category] ?? 0) + Math.abs(transaction.amount);
      return acc;
    }, {});

  const monthBudgets = budgets
    .filter((budget) => budget.month === monthKey)
    .map((budget) => {
      const spent = spentByCategory[budget.category] ?? 0;

      return { ...budget, spent, pct: budget.amount > 0 ? (spent / budget.amount) * 100 : 0 };
    })
    .sort((a, b) => b.pct - a.pct);

  const showInvoiceNudge =
    monthOffset === 0 &&
    batches !== null &&
    !batches.some((batch) => batch.referenceMonth === monthKey);

  return (
    <AppShell>
      <MonthSwitcher
        label={formatMonthYear(reference)}
        onPrevious={() => setMonthOffset(monthOffset - 1)}
        onNext={() => setMonthOffset(monthOffset + 1)}
      />

      <Grid>
        <Column>
          <MonthSummary
            income={month.income}
            outcome={month.outcome}
            investment={month.investment}
            balance={month.total}
            accumulated={overall.total}
          />

          {showInvoiceNudge && (
            <InvoiceNudge as={Link} href="/import">
              <span>A fatura de {monthName(reference)} ainda não foi importada.</span>
              <b>Importar →</b>
            </InvoiceNudge>
          )}

          <LedgerSection title="Orçamentos" action={{ label: "Planejar", href: "/planning" }}>
            {monthBudgets.length === 0 ? (
              <Quiet>Nenhum orçamento para {monthName(reference)}.</Quiet>
            ) : (
              <BudgetList>
                {monthBudgets.slice(0, 4).map((budget) => (
                  <BudgetItem key={budget.id} $over={budget.pct > 100} $near={budget.pct >= 80}>
                    <span>{budget.category}</span>
                    <span>
                      {formatPlainAmount(budget.spent)} de {formatPlainAmount(budget.amount)}
                    </span>
                    <ProgressBar value={budget.pct} label={budget.category} />
                  </BudgetItem>
                ))}
              </BudgetList>
            )}
          </LedgerSection>
        </Column>

        <LedgerSection title="Últimos lançamentos" action={{ label: "Ver todos", href: "/transactions" }}>
          {latest.length === 0 ? (
            <EmptyMonth>
              <p>Nada registrado em {monthName(reference)}.</p>
              <RegisterFirst type="button" onClick={() => openNewEntry()}>
                Registrar o primeiro
              </RegisterFirst>
            </EmptyMonth>
          ) : (
            <EntryList>
              {latest.map((transaction) => (
                <EntryRow key={transaction.id} transaction={transaction} showDate />
              ))}
            </EntryList>
          )}
        </LedgerSection>
      </Grid>
    </AppShell>
  );
}
