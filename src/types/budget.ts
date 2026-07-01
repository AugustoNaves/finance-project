export interface Budget {
  id: string;
  category: string;
  amount: number;
  month: string;
}

export type BudgetPayload = Omit<Budget, "id">;
