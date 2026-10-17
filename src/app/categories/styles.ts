"use client";

import styled from "styled-components";

export const Page = styled.div`
  max-width: 760px;
`;

export const PageContent = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
`;

export const TabList = styled.div`
  display: flex;
  gap: 20px;
  overflow-x: auto;
  scrollbar-width: none;
  border-bottom: 1px solid var(--rule);

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 399px) {
    gap: 14px;
  }
`;

export const TabButton = styled.button`
  flex-shrink: 0;
  min-height: 44px;
  padding: 0;
  margin-bottom: -1px;
  border-bottom: 2px solid transparent;
  font-size: 14px;
  color: var(--ink-soft);
  white-space: nowrap;

  &[aria-selected="true"] {
    color: var(--ink);
    font-weight: 600;
    border-bottom-color: var(--green);
  }

  &:hover {
    color: var(--ink);
  }

  &:focus-visible {
    outline-offset: -2px;
  }
`;

export const TabCount = styled.span`
  font-family: var(--font-figures);
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  font-size: 13px;
  color: var(--ink-soft);
`;

export const LedgerList = styled.ul`
  list-style: none;
`;

export const SearchField = styled.div`
  position: relative;
  margin: 12px 0 4px;
`;

export const SearchIcon = styled.span`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  color: var(--ink-soft);
  pointer-events: none;
`;

export const SearchInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 0 12px 0 36px;
  border-radius: 10px;
  border: 1px solid var(--rule-strong);
  background: var(--sheet);
  color: var(--ink);
  font-size: 15px;

  &::placeholder {
    color: var(--ink-soft);
    opacity: 0.7;
  }
`;

export const RuleItem = styled.li`
  list-style: none;
  min-height: 58px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--rule);
`;

export const RuleMain = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

export const RulePattern = styled.span`
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const RuleMeta = styled.span`
  font-size: 12.5px;
  color: var(--ink-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const RuleDot = styled.span`
  display: inline-block;
  vertical-align: 1px;
  width: 8px;
  height: 8px;
  margin-right: 6px;
  border-radius: 50%;
  background: var(--rule-strong);
`;

export const RuleDelete = styled.button`
  min-height: 44px;
  padding: 0 12px;
  margin-right: -12px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: var(--red);

  &:hover {
    background: var(--red-wash);
  }
`;
