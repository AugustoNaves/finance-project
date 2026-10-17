import type { Budget } from "@/types/budget";
import type { Category } from "@/types/category";
import type { CategoryRule } from "@/types/categoryRule";
import type { Goal } from "@/types/goal";
import type { Transaction } from "@/types/transaction";

/** "Agora" usado nos testes: 15/10/2026 ao meio-dia em São Paulo (15h UTC). */
export const NOW = "2026-10-15T15:00:00.000Z";

function tx(
  id: string,
  description: string,
  amount: number,
  category: string,
  day: string,
  type: Transaction["type"],
  extra: Partial<Transaction> = {},
): Transaction {
  return {
    id,
    description,
    amount,
    category,
    // 15h UTC = meio-dia em São Paulo: longe das viradas de dia/mês em qualquer fuso.
    date: `${day}T15:00:00.000Z`,
    type,
    paymentMethod: "Pix",
    notes: null,
    ...extra,
  };
}

/**
 * Totais esperados:
 * - geral: receitas 7.300 | despesas -3.200 | investimentos 1.500 | saldo 2.600
 * - out/2026: receitas 5.000 | despesas -2.300 | investimentos -1.000 | saldo 1.700 (34%)
 * - set/2026: receitas 2.000 | despesas -800 | investimentos -500 | saldo 700 (35%)
 * - ago/2026: receitas 300 | despesas -100 | saldo 200
 */
export const transactions: Transaction[] = [
  tx("t1", "Salário", 5000, "Salário", "2026-10-05", "income"),
  tx("t2", "Aluguel", -1500, "Moradia", "2026-10-06", "outcome", {
    paymentMethod: "Boleto",
    notes: "Vence dia 6",
  }),
  tx("t3", "Mercado", -600, "Alimentação", "2026-10-08", "outcome"),
  tx("t4", "Restaurante", -200, "Alimentação", "2026-10-10", "outcome"),
  tx("t5", "Tesouro Direto", -1000, "Renda fixa", "2026-10-12", "investment"),
  tx("t6", "Freelance", 2000, "Freelance", "2026-09-10", "income"),
  tx("t7", "Viagem", -800, "Lazer", "2026-09-20", "outcome"),
  tx("t8", "Compra de ações", -500, "Ações", "2026-09-15", "investment"),
  // Registros legados sem `type`: o tipo é inferido pelo sinal do valor.
  tx("t9", "Uber", -100, "Transporte", "2026-08-10", null),
  tx("t10", "Reembolso", 300, "Outros", "2026-08-12", null),
];

export const categories: Category[] = [
  { id: "c1", name: "Alimentação", type: "outcome", color: "#f75a68", icon: "food" },
  { id: "c2", name: "Moradia", type: "outcome", color: "#0ea5e9", icon: null },
  { id: "c3", name: "Salário", type: "income", color: "#00c48c", icon: null },
  { id: "c4", name: "Renda fixa", type: "investment", color: "#8b5cf6", icon: null },
];

export const budgets: Budget[] = [
  { id: "b1", category: "Alimentação", amount: 1000, month: "2026-10" }, // gasto 800 => 80%
  { id: "b2", category: "Moradia", amount: 1200, month: "2026-10" }, // gasto 1500 => 125%
  { id: "b3", category: "Lazer", amount: 2000, month: "2026-09" }, // gasto 800 => 40%
  { id: "b4", category: "Transporte", amount: 500, month: "2026-10" }, // gasto 0 => 0%
];

export const goals: Goal[] = [
  {
    id: "g1",
    name: "Reserva de emergência",
    targetAmount: 10000,
    currentAmount: 2500,
    deadline: "2026-12-31T15:00:00.000Z",
    color: "#00c48c",
  },
  {
    id: "g2",
    name: "Notebook novo",
    targetAmount: 4000,
    currentAmount: 5000,
    deadline: null,
    color: null,
  },
];

export const categoryRules: CategoryRule[] = [
  {
    id: "cr1",
    pattern: "NETFLIX",
    category: "Lazer",
    type: "outcome",
    createdAt: "2026-10-10T12:00:00.000Z",
  },
  {
    id: "cr2",
    pattern: "UBER",
    category: "Transporte",
    type: "outcome",
    createdAt: "2026-10-11T12:00:00.000Z",
  },
  {
    id: "cr3",
    pattern: "EMPRESA XYZ",
    category: "Salário",
    type: "income",
    createdAt: "2026-10-12T12:00:00.000Z",
  },
];

