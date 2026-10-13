import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BalanceLineChart } from "@/components/BalanceLineChart";
import { BudgetCard, type BudgetViewModel } from "@/components/BudgetCard";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { CategoryCard, type CategoryViewModel } from "@/components/CategoryCard";
import { Dashboard } from "@/components/Dashboard";
import { EmptyState } from "@/components/EmptyState";
import { ExpenseDonutChart } from "@/components/ExpenseDonutChart";
import { GoalCard, type GoalViewModel } from "@/components/GoalCard";
import { IncomeOutcomeBarChart } from "@/components/IncomeOutcomeBarChart";
import { InsightCard } from "@/components/InsightCard";
import { LatestTransactions } from "@/components/LatestTransactions";
import { MonthSummary } from "@/components/MonthSummary";
import { PageHeader } from "@/components/PageHeader";
import { ProgressBar } from "@/components/ProgressBar";
import { ReportMetricCard } from "@/components/ReportMetricCard";
import { SettingsCard } from "@/components/SettingsCard";
import { SummaryCard } from "@/components/SummaryCard";
import { transactions } from "../helpers/fixtures";
import { renderUi } from "../helpers/render";

const budget: BudgetViewModel = {
  id: "b1",
  category: "Alimentação",
  amount: "R$ 1.000,00",
  spent: "R$ 800,00",
  remaining: "R$ 200,00",
  month: "outubro de 2026",
  progress: 79.6,
  status: "safe",
};

describe("BudgetCard", () => {
  it("mostra categoria, mês, percentual arredondado e os valores de limite/gasto/restante", () => {
    render(<BudgetCard budget={budget} onEdit={vi.fn()} onDelete={vi.fn()} />);

    const card = screen.getByRole("article");
    expect(within(card).getByRole("heading", { name: "Alimentação" })).toBeInTheDocument();
    expect(card).toHaveTextContent("outubro de 2026");
    expect(within(card).getByText("80%")).toBeInTheDocument();
    expect(within(card).getByText("Limite").parentElement).toHaveTextContent("R$ 1.000,00");
    expect(within(card).getByText("Gasto").parentElement).toHaveTextContent("R$ 800,00");
    expect(within(card).getByText("Restante").parentElement).toHaveTextContent("R$ 200,00");
  });

  it.each([
    ["safe", "Dentro do previsto"],
    ["warning", "Atenção: acima de 80%"],
    ["danger", "Limite ultrapassado"],
  ] as const)("status %s mostra o alerta '%s'", (status, text) => {
    render(<BudgetCard budget={{ ...budget, status }} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("aciona onEdit e onDelete pelos botões", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const { user } = renderUi(<BudgetCard budget={budget} onEdit={onEdit} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: "Editar" }));
    await user.click(screen.getByRole("button", { name: "Excluir" }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

describe("GoalCard", () => {
  const goal: GoalViewModel = {
    id: "g1",
    name: "Reserva",
    targetAmount: 10000,
    currentAmount: 2500,
    deadline: "2026-12-31T00:00:00.000Z",
    color: "#00c48c",
    progress: 25,
  };

  it("mostra nome, percentual, valores atual/alvo/restante", () => {
    render(<GoalCard goal={goal} onEdit={vi.fn()} onDelete={vi.fn()} />);

    const card = screen.getByRole("article");
    expect(within(card).getByRole("heading", { name: "Reserva" })).toBeInTheDocument();
    expect(within(card).getByText("25%")).toBeInTheDocument();
    expect(within(card).getByText("Atual").parentElement).toHaveTextContent("R$ 2.500,00");
    expect(within(card).getByText("Alvo").parentElement).toHaveTextContent("R$ 10.000,00");
    expect(within(card).getByText("Restante").parentElement).toHaveTextContent("R$ 7.500,00");
  });

  it("[regressão de fuso] prazo salvo como 2026-12-31T00:00Z aparece como 31/12/2026", () => {
    render(<GoalCard goal={goal} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("Prazo: 31/12/2026")).toBeInTheDocument();
  });

  it("não mostra prazo quando a meta não tem deadline", () => {
    render(<GoalCard goal={{ ...goal, deadline: null }} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.queryByText(/Prazo:/)).toBeNull();
  });

  it("restante nunca fica negativo, mas o percentual passa de 100% quando a meta é superada", () => {
    render(
      <GoalCard
        goal={{ ...goal, currentAmount: 12500, progress: 125 }}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("Restante").parentElement).toHaveTextContent("R$ 0,00");
    expect(screen.getByText("125%")).toBeInTheDocument();
    // A barra, por outro lado, é limitada a 100%.
    expect(screen.getByLabelText("Progresso de 100%")).toBeInTheDocument();
  });

  it("aciona onEdit ('Atualizar progresso') e onDelete", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const { user } = renderUi(<GoalCard goal={goal} onEdit={onEdit} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: "Atualizar progresso" }));
    await user.click(screen.getByRole("button", { name: "Excluir" }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

describe("CategoryCard", () => {
  const category: CategoryViewModel = {
    id: "c1",
    name: "alimentação",
    type: "outcome",
    color: "#f75a68",
    icon: "food",
    transactionCount: 2,
    monthlyTotal: "R$ 800,00",
  };

  it("mostra nome, métricas do mês e as duas primeiras letras do ícone em maiúsculas", () => {
    render(<CategoryCard category={category} onEdit={vi.fn()} onDelete={vi.fn()} />);

    const card = screen.getByRole("article");
    expect(within(card).getByRole("heading", { name: "alimentação" })).toBeInTheDocument();
    expect(within(card).getByText("FO")).toBeInTheDocument();
    expect(within(card).getByText("Transações no mês").parentElement).toHaveTextContent("2");
    expect(within(card).getByText("Total no mês").parentElement).toHaveTextContent("R$ 800,00");
  });

  it("sem ícone usa a inicial do nome em maiúscula", () => {
    render(
      <CategoryCard category={{ ...category, icon: null }} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it.each([
    ["income", "Receita"],
    ["outcome", "Despesa"],
    ["investment", "Investimento"],
  ] as const)("tipo %s é rotulado como %s (o rótulo aparece duas vezes no card)", (type, label) => {
    render(<CategoryCard category={{ ...category, type }} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getAllByText(label)).toHaveLength(2);
  });

  it("aciona onEdit e onDelete", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const { user } = renderUi(
      <CategoryCard category={category} onEdit={onEdit} onDelete={onDelete} />,
    );

    await user.click(screen.getByRole("button", { name: "Editar" }));
    await user.click(screen.getByRole("button", { name: "Excluir" }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
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

  it("[a11y] tem role=progressbar com aria-valuenow", () => {
    render(<ProgressBar value={42} />);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "42");
  });
});

describe("Cards de exibição simples", () => {
  it.each(["income", "outcome", "investment", "total"] as const)(
    "SummaryCard (%s) mostra título e valor",
    (type) => {
      const { container } = render(<SummaryCard title="Receitas" amount="R$ 10,00" type={type} />);

      expect(screen.getByText("Receitas")).toBeInTheDocument();
      expect(screen.getByText("R$ 10,00")).toBeInTheDocument();
      expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    },
  );

  it("MonthSummary mostra mês, entradas, saídas, saldo e taxa de economia", () => {
    render(
      <MonthSummary
        monthLabel="outubro de 2026"
        income="R$ 5.000,00"
        outcome="-R$ 2.300,00"
        balance="R$ 1.700,00"
        savingsRate="34% economizado"
      />,
    );

    const card = screen.getByRole("article");
    expect(within(card).getByRole("heading", { name: "Resumo do mês" })).toBeInTheDocument();
    expect(card).toHaveTextContent("outubro de 2026");
    expect(card).toHaveTextContent("34% economizado");
    expect(within(card).getByText("Entradas").parentElement).toHaveTextContent("R$ 5.000,00");
    expect(within(card).getByText("Saídas").parentElement).toHaveTextContent("-R$ 2.300,00");
    expect(within(card).getByText("Saldo do mês").parentElement).toHaveTextContent("R$ 1.700,00");
  });

  it("InsightCard mostra título, valor e descrição", () => {
    render(<InsightCard title="Maior despesa" value="R$ 10,00" description="Detalhe" variant="red" />);

    expect(screen.getByRole("heading", { name: "Maior despesa" })).toBeInTheDocument();
    expect(screen.getByText("R$ 10,00")).toBeInTheDocument();
    expect(screen.getByText("Detalhe")).toBeInTheDocument();
  });

  it("ReportMetricCard mostra título, valor e descrição", () => {
    render(<ReportMetricCard title="Saldo" value="R$ 1,00" description="Diferença" />);

    expect(screen.getByRole("heading", { name: "Saldo" })).toBeInTheDocument();
    expect(screen.getByText("R$ 1,00")).toBeInTheDocument();
    expect(screen.getByText("Diferença")).toBeInTheDocument();
  });

  it("SettingsCard mostra título, descrição e o conteúdo filho", () => {
    render(
      <SettingsCard title="Perfil" description="Dados da conta">
        <button type="button">ação</button>
      </SettingsCard>,
    );

    expect(screen.getByRole("heading", { name: "Perfil", level: 2 })).toBeInTheDocument();
    expect(screen.getByText("Dados da conta")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ação" })).toBeInTheDocument();
  });

  it("EmptyState mostra a mensagem", () => {
    render(<EmptyState>Nada por aqui.</EmptyState>);

    expect(screen.getByText("Nada por aqui.")).toBeInTheDocument();
  });

  it("Dashboard (legado, não usado) mostra três cards com valores fixos no código", () => {
    render(<Dashboard />);

    expect(screen.getByText("Saldo Atual").parentElement).toHaveTextContent("R$ 2.500,00");
    expect(screen.getByText("Receitas do Mês").parentElement).toHaveTextContent("R$ 4.000,00");
    expect(screen.getByText("Despesas do Mês").parentElement).toHaveTextContent("R$ 1.500,00");
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

    const items = screen.getAllByRole("article");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Moradia");
    expect(items[0]).toHaveTextContent("R$ 1.500,00");
    expect(items[0]).toHaveTextContent("65% das despesas");
    expect(items[1]).toHaveTextContent("35% das despesas");
  });
});

describe("LatestTransactions", () => {
  it("mostra estado vazio", () => {
    render(<LatestTransactions transactions={[]} />);

    expect(screen.getByText("Nenhuma transação registrada ainda.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("mostra no máximo 5 itens, na ordem recebida, com valores e datas formatados", () => {
    render(<LatestTransactions transactions={transactions} />);

    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(5);
    expect(rows[0]).toHaveTextContent("Salário");
    expect(rows[0]).toHaveTextContent("+R$ 5.000,00");
    expect(rows[0]).toHaveTextContent("05/10/2026");
    expect(rows[1]).toHaveTextContent("-R$ 1.500,00");
    expect(within(rows[4]).getAllByRole("cell")[1]).toHaveTextContent(/^R\$ 1\.000,00$/);
  });

  it("[regressão de fuso] data salva como 2026-08-01T00:00Z aparece como 01/08/2026", () => {
    render(
      <LatestTransactions
        transactions={[{ ...transactions[0], date: "2026-08-01T00:00:00.000Z" }]}
      />,
    );

    expect(within(screen.getByRole("table")).getByText("01/08/2026")).toBeInTheDocument();
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

  it("ExpenseDonutChart: estado vazio sem dados", () => {
    render(<ExpenseDonutChart data={[]} />);

    expect(screen.getByText("Nenhuma despesa para exibir no gráfico.")).toBeInTheDocument();
  });

  it("ExpenseDonutChart: renderiza sem erros com dados", () => {
    const { container } = render(
      <ExpenseDonutChart
        data={[
          { category: "Moradia", amount: 1500 },
          { category: "Alimentação", amount: 800 },
        ]}
      />,
    );

    expect(screen.queryByText("Nenhuma despesa para exibir no gráfico.")).toBeNull();
    expect(container.querySelector(".recharts-responsive-container")).not.toBeNull();
  });

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
