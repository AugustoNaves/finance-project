"use client";

import styled, { keyframes } from "styled-components";

const colors = {
  textMuted: "#8892a4",
  textLight: "#c9d1e0",
  green: "#00c48c",
  greenGlow: "rgba(0, 196, 140, 0.25)",
  red: "#f75a68",
  yellow: "#feca57",
  border: "rgba(255, 255, 255, 0.07)",
  navyLight: "#1e2535",
};

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const PageContent = styled.div`
  display: grid;
  gap: 24px;
  animation: ${fadeUp} 0.6s ease both;
`;

export const Section = styled.section`
  padding: 22px 24px;
  background: rgba(22, 27, 39, 0.72);
  border: 1px solid ${colors.border};
  border-radius: 18px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(18px);

  h2 {
    color: #ffffff;
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 1.2rem;
    font-weight: 700;
    letter-spacing: -0.03em;
  }

  > p {
    margin-top: 6px;
    color: ${colors.textMuted};
    line-height: 1.6;
  }

  @media (max-width: 560px) {
    padding: 18px 16px;
  }
`;

export const UploadArea = styled.label`
  display: grid;
  gap: 8px;
  place-items: center;
  margin-top: 18px;
  padding: 34px 18px;
  border: 1.5px dashed rgba(0, 196, 140, 0.4);
  border-radius: 16px;
  background: rgba(0, 196, 140, 0.05);
  color: ${colors.textLight};
  text-align: center;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;

  &:hover,
  &:focus-within {
    background: rgba(0, 196, 140, 0.1);
    border-color: ${colors.green};
  }

  strong {
    color: #ffffff;
    font-size: 1rem;
  }

  span {
    color: ${colors.textMuted};
    font-size: 0.85rem;
  }

  input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }
`;

export const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  margin-top: 16px;
`;

export const Field = styled.label`
  display: grid;
  gap: 6px;
  color: ${colors.textLight};
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const controlStyles = `
  min-height: 40px;
  padding: 0 10px;
  background: ${colors.navyLight};
  border: 1px solid ${colors.border};
  border-radius: 10px;
  color: #ffffff;
  font-size: 0.86rem;
  outline: none;
  color-scheme: dark;

  &:focus {
    border-color: ${colors.green};
    box-shadow: 0 0 0 3px ${colors.greenGlow};
  }
`;

export const Input = styled.input`
  ${controlStyles}
  width: 100%;
`;

export const Select = styled.select`
  ${controlStyles}
  width: 100%;
`;

export const Button = styled.button<{ $variant?: "primary" | "ghost" | "danger" }>`
  min-height: 42px;
  padding: 0 18px;
  border-radius: 12px;
  font-size: 0.88rem;
  font-weight: 600;
  color: #ffffff;
  background: ${({ $variant }) =>
    $variant === "ghost"
      ? "rgba(255, 255, 255, 0.05)"
      : $variant === "danger"
        ? "linear-gradient(90deg, #f75a68 0%, #ff7a7a 100%)"
        : `linear-gradient(90deg, ${colors.green} 0%, #00b8d9 100%)`};
  border: 1px solid ${({ $variant }) => ($variant === "ghost" ? colors.border : "transparent")};
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

export const SummaryGrid = styled.dl`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-top: 16px;

  div {
    padding: 12px 14px;
    border: 1px solid ${colors.border};
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.03);
  }

  dt {
    color: ${colors.textMuted};
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  dd {
    margin-top: 4px;
    color: #ffffff;
    font-weight: 700;
  }

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

export const Notice = styled.div<{ $variant: "warning" | "error" | "success" | "info" }>`
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  line-height: 1.5;
  font-size: 0.88rem;
  color: ${({ $variant }) =>
    $variant === "error"
      ? "#ff9aa3"
      : $variant === "warning"
        ? "#ffe08a"
        : $variant === "success"
          ? "#7be3c2"
          : colors.textLight};
  background: ${({ $variant }) =>
    $variant === "error"
      ? "rgba(247, 90, 104, 0.1)"
      : $variant === "warning"
        ? "rgba(254, 202, 87, 0.08)"
        : $variant === "success"
          ? "rgba(0, 196, 140, 0.08)"
          : "rgba(255, 255, 255, 0.03)"};
  border: 1px solid
    ${({ $variant }) =>
      $variant === "error"
        ? "rgba(247, 90, 104, 0.35)"
        : $variant === "warning"
          ? "rgba(254, 202, 87, 0.3)"
          : $variant === "success"
            ? "rgba(0, 196, 140, 0.3)"
            : colors.border};

  label {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    color: #ffffff;
  }

  a {
    color: inherit;
    font-weight: 600;
    text-decoration: underline;
  }
`;

export const TableWrapper = styled.div`
  margin-top: 16px;
  overflow-x: auto;
  border: 1px solid ${colors.border};
  border-radius: 14px;
`;

export const Table = styled.table`
  width: 100%;
  min-width: 1080px;
  border-collapse: collapse;

  th,
  td {
    padding: 10px 12px;
    text-align: left;
    vertical-align: top;
    border-bottom: 1px solid ${colors.border};
  }

  th {
    color: ${colors.textMuted};
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: rgba(255, 255, 255, 0.02);
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  th:nth-child(6),
  td:nth-child(6) {
    min-width: 132px;
  }

  th:nth-child(5),
  td:nth-child(5) {
    min-width: 120px;
  }

  tr[data-excluded="true"] {
    opacity: 0.5;
  }
`;

export const Badge = styled.span<{ $tone?: "green" | "yellow" | "red" | "muted" }>`
  display: inline-block;
  margin: 4px 6px 0 0;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
  color: ${({ $tone }) =>
    $tone === "green"
      ? "#7be3c2"
      : $tone === "yellow"
        ? "#ffe08a"
        : $tone === "red"
          ? "#ff9aa3"
          : colors.textMuted};
  background: ${({ $tone }) =>
    $tone === "green"
      ? "rgba(0, 196, 140, 0.12)"
      : $tone === "yellow"
        ? "rgba(254, 202, 87, 0.12)"
        : $tone === "red"
          ? "rgba(247, 90, 104, 0.12)"
          : "rgba(255, 255, 255, 0.05)"};
`;

export const InlineButton = styled.button`
  margin-top: 6px;
  padding: 0;
  background: none;
  color: ${colors.green};
  font-size: 0.76rem;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
`;

export const CheckLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  color: ${colors.textMuted};
  font-size: 0.76rem;
`;

export const Footer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;

  p {
    color: ${colors.textLight};
  }

  > div {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
`;

export const BatchList = styled.ul`
  display: grid;
  gap: 10px;
  margin-top: 16px;
  list-style: none;

  li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid ${colors.border};
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.03);
  }

  strong {
    display: block;
    color: #ffffff;
  }

  span {
    color: ${colors.textMuted};
    font-size: 0.84rem;
  }
`;
