"use client";

import styled from "styled-components";

export const chartTick = {
  fill: "var(--ink-soft)",
  fontSize: 12,
  fontFamily: "var(--font-ui)",
};

export const tooltipContentStyle = {
  background: "var(--sheet)",
  border: "1px solid var(--rule-strong)",
  borderRadius: 10,
  boxShadow: "none",
  color: "var(--ink)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  padding: "8px 12px",
};

export const tooltipLabelStyle = {
  color: "var(--ink-soft)",
  fontSize: 12,
  marginBottom: 4,
};

export const tooltipItemStyle = {
  color: "var(--ink)",
  fontFamily: "var(--font-figures)",
  fontVariantNumeric: "tabular-nums",
  padding: 0,
};

export const ChartFrame = styled.div`
  width: 100%;
  min-width: 0;
  padding-top: 12px;

  .recharts-surface:focus,
  .recharts-wrapper:focus {
    outline: none;
  }
`;

export const ChartEmpty = styled.p`
  padding: 28px 0;
  color: var(--ink-soft);
  font-size: 14px;
  text-align: center;
`;
