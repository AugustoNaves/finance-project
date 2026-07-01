// src/components/TransactionTable/styles.ts
"use client";
import styled from "styled-components";

const colors = {
  navyMid: "#161b27",
  navyLight: "#1e2535",
  green: "#00c48c",
  blue: "#0ea5e9",
  red: "#f75a68",
  textMuted: "#8892a4",
  textLight: "#c9d1e0",
  border: "rgba(255, 255, 255, 0.07)",
};

export const TableWrapper = styled.div`
  background: rgba(22, 27, 39, 0.88);
  border: 1px solid ${colors.border};
  border-radius: 18px;
  overflow-x: auto;
  box-shadow: 0 28px 70px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(18px);

  &::-webkit-scrollbar {
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.03);
  }

  &::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.14);
    border-radius: 999px;
  }
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 760px;
`;
export const Thead = styled.thead`
  background: rgba(255, 255, 255, 0.035);
`;

export const Th = styled.th`
  padding: 18px 22px;
  text-align: left;
  font-size: 0.72rem;
  font-weight: 600;
  color: ${colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

export const Tbody = styled.tbody``;

export const Tr = styled.tr`
  border-top: 1px solid ${colors.border};
  transition:
    background 0.15s,
    box-shadow 0.15s;

  > td:last-child {
    padding: 12px 18px;
    text-align: right;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.035);
  }
`;

export const Td = styled.td`
  padding: 17px 22px;
  font-size: 0.9rem;
  color: ${colors.textLight};

  &:first-child {
    color: #ffffff;
    font-weight: 500;
  }
`;

export const Amount = styled.span<{ $positive: boolean }>`
  font-weight: 600;
  color: ${({ $positive }) => ($positive ? colors.green : colors.red)};
`;

export const CategoryTag = styled.span`
  display: inline-flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  color: ${colors.textLight};
  font-size: 0.76rem;
  font-weight: 500;
  padding: 5px 11px;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

export const PayerBadge = styled.span<{ $payer: "Eu" | "Namorada" }>`
  display: inline-flex;
  align-items: center;
  font-size: 0.74rem;
  font-weight: 600;
  padding: 5px 11px;
  border-radius: 9999px;
  background: ${({ $payer }) =>
    $payer === "Eu" ? "rgba(14, 165, 233, 0.13)" : "rgba(0, 196, 140, 0.13)"};
  color: ${({ $payer }) => ($payer === "Eu" ? colors.blue : colors.green)};
  border: 1px solid
    ${({ $payer }) =>
      $payer === "Eu" ? "rgba(14, 165, 233, 0.24)" : "rgba(0, 196, 140, 0.24)"};
`;

export const TrashButton = styled.button`
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(247, 90, 104, 0.08);
  color: ${colors.red};
  border: 1px solid rgba(247, 90, 104, 0.16);
  cursor: pointer;
  border-radius: 10px;
  transition:
    background 0.2s,
    border-color 0.2s,
    transform 0.15s;

  svg {
    width: 17px;
    height: 17px;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &:hover {
    background: rgba(247, 90, 104, 0.16);
    border-color: rgba(247, 90, 104, 0.34);
    transform: translateY(-1px);
  }
`;

export const DeleteButton = styled.button`
  background: linear-gradient(90deg, #f75a68 0%, #ff7a7a 100%);
  padding: 12px 18px;
  margin-top: 25px;
  border-radius: 10px;
  color: #ffffff;
  font-family: var(--font-syne), sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  box-shadow: 0 8px 24px rgba(247, 90, 104, 0.22);
  transition:
    transform 0.15s,
    box-shadow 0.2s;

  &:hover {
    box-shadow: 0 10px 30px rgba(247, 90, 104, 0.32);
    transform: translateY(-1px);
  }
`;
