"use client";

import { Card, Description, Header, Indicator, Title, Value } from "./styles";

export type ReportMetricVariant = "green" | "blue" | "red";

interface ReportMetricCardProps {
  title: string;
  value: string;
  description: string;
  variant?: ReportMetricVariant;
}

export function ReportMetricCard({
  title,
  value,
  description,
  variant = "green",
}: ReportMetricCardProps) {
  return (
    <Card $variant={variant}>
      <Header>
        <Title>{title}</Title>
        <Indicator $variant={variant} />
      </Header>
      <Value>{value}</Value>
      <Description>{description}</Description>
    </Card>
  );
}
