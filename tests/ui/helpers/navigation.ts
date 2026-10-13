import { vi } from "vitest";

/**
 * Estado compartilhado do mock de `next/navigation` (registrado em tests/setup/ui.ts).
 * Os testes alteram `pathname`/`searchParams` antes de renderizar e inspecionam `router`.
 */
export const navigationMock = {
  pathname: "/",
  searchParams: new URLSearchParams(),
  linkClicks: [] as string[],
  redirect: vi.fn<(url: string) => void>(),
  router: {
    push: vi.fn<(url: string) => void>(),
    replace: vi.fn<(url: string) => void>(),
    refresh: vi.fn<() => void>(),
    back: vi.fn<() => void>(),
    forward: vi.fn<() => void>(),
    prefetch: vi.fn<(url: string) => void>(),
  },
};

export function resetNavigationMock() {
  navigationMock.pathname = "/";
  navigationMock.searchParams = new URLSearchParams();
  navigationMock.linkClicks = [];
  navigationMock.redirect.mockReset();
  Object.values(navigationMock.router).forEach((mock) => mock.mockReset());
}

export function setPathname(pathname: string) {
  navigationMock.pathname = pathname;
}

export function setSearchParams(params: Record<string, string> | string) {
  navigationMock.searchParams = new URLSearchParams(params);
}
