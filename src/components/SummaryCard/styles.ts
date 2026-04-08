// src/components/SummaryCard/styles.ts
"use client";
import styled from "styled-components";

type CardType = "income" | "outcome" | "total";

export const Card = styled.div<{ $type: CardType }>`
  background: ${({ $type }) => ($type === "total" ? "#00b37e" : "#ffffff")};
  border-radius: 8px;
  padding: 24px 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`;

export const CardTitle = styled.div<{ $type: CardType }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 500;
  color: ${({ $type }) =>
    $type === "total" ? "rgba(255,255,255,0.85)" : "#6b6b6b"};
  margin-bottom: 12px;
`;

export const CardIcon = styled.span`
  font-size: 22px;
`;

export const CardAmount = styled.p<{ $type: CardType }>`
  font-size: 32px;
  font-weight: 700;
  color: ${({ $type }) => ($type === "total" ? "#ffffff" : "#1a1a2e")};
  letter-spacing: -0.5px;
`;
