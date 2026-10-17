"use client";

import styled from "styled-components";

export const Track = styled.div`
  width: 100%;
`;

export const Bar = styled.div`
  height: 4px;
  overflow: hidden;
  background: var(--rule);
`;

export const Fill = styled.div<{ $value: number; $raw: number; $color?: string }>`
  width: ${({ $value }) => $value}%;
  height: 100%;
  background: ${({ $raw, $color }) => {
    if ($color) return $color;
    if ($raw > 100) return "var(--red)";
    if ($raw >= 80) return "var(--amber)";
    return "var(--green)";
  }};

  @media (prefers-reduced-motion: no-preference) {
    transition: width 0.25s ease;
  }
`;
