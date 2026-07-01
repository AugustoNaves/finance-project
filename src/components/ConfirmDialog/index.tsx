"use client";

import { Modal } from "@/components/CustomModal";
import { Actions, CancelButton, ConfirmButton, Message } from "./styles";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirmar",
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <Message>{message}</Message>
      <Actions>
        <CancelButton type="button" onClick={onClose}>
          Cancelar
        </CancelButton>
        <ConfirmButton type="button" onClick={onConfirm}>
          {confirmLabel}
        </ConfirmButton>
      </Actions>
    </Modal>
  );
}
