"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/utils/formatters";
import {
  ChartEmpty,
  ChartFrame,
  chartTick,
  tooltipContentStyle,
  tooltipItemStyle,
  tooltipLabelStyle,
} from "./styles";

export interface BalanceLineChartItem {
  label: string;
  balance: number;
  fullLabel?: string;
}

interface BalanceLineChartProps {
  data: BalanceLineChartItem[];
  seriesName?: string;
}

const compactAmount = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatAxisAmount(value: number) {
  return compactAmount.format(value);
}

export function BalanceLineChart({ data, seriesName = "Saldo" }: BalanceLineChartProps) {
  if (data.length === 0) {
    return <ChartEmpty>Nenhum saldo para exibir no gráfico.</ChartEmpty>;
  }

  const hasNegative = data.some((item) => item.balance < 0);

  return (
    <ChartFrame>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--rule)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={chartTick}
            tickLine={false}
            axisLine={{ stroke: "var(--rule-strong)" }}
            interval={0}
            tickMargin={8}
          />
          <YAxis
            tick={chartTick}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(value) => formatAxisAmount(Number(value))}
          />
          {hasNegative && <ReferenceLine y={0} stroke="var(--rule-strong)" />}
          <Tooltip
            cursor={{ stroke: "var(--rule-strong)", strokeWidth: 1 }}
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            labelFormatter={(label, payload) =>
              (payload?.[0]?.payload as BalanceLineChartItem | undefined)?.fullLabel ?? label
            }
            formatter={(value) => [formatCurrency(Number(value)), seriesName]}
          />
          <Line
            type="linear"
            dataKey="balance"
            name={seriesName}
            stroke="var(--ink)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            dot={{ r: 4, fill: "var(--ink)", stroke: "var(--paper)", strokeWidth: 2 }}
            activeDot={{ r: 5, fill: "var(--green)", stroke: "var(--paper)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
