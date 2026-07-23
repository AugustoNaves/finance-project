"use client";

import { useContext, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CategoryCard, CategoryViewModel } from "@/components/CategoryCard";
import { CategoryForm, CategoryFormData } from "@/components/CategoryForm";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/CustomModal";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { TransactionsContext } from "@/contexts/TransactionsContenxt";
import {
  createCategory,
  fetchCategories,
  patchCategory,
  removeCategory,
} from "@/services/categories";
import { Category } from "@/types/category";
import { isSameMonth } from "@/utils/finance";
import { formatCurrency } from "@/utils/formatters";
import {
  PageContent,
  Section,
  SectionGrid,
  SectionHeader,
} from "./styles";

function getCategoryFormValues(category: Category): CategoryFormData {
  return {
    name: category.name,
    type: category.type,
    color: category.color ?? undefined,
    icon: category.icon ?? undefined,
  };
}

export default function CategoriesPage() {
  const { transactions } = useContext(TransactionsContext);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await fetchCategories();
        setCategories(data);
      } catch (error) {
        console.error("Erro ao buscar categorias:", error);
      }
    }

    loadCategories();
  }, []);

  const now = new Date();

  function getCategoryMetrics(category: Category): CategoryViewModel {
    const monthlyTransactions = transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.date);
      return (
        transaction.category === category.name &&
        isSameMonth(transactionDate, now)
      );
    });

    const total = monthlyTransactions.reduce(
      (acc, transaction) => acc + Math.abs(transaction.amount),
      0,
    );

    return {
      ...category,
      transactionCount: monthlyTransactions.length,
      monthlyTotal: formatCurrency(total),
    };
  }

  async function handleCreateCategory(data: CategoryFormData) {
    const category = await createCategory(data);

    if (category) {
      setCategories((currentCategories) => [...currentCategories, category]);
      setModalOpen(false);
    }
  }

  async function handleUpdateCategory(data: CategoryFormData) {
    if (!editingCategory) return;

    const category = await patchCategory(editingCategory.id, data);

    if (category) {
      setCategories((currentCategories) =>
        currentCategories.map((currentCategory) =>
          currentCategory.id === category.id ? category : currentCategory,
        ),
      );
      setEditingCategory(null);
    }
  }

  async function handleDeleteCategory() {
    if (!deleteCategory) return;

    const removed = await removeCategory(deleteCategory.id);

    if (removed) {
      setCategories((currentCategories) =>
        currentCategories.filter((category) => category.id !== deleteCategory.id),
      );
      setDeleteCategory(null);
    }
  }

  const incomeCategories = categories
    .filter((category) => category.type === "income")
    .map(getCategoryMetrics);
  const outcomeCategories = categories
    .filter((category) => category.type === "outcome")
    .map(getCategoryMetrics);
  const investmentCategories = categories
    .filter((category) => category.type === "investment")
    .map(getCategoryMetrics);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Categorias"
        title="Organize seus grupos"
        subtitle="Crie categorias de receitas, despesas e investimentos para acompanhar onde o dinheiro entra, sai e é aplicado."
        actionLabel="+ Nova Categoria"
        onAction={() => setModalOpen(true)}
      />

      <PageContent>
        <Section>
          <SectionHeader>
            <h2>Despesas</h2>
            <span>{outcomeCategories.length} categoria(s)</span>
          </SectionHeader>
          {outcomeCategories.length === 0 ? (
            <EmptyState>Nenhuma categoria de despesa cadastrada.</EmptyState>
          ) : (
            <SectionGrid>
              {outcomeCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  onEdit={() => setEditingCategory(category)}
                  onDelete={() => setDeleteCategory(category)}
                />
              ))}
            </SectionGrid>
          )}
        </Section>

        <Section>
          <SectionHeader>
            <h2>Receitas</h2>
            <span>{incomeCategories.length} categoria(s)</span>
          </SectionHeader>
          {incomeCategories.length === 0 ? (
            <EmptyState>Nenhuma categoria de receita cadastrada.</EmptyState>
          ) : (
            <SectionGrid>
              {incomeCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  onEdit={() => setEditingCategory(category)}
                  onDelete={() => setDeleteCategory(category)}
                />
              ))}
            </SectionGrid>
          )}
        </Section>

        <Section>
          <SectionHeader>
            <h2>Investimentos</h2>
            <span>{investmentCategories.length} categoria(s)</span>
          </SectionHeader>
          {investmentCategories.length === 0 ? (
            <EmptyState>Nenhuma categoria de investimento cadastrada.</EmptyState>
          ) : (
            <SectionGrid>
              {investmentCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  onEdit={() => setEditingCategory(category)}
                  onDelete={() => setDeleteCategory(category)}
                />
              ))}
            </SectionGrid>
          )}
        </Section>
      </PageContent>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nova categoria">
        <CategoryForm onSubmit={handleCreateCategory} />
      </Modal>

      <Modal
        isOpen={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        title="Editar categoria"
      >
        {editingCategory && (
          <CategoryForm
            key={editingCategory.id}
            initialValues={getCategoryFormValues(editingCategory)}
            submitLabel="Salvar alterações"
            onSubmit={handleUpdateCategory}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteCategory}
        onClose={() => setDeleteCategory(null)}
        title="Confirmar exclusão"
        message={`Tem certeza que deseja excluir a categoria ${deleteCategory?.name ?? ""}?`}
        confirmLabel="Confirmar exclusão"
        onConfirm={handleDeleteCategory}
      />
    </AppShell>
  );
}
