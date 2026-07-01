"use client";
import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Overlay,
  ModalContainer,
  ModalHeader,
  ModalTitle,
  CloseButton,
} from "./style";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth,
}: ModalProps) => {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <Overlay onClick={onClose}>
      <ModalContainer $maxWidth={maxWidth} onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          <CloseButton onClick={onClose}>✕</CloseButton>
        </ModalHeader>
        {children}
      </ModalContainer>
    </Overlay>
  );

  if (typeof document === "undefined") return null;

  return createPortal(modalContent, document.body);
};
