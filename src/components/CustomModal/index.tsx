"use client";
import { ReactNode } from "react";
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
  if (!isOpen) return null;

  return (
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
};
