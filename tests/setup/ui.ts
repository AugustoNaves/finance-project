// Fuso fixo para que a lógica baseada em mês/dia seja determinística em qualquer máquina.
process.env.TZ = "America/Sao_Paulo";

import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { createElement, forwardRef } from "react";
import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { afterEach, beforeEach, vi } from "vitest";
import { navigationMock, resetNavigationMock } from "../ui/helpers/navigation";

// Folga para máquinas carregadas (CI ou várias suítes em paralelo): evita falsos negativos por timeout.
configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 30000 });

// --- Stubs de APIs do browser que o jsdom não implementa (recharts, modais) ---
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

if (!URL.createObjectURL) {
  Object.defineProperty(URL, "createObjectURL", {
    writable: true,
    configurable: true,
    value: () => "blob:mock",
  });
}

if (!URL.revokeObjectURL) {
  Object.defineProperty(URL, "revokeObjectURL", {
    writable: true,
    configurable: true,
    value: () => {},
  });
}

// --- next/navigation controlável pelos testes (ver tests/ui/helpers/navigation.ts) ---
vi.mock("next/navigation", () => ({
  useRouter: () => navigationMock.router,
  usePathname: () => navigationMock.pathname,
  useSearchParams: () => navigationMock.searchParams,
  redirect: (url: string) => navigationMock.redirect(url),
}));

// --- next/link como <a> simples; o clique não navega (jsdom não implementa navegação) ---
vi.mock("next/link", () => {
  type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

  const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
    { href, onClick, children, ...rest },
    ref,
  ) {
    return createElement(
      "a",
      {
        ...rest,
        href,
        ref,
        onClick: (event: MouseEvent<HTMLAnchorElement>) => {
          onClick?.(event);
          event.preventDefault();
          navigationMock.linkClicks.push(href);
        },
      },
      children,
    );
  });

  return { default: Link };
});

beforeEach(() => {
  resetNavigationMock();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
