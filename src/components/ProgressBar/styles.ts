"use client";

import styled from "styled-components";

export const Track = styled.div`
  width: 100%;
`;

export const Bar = styled.div`
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.07);
`;

export const Fill = styled.div<{ $value: number; $color?: string }>`
  width: ${({ $value }) => $value}%;
  height: 100%;
  border-radius: inherit;
  background: ${({ $value, $color }) => {
    if ($color) return $color;
    if ($value >= 100) return "linear-gradient(90deg, #f75a68, #ff8a4c)";
    if ($value >= 80) return "linear-gradient(90deg, #f59e0b, #f75a68)";
    return "linear-gradient(90deg, #00c48c, #0ea5e9)";
  }};
  box-shadow: 0 0 18px rgba(0, 196, 140, 0.22);
  transition: width 0.25s ease;
`;
