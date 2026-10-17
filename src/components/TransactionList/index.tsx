"use client";

import { EntryRow } from "@/components/EntryRow";
import { Transaction } from "@/types/transaction";
import { getDateKey } from "@/utils/dates";
import { formatDayHeading, formatSignedAmount } from "@/utils/formatters";
import { Count, DayHead, DayTotal, Empty, List, Section } from "./styles";

interface TransactionListProps {
  transactions: Transaction[];
  groupByDay?: boolean;
  emptyText?: string;
}

type DayGroup = { day: string; items: Transaction[]; total: number };

function groupTransactionsByDay(transactions: Transaction[]) {
  return transactions.reduce<DayGroup[]>((groups, transaction) => {
    const day = getDateKey(transaction.date);
    const last = groups[groups.length - 1];

    if (last && last.day === day) {
      return [
        ...groups.slice(0, -1),
        { ...last, items: [...last.items, transaction], total: last.total + transaction.amount },
      ];
    }

    return [...groups, { day, items: [transaction], total: transaction.amount }];
  }, []);
}

export function TransactionList({
  transactions,
  groupByDay = true,
  emptyText = "Nenhum lançamento encontrado com esses filtros.",
}: TransactionListProps) {
  return (
    <Section aria-labelledby="transaction-list-title">
      <h2 id="transaction-list-title" className="sr-only">
        Lançamentos
      </h2>
      <Count>
        {transactions.length === 1 ? "1 lançamento" : `${transactions.length} lançamentos`}
      </Count>

      {transactions.length === 0 ? (
        <Empty>{emptyText}</Empty>
      ) : groupByDay ? (
        <List>
          {groupTransactionsByDay(transactions).map((group) => (
            <li key={group.day}>
              <List aria-label={formatDayHeading(group.day)}>
                <DayHead aria-hidden="true">
                  <span>{formatDayHeading(group.day)}</span>
                  <DayTotal>{formatSignedAmount(group.total)}</DayTotal>
                </DayHead>
                {group.items.map((transaction) => (
                  <EntryRow key={transaction.id} transaction={transaction} />
                ))}
              </List>
            </li>
          ))}
        </List>
      ) : (
        <List>
          {transactions.map((transaction) => (
            <EntryRow key={transaction.id} transaction={transaction} showDate />
          ))}
        </List>
      )}
    </Section>
  );
}
