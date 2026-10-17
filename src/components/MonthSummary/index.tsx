"use client";

import { formatPlainAmount } from "@/utils/formatters";
import { Accumulated, Cents, Figure, Hero, HeroLabel, Triad } from "./styles";

interface MonthSummaryProps {
  income: number;
  outcome: number;
  investment: number;
  balance: number;
  accumulated: number;
}

export function MonthSummary({ income, outcome, investment, balance, accumulated }: MonthSummaryProps) {
  const [whole, cents] = formatPlainAmount(Math.abs(balance)).split(",");

  return (
    <Hero aria-labelledby="month-summary-label">
      <HeroLabel id="month-summary-label">Sobra do mês</HeroLabel>
      <Figure $negative={balance < 0}>
        {balance < 0 ? "−" : ""}R$ {whole}
        <Cents>,{cents}</Cents>
      </Figure>
      <Triad>
        <div>
          <dt>Entrou</dt>
          <dd>{formatPlainAmount(income)}</dd>
        </div>
        <div>
          <dt>Saiu</dt>
          <dd data-tone="out">{formatPlainAmount(Math.abs(outcome))}</dd>
        </div>
        <div>
          <dt>Investiu</dt>
          <dd>{formatPlainAmount(Math.abs(investment))}</dd>
        </div>
      </Triad>
      <Accumulated>
        Saldo acumulado <b>R$ {formatPlainAmount(accumulated)}</b>
      </Accumulated>
    </Hero>
  );
}
