"use client";

import { ReactNode } from "react";
import { Bar, Step, Title } from "./styles";

interface MonthSwitcherProps {
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  children?: ReactNode;
}

export function MonthSwitcher({ label, onPrevious, onNext, children }: MonthSwitcherProps) {
  return (
    <Bar>
      <Step type="button" aria-label="Mês anterior" onClick={onPrevious}>
        ‹
      </Step>
      <Title>{label}</Title>
      <Step type="button" aria-label="Próximo mês" onClick={onNext}>
        ›
      </Step>
      {children}
    </Bar>
  );
}
