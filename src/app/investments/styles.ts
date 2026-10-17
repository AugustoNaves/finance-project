"use client";

import styled from "styled-components";

export const Hero = styled.section`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px 32px;
  padding: 4px 0 20px;
  border-bottom: 1px solid var(--rule);
`;

export const HeroLabel = styled.h2`
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
`;

export const Figure = styled.p`
  display: inline-block;
  margin-top: 6px;
  padding-bottom: 6px;
  border-bottom: 4px double currentColor;
  font-family: var(--font-figures);
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  font-size: clamp(36px, 10vw, 52px);
  line-height: 1.05;
  letter-spacing: -0.01em;
  color: var(--ink);
`;

export const Cents = styled.span`
  font-size: 0.5em;
`;

export const MonthLine = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12.5px;
  color: var(--ink-soft);

  b {
    font-family: var(--font-figures);
    font-variant-numeric: tabular-nums;
    font-size: 19px;
    font-weight: 500;
    color: var(--ink);
  }

  @media (min-width: 600px) {
    text-align: right;
  }
`;

export const Grid = styled.div`
  display: grid;
  min-width: 0;

  > * {
    min-width: 0;
  }

  @media (min-width: 1180px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
    gap: 48px;
    align-items: start;
  }
`;

export const Caption = styled.p`
  padding-top: 10px;
  font-size: 12.5px;
  color: var(--ink-soft);
`;

export const Quiet = styled.p`
  padding: 14px 0;
  font-size: 14px;
  color: var(--ink-soft);
`;
