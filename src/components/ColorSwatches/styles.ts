"use client";

import styled from "styled-components";

export const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const Legend = styled.p`
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
`;

export const Group = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin: 0 -6px;
`;

export const SwatchDot = styled.span`
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--ink-soft);
  font-size: 18px;
  line-height: 1;
`;

const swatchBase = `
  position: relative;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  cursor: pointer;

  input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }
`;

export const Swatch = styled.label`
  ${swatchBase}

  input:checked + ${SwatchDot} {
    outline: 2px solid var(--ink);
    outline-offset: 3px;
  }

  input:focus-visible + ${SwatchDot} {
    outline: 2px solid var(--green);
    outline-offset: 3px;
  }
`;

export const CustomSwatch = styled.label<{ $active: boolean }>`
  ${swatchBase}

  ${SwatchDot} {
    border: 1px ${({ $active }) => ($active ? "solid transparent" : "dashed var(--rule-strong)")};
    outline: ${({ $active }) => ($active ? "2px solid var(--ink)" : "none")};
    outline-offset: 3px;
  }

  input:focus-visible + ${SwatchDot} {
    outline: 2px solid var(--green);
  }
`;
