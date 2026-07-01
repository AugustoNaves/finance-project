"use client";

import { useContext, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { NewTransactionModal } from "@/components/NewTransactionModal";
import { PageHeader } from "@/components/PageHeader";
import {
  TransactionFilters,
  TransactionFiltersState,
} from "@/components/TransactionFilters";
import { TransactionList } from "@/components/TransactionList";
import { TransactionsContext } from "@/contexts/TransactionsContenxt";
import { getTransactionType } from "@/utils/finance";
import { PageContent } from "./styles";

const initialFilters: TransactionFiltersState = {
  search: "",
  type: "all",
  category: "all",
  payer: "all",
  startDate: "",
  endDate: "",
  sort: "dateDesc",
};

export default function TransactionsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState<TransactionFiltersState>(initialFilters);
  const { transactions, deleteTransaction, updateTransaction } =
    useContext(TransactionsContext);

  const categories = Array.from(
    new Set(transactions.map((transaction) => transaction.category).filter(Boolean)),
  ).sort((categoryA, categoryB) => categoryA.localeCompare(categoryB));

  const filteredTransactions = transactions
    .filter((transaction) => {
      const transactionDate = new Date(transaction.date);
      const search = filters.search.trim().toLowerCase();
      const matchesSearch = search
        ? transaction.description.toLowerCase().includes(search)
        : true;
      const matchesType =
        filters.type === "all" ||
        getTransactionType(transaction) === filters.type;
      const matchesCategory =
        filters.category === "all" || transaction.category === filters.category;
      const matchesPayer = filters.payer === "all" || transaction.payer === filters.payer;
      const matchesStartDate = filters.startDate
        ? transactionDate >= new Date(`${filters.startDate}T00:00:00`)
        : true;
      const matchesEndDate = filters.endDate
        ? transactionDate <= new Date(`${filters.endDate}T23:59:59`)
        : true;

      return (
        matchesSearch &&
        matchesType &&
        matchesCategory &&
        matchesPayer &&
        matchesStartDate &&
        matchesEndDate
      );
    })
    .sort((transactionA, transactionB) => {
      if (filters.sort === "dateAsc") {
        return new Date(transactionA.date).getTime() - new Date(transactionB.date).getTime();
      }

      if (filters.sort === "valueDesc") {
        return Math.abs(transactionB.amount) - Math.abs(transactionA.amount);
      }

      if (filters.sort === "valueAsc") {
        return Math.abs(transactionA.amount) - Math.abs(transactionB.amount);
      }

      return new Date(transactionB.date).getTime() - new Date(transactionA.date).getTime();
    });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Transações"
        title="Todas as movimentações"
        subtitle="Busque, filtre e acompanhe todas as receitas e despesas cadastradas."
        actionLabel="+ Nova Transação"
        onAction={() => setModalOpen(true)}
      />

      <PageContent>
        <TransactionFilters
          filters={filters}
          categories={categories}
          onChange={setFilters}
          onReset={() => setFilters(initialFilters)}
        />

        <TransactionList
          transactions={filteredTransactions}
          onDelete={deleteTransaction}
          onUpdate={updateTransaction}
        />
      </PageContent>

      <NewTransactionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </AppShell>
  );
}
