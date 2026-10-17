"use client";

import styled from "styled-components";

export const Details = styled.dl`
  margin: 0;

  div {
    display: grid;
    grid-template-columns: minmax(0, auto) minmax(0, 1fr);
    align-items: baseline;
    gap: 16px;
    min-height: 48px;
    padding: 12px 0;
    border-bottom: 1px solid var(--rule);
    font-size: 14px;
  }

  dt {
    color: var(--ink-soft);
    white-space: nowrap;
  }

  dd {
    margin: 0;
    min-width: 0;
    text-align: right;
    font-weight: 500;
    color: var(--ink);
    overflow-wrap: anywhere;
  }

  dd[data-figure] {
    font-family: var(--font-figures);
    font-variant-numeric: tabular-nums;
    font-size: 16px;
  }
`;

export const Note = styled.p`
  padding: 12px 0 0;
  font-size: 14px;
  color: var(--ink-soft);
`;

export const ExportActions = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 12px 0 4px;

  @media (min-width: 600px) {
    display: flex;
  }
`;

export const OutlineButton = styled.button`
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid var(--rule-strong);
  border-radius: 10px;
  color: var(--ink);
  font-weight: 500;

  &:hover {
    background: var(--green-wash);
    border-color: var(--green);
  }
`;

export const InstallSteps = styled.ul`
  list-style: none;

  li {
    display: grid;
    grid-template-columns: 76px minmax(0, 1fr);
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid var(--rule);
    font-size: 14px;
    line-height: 1.45;
  }

  b {
    font-weight: 600;
  }

  span {
    color: var(--ink-soft);
  }
`;

export const LogoutButton = styled.button`
  width: 100%;
  min-height: 52px;
  margin-top: 8px;
  padding: 0;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
  color: var(--red);
  font-weight: 600;
  text-align: left;

  &:hover {
    background: var(--red-wash);
  }

  &:disabled {
    opacity: 0.6;
  }
`;
