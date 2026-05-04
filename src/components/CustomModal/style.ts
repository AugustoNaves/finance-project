"use client";
import styled from "styled-components";

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`;

export const ModalContainer = styled.div<{ $maxWidth?: string }>`
  background: #ffffff;
  border-radius: 12px;
  padding: 32px;
  width: 100%;
  max-width: ${({ $maxWidth }) => $maxWidth ?? "480px"};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);

  @media (max-width: 768px) {
    padding: 24px;
    margin: 0 16px;
    max-height: 90vh;
    overflow-y: auto;
  }
`;

export const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
`;

export const ModalTitle = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
`;

export const CloseButton = styled.button`
  background: transparent;
  border: none;
  font-size: 18px;
  color: #6b6b6b;
  cursor: pointer;
  padding: 4px;
  line-height: 1;

  &:hover {
    color: #1a1a2e;
  }
`;
