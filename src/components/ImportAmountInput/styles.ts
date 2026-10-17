"use client";

import styled from "styled-components";

export const Field = styled.input`
  width: 9ch;
  min-width: 0;
  min-height: 44px;
  padding: 0 4px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: inherit;
  font: inherit;
  font-variant-numeric: tabular-nums;
  text-align: right;

  @supports (field-sizing: content) {
    field-sizing: content;
    width: auto;
    min-width: 5ch;
  }

  &:hover {
    border-color: var(--rule);
  }

  &:focus {
    border-color: var(--rule-strong);
    background: var(--sheet);
  }
`;
