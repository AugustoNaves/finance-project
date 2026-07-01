"use client";
import { useContext } from "react";
import { TransactionsContext } from "@/contexts/TransactionsContenxt";
import { Modal } from "@/components/CustomModal/index";
import { TransactionForm, TransactionFormData } from "@/components/TransactionForm";

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewTransactionModal = ({
  isOpen,
  onClose,
}: NewTransactionModalProps) => {
  const { addTransaction } = useContext(TransactionsContext);

  async function handleCreateNewTransaction(data: TransactionFormData) {
    await addTransaction(data);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nova Transação">
      <TransactionForm onSubmit={handleCreateNewTransaction} />
    </Modal>
  );
};
