"use client";

import styled from "styled-components";

const colors = {
  navyMid: "#161b27",
  navyLight: "#1e2535",
  green: "#00c48c",
  textMuted: "#8892a4",
  textLight: "#c9d1e0",
  border: "rgba(255, 255, 255, 0.07)",
};

export const FiltersPanel = styled.section`
  padding: 18px;
  background: rgba(22, 27, 39, 0.88);
  border: 1px solid ${colors.border};
  border-radius: 18px;
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.26);
  backdrop-filter: blur(18px);
`;

export const FiltersGrid = styled.div`
  display: grid;
  grid-template-columns: 1.4fr repeat(4, minmax(130px, 1fr)) auto;
  gap: 12px;
  align-items: end;

  @media (max-width: 1080px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

export const Field = styled.div<{ $wide?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;

  @media (max-width: 1080px) and (min-width: 681px) {
    grid-column: ${({ $wide }) => ($wide ? "span 3" : "auto")};
  }
`;

export const Label = styled.label`
  color: ${colors.textLight};
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const controlStyles = `
  width: 100%;
  min-height: 46px;
  padding: 0 13px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.015)),
    ${colors.navyLight};
  border: 1px solid ${colors.border};
  border-radius: 12px;
  color: #ffffff;
  font-size: 0.88rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;

  &:hover {
    border-color: rgba(255, 255, 255, 0.15);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.065), rgba(255, 255, 255, 0.02)),
      ${colors.navyLight};
  }

  &:focus {
    border-color: ${colors.green};
    box-shadow: 0 0 0 3px rgba(0, 196, 140, 0.22);
  }
`;

export const Input = styled.input`
  ${controlStyles}

  &::placeholder {
    color: ${colors.textMuted};
  }

  &[type="date"],
  &[type="month"] {
    color-scheme: dark;
  }

  &::-webkit-calendar-picker-indicator {
    width: 18px;
    height: 18px;
    border-radius: 6px;
    padding: 4px;
    background-color: rgba(0, 196, 140, 0.14);
    cursor: pointer;
    filter: invert(72%) sepia(56%) saturate(717%) hue-rotate(111deg) brightness(91%) contrast(92%);
  }
`;

export const Select = styled.select`
  ${controlStyles}
  padding-right: 40px;
  appearance: none;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.015)),
    linear-gradient(135deg, rgba(0, 196, 140, 0.16), rgba(14, 165, 233, 0.1)),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%2300c48c' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"),
    ${colors.navyLight};
  background-repeat: no-repeat;
  background-size: auto, 28px 28px, 18px 18px, auto;
  background-position: 0 0, right 9px center, right 14px center, 0 0;

  &:hover {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.065), rgba(255, 255, 255, 0.02)),
      linear-gradient(135deg, rgba(0, 196, 140, 0.22), rgba(14, 165, 233, 0.14)),
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%2300c48c' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"),
      ${colors.navyLight};
    background-repeat: no-repeat;
    background-size: auto, 28px 28px, 18px 18px, auto;
    background-position: 0 0, right 9px center, right 14px center, 0 0;
  }

  option {
    background: ${colors.navyLight};
    color: #ffffff;
  }
`;

export const ResetButton = styled.button`
  min-height: 42px;
  padding: 0 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid ${colors.border};
  color: ${colors.textLight};
  font-size: 0.84rem;
  font-weight: 700;
  white-space: nowrap;
  transition:
    background 0.2s,
    border-color 0.2s,
    color 0.2s;

  &:hover {
    background: rgba(0, 196, 140, 0.1);
    border-color: rgba(0, 196, 140, 0.24);
    color: ${colors.green};
  }
`;
