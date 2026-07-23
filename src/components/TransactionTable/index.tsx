"use client";
import { useContext, useState } from "react";
import { TransactionsContext } from "@/contexts/TransactionsContenxt"; // <-- Importação do contexto
import {
  TableWrapper,
  Table,
  Thead,
  Th,
  Tbody,
  Tr,
  Td,
  Amount,
  CategoryTag,
  TrashButton,
  DeleteButton,
} from "./styles";
import { Modal } from "../CustomModal";

export const TransactionTable = () => {
  const { transactions, deleteTransaction } = useContext(TransactionsContext);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function HandleDeleteModal(Id: string) {
    setDeleteId(Id);
  }
  return (
    <>
      <TableWrapper>
        <Table>
          <Thead>
            <tr>
              <Th>Descrição</Th>
              <Th>Valor</Th>
              <Th>Categoria</Th>
              <Th>Data</Th>
              <Th></Th>
            </tr>
          </Thead>
          <Tbody>
            {transactions.map((tx) => (
              <Tr key={tx.id}>
                <Td>{tx.description}</Td>
                <Td>
                  <Amount $positive={tx.amount > 0}>
                    {tx.amount > 0 ? "+" : ""}
                    {tx.amount.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </Amount>
                </Td>
                <Td>
                  <CategoryTag>{tx.category}</CategoryTag>
                </Td>
                <Td>{new Date(tx.date).toLocaleDateString("pt-BR")}</Td>
                <td>
                  <TrashButton
                    onClick={() => HandleDeleteModal(tx.id)}
                    title="Excluir transação"
                    aria-label="Excluir transação"
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4 7H20" />
                      <path d="M10 11V17" />
                      <path d="M14 11V17" />
                      <path d="M6 7L7 20H17L18 7" />
                      <path d="M9 7V4H15V7" />
                    </svg>
                  </TrashButton>
                </td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableWrapper>

      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Confirmar exclusão"
      >
        <p>Tem certeza que deseja excluir esta transação?</p>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <DeleteButton
            onClick={() => {
              if (typeof deleteId === "string") {
                deleteTransaction(deleteId);
                setDeleteId(null);
              }
            }}
          >
            Confirmar
          </DeleteButton>
        </div>
      </Modal>
    </>
  );
};
