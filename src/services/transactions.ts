import { Transaction, TransactionPayload } from "@/types/transaction";

export async function fetchTransactions() {
  const response = await fetch("/api/transactions");
  const data = await response.json();

  if (!response.ok || !Array.isArray(data)) {
    return [];
  }

  return data as Transaction[];
}

export async function createTransaction(payload: TransactionPayload) {
  const response = await fetch("/api/transactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) return null;

  return (await response.json()) as Transaction;
}

export async function patchTransaction(id: string, payload: TransactionPayload) {
  const response = await fetch(`/api/transactions/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) return null;

  return (await response.json()) as Transaction;
}

export async function removeTransaction(id: string) {
  const response = await fetch(`/api/transactions/${id}`, {
    method: "DELETE",
  });

  return response.ok;
}
