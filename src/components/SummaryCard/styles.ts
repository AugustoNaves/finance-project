// src/components/SummaryCard/styles.ts
"use client";
import styled from "styled-components";

type CardType = "income" | "outcome" | "investment" | "total";

const colors = {
  navyMid: "#161b27",
  green: "#00c48c",
  blue: "#0ea5e9",
  red: "#f75a68",
  purple: "#8b5cf6",
  textMuted: "#8892a4",
  border: "rgba(255, 255, 255, 0.07)",
};

const accentByType = {
  income: colors.green,
  outcome: colors.red,
  investment: colors.purple,
  total: colors.blue,
};

export const Card = styled.div<{ $type: CardType }>`
  position: relative;
  overflow: hidden;
  min-height: 148px;
  background:
    ${({ $type }) =>
      $type === "total"
        ? `linear-gradient(135deg, rgba(0, 196, 140, 0.16), rgba(14, 165, 233, 0.12)), ${colors.navyMid}`
        : colors.navyMid};
  border: 1px solid ${colors.border};
  border-radius: 18px;
  padding: 22px 24px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.26);
  transition:
    border-color 0.2s,
    transform 0.2s,
    box-shadow 0.2s;

  &::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 3px;
    background: ${({ $type }) => accentByType[$type]};
  }

  &::after {
    content: "";
    position: absolute;
    width: 150px;
    height: 150px;
    right: -64px;
    top: -72px;
    border-radius: 50%;
    background: ${({ $type }) => accentByType[$type]};
    opacity: ${({ $type }) => ($type === "total" ? 0.16 : 0.09)};
    filter: blur(2px);
  }

  &:hover {
    border-color: rgba(255, 255, 255, 0.13);
    box-shadow: 0 30px 72px rgba(0, 0, 0, 0.36);
    transform: translateY(-2px);
  }
`;

export const CardTitle = styled.div<{ $type: CardType }>`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.76rem;
  font-weight: 500;
  color: ${({ $type }) => ($type === "total" ? "#c9d1e0" : colors.textMuted)};
  margin-bottom: 18px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

export const CardIcon = styled.span<{ $type: CardType }>`
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ $type }) => `${accentByType[$type]}1f`};
  color: ${({ $type }) => accentByType[$type]};
  border: 1px solid ${({ $type }) => `${accentByType[$type]}40`};

  svg {
    width: 19px;
    height: 19px;
    stroke: currentColor;
    stroke-width: 1.9;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
`;

export const CardAmount = styled.p<{ $type: CardType }>`
  position: relative;
  z-index: 1;
  font-family: var(--font-dm-sans), sans-serif;
  font-size: clamp(1.55rem, 3vw, 2rem);
  font-weight: 700;
  color: ${({ $type }) =>
    $type === "income"
      ? colors.green
      : $type === "outcome"
        ? colors.red
        : $type === "investment"
          ? colors.purple
          : "#ffffff"};
  letter-spacing: -0.04em;
`;
