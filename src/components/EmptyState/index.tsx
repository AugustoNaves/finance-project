"use client";

import { EmptyText } from "./styles";

interface EmptyStateProps {
  children: string;
}

export function EmptyState({ children }: EmptyStateProps) {
  return <EmptyText>{children}</EmptyText>;
}
