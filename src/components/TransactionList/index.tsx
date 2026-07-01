"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/CustomModal";
import { TransactionForm, TransactionFormData } from "@/components/TransactionForm";
import { Transaction } from "@/types/transaction";
import { formatCurrency, formatDate } from "@/utils/formatters";
import {
  ActionButton,
  Actions,
  Amount,
  Card,
  CardActions,
  CardAmount,
  CardHeader,
  CardMeta,
  EmptyState,
  ListHeader,
  MobileList,
  PayerBadge,
  Section,
  Table,
  TableWrapper,
  Tag,
  Title,
} from "./styles";

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, data: TransactionFormData) => Promise<void>;
}

function getTransactionFormValues(transaction: Transaction): TransactionFormData {
  return {
    description: transaction.description,
    amount: transaction.amount,
    category: transaction.category,
    payer: transaction.payer,
    type: transaction.type ?? (transaction.amount > 0 ? "income" : "outcome"),
    paymentMethod: transaction.paymentMethod ?? "Pix",
    notes: transaction.notes ?? "",
  };
}

export function TransactionList({
  transactions,
  onDelete,
  onUpdate,
}: TransactionListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  async function handleDelete() {
    if (!deleteId) return;

    await onDelete(deleteId);
    setDeleteId(null);
  }

  async function handleUpdate(data: TransactionFormData) {
    if (!editingTransaction) return;

    await onUpdate(editingTransaction.id, data);
    setEditingTransaction(null);
  }

  return (
    <Section>
      <ListHeader>
        <div>
          <Title>Transações</Title>
          <span>{transactions.length} registro(s) encontrado(s)</span>
        </div>
      </ListHeader>

      {transactions.length === 0 ? (
        <EmptyState>Nenhuma transação encontrada com os filtros atuais.</EmptyState>
      ) : (
        <>
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Categoria</th>
                  <th>Data</th>
                  <th>Pagante</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.description}</td>
                    <td>
                      <Amount $positive={transaction.amount > 0}>
                        {transaction.amount > 0 ? "+" : ""}
                        {formatCurrency(transaction.amount)}
                      </Amount>
                    </td>
                    <td>
                      <Tag>{transaction.category}</Tag>
                    </td>
                    <td>{formatDate(transaction.date)}</td>
                    <td>
                      <PayerBadge $payer={transaction.payer}>{transaction.payer}</PayerBadge>
                    </td>
                    <td>
                      <Actions>
                        <ActionButton
                          type="button"
                          onClick={() => setEditingTransaction(transaction)}
                        >
                          Editar
                        </ActionButton>
                        <ActionButton
                          type="button"
                          $danger
                          onClick={() => setDeleteId(transaction.id)}
                        >
                          Excluir
                        </ActionButton>
                      </Actions>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>

          <MobileList>
            {transactions.map((transaction) => (
              <Card key={transaction.id}>
                <CardHeader>
                  <div>
                    <strong>{transaction.description}</strong>
                    <CardMeta>
                      {transaction.category} • {formatDate(transaction.date)} • {transaction.payer}
                    </CardMeta>
                  </div>
                  <CardAmount $positive={transaction.amount > 0}>
                    {transaction.amount > 0 ? "+" : ""}
                    {formatCurrency(transaction.amount)}
                  </CardAmount>
                </CardHeader>
                <CardActions>
                  <ActionButton
                    type="button"
                    onClick={() => setEditingTransaction(transaction)}
                  >
                    Editar
                  </ActionButton>
                  <ActionButton
                    type="button"
                    $danger
                    onClick={() => setDeleteId(transaction.id)}
                  >
                    Excluir
                  </ActionButton>
                </CardActions>
              </Card>
            ))}
          </MobileList>
        </>
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Confirmar exclusão"
        message="Tem certeza que deseja excluir esta transação?"
        confirmLabel="Confirmar exclusão"
        onConfirm={handleDelete}
      />

      <Modal
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        title="Editar transação"
      >
        {editingTransaction && (
          <TransactionForm
            key={editingTransaction.id}
            initialValues={getTransactionFormValues(editingTransaction)}
            submitLabel="Salvar alterações"
            onSubmit={handleUpdate}
          />
        )}
      </Modal>
    </Section>
  );
}
