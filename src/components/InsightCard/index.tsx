"use client";

import { Card, CardDescription, CardHeader, CardIcon, CardTitle, CardValue } from "./styles";

interface InsightCardProps {
  title: string;
  value: string;
  description: string;
  variant?: "green" | "blue" | "red";
}

export function InsightCard({
  title,
  value,
  description,
  variant = "green",
}: InsightCardProps) {
  return (
    <Card $variant={variant}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardIcon $variant={variant} />
      </CardHeader>
      <CardValue>{value}</CardValue>
      <CardDescription>{description}</CardDescription>
    </Card>
  );
}
