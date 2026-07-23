"use client";

import { useContext, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BudgetCard, BudgetViewModel } from "@/components/BudgetCard";
import { BudgetForm, BudgetFormData } from "@/components/BudgetForm";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/CustomModal";
import { EmptyState } from "@/components/EmptyState";
import { GoalCard, GoalViewModel } from "@/components/GoalCard";
import { GoalForm, GoalFormData } from "@/components/GoalForm";
import { PageHeader } from "@/components/PageHeader";
import { TransactionsContext } from "@/contexts/TransactionsContenxt";
import {
  createBudget,
  fetchBudgets,
  patchBudget,
  removeBudget,
} from "@/services/budgets";
import { fetchCategories } from "@/services/categories";
import {
  createGoal,
  fetchGoals,
  patchGoal,
  removeGoal,
} from "@/services/goals";
import { Budget } from "@/types/budget";
import { Category } from "@/types/category";
import { Goal } from "@/types/goal";
import { getTransactionType } from "@/utils/finance";
import { formatCurrency } from "@/utils/formatters";
import {
  PageContent,
  Section,
  SectionGrid,
  SectionHeader,
} from "./styles";

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

function getGoalFormValues(goal: Goal): GoalFormData {
  return {
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    deadline: goal.deadline,
    color: goal.color,
  };
}

function getGoalViewModel(goal: Goal): GoalViewModel {
  const progress =
    goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;

  return { ...goal, progress };
}

export default function PlanningPage() {
  const { transactions } = useContext(TransactionsContext);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deleteBudget, setDeleteBudget] = useState<Budget | null>(null);
  const [deleteGoal, setDeleteGoal] = useState<Goal | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  useEffect(() => {
    async function loadData() {
      try {
        const [budgetData, categoryData, goalData] = await Promise.all([
          fetchBudgets(),
          fetchCategories(),
          fetchGoals(),
        ]);

        setBudgets(budgetData);
        setCategories(categoryData);
        setGoals(goalData);
      } catch (error) {
        console.error("Erro ao buscar dados de planejamento:", error);
      }
    }

    loadData();
  }, []);

  function getBudgetMetrics(budget: Budget): BudgetViewModel {
    const spent = transactions
      .filter((transaction) => {
        const transactionMonth = new Date(transaction.date)
          .toISOString()
          .slice(0, 7);

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
      setBudgetModalOpen(false);
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

  async function handleCreateGoal(data: GoalFormData) {
    const goal = await createGoal(data);

    if (goal) {
      setGoals((currentGoals) => [goal, ...currentGoals]);
      setGoalModalOpen(false);
    }
  }

  async function handleUpdateGoal(data: GoalFormData) {
    if (!editingGoal) return;

    const goal = await patchGoal(editingGoal.id, data);

    if (goal) {
      setGoals((currentGoals) =>
        currentGoals.map((currentGoal) =>
          currentGoal.id === goal.id ? goal : currentGoal,
        ),
      );
      setEditingGoal(null);
    }
  }

  async function handleDeleteGoal() {
    if (!deleteGoal) return;

    const removed = await removeGoal(deleteGoal.id);

    if (removed) {
      setGoals((currentGoals) =>
        currentGoals.filter((goal) => goal.id !== deleteGoal.id),
      );
      setDeleteGoal(null);
    }
  }

  const monthlyBudgets = budgets
    .filter((budget) => budget.month === selectedMonth)
    .sort((budgetA, budgetB) => budgetA.category.localeCompare(budgetB.category));
  const budgetCards = monthlyBudgets.map(getBudgetMetrics);
  const goalCards = goals.map(getGoalViewModel);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Planejamento"
        title="Orçamentos e metas"
        subtitle="Defina limites mensais de gasto e acompanhe o progresso das suas metas financeiras."
      />

      <PageContent>
        <Section>
          <SectionHeader>
            <div>
              <h2>Orçamentos — {formatMonth(selectedMonth)}</h2>
              <span>{budgetCards.length} orçamento(s) neste mês</span>
            </div>
            <div>
              <label htmlFor="planning-month-filter">
                Mês
                <input
                  id="planning-month-filter"
                  type="month"
                  value={selectedMonth}
                  onChange={(event) =>
                    setSelectedMonth(event.target.value || getCurrentMonth())
                  }
                />
              </label>
              <button
                type="button"
                onClick={() => setBudgetModalOpen(true)}
              >
                + Novo orçamento
              </button>
            </div>
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

        <Section>
          <SectionHeader>
            <div>
              <h2>Metas financeiras</h2>
              <span>{goalCards.length} meta(s) em andamento</span>
            </div>
            <button type="button" onClick={() => setGoalModalOpen(true)}>
              + Nova meta
            </button>
          </SectionHeader>

          {goalCards.length === 0 ? (
            <EmptyState>Nenhuma meta cadastrada ainda.</EmptyState>
          ) : (
            <SectionGrid>
              {goalCards.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={() => setEditingGoal(goals.find((g) => g.id === goal.id) ?? null)}
                  onDelete={() => setDeleteGoal(goals.find((g) => g.id === goal.id) ?? null)}
                />
              ))}
            </SectionGrid>
          )}
        </Section>
      </PageContent>

      <Modal
        isOpen={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        title="Novo orçamento"
      >
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

      <Modal
        isOpen={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        title="Nova meta"
      >
        <GoalForm onSubmit={handleCreateGoal} />
      </Modal>

      <Modal
        isOpen={!!editingGoal}
        onClose={() => setEditingGoal(null)}
        title="Atualizar meta"
      >
        {editingGoal && (
          <GoalForm
            key={editingGoal.id}
            initialValues={getGoalFormValues(editingGoal)}
            submitLabel="Salvar alterações"
            onSubmit={handleUpdateGoal}
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

      <ConfirmDialog
        isOpen={!!deleteGoal}
        onClose={() => setDeleteGoal(null)}
        title="Confirmar exclusão"
        message={`Tem certeza que deseja excluir a meta ${deleteGoal?.name ?? ""}?`}
        confirmLabel="Confirmar exclusão"
        onConfirm={handleDeleteGoal}
      />
    </AppShell>
  );
}
