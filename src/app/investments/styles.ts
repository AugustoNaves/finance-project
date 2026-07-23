"use client";

import styled, { keyframes } from "styled-components";

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
`;

const colors = {
  textMuted: "#8892a4",
  border: "rgba(255, 255, 255, 0.07)",
};

export const PageContent = styled.div`
  display: grid;
  gap: 18px;
  animation: ${fadeUp} 0.6s ease both;
`;

export const InvestmentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const ChartSection = styled.section`
  padding: 22px 24px;
  background: rgba(22, 27, 39, 0.72);
  border: 1px solid ${colors.border};
  border-radius: 18px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(18px);

  h2 {
    color: #ffffff;
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: -0.04em;
  }

  span {
    display: block;
    margin: 4px 0 18px;
    color: ${colors.textMuted};
    font-size: 0.82rem;
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
