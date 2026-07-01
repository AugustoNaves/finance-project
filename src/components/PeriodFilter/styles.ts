"use client";

import styled from "styled-components";

const colors = {
  navyLight: "#1e2535",
  green: "#00c48c",
  greenGlow: "rgba(0, 196, 140, 0.25)",
  textLight: "#c9d1e0",
  border: "rgba(255, 255, 255, 0.07)",
};

export const Wrapper = styled.div`
  display: flex;
  justify-content: flex-end;

  @media (max-width: 640px) {
    justify-content: stretch;
  }
`;

export const Field = styled.label`
  display: grid;
  gap: 6px;
  color: ${colors.textLight};
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

export const Input = styled.input`
  min-height: 42px;
  padding: 0 12px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.015)),
    ${colors.navyLight};
  border: 1px solid ${colors.border};
  border-radius: 12px;
  color: #ffffff;
  color-scheme: dark;
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
