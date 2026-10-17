"use client";

import styled from "styled-components";

export const List = styled.ul`
  list-style: none;
`;

export const Item = styled.li`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--rule);
  font-size: 14px;
`;

export const Main = styled.span`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

export const Name = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
`;

export const Amount = styled.span`
  font-family: var(--font-figures);
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  white-space: nowrap;
`;

export const Bar = styled.div`
  grid-column: 1 / -1;
  height: 4px;
  background: var(--rule);
`;

export const Fill = styled.div<{ $value: number; $tone: "out" | "neutral" }>`
  width: ${({ $value }) => Math.min(Math.max($value, 0), 100)}%;
  height: 100%;
  background: ${({ $tone }) => ($tone === "out" ? "var(--red)" : "var(--ink-soft)")};
`;

export const Share = styled.span`
  font-size: 12.5px;
  color: var(--ink-soft);
`;

export const EmptyText = styled.p`
  padding: 14px 0;
  font-size: 14px;
  color: var(--ink-soft);
`;
