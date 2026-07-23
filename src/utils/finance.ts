import { Transaction } from "@/types/transaction";

export function isSameMonth(date: string | Date, referenceDate: Date) {
  const targetDate = new Date(date);

  return (
    targetDate.getMonth() === referenceDate.getMonth() &&
    targetDate.getFullYear() === referenceDate.getFullYear()
  );
}

export function getMonthlyTransactions(
  transactions: Transaction[],
  referenceDate = new Date(),
) {
  return transactions.filter((transaction) => isSameMonth(transaction.date, referenceDate));
}

export function getTransactionType(transaction: Transaction) {
  return transaction.type ?? (transaction.amount > 0 ? "income" : "outcome");
}

export function calculateSummary(transactions: Transaction[]) {
  return transactions.reduce(
    (acc, transaction) => {
      const type = getTransactionType(transaction);

      if (type === "investment") {
        acc.investment += transaction.amount;
      } else if (transaction.amount > 0) {
        acc.income += transaction.amount;
      } else {
        acc.outcome += transaction.amount;
      }

      acc.total += transaction.amount;
      return acc;
    },
    { income: 0, outcome: 0, investment: 0, total: 0 },
  );
}

export function calculateInvestments(transactions: Transaction[]) {
  return transactions
    .filter((transaction) => getTransactionType(transaction) === "investment")
    .reduce((acc, transaction) => acc + Math.abs(transaction.amount), 0);
}

export function calculateSavingsRate(income: number, balance: number) {
  if (income <= 0) return "Sem receitas";

  return `${Math.round((balance / income) * 100)}% economizado`;
}
