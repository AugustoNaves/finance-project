"use client";

import styled from "styled-components";

export const RowItem = styled.li`
  list-style: none;
  border-bottom: 1px solid var(--rule);
`;

export const RowButton = styled.button`
  width: calc(100% + 16px);
  min-height: 58px;
  margin: 0 -8px;
  padding: 8px;
  border-radius: 8px;
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  text-align: left;
  color: var(--ink);

  @media (hover: hover) {
    &:hover {
      background: var(--green-wash);
    }
  }
`;

export const Dot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--rule-strong);
`;

export const Name = styled.span`
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const Figures = styled.span`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
`;

export const Amount = styled.span<{ $muted: boolean }>`
  font-family: var(--font-figures);
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  font-size: 16px;
  white-space: nowrap;
  color: ${({ $muted }) => ($muted ? "var(--ink-soft)" : "var(--ink)")};
`;

export const Count = styled.span`
  font-size: 12.5px;
  color: var(--ink-soft);
  white-space: nowrap;
`;
