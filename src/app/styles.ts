// src/app/styles.ts
"use client";
import styled, { keyframes } from "styled-components";

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-bottom: 32px;
  animation: ${fadeUp} 0.6s ease both;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

export const DashboardGrid = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(300px, 0.85fr);
  gap: 18px;
  margin-bottom: 18px;
  animation: ${fadeUp} 0.65s 0.08s ease both;

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
  }
`;

export const MainColumn = styled.div`
  min-width: 0;
`;

export const InsightsGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  animation: ${fadeUp} 0.7s 0.12s ease both;

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
  }
`;
