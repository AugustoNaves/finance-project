"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartEmpty, ChartFrame } from "./styles";

export interface ExpenseDonutChartItem {
  category: string;
  amount: number;
}

interface ExpenseDonutChartProps {
  data: ExpenseDonutChartItem[];
}

const chartColors = ["#00c48c", "#0ea5e9", "#f75a68", "#f59e0b", "#8b5cf6", "#14b8a6"];

export function ExpenseDonutChart({ data }: ExpenseDonutChartProps) {
  if (data.length === 0) {
    return <ChartEmpty>Nenhuma despesa para exibir no gráfico.</ChartEmpty>;
  }

  return (
    <ChartFrame>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="category"
            innerRadius={62}
            outerRadius={96}
            paddingAngle={3}
            stroke="rgba(22, 27, 39, 0.92)"
            strokeWidth={3}
          >
            {data.map((item, index) => (
              <Cell
                key={item.category}
                fill={chartColors[index % chartColors.length]}
              />
            ))}
          </Pie>
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
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
