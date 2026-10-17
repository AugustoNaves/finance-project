"use client";

import styled from "styled-components";

export const Toolbar = styled.div`
  padding-bottom: 4px;
`;

export const Grid = styled.div`
  display: grid;
  min-width: 0;

  > * {
    min-width: 0;
  }

  @media (min-width: 1180px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 48px;
    align-items: start;
  }
`;

export const ChartsGrid = styled(Grid)``;

export const Caption = styled.p`
  padding-top: 10px;
  font-size: 12.5px;
  color: var(--ink-soft);
`;

export const Sheet = styled.dl`
  margin: 0;
`;

export const SheetLine = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 12px;
  min-height: 48px;
  padding: 12px 0;
  border-bottom: 1px solid var(--rule);
  font-size: 14px;

  dt {
    color: var(--ink-soft);
  }

  dd {
    margin: 0;
    min-width: 0;
    text-align: right;
    font-family: var(--font-figures);
    font-variant-numeric: tabular-nums;
    font-size: 16px;
    font-weight: 500;
    color: var(--ink);
    overflow-wrap: anywhere;
  }

  dd[data-tone="out"] {
    color: var(--red);
  }

  small {
    display: block;
    margin-top: 2px;
    font-family: var(--font-ui);
    font-size: 12.5px;
    font-weight: 400;
    color: var(--ink-soft);
  }
`;

export const SheetTotal = styled(SheetLine)<{ $negative: boolean }>`
  padding: 14px 0 16px;
  border-top: 1px solid var(--rule-strong);
  margin-top: -1px;

  dt {
    color: var(--ink);
    font-weight: 600;
  }

  dd span {
    display: inline-block;
    padding-bottom: 3px;
    border-bottom: 3px double currentColor;
    font-size: 20px;
    color: ${({ $negative }) => ($negative ? "var(--red)" : "var(--ink)")};
  }
`;

export const EvolutionList = styled.ul`
  list-style: none;
  margin-top: 8px;
  border-top: 1px solid var(--rule-strong);

  li {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid var(--rule);
    font-size: 14px;
  }

  li span:first-child {
    color: var(--ink-soft);
  }

  li span:first-child::first-letter {
    text-transform: uppercase;
  }

  li span:last-child {
    font-family: var(--font-figures);
    font-variant-numeric: tabular-nums;
    font-weight: 500;
  }

  li span[data-tone="out"] {
    color: var(--red);
  }
`;
