"use client";
import styled from "styled-components";

const colors = {
  green: "#00c48c",
  blue: "#0ea5e9",
  greenGlow: "rgba(0, 196, 140, 0.28)",
};

export const Nav = styled.header`
  max-width: 1120px;
  margin: 0 auto;
  padding: 28px 32px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  background: transparent;

  @media (max-width: 768px) {
    padding: 24px 16px 8px;
  }

  @media (max-width: 460px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: var(--font-dm-sans), sans-serif;
  font-size: 22px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.04em;
`;

export const BrandDot = styled.span`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, ${colors.green}, ${colors.blue});
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 26px ${colors.greenGlow};

  &::before {
    content: "F";
    color: #ffffff;
    font-size: 18px;
    font-weight: 800;
  }
`;

export const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  @media (max-width: 460px) {
    width: 100%;
  }
`;

export const NewTransactionButton = styled.button`
  position: relative;
  overflow: hidden;
  padding: 13px 20px;
  background: linear-gradient(90deg, ${colors.green} 0%, #00b8d9 100%);
  background-size: 200% auto;
  border-radius: 10px;
  color: #ffffff;
  font-family: var(--font-dm-sans), sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0, 196, 140, 0.28);
  transition:
    background-position 0.35s,
    transform 0.15s,
    box-shadow 0.2s;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      100deg,
      transparent 20%,
      rgba(255, 255, 255, 0.16) 50%,
      transparent 80%
    );
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover {
    background-position: right center;
    box-shadow: 0 8px 28px rgba(0, 196, 140, 0.4);
    transform: translateY(-1px);
  }

  &:hover::after {
    opacity: 1;
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    padding: 10px 16px;
    font-size: 13px;
  }

  @media (max-width: 460px) {
    width: 100%;
  }
`;
