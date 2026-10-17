"use client";

import styled from "styled-components";

export const Shell = styled.div`
  min-height: 100vh;
  background: var(--paper);
  color: var(--ink);
  font-variant-numeric: tabular-nums;

  @media (min-width: 960px) {
    display: grid;
    grid-template-columns: 248px minmax(0, 1fr);
  }
`;

export const ShellContent = styled.main`
  width: 100%;
  max-width: 1080px;
  padding: calc(8px + env(safe-area-inset-top)) max(20px, env(safe-area-inset-right))
    calc(96px + env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left));

  @media (min-width: 960px) {
    padding: 32px 48px 64px;
  }
`;
