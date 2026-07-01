"use client";

import styled from "styled-components";

const colors = {
  navyLight: "#1e2535",
  green: "#00c48c",
  blue: "#0ea5e9",
  textMuted: "#8892a4",
  textLight: "#c9d1e0",
  border: "rgba(255, 255, 255, 0.07)",
};

export const List = styled.div`
  display: grid;
  gap: 14px;
`;

export const Item = styled.article`
  display: grid;
  gap: 10px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid ${colors.border};
  border-radius: 14px;
`;

export const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
`;

export const Name = styled.strong`
  color: ${colors.textLight};
  font-family: var(--font-syne), sans-serif;
  font-size: 0.96rem;
`;

export const Amount = styled.span`
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 700;
`;

export const Bar = styled.div`
  height: 9px;
  overflow: hidden;
  border-radius: 999px;
  background: ${colors.navyLight};
  border: 1px solid ${colors.border};
`;

export const Fill = styled.div<{ $value: number }>`
  width: ${({ $value }) => Math.min(Math.max($value, 0), 100)}%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, ${colors.green}, ${colors.blue});
  box-shadow: 0 0 18px rgba(0, 196, 140, 0.22);
`;

export const Percentage = styled.span`
  color: ${colors.textMuted};
  font-size: 0.78rem;
`;

export const EmptyText = styled.p`
  padding: 22px;
  color: ${colors.textMuted};
  text-align: center;
`;
