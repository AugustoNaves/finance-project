"use client";

import styled from "styled-components";

export const Page = styled.div`
  max-width: 760px;

  @media (min-width: 1180px) {
    max-width: none;
  }
`;

export const Columns = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;

  @media (min-width: 1180px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 48px;
    align-items: start;
  }
`;

export const Column = styled.div`
  min-width: 0;

  @media (min-width: 1180px) {
    & + & {
      padding-top: 48px;
    }
  }
`;

export const MonthBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;

  @media (min-width: 960px) {
    justify-content: flex-start;
  }
`;

export const MonthStep = styled.button`
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--ink-soft);
  font-size: 24px;
  line-height: 1;

  &:hover {
    background: var(--green-wash);
    color: var(--ink);
  }
`;

export const MonthPicker = styled.div`
  position: relative;
  min-height: 44px;
  min-width: 0;
  display: grid;
  place-items: center;
  padding: 0 12px;
  border-radius: 10px;

  &:hover {
    background: var(--green-wash);
  }

  &:focus-within {
    outline: 2px solid var(--green);
    outline-offset: 2px;
  }

  @media (min-width: 960px) {
    order: -1;
    padding-left: 0;
    margin-right: 4px;

    &:hover {
      background: none;
    }
  }
`;

export const MonthName = styled.span`
  font-family: var(--font-figures);
  font-weight: 500;
  font-size: 18px;
  line-height: 1.2;
  white-space: nowrap;

  &::first-letter {
    text-transform: uppercase;
  }
`;

export const MonthInput = styled.input`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  opacity: 0;
  cursor: pointer;

  &:focus-visible {
    outline: none;
  }
`;

export const LedgerList = styled.ul`
  list-style: none;
`;

export const TotalRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  padding: 12px 0 0;

  span {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }

  strong {
    font-family: var(--font-figures);
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    font-size: 16px;
    padding-bottom: 2px;
    border-bottom: 4px double var(--rule-strong);
  }

  small {
    font-family: var(--font-ui);
    font-size: 12.5px;
    font-weight: 400;
    color: var(--ink-soft);
  }
`;
