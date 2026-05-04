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
  PayerBadge,
  CategoryTag,
  TrashButton,
  DeleteButton,
} from "./styles";
import { Modal } from "../CustomModal";

export const TransactionTable = () => {
  const { transactions, deleteTransaction } = useContext(TransactionsContext);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function HandleDeleteModal(Id: string) {
    setDeleteId((prev) => (prev = Id));
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
              <Th>Pagante</Th>
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
                <Td>
                  <PayerBadge $payer={tx.payer}>{tx.payer}</PayerBadge>
                </Td>
                <td>
                  <TrashButton
                    onClick={() => HandleDeleteModal(tx.id)}
                    title="Excluir transação"
                  >
                    <img src={"/trash.svg"} />
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
