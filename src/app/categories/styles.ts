"use client";

import styled, { keyframes } from "styled-components";

const colors = {
  navyMid: "#161b27",
  navyLight: "#1e2535",
  textMuted: "#8892a4",
  textLight: "#c9d1e0",
  green: "#00c48c",
  red: "#f75a68",
  border: "rgba(255, 255, 255, 0.07)",
};

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const PageContent = styled.div`
  display: grid;
  gap: 18px;
  animation: ${fadeUp} 0.6s ease both;
`;

export const TabsContainer = styled.div`
  display: flex;
  gap: 8px;
  border-bottom: 1px solid ${colors.border};
  padding-bottom: 6px;
  margin-bottom: 4px;
`;

export const TabButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 12px;
  border: 1px solid ${({ $active }) => ($active ? "rgba(0, 196, 140, 0.4)" : colors.border)};
  background: ${({ $active }) =>
    $active
      ? "linear-gradient(135deg, rgba(0, 196, 140, 0.16), rgba(14, 165, 233, 0.1))"
      : "rgba(255, 255, 255, 0.03)"};
  color: ${({ $active }) => ($active ? "#ffffff" : colors.textMuted)};
  font-family: var(--font-dm-sans), sans-serif;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.15);
  }

  &:focus-visible {
    outline: 2px solid ${colors.green};
    outline-offset: 2px;
  }
`;

export const TabBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 0.75rem;
  font-weight: 600;
`;

export const TabPanel = styled.div`
  display: grid;
  gap: 18px;
`;

export const Section = styled.section`
  background: rgba(22, 27, 39, 0.72);
  border: 1px solid ${colors.border};
  border-radius: 18px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(18px);
  overflow: hidden;
`;

export const SectionHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px;
  border-bottom: 1px solid ${colors.border};

  h2 {
    color: #ffffff;
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: -0.04em;
  }

  span {
    color: ${colors.textMuted};
    font-size: 0.88rem;
  }
`;

export const SectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 18px;

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    padding: 16px;
  }
`;

export const RulesToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px;
  border-bottom: 1px solid ${colors.border};
  background: rgba(255, 255, 255, 0.01);

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
    padding: 16px;
  }
`;

export const SearchWrapper = styled.div`
  position: relative;
  flex: 1;
  max-width: 380px;

  @media (max-width: 640px) {
    max-width: 100%;
  }
`;

export const SearchInput = styled.input`
  width: 100%;
  min-height: 42px;
  padding: 0 14px 0 38px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.015)),
    ${colors.navyLight};
  border: 1px solid ${colors.border};
  border-radius: 12px;
  color: #ffffff;
  font-size: 0.88rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;

  &::placeholder {
    color: ${colors.textMuted};
  }

  &:hover {
    border-color: rgba(255, 255, 255, 0.15);
  }

  &:focus {
    border-color: ${colors.green};
    box-shadow: 0 0 0 3px rgba(0, 196, 140, 0.22);
  }
`;

export const SearchIcon = styled.span`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: ${colors.textMuted};
  display: flex;
  align-items: center;
  pointer-events: none;
`;

export const RulesTableWrapper = styled.div`
  overflow-x: auto;

  @media (max-width: 780px) {
    display: none;
  }
`;

export const RulesTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 16px 20px;
    text-align: left;
    border-bottom: 1px solid ${colors.border};
  }

  th {
    color: ${colors.textMuted};
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: rgba(255, 255, 255, 0.015);
  }

  td {
    color: #ffffff;
    font-size: 0.9rem;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  tbody tr:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`;

export const CategoryTag = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: ${colors.textLight};
  font-size: 0.82rem;
  font-weight: 600;
`;

export const TypeBadge = styled.span<{ $type: string }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: ${({ $type }) =>
    $type === "income"
      ? "rgba(0, 196, 140, 0.12)"
      : $type === "investment"
        ? "rgba(139, 92, 246, 0.14)"
        : "rgba(247, 90, 104, 0.12)"};
  color: ${({ $type }) =>
    $type === "income" ? colors.green : $type === "investment" ? "#a78bfa" : colors.red};
  border: 1px solid
    ${({ $type }) =>
      $type === "income"
        ? "rgba(0, 196, 140, 0.28)"
        : $type === "investment"
          ? "rgba(139, 92, 246, 0.3)"
          : "rgba(247, 90, 104, 0.28)"};
`;

export const RuleDate = styled.span`
  color: ${colors.textMuted};
  font-size: 0.85rem;
`;

export const DeleteButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(247, 90, 104, 0.08);
  border: 1px solid rgba(247, 90, 104, 0.24);
  color: ${colors.red};
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(247, 90, 104, 0.18);
    border-color: rgba(247, 90, 104, 0.4);
    color: #ffffff;
  }

  &:focus-visible {
    outline: 2px solid ${colors.red};
    outline-offset: 2px;
  }
`;

export const RulesMobileList = styled.div`
  display: none;
  padding: 16px;
  gap: 12px;

  @media (max-width: 780px) {
    display: flex;
    flex-direction: column;
  }
`;

export const RuleMobileCard = styled.article`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid ${colors.border};
  border-radius: 12px;
`;

export const RuleMobileCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  strong {
    color: #ffffff;
    font-size: 0.95rem;
  }
`;

export const RuleMobileCardMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`;

export const RuleMobileCardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px solid ${colors.border};
`;

export const ErrorContainer = styled.div`
  padding: 16px 24px 0 24px;
`;
