"use client";

import { useState } from "react";
import {
  Chip,
  Chips,
  Field,
  FiltersPanel,
  Input,
  Label,
  MoreButton,
  MoreGrid,
  ResetButton,
  SearchInput,
  Select,
  TopRow,
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

const typeOptions: { value: TransactionTypeFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "outcome", label: "Gastos" },
  { value: "income", label: "Receitas" },
  { value: "investment", label: "Investimentos" },
];

export function TransactionFilters({
  filters,
  categories,
  onChange,
  onReset,
}: TransactionFiltersProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const activeExtra =
    (filters.category !== "all" ? 1 : 0) +
    (filters.startDate ? 1 : 0) +
    (filters.endDate ? 1 : 0) +
    (filters.sort !== "dateDesc" ? 1 : 0);

  function updateFilter<Key extends keyof TransactionFiltersState>(
    key: Key,
    value: TransactionFiltersState[Key],
  ) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <FiltersPanel>
      <Label htmlFor="transaction-filter-search" className="sr-only">
        Buscar
      </Label>
      <SearchInput
        id="transaction-filter-search"
        type="search"
        placeholder="Buscar por descrição"
        value={filters.search}
        onChange={(event) => updateFilter("search", event.target.value)}
      />

      <TopRow>
        <Chips role="group" aria-label="Tipo">
          {typeOptions.map((option) => (
            <Chip
              key={option.value}
              type="button"
              aria-pressed={filters.type === option.value}
              $active={filters.type === option.value}
              onClick={() => updateFilter("type", option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </Chips>

        <MoreButton
          type="button"
          aria-expanded={moreOpen}
          aria-controls="transaction-more-filters"
          onClick={() => setMoreOpen(!moreOpen)}
        >
          Filtros{activeExtra > 0 ? ` (${activeExtra})` : ""}
        </MoreButton>
      </TopRow>

      <MoreGrid id="transaction-more-filters" hidden={!moreOpen}>
        <Field>
          <Label htmlFor="transaction-filter-category">Categoria</Label>
          <Select
            id="transaction-filter-category"
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
          <Label htmlFor="transaction-filter-start-date">De</Label>
          <Input
            id="transaction-filter-start-date"
            type="date"
            value={filters.startDate}
            onChange={(event) => updateFilter("startDate", event.target.value)}
          />
        </Field>

        <Field>
          <Label htmlFor="transaction-filter-end-date">Até</Label>
          <Input
            id="transaction-filter-end-date"
            type="date"
            value={filters.endDate}
            onChange={(event) => updateFilter("endDate", event.target.value)}
          />
        </Field>

        <Field>
          <Label htmlFor="transaction-filter-sort">Ordenar</Label>
          <Select
            id="transaction-filter-sort"
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
      </MoreGrid>
    </FiltersPanel>
  );
}
