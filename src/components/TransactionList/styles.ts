"use client";

import styled from "styled-components";

export const Section = styled.section`
  padding-top: 8px;
`;

export const Count = styled.p`
  padding: 8px 0 0;
  font-size: 12.5px;
  color: var(--ink-soft);
`;

export const List = styled.ul`
  list-style: none;
`;

export const DayHead = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 20px 0 6px;
  border-bottom: 1px solid var(--rule-strong);
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--ink-soft);

  span:first-child::first-letter {
    text-transform: uppercase;
  }
`;

export const DayTotal = styled.span`
  font-family: var(--font-figures);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
`;

export const Empty = styled.p`
  padding: 32px 0;
  text-align: center;
  color: var(--ink-soft);
`;
