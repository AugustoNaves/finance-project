"use client";

import styled from "styled-components";

const colors = {
  navyLight: "#1e2535",
  green: "#00c48c",
  greenGlow: "rgba(0, 196, 140, 0.25)",
  textMuted: "#8892a4",
  textLight: "#c9d1e0",
  border: "rgba(255, 255, 255, 0.07)",
};

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const Label = styled.label`
  color: ${colors.textLight};
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const controlStyles = `
  width: 100%;
  min-height: 48px;
  padding: 0 14px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.015)),
    ${colors.navyLight};
  border: 1px solid ${colors.border};
  border-radius: 12px;
  color: #ffffff;
  font-size: 0.9rem;
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
    box-shadow: 0 0 0 3px ${colors.greenGlow};
  }
`;

export const Input = styled.input`
  ${controlStyles}

  &[type="color"] {
    padding: 6px;
  }

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
  padding-right: 42px;
  appearance: none;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.015)),
    linear-gradient(135deg, rgba(0, 196, 140, 0.16), rgba(14, 165, 233, 0.1)),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%2300c48c' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"),
    ${colors.navyLight};
  background-repeat: no-repeat;
  background-size: auto, 30px 30px, 18px 18px, auto;
  background-position: 0 0, right 10px center, right 16px center, 0 0;

  &:hover {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.065), rgba(255, 255, 255, 0.02)),
      linear-gradient(135deg, rgba(0, 196, 140, 0.22), rgba(14, 165, 233, 0.14)),
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%2300c48c' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"),
      ${colors.navyLight};
    background-repeat: no-repeat;
    background-size: auto, 30px 30px, 18px 18px, auto;
    background-position: 0 0, right 10px center, right 16px center, 0 0;
  }

  option {
    background: ${colors.navyLight};
    color: #ffffff;
  }
`;

export const SubmitButton = styled.button`
  margin-top: 8px;
  padding: 14px;
  background: linear-gradient(90deg, ${colors.green} 0%, #00b8d9 100%);
  background-size: 200% auto;
  border-radius: 10px;
  color: #ffffff;
  font-family: var(--font-dm-sans), sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  box-shadow: 0 4px 20px rgba(0, 196, 140, 0.28);
  transition:
    background-position 0.35s,
    transform 0.15s,
    box-shadow 0.2s;

  &:hover {
    background-position: right center;
    box-shadow: 0 6px 28px rgba(0, 196, 140, 0.42);
    transform: translateY(-1px);
  }
`;
