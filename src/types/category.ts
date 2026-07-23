export type CategoryType = "income" | "outcome" | "investment";

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color?: string | null;
  icon?: string | null;
}

export type CategoryPayload = Omit<Category, "id">;
