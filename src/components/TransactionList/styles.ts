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

export const Section = styled.section`
  background: rgba(22, 27, 39, 0.88);
  border: 1px solid ${colors.border};
  border-radius: 18px;
  box-shadow: 0 28px 70px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(18px);
  overflow: hidden;
`;

export const ListHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px;
  border-bottom: 1px solid ${colors.border};

  span {
    display: inline-flex;
    margin-top: 6px;
    color: ${colors.textMuted};
    font-size: 0.88rem;
  }

  @media (max-width: 640px) {
    padding: 20px;
  }
`;

export const Title = styled.h2`
  color: #ffffff;
  font-family: var(--font-syne), sans-serif;
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: -0.04em;
`;

export const EmptyState = styled.p`
  padding: 24px;
  color: ${colors.textMuted};
  font-size: 0.92rem;
`;

export const TableWrapper = styled.div`
  overflow-x: auto;

  @media (max-width: 780px) {
    display: none;
  }
`;

export const Table = styled.table`
  width: 100%;
  min-width: 820px;
  border-collapse: collapse;

  th,
  td {
    padding: 16px 20px;
    text-align: left;
  }

  th {
    color: ${colors.textMuted};
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  td {
    border-top: 1px solid ${colors.border};
    color: ${colors.textLight};
    font-size: 0.9rem;
  }

  td:first-child {
    color: #ffffff;
    font-weight: 500;
  }
`;

export const Amount = styled.span<{ $positive: boolean }>`
  color: ${({ $positive }) => ($positive ? colors.green : colors.red)};
  font-weight: 700;
`;

export const Tag = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 5px 11px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: ${colors.textLight};
  font-size: 0.76rem;
  font-weight: 500;
`;

export const PayerBadge = styled.span<{ $payer: "Eu" | "Namorada" }>`
  display: inline-flex;
  align-items: center;
  padding: 5px 11px;
  border-radius: 999px;
  background: ${({ $payer }) =>
    $payer === "Eu" ? "rgba(14, 165, 233, 0.13)" : "rgba(0, 196, 140, 0.13)"};
  color: ${({ $payer }) => ($payer === "Eu" ? colors.blue : colors.green)};
  border: 1px solid
    ${({ $payer }) =>
      $payer === "Eu" ? "rgba(14, 165, 233, 0.24)" : "rgba(0, 196, 140, 0.24)"};
  font-size: 0.74rem;
  font-weight: 600;
`;

export const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const ActionButton = styled.button<{ $danger?: boolean }>`
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
    transform 0.15s,
    opacity 0.2s;

  &:hover:not(:disabled) {
    background: ${({ $danger }) =>
      $danger ? "rgba(247, 90, 104, 0.16)" : "rgba(14, 165, 233, 0.16)"};
    border-color: ${({ $danger }) =>
      $danger ? "rgba(247, 90, 104, 0.34)" : "rgba(14, 165, 233, 0.34)"};
    transform: translateY(-1px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`;

export const MobileList = styled.div`
  display: none;
  padding: 0 16px 16px;

  @media (max-width: 780px) {
    display: grid;
    gap: 12px;
  }
`;

export const Card = styled.article`
  padding: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid ${colors.border};
  border-radius: 14px;
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;

  strong {
    display: block;
    color: #ffffff;
    font-size: 0.95rem;
    font-weight: 600;
  }
`;

export const CardMeta = styled.span`
  display: inline-flex;
  margin-top: 6px;
  color: ${colors.textMuted};
  font-size: 0.8rem;
  line-height: 1.5;
`;

export const CardAmount = styled.strong<{ $positive: boolean }>`
  flex: 0 0 auto;
  color: ${({ $positive }) => ($positive ? colors.green : colors.red)};
  font-family: var(--font-syne), sans-serif;
  font-size: 0.98rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  text-align: right;
`;

export const CardActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
`;
