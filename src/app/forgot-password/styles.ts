"use client";

import Link from "next/link";
import styled, { keyframes } from "styled-components";

const colors = {
  navy: "#0d1117",
  navyMid: "#161b27",
  navyLight: "#1e2535",
  green: "#00c48c",
  greenGlow: "rgba(0, 196, 140, 0.25)",
  blue: "#0ea5e9",
  white: "#ffffff",
  textMuted: "#8892a4",
  textLight: "#c9d1e0",
  border: "rgba(255, 255, 255, 0.07)",
  glass: "rgba(255, 255, 255, 0.04)",
};

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const Wrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: ${colors.navy};
  background-image:
    radial-gradient(
      ellipse 80% 60% at 70% 50%,
      rgba(0, 196, 140, 0.07) 0%,
      transparent 60%
    ),
    radial-gradient(
      ellipse 60% 50% at 10% 80%,
      rgba(14, 165, 233, 0.06) 0%,
      transparent 55%
    );
  font-family: var(--font-dm-sans), sans-serif;
  overflow: hidden;
  position: relative;
  padding: 24px;
`;

export const FormCard = styled.div`
  width: 100%;
  max-width: 420px;
  background: ${colors.navyMid};
  border: 1px solid ${colors.border};
  border-radius: 24px;
  padding: 48px 40px;
  display: flex;
  flex-direction: column;
  gap: 0;
  backdrop-filter: blur(20px);
  box-shadow:
    0 0 0 1px ${colors.border},
    0 40px 80px rgba(0, 0, 0, 0.5);
  animation: ${fadeUp} 0.7s ease both;

  @media (max-width: 480px) {
    padding: 36px 24px;
    border-radius: 16px;
  }
`;

export const FormHeader = styled.div`
  margin-bottom: 32px;
`;

export const LogoMark = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, ${colors.green}, ${colors.blue});
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-dm-sans), sans-serif;
  font-weight: 800;
  font-size: 18px;
  color: #fff;
  margin-bottom: 20px;
`;

export const FormTitle = styled.h1`
  font-family: var(--font-dm-sans), sans-serif;
  font-size: 1.75rem;
  font-weight: 700;
  color: ${colors.white};
  margin-bottom: 6px;
  letter-spacing: -0.02em;
`;

export const FormSubtitle = styled.p`
  color: ${colors.textMuted};
  font-size: 0.875rem;
  line-height: 1.5;
`;

export const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
`;

export const InputLabel = styled.label`
  font-size: 0.78rem;
  font-weight: 500;
  color: ${colors.textLight};
  letter-spacing: 0.03em;
  text-transform: uppercase;
`;

export const InputWrapper = styled.div`
  position: relative;

  svg.input-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: ${colors.textMuted};
    width: 16px;
    height: 16px;
    pointer-events: none;
    transition: color 0.2s;
  }
`;

export const StyledInput = styled.input`
  width: 100%;
  padding: 13px 14px 13px 42px;
  background: ${colors.navyLight};
  border: 1px solid ${colors.border};
  border-radius: 10px;
  color: ${colors.white};
  font-family: var(--font-dm-sans), sans-serif;
  font-size: 0.9rem;
  outline: none;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;

  &::placeholder {
    color: ${colors.textMuted};
  }

  &:hover {
    border-color: rgba(255, 255, 255, 0.15);
  }

  &:focus {
    border-color: ${colors.green};
    box-shadow: 0 0 0 3px ${colors.greenGlow};

    ~ svg.input-icon,
    & + svg.input-icon {
      color: ${colors.green};
    }
  }

  &:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 40px ${colors.navyLight} inset;
    -webkit-text-fill-color: ${colors.white};
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

export const SubmitButton = styled.button`
  width: 100%;
  margin-top: 8px;
  padding: 14px;
  background: linear-gradient(90deg, ${colors.green} 0%, #00b8d9 100%);
  background-size: 200% auto;
  border: none;
  border-radius: 10px;
  color: #fff;
  font-family: var(--font-dm-sans), sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  cursor: pointer;
  transition:
    background-position 0.4s,
    transform 0.15s,
    box-shadow 0.2s;
  box-shadow: 0 4px 20px rgba(0, 196, 140, 0.3);

  &:hover:not(:disabled) {
    background-position: right center;
    box-shadow: 0 6px 28px rgba(0, 196, 140, 0.45);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
    transform: none;
    box-shadow: none;
  }
`;

export const FormMessage = styled.p<{ $variant: "error" | "success" }>`
  border: 1px solid
    ${({ $variant }) =>
      $variant === "error" ? "rgba(248, 113, 113, 0.35)" : "rgba(0, 196, 140, 0.35)"};
  border-radius: 10px;
  background: ${({ $variant }) =>
    $variant === "error" ? "rgba(248, 113, 113, 0.09)" : "rgba(0, 196, 140, 0.09)"};
  color: ${({ $variant }) => ($variant === "error" ? "#fecaca" : colors.textLight)};
  font-size: 0.82rem;
  line-height: 1.4;
  padding: 10px 12px;
  margin-bottom: 16px;
`;

export const ForgotLink = styled(Link)`
  display: block;
  text-align: center;
  margin-top: 20px;
  font-size: 0.8rem;
  color: ${colors.green};
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;
