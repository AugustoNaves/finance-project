"use client";

import { useContext, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BudgetForm, BudgetFormData } from "@/components/BudgetForm";
import {
  BudgetRow,
  BudgetStatus,
  BudgetViewModel,
} from "@/components/BudgetRow";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/CustomModal";
import { EmptyState } from "@/components/EmptyState";
import { FormError } from "@/components/FormError";
import { GoalForm, GoalFormData } from "@/components/GoalForm";
import { GoalRow, GoalViewModel } from "@/components/GoalRow";
import { LedgerSection } from "@/components/LedgerSection";
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
import { getLocalMonthKey, getMonthKey } from "@/utils/dates";
import { getTransactionType } from "@/utils/finance";
import { formatMonthYear, formatPlainAmount } from "@/utils/formatters";
import {
  Column,
  Columns,
  LedgerList,
  MonthBar,
  MonthInput,
  MonthName,
  MonthPicker,
  MonthStep,
  Page,
  TotalRow,
} from "./styles";

function getCurrentMonth() {
  return getLocalMonthKey();
}

function monthKeyToDate(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);

  return new Date(year, monthNumber - 1, 1);
}

function shiftMonth(month: string, delta: number) {
  const date = monthKeyToDate(month);

  return getLocalMonthKey(
    new Date(date.getFullYear(), date.getMonth() + delta, 1),
  );
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
  const [loadError, setLoadError] = useState("");
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editingGoal, setEditingGoal] = useState<{
    goal: Goal;
    title: string;
  } | null>(null);
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
        setLoadError(
          "Não foi possível carregar orçamentos e metas. Tente de novo em instantes.",
        );
      }
    }

    loadData();
  }, []);

  function getBudgetMetrics(budget: Budget): BudgetViewModel {
    const spent = transactions
      .filter((transaction) => {
        const transactionMonth = getMonthKey(transaction.date);

        return (
          transaction.category === budget.category &&
          transactionMonth === budget.month &&
          getTransactionType(transaction) === "outcome"
        );
      })
      .reduce((acc, transaction) => acc + Math.abs(transaction.amount), 0);
    const progress = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
    const status: BudgetStatus =
      spent > budget.amount ? "danger" : progress >= 80 ? "warning" : "safe";
    const category = categories.find(
      (currentCategory) =>
        currentCategory.type === "outcome" &&
        currentCategory.name === budget.category,
    );

    return {
      id: budget.id,
      category: budget.category,
      color: category?.color,
      amount: budget.amount,
      spent,
      progress,
      status,
    };
  }

  async function handleCreateBudget(data: BudgetFormData) {
    const budget = await createBudget(data);

    setBudgets((currentBudgets) => [budget, ...currentBudgets]);
    setSelectedMonth(budget.month);
    setBudgetModalOpen(false);
  }

  async function handleUpdateBudget(data: BudgetFormData) {
    if (!editingBudget) return;

    const budget = await patchBudget(editingBudget.id, data);

    setBudgets((currentBudgets) =>
      currentBudgets.map((currentBudget) =>
        currentBudget.id === budget.id ? budget : currentBudget,
      ),
    );
    setSelectedMonth(budget.month);
    setEditingBudget(null);
  }

  async function handleDeleteBudget() {
    if (!deleteBudget) return;

    await removeBudget(deleteBudget.id);

    setBudgets((currentBudgets) =>
      currentBudgets.filter((budget) => budget.id !== deleteBudget.id),
    );
    setDeleteBudget(null);
    setEditingBudget(null);
  }

  async function handleCreateGoal(data: GoalFormData) {
    const goal = await createGoal(data);

    setGoals((currentGoals) => [goal, ...currentGoals]);
    setGoalModalOpen(false);
  }

  async function handleUpdateGoal(data: GoalFormData) {
    if (!editingGoal) return;

    const goal = await patchGoal(editingGoal.goal.id, data);

    setGoals((currentGoals) =>
      currentGoals.map((currentGoal) =>
        currentGoal.id === goal.id ? goal : currentGoal,
      ),
    );
    setEditingGoal(null);
  }

  async function handleDeleteGoal() {
    if (!deleteGoal) return;

    await removeGoal(deleteGoal.id);

    setGoals((currentGoals) =>
      currentGoals.filter((goal) => goal.id !== deleteGoal.id),
    );
    setDeleteGoal(null);
  }

  function handleMonthChange(value: string) {
    setSelectedMonth(value || getCurrentMonth());
  }

  function openMonthPicker(input: HTMLInputElement) {
    try {
      input.showPicker?.();
    } catch {
      input.focus();
    }
  }

  const monthLabel = formatMonthYear(monthKeyToDate(selectedMonth));
  const monthlyBudgets = budgets
    .filter((budget) => budget.month === selectedMonth)
    .sort((budgetA, budgetB) =>
      budgetA.category.localeCompare(budgetB.category),
    );
  const budgetRows = monthlyBudgets.map(getBudgetMetrics);
  const totalLimit = budgetRows.reduce((acc, budget) => acc + budget.amount, 0);
  const totalSpent = budgetRows.reduce((acc, budget) => acc + budget.spent, 0);
  const goalRows = goals.map(getGoalViewModel);

  return (
    <AppShell>
      <Page>
        <PageHeader title="Planejar" />

        <FormError message={loadError} />

        <Columns>
          <Column>
            <MonthBar>
              <MonthStep
                type="button"
                aria-label="Mês anterior"
                onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
              >
                ‹
              </MonthStep>
              <MonthPicker>
                <MonthName aria-hidden="true">{monthLabel}</MonthName>
                <MonthInput
                  id="planning-month-filter"
                  type="month"
                  aria-label="Mês"
                  value={selectedMonth}
                  onClick={(event) => openMonthPicker(event.currentTarget)}
                  onChange={(event) => handleMonthChange(event.target.value)}
                />
              </MonthPicker>
              <MonthStep
                type="button"
                aria-label="Próximo mês"
                onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
              >
                ›
              </MonthStep>
            </MonthBar>

            <LedgerSection
              title="Orçamentos"
              action={{
                label: "+ Novo orçamento",
                onClick: () => setBudgetModalOpen(true),
              }}
            >
              {budgetRows.length === 0 ? (
                <EmptyState>{`Nenhum orçamento para ${monthLabel}. Defina um limite para a categoria em que você mais gasta.`}</EmptyState>
              ) : (
                <>
                  <LedgerList aria-label={`Orçamentos de ${monthLabel}`}>
                    {budgetRows.map((budget) => {
                      const originalBudget = monthlyBudgets.find(
                        (currentBudget) => currentBudget.id === budget.id,
                      );

                      if (!originalBudget) return null;

                      return (
                        <BudgetRow
                          key={budget.id}
                          budget={budget}
                          onEdit={() => setEditingBudget(originalBudget)}
                        />
                      );
                    })}
                  </LedgerList>
                  {budgetRows.length > 1 && (
                    <TotalRow>
                      <span>Total</span>
                      <strong>
                        {formatPlainAmount(totalSpent)} <small>de</small>{" "}
                        {formatPlainAmount(totalLimit)}
                      </strong>
                    </TotalRow>
                  )}
                </>
              )}
            </LedgerSection>
          </Column>

          <Column>
            <LedgerSection
              title="Metas"
              action={{
                label: "+ Nova meta",
                onClick: () => setGoalModalOpen(true),
              }}
            >
              {goalRows.length === 0 ? (
                <EmptyState>
                  Nenhuma meta ainda. Uma reserva de emergência é um bom começo.
                </EmptyState>
              ) : (
                <LedgerList aria-label="Metas">
                  {goalRows.map((goal) => {
                    const originalGoal = goals.find(
                      (currentGoal) => currentGoal.id === goal.id,
                    );

                    if (!originalGoal) return null;

                    return (
                      <GoalRow
                        key={goal.id}
                        goal={goal}
                        onEdit={() =>
                          setEditingGoal({
                            goal: originalGoal,
                            title: "Editar meta",
                          })
                        }
                        onUpdateProgress={() =>
                          setEditingGoal({
                            goal: originalGoal,
                            title: "Atualizar progresso",
                          })
                        }
                        onDelete={() => setDeleteGoal(originalGoal)}
                      />
                    );
                  })}
                </LedgerList>
              )}
            </LedgerSection>
          </Column>
        </Columns>
      </Page>

      <Modal
        isOpen={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        title="Novo orçamento"
      >
        <BudgetForm
          key={selectedMonth}
          categories={categories}
          defaultMonth={selectedMonth}
          onSubmit={handleCreateBudget}
        />
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
            onDelete={() => setDeleteBudget(editingBudget)}
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
        title={editingGoal?.title ?? "Editar meta"}
      >
        {editingGoal && (
          <GoalForm
            key={editingGoal.goal.id}
            initialValues={getGoalFormValues(editingGoal.goal)}
            submitLabel="Salvar alterações"
            onSubmit={handleUpdateGoal}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteBudget}
        onClose={() => setDeleteBudget(null)}
        title="Confirmar exclusão"
        message={`Excluir o orçamento de ${deleteBudget?.category ?? ""}? Os lançamentos não são afetados.`}
        confirmLabel="Excluir"
        onConfirm={handleDeleteBudget}
      />

      <ConfirmDialog
        isOpen={!!deleteGoal}
        onClose={() => setDeleteGoal(null)}
        title="Confirmar exclusão"
        message={`Excluir a meta ${deleteGoal?.name ?? ""}? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleDeleteGoal}
      />
    </AppShell>
  );
}
