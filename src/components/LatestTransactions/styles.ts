"use client";

import styled from "styled-components";

const colors = {
  navyMid: "#161b27",
  green: "#00c48c",
  red: "#f75a68",
  purple: "#8b5cf6",
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

export const Header = styled.header`
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
  font-family: var(--font-dm-sans), sans-serif;
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

  @media (max-width: 720px) {
    display: none;
  }
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 16px 24px;
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

export const Amount = styled.span<{ $variant: "income" | "outcome" | "investment" }>`
  color: ${({ $variant }) =>
    $variant === "income" ? colors.green : $variant === "investment" ? colors.purple : colors.red};
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

export const MobileList = styled.div`
  display: none;
  padding: 0 16px 16px;

  @media (max-width: 720px) {
    display: grid;
    gap: 12px;
  }
`;

export const MobileCard = styled.article`
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
`;

export const CardAmount = styled.strong<{ $variant: "income" | "outcome" | "investment" }>`
  flex: 0 0 auto;
  color: ${({ $variant }) =>
    $variant === "income" ? colors.green : $variant === "investment" ? colors.purple : colors.red};
  font-family: var(--font-dm-sans), sans-serif;
  font-size: 0.98rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  text-align: right;
`;
