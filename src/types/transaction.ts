export type TransactionType = "income" | "outcome";

export type Payer = "Eu" | "Namorada";

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  payer: Payer;
  type?: TransactionType | null;
  paymentMethod?: string | null;
  notes?: string | null;
}

export type TransactionPayload = Omit<Transaction, "id" | "date">;
