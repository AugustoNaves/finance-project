"use client";

import styled from "styled-components";

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--scrim);
  display: flex;
  align-items: flex-end;
  justify-content: center;

  @media (min-width: 960px) {
    align-items: center;
    padding: 24px;
  }
`;

export const ModalContainer = styled.div<{ $maxWidth?: string }>`
  width: 100%;
  max-width: ${({ $maxWidth }) => $maxWidth ?? "560px"};
  max-height: 92vh;
  max-height: 92dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--sheet);
  color: var(--ink);
  border-radius: 20px 20px 0 0;
  padding: 10px 20px calc(24px + env(safe-area-inset-bottom));

  &::before {
    content: "";
    display: block;
    width: 40px;
    height: 4px;
    margin: 0 auto 10px;
    border-radius: 2px;
    background: var(--rule-strong);
  }

  @media (min-width: 960px) {
    border-radius: 16px;
    padding: 24px 28px 28px;

    &::before {
      display: none;
    }
  }

  @media (prefers-reduced-motion: no-preference) {
    animation: modal-rise 0.22s ease-out;

    @keyframes modal-rise {
      from {
        transform: translateY(24px);
        opacity: 0;
      }
    }
  }
`;

export const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
`;

export const ModalTitle = styled.h2`
  font-size: 17px;
  font-weight: 600;
  line-height: 1.3;
`;

export const CloseButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  margin-right: -10px;
  border-radius: 10px;
  color: var(--ink-soft);
  font-size: 16px;

  &:hover {
    background: var(--green-wash);
    color: var(--ink);
  }
`;
