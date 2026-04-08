"use client";
import { useContext } from "react";
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
} from "./styles";

export const TransactionTable = () => {
  // Puxando os dados dinamicamente do contexto!
  const { transactions } = useContext(TransactionsContext);

  return (
    <TableWrapper>
      <Table>
        <Thead>
          <tr>
            <Th>Descrição</Th>
            <Th>Valor</Th>
            <Th>Categoria</Th>
            <Th>Data</Th>
            <Th>Pagante</Th>
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
              <Td>{tx.date}</Td>
              <Td>
                <PayerBadge $payer={tx.payer}>{tx.payer}</PayerBadge>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableWrapper>
  );
};
