import { Category, CategoryPayload } from "@/types/category";

export async function fetchCategories() {
  const response = await fetch("/api/categories");
  const data = await response.json();

  if (!response.ok || !Array.isArray(data)) {
    return [];
  }

  return data as Category[];
}

export async function createCategory(payload: CategoryPayload) {
  const response = await fetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) return null;

  return (await response.json()) as Category;
}

export async function patchCategory(id: string, payload: CategoryPayload) {
  const response = await fetch(`/api/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) return null;

  return (await response.json()) as Category;
}

export async function removeCategory(id: string) {
  const response = await fetch(`/api/categories/${id}`, {
    method: "DELETE",
  });

  return response.ok;
}
