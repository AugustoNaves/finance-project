"use client";

import styled from "styled-components";
import { CategoryType } from "@/types/category";

const colors = {
  navyMid: "#161b27",
  green: "#00c48c",
  blue: "#0ea5e9",
  red: "#f75a68",
  textMuted: "#8892a4",
  textLight: "#c9d1e0",
  border: "rgba(255, 255, 255, 0.07)",
};

export const Card = styled.article<{ $accent?: string }>`
  position: relative;
  overflow: hidden;
  padding: 20px;
  background: ${colors.navyMid};
  border: 1px solid ${colors.border};
  border-radius: 18px;
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.24);

  &::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 3px;
    background: ${({ $accent }) => $accent ?? colors.green};
  }

  &::after {
    content: "";
    position: absolute;
    width: 140px;
    height: 140px;
    right: -70px;
    top: -80px;
    border-radius: 50%;
    background: ${({ $accent }) => $accent ?? colors.green};
    opacity: 0.08;
  }
`;

export const Header = styled.header`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
`;

export const ColorMark = styled.span<{ $accent?: string }>`
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ $accent }) => `${$accent ?? colors.green}24`};
  border: 1px solid ${({ $accent }) => `${$accent ?? colors.green}55`};
  color: ${({ $accent }) => $accent ?? colors.green};
  font-family: var(--font-syne), sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
`;

export const Name = styled.h3`
  color: #ffffff;
  font-family: var(--font-syne), sans-serif;
  font-size: 1.12rem;
  font-weight: 700;
  letter-spacing: -0.04em;
`;

export const TypeLabel = styled.span`
  display: inline-flex;
  margin-top: 4px;
  color: ${colors.textMuted};
  font-size: 0.82rem;
`;

export const Badge = styled.span<{ $type: CategoryType }>`
  padding: 6px 10px;
  border-radius: 999px;
  background: ${({ $type }) =>
    $type === "income" ? "rgba(0, 196, 140, 0.1)" : "rgba(247, 90, 104, 0.1)"};
  border: 1px solid
    ${({ $type }) =>
      $type === "income" ? "rgba(0, 196, 140, 0.22)" : "rgba(247, 90, 104, 0.22)"};
  color: ${({ $type }) => ($type === "income" ? colors.green : colors.red)};
  font-size: 0.72rem;
  font-weight: 700;
`;

export const Metrics = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  gap: 10px;
  margin: 20px 0;
`;

export const Metric = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding-top: 10px;
  border-top: 1px solid ${colors.border};

  span {
    color: ${colors.textMuted};
    font-size: 0.84rem;
  }

  strong {
    color: ${colors.textLight};
    font-family: var(--font-syne), sans-serif;
    font-size: 0.95rem;
  }
`;

export const Actions = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

export const OutlineButton = styled.button<{ $danger?: boolean }>`
  min-height: 34px;
  padding: 0 11px;
  border-radius: 9px;
  background: ${({ $danger }) =>
    $danger ? "rgba(247, 90, 104, 0.08)" : "rgba(14, 165, 233, 0.08)"};
  border: 1px solid
    ${({ $danger }) =>
      $danger ? "rgba(247, 90, 104, 0.18)" : "rgba(14, 165, 233, 0.18)"};
  color: ${({ $danger }) => ($danger ? colors.red : colors.blue)};
  font-size: 0.78rem;
  font-weight: 700;
  transition:
    background 0.2s,
    border-color 0.2s,
    transform 0.15s;

  &:hover {
    background: ${({ $danger }) =>
      $danger ? "rgba(247, 90, 104, 0.16)" : "rgba(14, 165, 233, 0.16)"};
    border-color: ${({ $danger }) =>
      $danger ? "rgba(247, 90, 104, 0.34)" : "rgba(14, 165, 233, 0.34)"};
    transform: translateY(-1px);
  }
`;
