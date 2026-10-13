"use client";

import { createContext, ReactNode, useState, useEffect } from "react";
import {
  createTransaction,
  fetchTransactions,
  patchTransaction,
  removeTransaction,
} from "@/services/transactions";
import { Transaction, TransactionPayload } from "@/types/transaction";

export type { Transaction } from "@/types/transaction";

interface TransactionsContextType {
  transactions: Transaction[];
  addTransaction: (transaction: TransactionPayload) => Promise<void>;
  updateTransaction: (id: string, transaction: TransactionPayload) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

export const TransactionsContext = createContext<TransactionsContextType>(
  {} as TransactionsContextType,
);

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    async function loadTransactions() {
      try {
        const data = await fetchTransactions();
        setTransactions(data);
      } catch (error) {
        console.error("Erro ao buscar transações:", error);
        setTransactions([]);
      }
    }

    loadTransactions();
  }, []);

  async function addTransaction(newTx: TransactionPayload) {
    const transactionCreated = await createTransaction(newTx);

    setTransactions((currentTransactions) => [
      transactionCreated,
      ...currentTransactions,
    ]);
  }

  async function updateTransaction(id: string, updatedTx: TransactionPayload) {
    const transactionUpdated = await patchTransaction(id, updatedTx);

    setTransactions((currentTransactions) =>
      currentTransactions.map((transaction) =>
        transaction.id === id ? transactionUpdated : transaction,
      ),
    );
  }

  async function deleteTransaction(id: string) {
    await removeTransaction(id);

    setTransactions((currentTransactions) =>
      currentTransactions.filter((transaction) => transaction.id !== id),
    );
  }

  return (
    <TransactionsContext.Provider
      value={{ transactions, addTransaction, updateTransaction, deleteTransaction }}
    >
      {children}
    </TransactionsContext.Provider>
  );
}
