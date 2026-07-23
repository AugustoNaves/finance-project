export type TransactionType = "income" | "outcome" | "investment";

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  type?: TransactionType | null;
  paymentMethod?: string | null;
  notes?: string | null;
}

export type TransactionPayload = Omit<Transaction, "id" | "date">;
