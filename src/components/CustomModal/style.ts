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

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(6, 9, 15, 0.78);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 9999;
  padding: 32px 20px;
  overflow-y: auto;
  backdrop-filter: blur(10px);

  @media (max-width: 768px) {
    padding: 18px 12px;
  }
`;

export const ModalContainer = styled.div<{ $maxWidth?: string }>`
  position: relative;
  overflow: visible;
  background:
    radial-gradient(circle at 100% 0%, rgba(0, 196, 140, 0.1), transparent 34%),
    radial-gradient(circle at 0% 100%, rgba(14, 165, 233, 0.08), transparent 34%),
    ${colors.navyMid};
  border: 1px solid ${colors.border};
  border-radius: 24px;
  padding: 32px;
  width: 100%;
  max-width: ${({ $maxWidth }) => $maxWidth ?? "480px"};
  color: ${colors.textLight};
  box-shadow:
    0 0 0 1px ${colors.border},
    0 40px 90px rgba(0, 0, 0, 0.52);

  p {
    color: ${colors.textMuted};
    line-height: 1.6;
  }

  @media (max-width: 768px) {
    padding: 24px;
  }
`;

export const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
`;

export const ModalTitle = styled.h2`
  font-family: var(--font-dm-sans), sans-serif;
  font-size: 1.35rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.03em;
`;

export const CloseButton = styled.button`
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${colors.navyLight};
  border: 1px solid ${colors.border};
  border-radius: 10px;
  font-size: 16px;
  color: ${colors.textMuted};
  cursor: pointer;
  line-height: 1;
  transition:
    color 0.2s,
    border-color 0.2s,
    background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.15);
    color: ${colors.green};
  }
`;
