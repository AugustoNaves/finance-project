import { Goal, GoalPayload } from "@/types/goal";

export async function fetchGoals(): Promise<Goal[]> {
  const response = await fetch("/api/goals");
  const data = await response.json();

  if (!response.ok || !Array.isArray(data)) {
    return [];
  }

  return data as Goal[];
}

export async function createGoal(payload: GoalPayload): Promise<Goal | null> {
  const response = await fetch("/api/goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) return null;

  return (await response.json()) as Goal;
}

export async function patchGoal(id: string, payload: GoalPayload): Promise<Goal | null> {
  const response = await fetch(`/api/goals/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) return null;

  return (await response.json()) as Goal;
}

export async function removeGoal(id: string): Promise<boolean> {
  const response = await fetch(`/api/goals/${id}`, { method: "DELETE" });

  return response.ok;
}
