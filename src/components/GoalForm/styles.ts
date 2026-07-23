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
  display: grid;
  gap: 16px;
`;

export const Field = styled.div`
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
  width: 100%;
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
  }

  &::placeholder {
    color: ${colors.textMuted};
  }

  &[type="date"] {
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

export const ColorInput = styled(Input)`
  min-height: 48px;
  padding: 6px;
  cursor: pointer;
`;

export const SubmitButton = styled.button`
  margin-top: 8px;
  padding: 14px;
  background: linear-gradient(90deg, ${colors.green} 0%, #00b8d9 100%);
  background-size: 200% auto;
  border: none;
  border-radius: 10px;
  font-family: var(--font-dm-sans), sans-serif;
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
