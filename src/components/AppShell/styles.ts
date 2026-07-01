"use client";

import styled from "styled-components";

const colors = {
  navy: "#0d1117",
  navyMid: "#161b27",
  border: "rgba(255, 255, 255, 0.07)",
};

export const Shell = styled.div`
  min-height: 100vh;
  background-color: ${colors.navy};
  background-image:
    radial-gradient(
      ellipse 70% 55% at 80% 8%,
      rgba(0, 196, 140, 0.11) 0%,
      transparent 58%
    ),
    radial-gradient(
      ellipse 55% 45% at 8% 55%,
      rgba(14, 165, 233, 0.09) 0%,
      transparent 56%
    ),
    linear-gradient(180deg, ${colors.navyMid} 0%, ${colors.navy} 44%);
  color: #c9d1e0;
  overflow-x: hidden;
  position: relative;

  &::before {
    content: "";
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(${colors.border} 1px, transparent 1px),
      linear-gradient(90deg, ${colors.border} 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
    z-index: 0;
  }

  &::after {
    content: "";
    position: fixed;
    width: 360px;
    height: 360px;
    right: -120px;
    bottom: -140px;
    background: radial-gradient(circle, rgba(0, 196, 140, 0.16), transparent 68%);
    filter: blur(4px);
    pointer-events: none;
    z-index: 0;
  }
`;

export const ShellContent = styled.main`
  position: relative;
  z-index: 1;
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px 32px 56px;

  @media (max-width: 768px) {
    padding: 20px 16px 36px;
  }
`;
