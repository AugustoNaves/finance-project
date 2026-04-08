"use client";

import { createContext, ReactNode, useState } from "react";

export interface Transaction {
  id: number;
  description: string;
  amount: number;
  category: string;
  date: string;
  payer: "Eu" | "Namorada";
}

interface TransactionsContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, "id" | "date">) => void;
}

export const TransactionsContext = createContext<TransactionsContextType>(
  {} as TransactionsContextType,
);

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 1,
      description: "Salário",
      amount: 5000,
      category: "Receita",
      date: "01/04/2026",
      payer: "Eu",
    },
    {
      id: 2,
      description: "Salário",
      amount: 3800,
      category: "Receita",
      date: "01/04/2026",
      payer: "Namorada",
    },
    {
      id: 3,
      description: "Aluguel",
      amount: -1800,
      category: "Moradia",
      date: "05/04/2026",
      payer: "Eu",
    },
  ]);

  function addTransaction(newTx: Omit<Transaction, "id" | "date">) {
    const newTransaction = {
      ...newTx,
      id: Math.random(), // Criamos um ID falso por enquanto
      date: new Intl.DateTimeFormat("pt-BR").format(new Date()), // Pega a data de hoje
    };

    setTransactions([newTransaction, ...transactions]);
  }

  return (
    <TransactionsContext.Provider value={{ transactions, addTransaction }}>
      {children}
    </TransactionsContext.Provider>
  );
}
