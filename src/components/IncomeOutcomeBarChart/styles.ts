"use client";

import styled from "styled-components";

export {
  ChartEmpty,
  ChartFrame,
  chartTick,
  tooltipContentStyle,
  tooltipItemStyle,
  tooltipLabelStyle,
} from "@/components/BalanceLineChart/styles";

export const Legend = styled.ul`
  display: flex;
  gap: 16px;
  list-style: none;
  font-size: 12.5px;
  color: var(--ink-soft);

  li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
`;

export const Key = styled.span<{ $tone: "in" | "out" }>`
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: ${({ $tone }) => ($tone === "in" ? "var(--green)" : "var(--red)")};
`;
