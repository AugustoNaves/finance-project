"use client";

import { Bar, Fill, Track } from "./styles";

interface ProgressBarProps {
  value: number;
}

export function ProgressBar({ value }: ProgressBarProps) {
  const normalizedValue = Math.min(Math.max(value, 0), 100);

  return (
    <Track aria-label={`Progresso de ${Math.round(normalizedValue)}%`}>
      <Bar>
        <Fill $value={normalizedValue} />
      </Bar>
    </Track>
  );
}
