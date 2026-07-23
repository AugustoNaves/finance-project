export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  color: string | null;
}

export type GoalPayload = Omit<Goal, "id">;
