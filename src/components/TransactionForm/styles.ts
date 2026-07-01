"use client";

import styled from "styled-components";

const colors = {
  navyLight: "#1e2535",
  green: "#00c48c",
  red: "#f75a68",
  greenGlow: "rgba(0, 196, 140, 0.25)",
  textMuted: "#8892a4",
  textLight: "#c9d1e0",
  border: "rgba(255, 255, 255, 0.07)",
};

const variantColor = {
  income: colors.green,
  outcome: colors.red,
};

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const Label = styled.label`
  font-size: 0.78rem;
  font-weight: 500;
  color: ${colors.textLight};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

export const Input = styled.input`
  padding: 13px 14px;
  min-height: 48px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.015)),
    ${colors.navyLight};
  border: 1px solid ${colors.border};
  border-radius: 12px;
  font-size: 0.9rem;
  color: #ffffff;
  outline: none;
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    background 0.2s;

  &:focus {
    border-color: ${colors.green};
    box-shadow: 0 0 0 3px ${colors.greenGlow};
  }

  &:hover {
    border-color: rgba(255, 255, 255, 0.15);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.065), rgba(255, 255, 255, 0.02)),
      ${colors.navyLight};
  }

  &::placeholder {
    color: ${colors.textMuted};
  }

  &:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 40px ${colors.navyLight} inset;
    -webkit-text-fill-color: #ffffff;
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

export const Textarea = styled.textarea`
  padding: 13px 14px;
  min-height: 92px;
  resize: vertical;
  background: ${colors.navyLight};
  border: 1px solid ${colors.border};
  border-radius: 10px;
  font-size: 0.9rem;
  color: #ffffff;
  outline: none;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;

  &:focus {
    border-color: ${colors.green};
    box-shadow: 0 0 0 3px ${colors.greenGlow};
  }

  &:hover {
    border-color: rgba(255, 255, 255, 0.15);
  }

  &::placeholder {
    color: ${colors.textMuted};
  }
`;

export const TypeSelector = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

export const TypeButton = styled.button<{
  $active: boolean;
  $variant: "income" | "outcome";
}>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.2s,
    border-color 0.2s,
    color 0.2s,
    transform 0.15s;
  border: 1px solid
    ${({ $active, $variant }) =>
      $active ? variantColor[$variant] : "rgba(255, 255, 255, 0.07)"};
  background: ${({ $active, $variant }) =>
    $active ? `${variantColor[$variant]}1f` : colors.navyLight};
  color: ${({ $active, $variant }) =>
    $active ? variantColor[$variant] : colors.textMuted};

  &::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $variant }) => variantColor[$variant]};
    box-shadow: 0 0 14px ${({ $variant }) => variantColor[$variant]};
    opacity: ${({ $active }) => ($active ? 1 : 0.45)};
  }

  &:hover {
    border-color: ${({ $variant }) => `${variantColor[$variant]}80`};
    color: ${({ $variant }) => variantColor[$variant]};
    transform: translateY(-1px);
  }
`;

export const Select = styled.select`
  min-height: 48px;
  padding: 0 42px 0 14px;
  border: 1px solid ${colors.border};
  border-radius: 12px;
  font-size: 0.9rem;
  color: #ffffff;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.015)),
    linear-gradient(135deg, rgba(0, 196, 140, 0.16), rgba(14, 165, 233, 0.1)),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%2300c48c' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"),
    ${colors.navyLight};
  background-repeat: no-repeat;
  background-size: auto, 30px 30px, 18px 18px, auto;
  background-position: 0 0, right 10px center, right 16px center, 0 0;
  outline: none;
  appearance: none;
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    background 0.2s;

  &:hover {
    border-color: rgba(255, 255, 255, 0.15);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.065), rgba(255, 255, 255, 0.02)),
      linear-gradient(135deg, rgba(0, 196, 140, 0.22), rgba(14, 165, 233, 0.14)),
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%2300c48c' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"),
      ${colors.navyLight};
    background-repeat: no-repeat;
    background-size: auto, 30px 30px, 18px 18px, auto;
    background-position: 0 0, right 10px center, right 16px center, 0 0;
  }

  &:focus {
    border-color: ${colors.green};
    box-shadow: 0 0 0 3px ${colors.greenGlow};
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
  border: none;
  border-radius: 10px;
  font-family: var(--font-syne), sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: #ffffff;
  cursor: pointer;
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

  &:active {
    transform: translateY(0);
  }
`;
