"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartEmpty, ChartFrame } from "./styles";

export interface BalanceLineChartItem {
  label: string;
  balance: number;
}

interface BalanceLineChartProps {
  data: BalanceLineChartItem[];
}

export function BalanceLineChart({ data }: BalanceLineChartProps) {
  if (data.length === 0) {
    return <ChartEmpty>Nenhum saldo para exibir no gráfico.</ChartEmpty>;
  }

  return (
    <ChartFrame>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
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
          <Line
            type="monotone"
            dataKey="balance"
            name="Saldo"
            stroke="#00c48c"
            strokeWidth={3}
            dot={{ r: 4, fill: "#00c48c", strokeWidth: 0 }}
            activeDot={{ r: 6, fill: "#0ea5e9", strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
