"use client";

import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  :root {
    color-scheme: dark;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    background: #0d1117;
  }

  body {
    min-height: 100vh;
    background: #0d1117;
    color: #c9d1e0;
    font-family: var(--font-dm-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    -webkit-font-smoothing: antialiased;
    text-rendering: geometricPrecision;
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
  }

  button {
    cursor: pointer;
    border: none;
  }

  ::selection {
    background: rgba(0, 196, 140, 0.32);
    color: #ffffff;
  }

  body::-webkit-scrollbar {
    width: 10px;
  }

  body::-webkit-scrollbar-track {
    background: #0d1117;
  }

  body::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.14);
    border: 2px solid #0d1117;
    border-radius: 999px;
  }
`;
