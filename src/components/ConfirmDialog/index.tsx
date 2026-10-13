"use client";

import { useState } from "react";
import { Modal } from "@/components/CustomModal";
import { FormError } from "@/components/FormError";
import { getErrorMessage } from "@/services/http";
import { Actions, CancelButton, ConfirmButton, ErrorSlot, Message } from "./styles";

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
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function handleClose() {
    setError("");
    onClose();
  }

  async function handleConfirm() {
    setError("");
    setPending(true);

    try {
      await onConfirm();
    } catch (confirmError) {
      setError(getErrorMessage(confirmError, "Não foi possível concluir a ação."));
    }

    setPending(false);
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <Message>{message}</Message>
      <ErrorSlot>
        <FormError message={error} />
      </ErrorSlot>
      <Actions>
        <CancelButton type="button" onClick={handleClose}>
          Cancelar
        </CancelButton>
        <ConfirmButton type="button" onClick={handleConfirm} disabled={pending}>
          {confirmLabel}
        </ConfirmButton>
      </Actions>
    </Modal>
  );
}
