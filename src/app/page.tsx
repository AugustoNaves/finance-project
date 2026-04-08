"use client";
import { useState, useContext } from "react";
import { TransactionsContext } from "@/contexts/TransactionsContenxt"; // <-- Importação do contexto
import { Header } from "@/components/Header";
import { SummaryCard } from "@/components/SummaryCard";
import { TransactionTable } from "@/components/TransactionTable";
import { NewTransactionModal } from "@/components/NewTransactionModal";
import {
  PageWrapper,
  HeaderWrapper,
  SummaryGrid,
  ContentWrapper,
} from "./styles";

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const { transactions } = useContext(TransactionsContext);

  const summary = transactions.reduce(
    (acc, transaction) => {
      if (transaction.amount > 0) {
        acc.income += transaction.amount;
        acc.total += transaction.amount;
      } else {
        acc.outcome += transaction.amount;
        acc.total += transaction.amount;
      }
      return acc;
    },
    { income: 0, outcome: 0, total: 0 },
  );
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <PageWrapper>
      <HeaderWrapper>
        <Header onNewTransaction={() => setModalOpen(true)} />
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
      </HeaderWrapper>

      <ContentWrapper>
        <TransactionTable />
      </ContentWrapper>

      <NewTransactionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </PageWrapper>
  );
}
