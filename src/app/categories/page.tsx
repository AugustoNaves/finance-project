"use client";

import { useContext, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CategoryCard, CategoryViewModel } from "@/components/CategoryCard";
import { CategoryForm, CategoryFormData } from "@/components/CategoryForm";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/CustomModal";
import { EmptyState } from "@/components/EmptyState";
import { FormError } from "@/components/FormError";
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
import { Category } from "@/types/category";
import { CategoryRule } from "@/types/categoryRule";
import { getTransactionType, isSameMonth } from "@/utils/finance";
import { formatCurrency, formatDate } from "@/utils/formatters";
import {
  CategoryTag,
  DeleteButton,
  ErrorContainer,
  PageContent,
  RuleDate,
  RuleMobileCard,
  RuleMobileCardFooter,
  RuleMobileCardHeader,
  RuleMobileCardMeta,
  RulesMobileList,
  RulesTable,
  RulesTableWrapper,
  RulesToolbar,
  SearchIcon,
  SearchInput,
  SearchWrapper,
  Section,
  SectionGrid,
  SectionHeader,
  TabBadge,
  TabButton,
  TabPanel,
  TabsContainer,
  TypeBadge,
} from "./styles";

function getCategoryFormValues(category: Category): CategoryFormData {
  return {
    name: category.name,
    type: category.type,
    color: category.color ?? undefined,
    icon: category.icon ?? undefined,
  };
}

function formatRuleDate(dateString?: string | null) {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "—";
    return formatDate(d);
  } catch {
    return "—";
  }
}

function formatRuleType(type: string) {
  if (type === "outcome") return "Despesa";
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
  const [activeTab, setActiveTab] = useState<"categories" | "rules">(defaultTab);

  const [categories, setCategories] = useState<Category[]>([]);
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
        setRulesError(getErrorMessage(error, "Erro ao carregar regras de categorização."));
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
  }

  async function handleDeleteRule() {
    if (!deleteRule) return;

    await deleteCategoryRule(deleteRule.id);

    setRules((currentRules) =>
      currentRules.filter((rule) => rule.id !== deleteRule.id),
    );
    setDeleteRule(null);
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

  const filteredRules = rules.filter((rule) =>
    rule.pattern.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <AppShell>
      <PageHeader
        eyebrow="Categorias"
        title={activeTab === "categories" ? "Organize seus grupos" : "Regras de importação"}
        subtitle={
          activeTab === "categories"
            ? "Crie categorias de receitas, despesas e investimentos para acompanhar onde o dinheiro entra, sai e é aplicado."
            : "Gerencie as regras automáticas de categorização aprendidas a partir das faturas importadas."
        }
        actionLabel={activeTab === "categories" ? "+ Nova Categoria" : undefined}
        onAction={activeTab === "categories" ? () => setModalOpen(true) : undefined}
      />

      <PageContent>
        <TabsContainer role="tablist" aria-label="Abas de categorias">
          <TabButton
            type="button"
            role="tab"
            id="tab-categories"
            aria-selected={activeTab === "categories"}
            aria-controls="panel-categories"
            $active={activeTab === "categories"}
            onClick={() => setActiveTab("categories")}
          >
            Categorias
            <TabBadge>{categories.length}</TabBadge>
          </TabButton>
          <TabButton
            type="button"
            role="tab"
            id="tab-rules"
            aria-selected={activeTab === "rules"}
            aria-controls="panel-rules"
            $active={activeTab === "rules"}
            onClick={() => setActiveTab("rules")}
          >
            Regras de Importação
            <TabBadge>{rules.length}</TabBadge>
          </TabButton>
        </TabsContainer>

        {activeTab === "categories" ? (
          <TabPanel id="panel-categories" role="tabpanel" aria-labelledby="tab-categories">
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
          </TabPanel>
        ) : (
          <Section id="panel-rules" role="tabpanel" aria-labelledby="tab-rules">
            <SectionHeader>
              <div>
                <h2>Regras de Importação</h2>
                <span>{rules.length} regra(s) cadastrada(s)</span>
              </div>
            </SectionHeader>

            <RulesToolbar>
              <SearchWrapper>
                <SearchIcon aria-hidden="true">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </SearchIcon>
                <SearchInput
                  id="rule-search"
                  type="search"
                  placeholder="Buscar por estabelecimento..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Buscar regra por estabelecimento"
                />
              </SearchWrapper>
            </RulesToolbar>

            {rulesError && (
              <ErrorContainer>
                <FormError message={rulesError} />
              </ErrorContainer>
            )}

            {rulesLoading ? (
              <EmptyState>Carregando regras...</EmptyState>
            ) : rules.length === 0 ? (
              <EmptyState>
                Nenhuma regra cadastrada. Ao importar faturas e marcar &apos;Lembrar&apos;, as regras aparecerão aqui
              </EmptyState>
            ) : filteredRules.length === 0 ? (
              <EmptyState>Nenhuma regra encontrada para a busca.</EmptyState>
            ) : (
              <>
                <RulesTableWrapper>
                  <RulesTable>
                    <thead>
                      <tr>
                        <th>Estabelecimento</th>
                        <th>Categoria associada</th>
                        <th>Tipo</th>
                        <th>Data de criação</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRules.map((rule) => (
                        <tr key={rule.id}>
                          <td>
                            <strong>{rule.pattern}</strong>
                          </td>
                          <td>
                            <CategoryTag>{rule.category}</CategoryTag>
                          </td>
                          <td>
                            <TypeBadge $type={rule.type}>
                              {formatRuleType(rule.type)}
                            </TypeBadge>
                          </td>
                          <td>
                            <RuleDate>{formatRuleDate(rule.createdAt)}</RuleDate>
                          </td>
                          <td>
                            <DeleteButton
                              type="button"
                              onClick={() => setDeleteRule(rule)}
                              aria-label={`Excluir regra de ${rule.pattern}`}
                            >
                              Excluir
                            </DeleteButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </RulesTable>
                </RulesTableWrapper>

                <RulesMobileList>
                  {filteredRules.map((rule) => (
                    <RuleMobileCard key={rule.id}>
                      <RuleMobileCardHeader>
                        <strong>{rule.pattern}</strong>
                        <TypeBadge $type={rule.type}>
                          {formatRuleType(rule.type)}
                        </TypeBadge>
                      </RuleMobileCardHeader>
                      <RuleMobileCardMeta>
                        <CategoryTag>{rule.category}</CategoryTag>
                      </RuleMobileCardMeta>
                      <RuleMobileCardFooter>
                        <RuleDate>{formatRuleDate(rule.createdAt)}</RuleDate>
                        <DeleteButton
                          type="button"
                          onClick={() => setDeleteRule(rule)}
                          aria-label={`Excluir regra de ${rule.pattern}`}
                        >
                          Excluir
                        </DeleteButton>
                      </RuleMobileCardFooter>
                    </RuleMobileCard>
                  ))}
                </RulesMobileList>
              </>
            )}
          </Section>
        )}
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

      <ConfirmDialog
        isOpen={!!deleteRule}
        onClose={() => setDeleteRule(null)}
        title="Confirmar exclusão"
        message={`Tem certeza que deseja excluir a regra para o estabelecimento "${deleteRule?.pattern ?? ""}"?`}
        confirmLabel="Confirmar exclusão"
        onConfirm={handleDeleteRule}
      />
    </AppShell>
  );
}
