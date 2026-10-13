"use client";
import { useContext } from "react";
import { TransactionsContext } from "@/contexts/TransactionsContenxt";
import { Modal } from "@/components/CustomModal/index";
import { TransactionForm, TransactionFormData } from "@/components/TransactionForm";
import { TransactionType } from "@/types/transaction";

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  defaultType?: TransactionType;
}

export const NewTransactionModal = ({
  isOpen,
  onClose,
  title = "Nova Transação",
  defaultType,
}: NewTransactionModalProps) => {
  const { addTransaction } = useContext(TransactionsContext);

  async function handleCreateNewTransaction(data: TransactionFormData) {
    await addTransaction(data);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <TransactionForm
        defaultType={defaultType}
        onSubmit={handleCreateNewTransaction}
      />
    </Modal>
  );
};
