// src/components/Dashboard/styles.ts
import styled from "styled-components";

type CardType = "balance" | "income" | "expense";

const CARD_COLORS: Record<CardType, { border: string; bg: string }> = {
  balance: { border: "#378ADD", bg: "#E6F1FB" },
  income: { border: "#1D9E75", bg: "#E1F5EE" },
  expense: { border: "#D85A30", bg: "#FAECE7" },
};

const VALUE_COLORS: Record<CardType, string> = {
  balance: "#185FA5",
  income: "#0F6E56",
  expense: "#993C1D",
};

export const Container = styled.main`
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 32px;
`;

export const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

export const Card = styled.div<{ $type: CardType }>`
  background: ${({ $type }) => CARD_COLORS[$type].bg};
  border: 1px solid ${({ $type }) => CARD_COLORS[$type].border}44;
  border-left: 4px solid ${({ $type }) => CARD_COLORS[$type].border};
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const CardIcon = styled.span`
  font-size: 24px;
  margin-bottom: 4px;
`;

export const CardLabel = styled.p`
  font-size: 13px;
  font-weight: 500;
  color: #6b6960;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

export const CardValue = styled.p<{ $type: CardType }>`
  font-size: 28px;
  font-weight: 600;
  color: ${({ $type }) => VALUE_COLORS[$type]};
  letter-spacing: -0.5px;
`;
