"use client";

import { createContext, ReactNode, useState, useEffect } from "react";

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  payer: "Eu" | "Namorada";
}

interface TransactionsContextType {
  transactions: Transaction[];
  addTransaction: (
    transaction: Omit<Transaction, "id" | "date">,
  ) => Promise<void>;
}

export const TransactionsContext = createContext<TransactionsContextType>(
  {} as TransactionsContextType,
);

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    async function fetchTransactions() {
      try {
        const response = await fetch("/api/transactions");
        const data = await response.json();
        setTransactions(data);
      } catch (error) {
        console.error("Erro ao buscar transações:", error);
      }
    }

    fetchTransactions();
  }, []);

  async function addTransaction(newTx: Omit<Transaction, "id" | "date">) {
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTx),
      });

      if (response.ok) {
        const transactionCreated = await response.json();

        setTransactions([transactionCreated, ...transactions]);
      }
    } catch (error) {
      console.error("Erro ao salvar a transação:", error);
    }
  }

  return (
    <TransactionsContext.Provider value={{ transactions, addTransaction }}>
      {children}
    </TransactionsContext.Provider>
  );
}
