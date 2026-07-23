"use client";

import styled from "styled-components";

type BudgetStatus = "safe" | "warning" | "danger";

const colors = {
  navyMid: "#161b27",
  green: "#00c48c",
  blue: "#0ea5e9",
  amber: "#f59e0b",
  red: "#f75a68",
  textMuted: "#8892a4",
  textLight: "#c9d1e0",
  border: "rgba(255, 255, 255, 0.07)",
};

const statusColor = {
  safe: colors.green,
  warning: colors.amber,
  danger: colors.red,
};

export const Card = styled.article<{ $status: BudgetStatus }>`
  position: relative;
  display: grid;
  gap: 18px;
  overflow: hidden;
  padding: 20px;
  background: ${colors.navyMid};
  border: 1px solid ${colors.border};
  border-radius: 18px;
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.24);

  &::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 3px;
    background: ${({ $status }) => statusColor[$status]};
  }
`;

export const Header = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;

  span {
    color: ${colors.textMuted};
    font-size: 0.82rem;
  }
`;

export const Title = styled.h3`
  color: #ffffff;
  font-family: var(--font-dm-sans), sans-serif;
  font-size: 1.14rem;
  font-weight: 700;
  letter-spacing: -0.04em;
`;

export const Percentage = styled.strong<{ $status: BudgetStatus }>`
  padding: 7px 10px;
  border-radius: 999px;
  background: ${({ $status }) => `${statusColor[$status]}1f`};
  border: 1px solid ${({ $status }) => `${statusColor[$status]}40`};
  color: ${({ $status }) => statusColor[$status]};
  font-family: var(--font-dm-sans), sans-serif;
  font-size: 0.88rem;
`;

export const Metrics = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const Metric = styled.div`
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid ${colors.border};

  span {
    display: block;
    margin-bottom: 6px;
    color: ${colors.textMuted};
    font-size: 0.78rem;
  }

  strong {
    color: ${colors.textLight};
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 0.95rem;
  }
`;

export const Alert = styled.span<{ $status: BudgetStatus }>`
  justify-self: start;
  padding: 7px 10px;
  border-radius: 999px;
  background: ${({ $status }) => `${statusColor[$status]}14`};
  color: ${({ $status }) => statusColor[$status]};
  font-size: 0.78rem;
  font-weight: 700;
`;

export const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

export const OutlineButton = styled.button<{ $danger?: boolean }>`
  min-height: 34px;
  padding: 0 11px;
  border-radius: 9px;
  background: ${({ $danger }) =>
    $danger ? "rgba(247, 90, 104, 0.08)" : "rgba(14, 165, 233, 0.08)"};
  border: 1px solid
    ${({ $danger }) =>
      $danger ? "rgba(247, 90, 104, 0.18)" : "rgba(14, 165, 233, 0.18)"};
  color: ${({ $danger }) => ($danger ? colors.red : colors.blue)};
  font-size: 0.78rem;
  font-weight: 700;
  transition:
    background 0.2s,
    border-color 0.2s,
    transform 0.15s;

  &:hover {
    background: ${({ $danger }) =>
      $danger ? "rgba(247, 90, 104, 0.16)" : "rgba(14, 165, 233, 0.16)"};
    border-color: ${({ $danger }) =>
      $danger ? "rgba(247, 90, 104, 0.34)" : "rgba(14, 165, 233, 0.34)"};
    transform: translateY(-1px);
  }
`;
