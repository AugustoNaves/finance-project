"use client";

import { Bar, Fill, Track } from "./styles";

interface ProgressBarProps {
  value: number;
  color?: string;
  label?: string;
}

export function ProgressBar({ value, color, label }: ProgressBarProps) {
  const normalizedValue = Math.min(Math.max(value, 0), 100);
  const rounded = Math.round(normalizedValue);

  return (
    <Track
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={rounded}
      aria-label={label ? `${label}: ${rounded}%` : `Progresso de ${rounded}%`}
    >
      <Bar>
        <Fill $value={normalizedValue} $raw={value} $color={color} />
      </Bar>
    </Track>
  );
}
