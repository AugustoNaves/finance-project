"use client";

import { createGlobalStyle, css } from "styled-components";

const lightTokens = css`
  --paper: #eef2ea;
  --sheet: #f8faf5;
  --ink: #1f2b26;
  --ink-soft: #536259;
  --rule: #d3dccf;
  --rule-strong: #b4c2b4;
  --green: #2f5d50;
  --green-wash: #dfe9e0;
  --on-green: #f8faf5;
  --red: #a8382c;
  --red-wash: #f6dcd7;
  --amber: #8a5600;
  --amber-wash: #f6e8cc;
  --scrim: rgba(23, 33, 28, 0.42);
  color-scheme: light;
`;

const darkTokens = css`
  --paper: #121815;
  --sheet: #18201c;
  --ink: #e3ebe4;
  --ink-soft: #9bada2;
  --rule: #26332c;
  --rule-strong: #3a4b41;
  --green: #8cc7ad;
  --green-wash: #1f2e27;
  --on-green: #0f1a15;
  --red: #f08a7c;
  --red-wash: #3a1f1b;
  --amber: #e8b86a;
  --amber-wash: #33281a;
  --scrim: rgba(0, 0, 0, 0.55);
  color-scheme: dark;
`;

export const GlobalStyle = createGlobalStyle`
  :root {
    ${lightTokens}
    --font-ui: var(--font-public-sans), system-ui, -apple-system, "Segoe UI", sans-serif;
    --font-figures: var(--font-literata), Georgia, "Times New Roman", serif;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      ${darkTokens}
    }
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    background: var(--paper);
    -webkit-text-size-adjust: 100%;
  }

  body {
    min-height: 100vh;
    background: var(--paper);
    color: var(--ink);
    font-family: var(--font-ui);
    font-size: 15px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -webkit-tap-highlight-color: transparent;
  }

  a {
    text-decoration: none;
    color: inherit;
  }

  button,
  input,
  textarea,
  select {
    font: inherit;
    color: inherit;
  }

  button {
    cursor: pointer;
    border: none;
    background: none;
  }

  :focus-visible {
    outline: 2px solid var(--green);
    outline-offset: 2px;
  }

  ::selection {
    background: var(--green-wash);
    color: var(--ink);
  }

  .figures {
    font-family: var(--font-figures);
    font-variant-numeric: tabular-nums;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;
