"use client";

import styled from "styled-components";

export const RowItem = styled.li`
  list-style: none;
  border-bottom: 1px solid var(--rule);
`;

export const RowButton = styled.button`
  width: 100%;
  min-height: 58px;
  padding: 8px 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  text-align: left;
  color: var(--ink);

  &:hover {
    background: linear-gradient(90deg, transparent, var(--green-wash) 15%, var(--green-wash) 85%, transparent);
  }
`;

export const Main = styled.span`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

export const Name = styled.span`
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const Meta = styled.span`
  font-size: 12.5px;
  color: var(--ink-soft);
`;

export const Amount = styled.span<{ $kind: "income" | "outcome" | "investment" }>`
  font-family: var(--font-figures);
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  font-size: 16px;
  white-space: nowrap;
  color: ${({ $kind }) => ($kind === "outcome" ? "var(--red)" : "var(--ink)")};
`;
