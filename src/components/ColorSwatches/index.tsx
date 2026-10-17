"use client";

import { useId } from "react";
import { colorPalette } from "./palette";
import { CustomSwatch, Group, Legend, Root, Swatch, SwatchDot } from "./styles";

export { colorPalette, defaultColor } from "./palette";

interface ColorSwatchesProps {
  label?: string;
  value: string;
  onChange: (color: string) => void;
}

export function ColorSwatches({ label = "Cor", value, onChange }: ColorSwatchesProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const current = value.toLowerCase();
  const isCustom = !colorPalette.some((color) => color.value === current);

  return (
    <Root>
      <Legend id={labelId}>{label}</Legend>
      <Group role="radiogroup" aria-labelledby={labelId}>
        {colorPalette.map((color) => (
          <Swatch key={color.value}>
            <input
              type="radio"
              name={`${id}-color`}
              value={color.value}
              aria-label={color.name}
              checked={current === color.value}
              onChange={() => onChange(color.value)}
            />
            <SwatchDot aria-hidden="true" style={{ background: color.value }} />
          </Swatch>
        ))}
        <CustomSwatch $active={isCustom} title="Cor personalizada">
          <input
            type="color"
            aria-label="Cor personalizada"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
          <SwatchDot aria-hidden="true" style={isCustom ? { background: value } : undefined}>
            {isCustom ? null : "+"}
          </SwatchDot>
        </CustomSwatch>
      </Group>
    </Root>
  );
}
