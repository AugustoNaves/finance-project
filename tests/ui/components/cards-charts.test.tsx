import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BalanceLineChart } from "@/components/BalanceLineChart";
import { BudgetRow, type BudgetViewModel } from "@/components/BudgetRow";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { CategoryRow, type CategoryViewModel } from "@/components/CategoryRow";
import { EmptyState } from "@/components/EmptyState";
import { GoalRow, type GoalViewModel } from "@/components/GoalRow";
import { IncomeOutcomeBarChart } from "@/components/IncomeOutcomeBarChart";
import { MonthSummary } from "@/components/MonthSummary";
import { PageHeader } from "@/components/PageHeader";
import { ProgressBar } from "@/components/ProgressBar";
import { renderUi } from "../helpers/render";

const budget: BudgetViewModel = {
  id: "b1",
  category: "Alimentação",
  color: "#3f8a6e",
  amount: 1000,
  spent: 800,
  progress: 79.6,
  status: "safe",
};

describe("BudgetRow", () => {
  it("mostra categoria, gasto de limite, percentual arredondado e a barra rotulada", () => {
    render(<BudgetRow budget={budget} onEdit={vi.fn()} />);

    const row = screen.getByRole("listitem");
    expect(row).toHaveTextContent("Alimentação");
    expect(row).toHaveTextContent("800,00 de 1.000,00");
    expect(row).toHaveTextContent("80%");
    expect(screen.getByRole("progressbar", { name: "Alimentação: 80%" })).toBeInTheDocument();
  });

  it.each([
    ["safe", 800, /^Dentro do previsto · restam R\$\s200,00$/],
    ["warning", 950, /^Perto do limite · restam R\$\s50,00$/],
    ["danger", 1250, /^Estourou R\$\s250,00$/],
  ] as const)("status %s descreve a situação do orçamento", (status, spent, text) => {
    render(<BudgetRow budget={{ ...budget, status, spent, progress: spent / 10 }} onEdit={vi.fn()} />);

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("aciona onEdit pelo nome da categoria", async () => {
    const onEdit = vi.fn();
    const { user } = renderUi(<BudgetRow budget={budget} onEdit={onEdit} />);

    await user.click(screen.getByRole("button", { name: "Editar orçamento de Alimentação" }));

    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});

describe("GoalRow", () => {
  const goal: GoalViewModel = {
    id: "g1",
    name: "Reserva",
    targetAmount: 10000,
    currentAmount: 2500,
    deadline: "2026-12-31T00:00:00.000Z",
    color: "#3f8a6e",
    progress: 25,
  };

  function renderGoal(overrides: Partial<GoalViewModel> = {}) {
    const handlers = { onEdit: vi.fn(), onUpdateProgress: vi.fn(), onDelete: vi.fn() };
    const utils = renderUi(<GoalRow goal={{ ...goal, ...overrides }} {...handlers} />);

    return { ...handlers, ...utils };
  }

  it("mostra nome, atual de alvo, percentual e quanto falta", () => {
    renderGoal();

    const row = screen.getByRole("listitem");
    expect(row).toHaveTextContent("Reserva");
    expect(row).toHaveTextContent("2.500,00 de 10.000,00");
    expect(row).toHaveTextContent(/25% · faltam R\$\s7\.500,00/);
  });

  it("[regressão de fuso] prazo salvo como 2026-12-31T00:00Z aparece como 31/12/2026", () => {
    renderGoal();

    expect(screen.getByRole("listitem")).toHaveTextContent("prazo 31/12/2026");
  });

  it("não mostra prazo quando a meta não tem deadline", () => {
    renderGoal({ deadline: null });

    expect(screen.getByRole("listitem")).not.toHaveTextContent("prazo");
  });

  it("meta superada mostra 'meta alcançada' e percentual acima de 100%, com a barra limitada a 100%", () => {
    renderGoal({ currentAmount: 12500, progress: 125 });

    expect(screen.getByRole("listitem")).toHaveTextContent("125% · meta alcançada");
    expect(screen.getByRole("progressbar", { name: "Reserva: 100%" })).toBeInTheDocument();
  });

  it("aciona editar, atualizar progresso e excluir", async () => {
    const { onEdit, onUpdateProgress, onDelete, user } = renderGoal();

    await user.click(screen.getByRole("button", { name: "Editar meta Reserva" }));
    await user.click(screen.getByRole("button", { name: "Atualizar progresso de Reserva" }));
    await user.click(screen.getByRole("button", { name: "Excluir meta Reserva" }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onUpdateProgress).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

describe("CategoryRow", () => {
  const category: CategoryViewModel = {
    id: "c1",
    name: "Alimentação",
    type: "outcome",
    color: "#3f8a6e",
    icon: "food",
    transactionCount: 2,
    monthlyTotal: "R$ 800,00",
  };

  it("é uma linha que mostra nome, total do mês e quantidade de lançamentos", () => {
    render(<CategoryRow category={category} onEdit={vi.fn()} />);

    const row = screen.getByRole("button", { name: /^Alimentação, 2 lançamentos, R\$\s800,00 no mês\. Editar$/ });
    expect(row).toHaveTextContent("Alimentação");
    expect(row).toHaveTextContent("R$ 800,00");
    expect(row).toHaveTextContent("2 lançamentos");
  });

  it.each([
    [0, "Nenhum lançamento"],
    [1, "1 lançamento"],
  ])("com %s lançamento(s) mostra '%s'", (transactionCount, text) => {
    render(<CategoryRow category={{ ...category, transactionCount }} onEdit={vi.fn()} />);

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("tocar na linha aciona onEdit", async () => {
    const onEdit = vi.fn();
    const { user } = renderUi(<CategoryRow category={category} onEdit={onEdit} />);

    await user.click(screen.getByRole("button"));

    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});

describe("ProgressBar", () => {
  it.each([
    [42.4, "Progresso de 42%"],
    [150, "Progresso de 100%"],
    [-20, "Progresso de 0%"],
  ])("valor %s é exposto como '%s' (limitado entre 0 e 100)", (value, label) => {
    render(<ProgressBar value={value} />);

    expect(screen.getByLabelText(label)).toBeInTheDocument();
  });

  it("usa o rótulo informado no nome acessível", () => {
    render(<ProgressBar value={80} label="Moradia" />);

    expect(screen.getByRole("progressbar", { name: "Moradia: 80%" })).toBeInTheDocument();
  });

  it("[a11y] tem role=progressbar com aria-valuenow", () => {
    render(<ProgressBar value={42} />);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "42");

  });
});

describe("MonthSummary e EmptyState", () => {
  it("MonthSummary mostra a sobra com centavos, o trio do mês e o saldo acumulado", () => {
    render(<MonthSummary income={5000} outcome={-2300} investment={-1000} balance={1700} accumulated={2600.5} />);

    const summary = screen.getByRole("region", { name: "Sobra do mês" });
    expect(summary).toHaveTextContent("R$ 1.700,00");
    expect(screen.getByText("Entrou").nextElementSibling).toHaveTextContent("5.000,00");
    expect(screen.getByText("Saiu").nextElementSibling).toHaveTextContent("2.300,00");
    expect(screen.getByText("Investiu").nextElementSibling).toHaveTextContent("1.000,00");
    expect(screen.getByText("Saldo acumulado")).toHaveTextContent("R$ 2.600,50");
  });

  it("MonthSummary mostra sobra negativa com sinal", () => {
    render(<MonthSummary income={0} outcome={-150.4} investment={0} balance={-150.4} accumulated={-150.4} />);

    expect(screen.getByRole("region", { name: "Sobra do mês" })).toHaveTextContent("−R$ 150,40");
  });

  it("EmptyState mostra a mensagem", () => {
    render(<EmptyState>Nada por aqui.</EmptyState>);

    expect(screen.getByText("Nada por aqui.")).toBeInTheDocument();
  });
});

describe("PageHeader", () => {
  it("mostra eyebrow, título (h1) e subtítulo", () => {
    render(<PageHeader eyebrow="Relatórios" title="Análise" subtitle="Detalhes" />);

    expect(screen.getByText("Relatórios")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Análise", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Detalhes")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("mostra o botão de ação apenas quando há rótulo E callback", async () => {
    const onAction = vi.fn();
    const { user, rerender } = renderUi(
      <PageHeader title="Análise" actionLabel="+ Novo" onAction={onAction} />,
    );

    await user.click(screen.getByRole("button", { name: "+ Novo" }));
    expect(onAction).toHaveBeenCalledTimes(1);

    rerender(<PageHeader title="Análise" actionLabel="+ Novo" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("CategoryBreakdown", () => {
  it("mostra estado vazio sem itens", () => {
    render(<CategoryBreakdown items={[]} />);

    expect(screen.getByText("Nenhuma despesa encontrada neste período.")).toBeInTheDocument();
  });

  it("lista categoria, valor e percentual arredondado", () => {
    render(
      <CategoryBreakdown
        items={[
          { category: "Moradia", amount: "R$ 1.500,00", percentage: 65.2 },
          { category: "Alimentação", amount: "R$ 800,00", percentage: 34.8 },
        ]}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Moradia");
    expect(items[0]).toHaveTextContent("R$ 1.500,00");
    expect(items[0]).toHaveTextContent("65% das despesas");
    expect(items[1]).toHaveTextContent("35% das despesas");
  });
});

describe("Gráficos (smoke)", () => {
  beforeEach(() => {
    // recharts avisa no console quando o container tem tamanho 0 (caso do jsdom).
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  const evolution = [
    { label: "set. de 2026", income: 2000, outcome: 800, balance: 700 },
    { label: "out. de 2026", income: 5000, outcome: 2300, balance: 1700 },
  ];

  it("IncomeOutcomeBarChart: estado vazio sem dados", () => {
    render(<IncomeOutcomeBarChart data={[]} />);

    expect(screen.getByText("Nenhum movimento para exibir no gráfico.")).toBeInTheDocument();
  });

  it("IncomeOutcomeBarChart: renderiza sem erros com dados", () => {
    const { container } = render(<IncomeOutcomeBarChart data={evolution} />);

    expect(container.querySelector(".recharts-responsive-container")).not.toBeNull();
  });

  it("BalanceLineChart: estado vazio sem dados", () => {
    render(<BalanceLineChart data={[]} />);

    expect(screen.getByText("Nenhum saldo para exibir no gráfico.")).toBeInTheDocument();
  });

  it("BalanceLineChart: renderiza sem erros com dados", () => {
    const { container } = render(<BalanceLineChart data={evolution} />);

    expect(container.querySelector(".recharts-responsive-container")).not.toBeNull();
  });
});
