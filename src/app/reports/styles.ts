"use client";

import styled, { keyframes } from "styled-components";

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

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const PageContent = styled.div`
  display: grid;
  gap: 18px;
  animation: ${fadeUp} 0.6s ease both;
`;

export const FiltersRow = styled.div`
  display: flex;
  justify-content: flex-end;

  @media (max-width: 640px) {
    justify-content: stretch;
  }
`;

export const MetricsGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;

  @media (max-width: 1120px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const ChartGrid = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 18px;

  section:last-child {
    grid-column: 1 / -1;
  }

  @media (max-width: 920px) {
    grid-template-columns: 1fr;

    section:last-child {
      grid-column: auto;
    }
  }
`;

export const SectionsGrid = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 18px;

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
  }
`;

export const Section = styled.section`
  background: rgba(22, 27, 39, 0.72);
  border: 1px solid ${colors.border};
  border-radius: 18px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(18px);
  overflow: hidden;
`;

export const SectionHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px;
  border-bottom: 1px solid ${colors.border};

  h2 {
    color: #ffffff;
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: -0.04em;
  }

  span {
    color: ${colors.textMuted};
    font-size: 0.88rem;
  }
`;

export const SectionBody = styled.div`
  padding: 18px;
`;

export const EvolutionList = styled.div`
  display: grid;
  gap: 14px;
`;

export const EvolutionItem = styled.article`
  display: grid;
  grid-template-columns: 86px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid ${colors.border};
  border-radius: 14px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const EvolutionMonth = styled.span`
  color: ${colors.textLight};
  font-size: 0.84rem;
  font-weight: 700;
  text-transform: capitalize;
`;

export const EvolutionBar = styled.div`
  height: 9px;
  overflow: hidden;
  border-radius: 999px;
  background: ${colors.navyLight};
  border: 1px solid ${colors.border};
`;

export const EvolutionFill = styled.div<{ $positive: boolean; $value: number }>`
  width: ${({ $value }) => Math.min(Math.max($value, 0), 100)}%;
  height: 100%;
  border-radius: inherit;
  background: ${({ $positive }) =>
    $positive
      ? `linear-gradient(90deg, ${colors.green}, ${colors.blue})`
      : `linear-gradient(90deg, ${colors.red}, #ff8a4c)`};
`;

export const EvolutionAmount = styled.strong<{ $positive: boolean }>`
  color: ${({ $positive }) => ($positive ? colors.green : colors.red)};
  font-family: var(--font-dm-sans), sans-serif;
  font-size: 0.92rem;
  white-space: nowrap;
`;
