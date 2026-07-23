"use client";

import styled from "styled-components";

const colors = {
  navyMid: "#161b27",
  green: "#00c48c",
  blue: "#0ea5e9",
  red: "#f75a68",
  textMuted: "#8892a4",
  textLight: "#c9d1e0",
  border: "rgba(255, 255, 255, 0.07)",
};

type MetricVariant = "income" | "outcome" | "total";

const metricColor = {
  income: colors.green,
  outcome: colors.red,
  total: "#ffffff",
};

export const SummaryCard = styled.article`
  min-height: 100%;
  padding: 24px;
  background:
    radial-gradient(circle at 100% 0%, rgba(0, 196, 140, 0.1), transparent 34%),
    ${colors.navyMid};
  border: 1px solid ${colors.border};
  border-radius: 18px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.26);
`;

export const SummaryHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;

  span {
    display: inline-flex;
    margin-top: 6px;
    color: ${colors.textMuted};
    font-size: 0.86rem;
  }
`;

export const SummaryTitle = styled.h2`
  color: #ffffff;
  font-family: var(--font-dm-sans), sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.04em;
`;

export const SummaryTrend = styled.strong`
  flex: 0 0 auto;
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(0, 196, 140, 0.1);
  border: 1px solid rgba(0, 196, 140, 0.22);
  color: ${colors.green};
  font-size: 0.76rem;
  font-weight: 700;
`;

export const Metric = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-top: 1px solid ${colors.border};
`;

export const MetricLabel = styled.span`
  color: ${colors.textMuted};
  font-size: 0.86rem;
`;

export const MetricValue = styled.strong<{ $variant: MetricVariant }>`
  color: ${({ $variant }) => metricColor[$variant]};
  font-family: var(--font-dm-sans), sans-serif;
  font-size: 1.02rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  text-align: right;
`;
