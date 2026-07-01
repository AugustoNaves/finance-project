"use client";

import styled from "styled-components";

const colors = {
  green: "#00c48c",
  blue: "#0ea5e9",
  textMuted: "#8892a4",
};

export const HeaderRoot = styled.section`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;

  @media (max-width: 640px) {
    align-items: stretch;
    flex-direction: column;
    gap: 16px;
  }
`;

export const HeaderContent = styled.div`
  min-width: 0;
`;

export const HeaderEyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: ${colors.green};
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;

  &::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${colors.green};
    box-shadow: 0 0 18px rgba(0, 196, 140, 0.55);
  }
`;

export const HeaderTitle = styled.h1`
  color: #ffffff;
  font-family: var(--font-syne), sans-serif;
  font-size: clamp(2rem, 5vw, 3.25rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.07em;
`;

export const HeaderSubtitle = styled.p`
  max-width: 620px;
  margin-top: 12px;
  color: ${colors.textMuted};
  font-size: 0.98rem;
  line-height: 1.65;
`;

export const HeaderAction = styled.button`
  position: relative;
  overflow: hidden;
  flex: 0 0 auto;
  min-height: 46px;
  padding: 0 20px;
  border-radius: 12px;
  background: linear-gradient(90deg, ${colors.green} 0%, #00b8d9 100%);
  background-size: 200% auto;
  color: #ffffff;
  font-family: var(--font-syne), sans-serif;
  font-size: 0.92rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  box-shadow: 0 4px 20px rgba(0, 196, 140, 0.28);
  transition:
    background-position 0.35s,
    transform 0.15s,
    box-shadow 0.2s;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      100deg,
      transparent 20%,
      rgba(255, 255, 255, 0.16) 50%,
      transparent 80%
    );
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover {
    background-position: right center;
    box-shadow: 0 8px 28px rgba(0, 196, 140, 0.4);
    transform: translateY(-1px);
  }

  &:hover::after {
    opacity: 1;
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 640px) {
    width: 100%;
  }
`;
