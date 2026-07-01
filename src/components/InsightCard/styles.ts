"use client";

import styled from "styled-components";

type InsightVariant = "green" | "blue" | "red";

const colors = {
  navyMid: "#161b27",
  green: "#00c48c",
  blue: "#0ea5e9",
  red: "#f75a68",
  textMuted: "#8892a4",
  border: "rgba(255, 255, 255, 0.07)",
};

const accentColor = {
  green: colors.green,
  blue: colors.blue,
  red: colors.red,
};

export const Card = styled.article<{ $variant: InsightVariant }>`
  position: relative;
  overflow: hidden;
  padding: 20px;
  background: ${colors.navyMid};
  border: 1px solid ${colors.border};
  border-radius: 18px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);

  &::after {
    content: "";
    position: absolute;
    width: 110px;
    height: 110px;
    right: -52px;
    top: -58px;
    border-radius: 50%;
    background: ${({ $variant }) => accentColor[$variant]};
    opacity: 0.1;
  }
`;

export const CardHeader = styled.header`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
`;

export const CardTitle = styled.h3`
  color: ${colors.textMuted};
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

export const CardIcon = styled.span<{ $variant: InsightVariant }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $variant }) => accentColor[$variant]};
  box-shadow: 0 0 18px ${({ $variant }) => accentColor[$variant]};
`;

export const CardValue = styled.strong`
  position: relative;
  z-index: 1;
  display: block;
  color: #ffffff;
  font-family: var(--font-syne), sans-serif;
  font-size: 1.45rem;
  font-weight: 700;
  letter-spacing: -0.05em;
`;

export const CardDescription = styled.p`
  position: relative;
  z-index: 1;
  margin-top: 8px;
  color: ${colors.textMuted};
  font-size: 0.86rem;
  line-height: 1.55;
`;
