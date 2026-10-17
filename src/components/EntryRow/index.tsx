"use client";

import { useContext } from "react";
import { EntrySheetContext } from "@/contexts/EntrySheetContext";
import { Transaction } from "@/types/transaction";
import { getTransactionType } from "@/utils/finance";
import { formatCurrency, formatDayHeading, formatSignedAmount } from "@/utils/formatters";
import { Amount, Main, Meta, Name, RowButton, RowItem } from "./styles";

interface EntryRowProps {
  transaction: Transaction;
  showDate?: boolean;
}

export function EntryRow({ transaction, showDate = false }: EntryRowProps) {
  const { openEditEntry } = useContext(EntrySheetContext);
  const kind = getTransactionType(transaction);
  const meta = showDate
    ? `${transaction.category} · ${formatDayHeading(transaction.date)}`
    : transaction.category;

  return (
    <RowItem>
      <RowButton
        type="button"
        aria-label={`${transaction.description}, ${meta}, ${formatCurrency(transaction.amount)}. Editar`}
        onClick={() => openEditEntry(transaction)}
      >
        <Main>
          <Name>{transaction.description}</Name>
          <Meta>{meta}</Meta>
        </Main>
        <Amount $kind={kind}>{formatSignedAmount(transaction.amount)}</Amount>
      </RowButton>
    </RowItem>
  );
}
