"use client";

import styled, { keyframes } from "styled-components";

const colors = {
  textMuted: "#8892a4",
  textLight: "#c9d1e0",
  green: "#00c48c",
  greenGlow: "rgba(0, 196, 140, 0.25)",
  border: "rgba(255, 255, 255, 0.07)",
  navyLight: "#1e2535",
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
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: -0.04em;
    text-transform: capitalize;
  }

  span {
    color: ${colors.textMuted};
    font-size: 0.88rem;
  }

  label {
    display: grid;
    gap: 6px;
    color: ${colors.textLight};
    font-size: 0.78rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  input {
    min-height: 42px;
    padding: 0 12px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.015)),
      ${colors.navyLight};
    border: 1px solid ${colors.border};
    border-radius: 12px;
    color: #ffffff;
    color-scheme: dark;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;

    &:hover {
      border-color: rgba(255, 255, 255, 0.15);
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.065), rgba(255, 255, 255, 0.02)),
        ${colors.navyLight};
    }

    &:focus {
      border-color: ${colors.green};
      box-shadow: 0 0 0 3px ${colors.greenGlow};
    }

    &::-webkit-calendar-picker-indicator {
      width: 18px;
      height: 18px;
      border-radius: 6px;
      padding: 4px;
      background-color: rgba(0, 196, 140, 0.14);
      cursor: pointer;
      filter: invert(72%) sepia(56%) saturate(717%) hue-rotate(111deg) brightness(91%) contrast(92%);
    }
  }

  @media (max-width: 640px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export const SectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 18px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 640px) {
    padding: 16px;
  }
`;
