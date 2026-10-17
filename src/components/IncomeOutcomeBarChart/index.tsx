"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatAxisAmount } from "@/components/BalanceLineChart";
import { formatCurrency } from "@/utils/formatters";
import {
  ChartEmpty,
  ChartFrame,
  chartTick,
  Key,
  Legend,
  tooltipContentStyle,
  tooltipItemStyle,
  tooltipLabelStyle,
} from "./styles";

export interface IncomeOutcomeBarChartItem {
  label: string;
  income: number;
  outcome: number;
  fullLabel?: string;
}

interface IncomeOutcomeBarChartProps {
  data: IncomeOutcomeBarChartItem[];
}

export function IncomeOutcomeBarChart({ data }: IncomeOutcomeBarChartProps) {
  if (data.length === 0) {
    return <ChartEmpty>Nenhum movimento para exibir no gráfico.</ChartEmpty>;
  }

  return (
    <ChartFrame>
      <Legend>
        <li>
          <Key $tone="in" />
          Receitas
        </li>
        <li>
          <Key $tone="out" />
          Despesas
        </li>
      </Legend>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
          barGap={2}
          barCategoryGap="28%"
        >
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
          <Tooltip
            cursor={{ fill: "var(--green-wash)", opacity: 0.6 }}
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            labelFormatter={(label, payload) =>
              (payload?.[0]?.payload as IncomeOutcomeBarChartItem | undefined)?.fullLabel ?? label
            }
            formatter={(value, name) => [formatCurrency(Number(value)), name]}
          />
          <Bar
            dataKey="income"
            name="Receitas"
            fill="var(--green)"
            maxBarSize={16}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="outcome"
            name="Despesas"
            fill="var(--red)"
            maxBarSize={16}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
