import { Budget, BudgetPayload } from "@/types/budget";

export async function fetchBudgets() {
  const response = await fetch("/api/budgets");
  const data = await response.json();

  if (!response.ok || !Array.isArray(data)) {
    return [];
  }

  return data as Budget[];
}

export async function createBudget(payload: BudgetPayload) {
  const response = await fetch("/api/budgets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) return null;

  return (await response.json()) as Budget;
}

export async function patchBudget(id: string, payload: BudgetPayload) {
  const response = await fetch(`/api/budgets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) return null;

  return (await response.json()) as Budget;
}

export async function removeBudget(id: string) {
  const response = await fetch(`/api/budgets/${id}`, {
    method: "DELETE",
  });

  return response.ok;
}
