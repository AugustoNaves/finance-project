import { toApiError } from "@/services/http";
import type { CategoryRule } from "@/types/categoryRule";

export async function getCategoryRules(): Promise<CategoryRule[]> {
  const response = await fetch("/api/category-rules");

  if (!response.ok) {
    throw await toApiError(response, "Não foi possível carregar as regras de categorização.");
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    return [];
  }

  return data as CategoryRule[];
}

export async function deleteCategoryRule(id: string): Promise<boolean> {
  const response = await fetch(`/api/category-rules/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw await toApiError(response, "Não foi possível excluir a regra de categorização.");
  }

  return true;
}
