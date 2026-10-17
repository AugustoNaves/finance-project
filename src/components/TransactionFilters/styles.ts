"use client";

import styled, { css } from "styled-components";

const control = css`
  width: 100%;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid var(--rule-strong);
  background: var(--sheet);
  color: var(--ink);
`;

export const FiltersPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 4px;
`;

export const SearchInput = styled.input`
  ${control}
  padding: 0 14px;

  &::placeholder {
    color: var(--ink-soft);
  }
`;

export const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

export const Chips = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  margin: 0 -4px;
  padding: 2px 4px;

  &::-webkit-scrollbar {
    display: none;
  }
`;

export const Chip = styled.button<{ $active: boolean }>`
  flex-shrink: 0;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 14px;
  border: 1px solid ${({ $active }) => ($active ? "var(--green)" : "var(--rule-strong)")};
  background: ${({ $active }) => ($active ? "var(--green)" : "transparent")};
  color: ${({ $active }) => ($active ? "var(--on-green)" : "var(--ink)")};
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
`;

export const MoreButton = styled.button`
  flex-shrink: 0;
  min-height: 36px;
  padding: 0 4px;
  font-size: 14px;
  font-weight: 500;
  color: var(--green);
`;

export const MoreGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  background: var(--sheet);

  &[hidden] {
    display: none;
  }

  @media (min-width: 720px) {
    grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
    align-items: end;
  }
`;

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

export const Label = styled.label`
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
`;

export const Input = styled.input`
  ${control}
  background: var(--paper);
`;

export const Select = styled.select`
  ${control}
  background: var(--paper);
`;

export const ResetButton = styled.button`
  min-height: 44px;
  padding: 0 12px;
  border-radius: 10px;
  color: var(--ink-soft);
  font-weight: 500;
  grid-column: 1 / -1;

  &:hover {
    color: var(--ink);
    background: var(--green-wash);
  }

  @media (min-width: 720px) {
    grid-column: auto;
  }
`;
