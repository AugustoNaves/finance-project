"use client";

import styled, { keyframes } from "styled-components";

const colors = {
  navyMid: "#161b27",
  textMuted: "#8892a4",
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
    font-family: var(--font-syne), sans-serif;
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: -0.04em;
  }

  span {
    color: ${colors.textMuted};
    font-size: 0.88rem;
  }
`;

export const SectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 18px;

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    padding: 16px;
  }
`;
