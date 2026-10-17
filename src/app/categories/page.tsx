"use client";

import { KeyboardEvent, useContext, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CategoryForm, CategoryFormData } from "@/components/CategoryForm";
import { CategoryRow, CategoryViewModel } from "@/components/CategoryRow";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/CustomModal";
import { EmptyState } from "@/components/EmptyState";
import { FormError } from "@/components/FormError";
import { LedgerSection } from "@/components/LedgerSection";
import { PageHeader } from "@/components/PageHeader";
import { TransactionsContext } from "@/contexts/TransactionsContenxt";
import {
  createCategory,
  fetchCategories,
  patchCategory,
  removeCategory,
} from "@/services/categories";
import { deleteCategoryRule, getCategoryRules } from "@/services/categoryRules";
import { getErrorMessage } from "@/services/http";
import { Category, CategoryType } from "@/types/category";
import { CategoryRule } from "@/types/categoryRule";
import { getTransactionType, isSameMonth } from "@/utils/finance";
import {
  formatCurrency,
  formatDate,
  formatMonthYear,
} from "@/utils/formatters";
import {
  LedgerList,
  Page,
  PageContent,
  RuleDelete,
  RuleDot,
  RuleItem,
  RuleMain,
  RuleMeta,
  RulePattern,
  SearchField,
  SearchIcon,
  SearchInput,
  TabButton,
  TabCount,
  TabList,
} from "./styles";

type TabId = CategoryType | "rules";

const categoryTabs: { id: CategoryType; label: string; emptyText: string }[] = [
  {
    id: "outcome",
    label: "Gastos",
    emptyText:
      "Nenhuma categoria de gasto ainda. Crie a primeira em Nova categoria.",
  },
  {
    id: "income",
    label: "Receitas",
    emptyText:
      "Nenhuma categoria de receita ainda. Crie a primeira em Nova categoria.",
  },
  {
    id: "investment",
    label: "Investimentos",
    emptyText:
      "Nenhuma categoria de investimento ainda. Crie a primeira em Nova categoria.",
  },
];

const tabOrder: TabId[] = ["outcome", "income", "investment", "rules"];

function getCategoryFormValues(category: Category): CategoryFormData {
  return {
    name: category.name,
    type: category.type,
    color: category.color ?? undefined,
    icon: category.icon ?? undefined,
  };
}

function formatRuleDate(dateString?: string | null) {
  if (!dateString) return null;

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return null;

  return formatDate(date);
}

function formatRuleType(type: string) {
  if (type === "outcome") return "Gasto";
  if (type === "income") return "Receita";
  if (type === "investment") return "Investimento";
  return type;
}

interface CategoriesPageProps {
  defaultTab?: "categories" | "rules";
}

export default function CategoriesPage({
  defaultTab = "categories",
}: CategoriesPageProps = {}) {
  const { transactions } = useContext(TransactionsContext);
  const [activeTab, setActiveTab] = useState<TabId>(
    defaultTab === "rules" ? "rules" : "outcome",
  );
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesError, setCategoriesError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);

  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deleteRule, setDeleteRule] = useState<CategoryRule | null>(null);

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await fetchCategories();
        setCategories(data);
      } catch (error) {
        console.error("Erro ao buscar categorias:", error);
        setCategoriesError(
          "Não foi possível carregar as categorias. Tente de novo em instantes.",
        );
      }
    }

    loadCategories();
  }, []);

  useEffect(() => {
    async function loadRules() {
      try {
        setRulesLoading(true);
        setRulesError(null);
        const data = await getCategoryRules();
        setRules(data);
      } catch (error) {
        setRulesError(
          getErrorMessage(error, "Erro ao carregar regras de categorização."),
        );
      } finally {
        setRulesLoading(false);
      }
    }

    loadRules();
  }, []);

  const now = new Date();

  function getCategoryMetrics(category: Category): CategoryViewModel {
    const monthlyTransactions = transactions.filter((transaction) => {
      return (
        transaction.category === category.name &&
        getTransactionType(transaction) === category.type &&
        isSameMonth(transaction.date, now)
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

    setCategories((currentCategories) => [...currentCategories, category]);
    setActiveTab(category.type);
    setModalOpen(false);
  }

  async function handleUpdateCategory(data: CategoryFormData) {
    if (!editingCategory) return;

    const category = await patchCategory(editingCategory.id, data);

    setCategories((currentCategories) =>
      currentCategories.map((currentCategory) =>
        currentCategory.id === category.id ? category : currentCategory,
      ),
    );
    setEditingCategory(null);
  }

  async function handleDeleteCategory() {
    if (!deleteCategory) return;

    await removeCategory(deleteCategory.id);

    setCategories((currentCategories) =>
      currentCategories.filter((category) => category.id !== deleteCategory.id),
    );
    setDeleteCategory(null);
    setEditingCategory(null);
  }

  async function handleDeleteRule() {
    if (!deleteRule) return;

    await deleteCategoryRule(deleteRule.id);

    setRules((currentRules) =>
      currentRules.filter((rule) => rule.id !== deleteRule.id),
    );
    setDeleteRule(null);
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = tabOrder.indexOf(activeTab);
    let next: TabId | null = null;

    if (event.key === "ArrowRight")
      next = tabOrder[(index + 1) % tabOrder.length];
    if (event.key === "ArrowLeft")
      next = tabOrder[(index - 1 + tabOrder.length) % tabOrder.length];
    if (event.key === "Home") next = tabOrder[0];
    if (event.key === "End") next = tabOrder[tabOrder.length - 1];

    if (!next) return;

    event.preventDefault();
    setActiveTab(next);
    tabRefs.current[next]?.focus();
  }

  const categoriesByType = Object.fromEntries(
    categoryTabs.map((tab) => [
      tab.id,
      categories
        .filter((category) => category.type === tab.id)
        .map(getCategoryMetrics),
    ]),
  ) as Record<CategoryType, CategoryViewModel[]>;

  const normalizedSearch = search.trim().toLowerCase();
  const filteredRules = rules.filter((rule) =>
    rule.pattern.toLowerCase().includes(normalizedSearch),
  );

  function getRuleColor(rule: CategoryRule) {
    return categories.find(
      (category) =>
        category.name === rule.category && category.type === rule.type,
    )?.color;
  }

  const activeCategoryTab = categoryTabs.find((tab) => tab.id === activeTab);
  const tabs = [
    ...categoryTabs.map((tab) => ({
      id: tab.id as TabId,
      label: tab.label,
      count: categoriesByType[tab.id].length,
    })),
    { id: "rules" as TabId, label: "Regras", count: rules.length },
  ];

  return (
    <AppShell>
      <Page>
        <PageHeader
          title="Categorias e regras"
          actionLabel={activeCategoryTab ? "Nova categoria" : undefined}
          onAction={activeCategoryTab ? () => setModalOpen(true) : undefined}
        />

        <PageContent>
          <TabList
            role="tablist"
            aria-label="Categorias e regras"
            onKeyDown={handleTabKeyDown}
          >
            {tabs.map((tab) => (
              <TabButton
                key={tab.id}
                ref={(element) => {
                  tabRefs.current[tab.id] = element;
                }}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label} <TabCount>{tab.count}</TabCount>
              </TabButton>
            ))}
          </TabList>

          {activeCategoryTab ? (
            <div
              id={`panel-${activeCategoryTab.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${activeCategoryTab.id}`}
            >
              <LedgerSection
                title={`${activeCategoryTab.label} em ${formatMonthYear(now)}`}
              >
                <FormError message={categoriesError} />
                {categoriesByType[activeCategoryTab.id].length === 0 ? (
                  <EmptyState>{activeCategoryTab.emptyText}</EmptyState>
                ) : (
                  <LedgerList
                    aria-label={`Categorias de ${activeCategoryTab.label.toLowerCase()}`}
                  >
                    {categoriesByType[activeCategoryTab.id].map((category) => {
                      const original = categories.find(
                        (current) => current.id === category.id,
                      );

                      return (
                        <CategoryRow
                          key={category.id}
                          category={category}
                          onEdit={() => setEditingCategory(original ?? null)}
                        />
                      );
                    })}
                  </LedgerList>
                )}
              </LedgerSection>
            </div>
          ) : (
            <div id="panel-rules" role="tabpanel" aria-labelledby="tab-rules">
              <LedgerSection title="Regras de importação">
                {rules.length > 0 && (
                  <SearchField>
                    <SearchIcon aria-hidden="true">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="11" cy="11" r="7" />
                        <line x1="20" y1="20" x2="16.2" y2="16.2" />
                      </svg>
                    </SearchIcon>
                    <SearchInput
                      id="rule-search"
                      type="search"
                      placeholder="Buscar estabelecimento"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      aria-label="Buscar regra por estabelecimento"
                    />
                  </SearchField>
                )}

                {rulesError && <FormError message={rulesError} />}

                {rulesLoading ? (
                  <EmptyState>Carregando regras…</EmptyState>
                ) : rules.length === 0 ? (
                  rulesError ? null : (
                    <EmptyState>
                      Nenhuma regra ainda. Ao importar uma fatura e marcar
                      “Lembrar”, a regra aparece aqui.
                    </EmptyState>
                  )
                ) : filteredRules.length === 0 ? (
                  <EmptyState>Nenhuma regra para essa busca.</EmptyState>
                ) : (
                  <LedgerList aria-label="Regras de importação">
                    {filteredRules.map((rule) => {
                      const createdAt = formatRuleDate(rule.createdAt);
                      const color = getRuleColor(rule);

                      return (
                        <RuleItem key={rule.id}>
                          <RuleMain>
                            <RulePattern>{rule.pattern}</RulePattern>
                            <RuleMeta>
                              <RuleDot
                                aria-hidden="true"
                                style={
                                  color ? { background: color } : undefined
                                }
                              />
                              <span>{rule.category}</span>
                              {" · "}
                              <span>{formatRuleType(rule.type)}</span>
                              {createdAt && (
                                <>
                                  {" · "}
                                  <span>{createdAt}</span>
                                </>
                              )}
                            </RuleMeta>
                          </RuleMain>
                          <RuleDelete
                            type="button"
                            onClick={() => setDeleteRule(rule)}
                            aria-label={`Excluir regra de ${rule.pattern}`}
                          >
                            Excluir
                          </RuleDelete>
                        </RuleItem>
                      );
                    })}
                  </LedgerList>
                )}
              </LedgerSection>
            </div>
          )}
        </PageContent>
      </Page>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nova categoria"
      >
        <CategoryForm
          key={activeCategoryTab?.id ?? "outcome"}
          defaultType={activeCategoryTab?.id ?? "outcome"}
          onSubmit={handleCreateCategory}
        />
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
            onDelete={() => setDeleteCategory(editingCategory)}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteCategory}
        onClose={() => setDeleteCategory(null)}
        title="Confirmar exclusão"
        message={`Excluir a categoria ${deleteCategory?.name ?? ""}? Os lançamentos já registrados continuam com esse nome.`}
        confirmLabel="Excluir"
        onConfirm={handleDeleteCategory}
      />

      <ConfirmDialog
        isOpen={!!deleteRule}
        onClose={() => setDeleteRule(null)}
        title="Confirmar exclusão"
        message={`Excluir a regra de “${deleteRule?.pattern ?? ""}”? Nas próximas importações a categoria volta a ser escolhida à mão.`}
        confirmLabel="Excluir"
        onConfirm={handleDeleteRule}
      />
    </AppShell>
  );
}
