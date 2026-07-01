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
import { ChartEmpty, ChartFrame } from "./styles";

export interface IncomeOutcomeBarChartItem {
  label: string;
  income: number;
  outcome: number;
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
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255, 255, 255, 0.07)" vertical={false} />
          <XAxis dataKey="label" stroke="#8892a4" tickLine={false} axisLine={false} />
          <YAxis
            stroke="#8892a4"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `R$ ${Number(value) / 1000}k`}
          />
          <Tooltip
            formatter={(value) => Number(value).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
            contentStyle={{
              background: "#161b27",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 12,
              color: "#ffffff",
            }}
          />
          <Bar dataKey="income" name="Receitas" fill="#00c48c" radius={[8, 8, 0, 0]} />
          <Bar dataKey="outcome" name="Despesas" fill="#f75a68" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
