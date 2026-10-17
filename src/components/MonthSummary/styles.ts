"use client";

import styled from "styled-components";

export const Hero = styled.section`
  padding: 16px 0 20px;
  border-bottom: 1px solid var(--rule);
`;

export const HeroLabel = styled.h2`
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
`;

export const Figure = styled.p<{ $negative: boolean }>`
  display: inline-block;
  margin-top: 6px;
  padding-bottom: 6px;
  border-bottom: 4px double currentColor;
  font-family: var(--font-figures);
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  font-size: clamp(40px, 11vw, 56px);
  line-height: 1.05;
  letter-spacing: -0.01em;
  color: ${({ $negative }) => ($negative ? "var(--red)" : "var(--ink)")};
`;

export const Cents = styled.span`
  font-size: 0.5em;
`;

export const Triad = styled.dl`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;

  div {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  dt {
    font-size: 12px;
    color: var(--ink-soft);
  }

  dd {
    font-family: var(--font-figures);
    font-variant-numeric: tabular-nums;
    font-size: 17px;
    font-weight: 500;
  }

  dd[data-tone="out"] {
    color: var(--red);
  }
`;

export const Accumulated = styled.p`
  margin-top: 14px;
  font-size: 13px;
  color: var(--ink-soft);

  b {
    font-family: var(--font-figures);
    font-weight: 500;
    color: var(--ink);
  }
`;
