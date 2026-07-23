"use client";

import { Transaction } from "@/types/transaction";
import { getTransactionType } from "@/utils/finance";
import { formatCurrency, formatDate } from "@/utils/formatters";
import {
  Amount,
  CardAmount,
  CardHeader,
  CardMeta,
  EmptyState,
  Header,
  MobileCard,
  MobileList,
  Section,
  Table,
  TableWrapper,
  Tag,
  Title,
} from "./styles";

interface LatestTransactionsProps {
  transactions: Transaction[];
}

export function LatestTransactions({ transactions }: LatestTransactionsProps) {
  const latest = transactions.slice(0, 5);

  return (
    <Section>
      <Header>
        <div>
          <Title>Últimas transações</Title>
          <span>Movimentações mais recentes registradas no app.</span>
        </div>
      </Header>

      {latest.length === 0 ? (
        <EmptyState>Nenhuma transação registrada ainda.</EmptyState>
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
                </tr>
              </thead>
              <tbody>
                {latest.map((transaction) => {
                  const transactionType = getTransactionType(transaction);

                  return (
                    <tr key={transaction.id}>
                      <td>{transaction.description}</td>
                      <td>
                        <Amount $variant={transactionType}>
                          {transactionType === "investment"
                            ? formatCurrency(Math.abs(transaction.amount))
                            : `${transaction.amount > 0 ? "+" : ""}${formatCurrency(transaction.amount)}`}
                        </Amount>
                      </td>
                      <td>
                        <Tag>{transaction.category}</Tag>
                      </td>
                      <td>{formatDate(transaction.date)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </TableWrapper>

          <MobileList>
            {latest.map((transaction) => {
              const transactionType = getTransactionType(transaction);

              return (
                <MobileCard key={transaction.id}>
                  <CardHeader>
                    <div>
                      <strong>{transaction.description}</strong>
                      <CardMeta>
                        {transaction.category} • {formatDate(transaction.date)}
                      </CardMeta>
                    </div>
                    <CardAmount $variant={transactionType}>
                      {transactionType === "investment"
                        ? formatCurrency(Math.abs(transaction.amount))
                        : `${transaction.amount > 0 ? "+" : ""}${formatCurrency(transaction.amount)}`}
                    </CardAmount>
                  </CardHeader>
                </MobileCard>
              );
            })}
          </MobileList>
        </>
      )}
    </Section>
  );
}
