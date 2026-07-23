"use client";

import {
  Field,
  FiltersGrid,
  FiltersPanel,
  Input,
  Label,
  ResetButton,
  Select,
} from "./styles";

export type TransactionTypeFilter = "all" | "income" | "outcome" | "investment";
export type TransactionSortOption = "dateDesc" | "dateAsc" | "valueDesc" | "valueAsc";

export interface TransactionFiltersState {
  search: string;
  type: TransactionTypeFilter;
  category: string;
  startDate: string;
  endDate: string;
  sort: TransactionSortOption;
}

interface TransactionFiltersProps {
  filters: TransactionFiltersState;
  categories: string[];
  onChange: (filters: TransactionFiltersState) => void;
  onReset: () => void;
}

export function TransactionFilters({
  filters,
  categories,
  onChange,
  onReset,
}: TransactionFiltersProps) {
  function updateFilter<Key extends keyof TransactionFiltersState>(
    key: Key,
    value: TransactionFiltersState[Key],
  ) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <FiltersPanel>
      <FiltersGrid>
        <Field $wide>
          <Label htmlFor="transaction-search">Buscar</Label>
          <Input
            id="transaction-search"
            type="search"
            placeholder="Buscar por descrição..."
            value={filters.search}
            onChange={(event) => updateFilter("search", event.target.value)}
          />
        </Field>

        <Field>
          <Label htmlFor="transaction-type">Tipo</Label>
          <Select
            id="transaction-type"
            value={filters.type}
            onChange={(event) =>
              updateFilter("type", event.target.value as TransactionTypeFilter)
            }
          >
            <option value="all">Todos</option>
            <option value="income">Receitas</option>
            <option value="outcome">Despesas</option>
            <option value="investment">Investimentos</option>
          </Select>
        </Field>

        <Field>
          <Label htmlFor="transaction-category">Categoria</Label>
          <Select
            id="transaction-category"
            value={filters.category}
            onChange={(event) => updateFilter("category", event.target.value)}
          >
            <option value="all">Todas</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </Field>

        <Field>
          <Label htmlFor="transaction-start-date">De</Label>
          <Input
            id="transaction-start-date"
            type="date"
            value={filters.startDate}
            onChange={(event) => updateFilter("startDate", event.target.value)}
          />
        </Field>

        <Field>
          <Label htmlFor="transaction-end-date">Até</Label>
          <Input
            id="transaction-end-date"
            type="date"
            value={filters.endDate}
            onChange={(event) => updateFilter("endDate", event.target.value)}
          />
        </Field>

        <Field>
          <Label htmlFor="transaction-sort">Ordenar</Label>
          <Select
            id="transaction-sort"
            value={filters.sort}
            onChange={(event) =>
              updateFilter("sort", event.target.value as TransactionSortOption)
            }
          >
            <option value="dateDesc">Mais recentes</option>
            <option value="dateAsc">Mais antigas</option>
            <option value="valueDesc">Maior valor</option>
            <option value="valueAsc">Menor valor</option>
          </Select>
        </Field>

        <ResetButton type="button" onClick={onReset}>
          Limpar filtros
        </ResetButton>
      </FiltersGrid>
    </FiltersPanel>
  );
}
