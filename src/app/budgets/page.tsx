"use client";

import { useContext, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BudgetCard, BudgetViewModel } from "@/components/BudgetCard";
import { BudgetForm, BudgetFormData } from "@/components/BudgetForm";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/CustomModal";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { TransactionsContext } from "@/contexts/TransactionsContenxt";
import {
  createBudget,
  fetchBudgets,
  patchBudget,
  removeBudget,
} from "@/services/budgets";
import { fetchCategories } from "@/services/categories";
import { Budget } from "@/types/budget";
import { Category } from "@/types/category";
import { getTransactionType } from "@/utils/finance";
import { formatCurrency } from "@/utils/formatters";
import { PageContent, Section, SectionGrid, SectionHeader } from "./styles";

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);

  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthNumber - 1, 1));
}

function getBudgetFormValues(budget: Budget): BudgetFormData {
  return {
    category: budget.category,
    amount: budget.amount,
    month: budget.month,
  };
}

export default function BudgetsPage() {
  const { transactions } = useContext(TransactionsContext);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteBudget, setDeleteBudget] = useState<Budget | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  useEffect(() => {
    async function loadData() {
      try {
        const [budgetData, categoryData] = await Promise.all([
          fetchBudgets(),
          fetchCategories(),
        ]);

        setBudgets(budgetData);
        setCategories(categoryData);
      } catch (error) {
        console.error("Erro ao buscar orçamentos:", error);
      }
    }

    loadData();
  }, []);

  function getBudgetMetrics(budget: Budget): BudgetViewModel {
    const spent = transactions
      .filter((transaction) => {
        const transactionMonth = new Date(transaction.date).toISOString().slice(0, 7);

        return (
          transaction.category === budget.category &&
          transactionMonth === budget.month &&
          getTransactionType(transaction) === "outcome"
        );
      })
      .reduce((acc, transaction) => acc + Math.abs(transaction.amount), 0);
    const progress = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
    const remaining = budget.amount - spent;
    const status = progress >= 100 ? "danger" : progress >= 80 ? "warning" : "safe";

    return {
      id: budget.id,
      category: budget.category,
      amount: formatCurrency(budget.amount),
      spent: formatCurrency(spent),
      remaining: formatCurrency(remaining),
      month: formatMonth(budget.month),
      progress,
      status,
    };
  }

  async function handleCreateBudget(data: BudgetFormData) {
    const budget = await createBudget(data);

    if (budget) {
      setBudgets((currentBudgets) => [budget, ...currentBudgets]);
      setSelectedMonth(budget.month);
      setModalOpen(false);
    }
  }

  async function handleUpdateBudget(data: BudgetFormData) {
    if (!editingBudget) return;

    const budget = await patchBudget(editingBudget.id, data);

    if (budget) {
      setBudgets((currentBudgets) =>
        currentBudgets.map((currentBudget) =>
          currentBudget.id === budget.id ? budget : currentBudget,
        ),
      );
      setSelectedMonth(budget.month);
      setEditingBudget(null);
    }
  }

  async function handleDeleteBudget() {
    if (!deleteBudget) return;

    const removed = await removeBudget(deleteBudget.id);

    if (removed) {
      setBudgets((currentBudgets) =>
        currentBudgets.filter((budget) => budget.id !== deleteBudget.id),
      );
      setDeleteBudget(null);
    }
  }

  const monthlyBudgets = budgets
    .filter((budget) => budget.month === selectedMonth)
    .sort((budgetA, budgetB) => budgetA.category.localeCompare(budgetB.category));
  const budgetCards = monthlyBudgets.map(getBudgetMetrics);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Orçamentos"
        title="Controle seus limites"
        subtitle="Defina tetos mensais por categoria e acompanhe quanto já foi usado."
        actionLabel="+ Novo Orçamento"
        onAction={() => setModalOpen(true)}
      />

      <PageContent>
        <Section>
          <SectionHeader>
            <div>
              <h2>{formatMonth(selectedMonth)}</h2>
              <span>{budgetCards.length} orçamento(s) neste mês</span>
            </div>
            <label htmlFor="budget-month-filter">
              Mês
              <input
                id="budget-month-filter"
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value || getCurrentMonth())}
              />
            </label>
          </SectionHeader>

          {budgetCards.length === 0 ? (
            <EmptyState>Nenhum orçamento cadastrado para este mês.</EmptyState>
          ) : (
            <SectionGrid>
              {budgetCards.map((budget) => {
                const originalBudget = monthlyBudgets.find(
                  (currentBudget) => currentBudget.id === budget.id,
                );

                if (!originalBudget) return null;

                return (
                  <BudgetCard
                    key={budget.id}
                    budget={budget}
                    onEdit={() => setEditingBudget(originalBudget)}
                    onDelete={() => setDeleteBudget(originalBudget)}
                  />
                );
              })}
            </SectionGrid>
          )}
        </Section>
      </PageContent>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Novo orçamento">
        <BudgetForm categories={categories} onSubmit={handleCreateBudget} />
      </Modal>

      <Modal
        isOpen={!!editingBudget}
        onClose={() => setEditingBudget(null)}
        title="Editar orçamento"
      >
        {editingBudget && (
          <BudgetForm
            key={editingBudget.id}
            categories={categories}
            initialValues={getBudgetFormValues(editingBudget)}
            submitLabel="Salvar alterações"
            onSubmit={handleUpdateBudget}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteBudget}
        onClose={() => setDeleteBudget(null)}
        title="Confirmar exclusão"
        message={`Tem certeza que deseja excluir o orçamento de ${deleteBudget?.category ?? ""}?`}
        confirmLabel="Confirmar exclusão"
        onConfirm={handleDeleteBudget}
      />
    </AppShell>
  );
}
