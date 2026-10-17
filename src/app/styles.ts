"use client";

import styled from "styled-components";

export const Grid = styled.div`
  display: grid;

  @media (min-width: 1180px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
    gap: 48px;
    align-items: start;
  }
`;

export const Column = styled.div`
  min-width: 0;
`;

export const InvoiceNudge = styled.a`
  margin-top: 18px;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--amber-wash);
  color: var(--ink);
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;

  b {
    color: var(--amber);
    font-weight: 600;
    white-space: nowrap;
  }
`;

export const Quiet = styled.p`
  padding: 14px 0;
  font-size: 14px;
  color: var(--ink-soft);
`;

export const BudgetList = styled.ul`
  list-style: none;
`;

export const BudgetItem = styled.li<{ $over: boolean; $near: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--rule);
  font-size: 14px;

  span:nth-child(2) {
    font-family: var(--font-figures);
    font-variant-numeric: tabular-nums;
    color: ${({ $over, $near }) => ($over ? "var(--red)" : $near ? "var(--amber)" : "var(--ink-soft)")};
  }

  > div {
    grid-column: 1 / -1;
  }
`;

export const EntryList = styled.ul`
  list-style: none;
`;

export const EmptyMonth = styled.div`
  padding: 28px 0;
  text-align: center;
  color: var(--ink-soft);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
`;

export const RegisterFirst = styled.button`
  min-height: 44px;
  padding: 0 18px;
  border-radius: 10px;
  background: var(--green);
  color: var(--on-green);
  font-weight: 600;
`;
