"use client";

import { Bar, Fill, Track } from "./styles";

interface ProgressBarProps {
  value: number;
  color?: string;
}

export function ProgressBar({ value, color }: ProgressBarProps) {
  const normalizedValue = Math.min(Math.max(value, 0), 100);

  return (
    <Track aria-label={`Progresso de ${Math.round(normalizedValue)}%`}>
      <Bar>
        <Fill $value={normalizedValue} $color={color} />
      </Bar>
    </Track>
  );
}
