import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { TransactionsProvider } from "@/contexts/TransactionsContenxt";
import { NOW } from "./fixtures";

/** Congela apenas o relógio (`Date`), mantendo timers reais para `waitFor`/user-event. */
export function freezeDate(iso: string = NOW) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(iso));
}

/** Renderiza dentro do TransactionsProvider real (que busca GET /api/transactions). */
export function renderWithProvider(ui: ReactElement) {
  return {
    user: userEvent.setup(),
    ...render(<TransactionsProvider>{ui}</TransactionsProvider>),
  };
}

export function renderUi(ui: ReactElement) {
  return { user: userEvent.setup(), ...render(ui) };
}

/** Localiza o container do Modal pelo título (h2), independente de role/aria. */
export function getModalByTitle(title: string): HTMLElement {
  const headings = Array.from(document.body.querySelectorAll("h2")).filter(
    (heading) => heading.textContent === title,
  );

  if (headings.length !== 1) {
    throw new Error(`Esperava 1 modal com título "${title}", encontrei ${headings.length}`);
  }

  const container = headings[0].parentElement?.parentElement;

  if (!container) throw new Error(`Modal "${title}" sem container`);

  return container;
}

export function queryModalByTitle(title: string): HTMLElement | null {
  try {
    return getModalByTitle(title);
  } catch {
    return null;
  }
}

/** Botão de fechar (✕) do Modal: é o botão irmão do título. */
export function getModalCloseButton(modal: HTMLElement): HTMLElement {
  const button = modal.querySelector<HTMLElement>("h2 + button");

  if (!button) throw new Error("Botão de fechar do modal não encontrado");

  return button;
}
