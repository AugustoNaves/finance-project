"use client";

import styled from "styled-components";

export const RowItem = styled.li`
  position: relative;
  isolation: isolate;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0;
  border-bottom: 1px solid var(--rule);

  &::before {
    content: "";
    position: absolute;
    inset: 0 -8px;
    z-index: -1;
    border-radius: 8px;
  }

  @media (hover: hover) {
    &:hover::before {
      background: var(--green-wash);
    }
  }
`;

export const Top = styled.div`
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 12px;
`;

export const Dot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--rule-strong);
  align-self: center;
`;

export const NameButton = styled.button`
  min-width: 0;
  padding: 0;
  text-align: left;
  font-weight: 500;
  color: var(--ink);
  overflow-wrap: anywhere;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
  }

  &:focus-visible {
    outline: none;
  }

  &:focus-visible::after {
    outline: 2px solid var(--green);
    outline-offset: 2px;
    border-radius: 8px;
  }
`;

export const Figures = styled.span`
  font-family: var(--font-figures);
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  font-size: 15px;
  white-space: nowrap;

  small {
    font-family: var(--font-ui);
    font-size: 12.5px;
    font-weight: 400;
    color: var(--ink-soft);
  }
`;

export const Bottom = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 12px;
  font-size: 12.5px;
`;

export const Status = styled.span<{ $status: "safe" | "warning" | "danger" }>`
  color: ${({ $status }) =>
    $status === "danger" ? "var(--red)" : $status === "warning" ? "var(--amber)" : "var(--ink-soft)"};
  font-weight: ${({ $status }) => ($status === "safe" ? 400 : 500)};
`;

export const Percent = styled.span`
  font-family: var(--font-figures);
  font-variant-numeric: tabular-nums;
  color: var(--ink-soft);
`;

export const RowActions = styled.span`
  position: relative;
  z-index: 1;
  display: flex;
  gap: 4px;
  margin: -8px -10px -8px auto;
`;

export const TextButton = styled.button<{ $danger?: boolean }>`
  min-height: 44px;
  padding: 0 10px;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 500;
  color: ${({ $danger }) => ($danger ? "var(--red)" : "var(--green)")};

  &:hover {
    background: ${({ $danger }) => ($danger ? "var(--red-wash)" : "var(--paper)")};
  }
`;
