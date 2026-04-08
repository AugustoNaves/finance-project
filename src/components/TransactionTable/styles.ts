// src/components/TransactionTable/styles.ts
"use client";
import styled from "styled-components";

export const TableWrapper = styled.div`
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

export const Thead = styled.thead`
  background: #f5f5f5;
`;

export const Th = styled.th`
  padding: 16px 24px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: #6b6b6b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

export const Tbody = styled.tbody``;

export const Tr = styled.tr`
  border-top: 1px solid #f0f0f0;
  transition: background 0.15s;

  &:hover {
    background: #fafafa;
  }
`;

export const Td = styled.td`
  padding: 16px 24px;
  font-size: 14px;
  color: #1a1a2e;
`;

export const Amount = styled.span<{ $positive: boolean }>`
  font-weight: 600;
  color: ${({ $positive }) => ($positive ? "#00b37e" : "#f75a68")};
`;

export const CategoryTag = styled.span`
  background: #f0f0f0;
  color: #6b6b6b;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 9999px;
`;

export const PayerBadge = styled.span<{ $payer: "Eu" | "Namorada" }>`
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 9999px;
  background: ${({ $payer }) => ($payer === "Eu" ? "#e6f1fb" : "#f0eaf7")};
  color: ${({ $payer }) => ($payer === "Eu" ? "#185fa5" : "#7b3fa8")};
`;
