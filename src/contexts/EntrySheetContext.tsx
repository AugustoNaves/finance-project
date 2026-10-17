"use client";

import { createContext, ReactNode, useContext, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/CustomModal";
import { NewTransactionModal } from "@/components/NewTransactionModal";
import { TransactionForm, TransactionFormData } from "@/components/TransactionForm";
import { TransactionsContext } from "@/contexts/TransactionsContenxt";
import { Transaction, TransactionType } from "@/types/transaction";
import { getTransactionType } from "@/utils/finance";

interface EntrySheetContextType {
  openNewEntry: (defaultType?: TransactionType) => void;
  openEditEntry: (transaction: Transaction) => void;
}

export const EntrySheetContext = createContext<EntrySheetContextType>({
  openNewEntry: () => {},
  openEditEntry: () => {},
});

function toFormValues(transaction: Transaction): TransactionFormData {
  return {
    description: transaction.description,
    amount: transaction.amount,
    category: transaction.category,
    type: getTransactionType(transaction),
    paymentMethod: transaction.paymentMethod ?? "Pix",
    notes: transaction.notes ?? "",
    date: transaction.date,
  };
}

export function EntrySheetProvider({ children }: { children: ReactNode }) {
  const { updateTransaction, deleteTransaction } = useContext(TransactionsContext);
  const [newEntry, setNewEntry] = useState<{ defaultType: TransactionType } | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function handleUpdate(data: TransactionFormData) {
    if (!editing) return;

    await updateTransaction(editing.id, data);
    setEditing(null);
  }

  async function handleDelete() {
    if (!editing) return;

    await deleteTransaction(editing.id);
    setConfirmingDelete(false);
    setEditing(null);
  }

  return (
    <EntrySheetContext.Provider
      value={{
        openNewEntry: (defaultType = "outcome") => setNewEntry({ defaultType }),
        openEditEntry: (transaction) => setEditing(transaction),
      }}
    >
      {children}

      <NewTransactionModal
        isOpen={!!newEntry}
        defaultType={newEntry?.defaultType}
        title={newEntry?.defaultType === "investment" ? "Novo aporte" : "Registrar"}
        onClose={() => setNewEntry(null)}
      />

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Editar lançamento">
        {editing && (
          <TransactionForm
            key={editing.id}
            initialValues={toFormValues(editing)}
            submitLabel="Salvar alterações"
            onSubmit={handleUpdate}
            onDelete={() => setConfirmingDelete(true)}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmingDelete && !!editing}
        title="Confirmar exclusão"
        message={
          editing
            ? `Excluir "${editing.description}"? Essa ação não pode ser desfeita.`
            : "Excluir este lançamento?"
        }
        confirmLabel="Excluir"
        onClose={() => setConfirmingDelete(false)}
        onConfirm={handleDelete}
      />
    </EntrySheetContext.Provider>
  );
}
