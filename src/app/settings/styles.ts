"use client";

import styled, { keyframes } from "styled-components";

const colors = {
  navyLight: "#1e2535",
  green: "#00c48c",
  blue: "#0ea5e9",
  red: "#f75a68",
  textMuted: "#8892a4",
  textLight: "#c9d1e0",
  border: "rgba(255, 255, 255, 0.07)",
};

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const PageContent = styled.div`
  animation: ${fadeUp} 0.6s ease both;
`;

export const SettingsGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;

  article:first-child {
    grid-column: 1 / -1;
  }

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

export const DataGrid = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const DetailItem = styled.div`
  padding: 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid ${colors.border};

  span {
    display: block;
    margin-bottom: 8px;
    color: ${colors.textMuted};
    font-size: 0.78rem;
  }

  strong {
    color: ${colors.textLight};
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 0.98rem;
  }
`;

export const ExportActions = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

export const ActionButton = styled.button`
  min-height: 42px;
  padding: 0 14px;
  border-radius: 10px;
  background: rgba(14, 165, 233, 0.1);
  border: 1px solid rgba(14, 165, 233, 0.22);
  color: ${colors.blue};
  font-weight: 700;
  transition:
    background 0.2s,
    border-color 0.2s,
    transform 0.15s;

  &:hover {
    background: rgba(14, 165, 233, 0.16);
    border-color: rgba(14, 165, 233, 0.36);
    transform: translateY(-1px);
  }
`;

export const SecurityList = styled.ul`
  position: relative;
  z-index: 1;
  display: grid;
  gap: 10px;
  margin: 0 0 18px;
  padding-left: 18px;
  color: ${colors.textMuted};
  font-size: 0.9rem;
  line-height: 1.55;
`;

export const DangerButton = styled.button`
  position: relative;
  z-index: 1;
  min-height: 42px;
  padding: 0 14px;
  border-radius: 10px;
  background: rgba(247, 90, 104, 0.1);
  border: 1px solid rgba(247, 90, 104, 0.22);
  color: ${colors.red};
  font-weight: 700;
  transition:
    background 0.2s,
    border-color 0.2s,
    transform 0.15s;

  &:hover {
    background: rgba(247, 90, 104, 0.16);
    border-color: rgba(247, 90, 104, 0.36);
    transform: translateY(-1px);
  }
`;
