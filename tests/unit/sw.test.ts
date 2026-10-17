import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Listener = (event: Record<string, unknown>) => void;

const source = fs.readFileSync(path.resolve(__dirname, "../../public/sw.js"), "utf8");

function loadWorker() {
  const listeners: Record<string, Listener> = {};
  const cachePut = vi.fn();
  const cacheAddAll = vi.fn(async () => {});
  const cached = new Map<string, Response>();

  const caches = {
    open: vi.fn(async () => ({
      put: cachePut,
      addAll: cacheAddAll,
      match: async (url: string) => cached.get(url),
    })),
    match: vi.fn(async (request: Request | string) => {
      const url = typeof request === "string" ? request : new URL(request.url).pathname;
      return cached.get(url);
    }),
    keys: vi.fn(async () => ["finance-app-v3-static", "finance-app-v4-static"]),
    delete: vi.fn(async () => true),
  };

  const fetchMock = vi.fn(async () => new Response("rede", { status: 200 }));

  const self = {
    location: { origin: "http://localhost:3000" },
    addEventListener: (type: string, listener: Listener) => {
      listeners[type] = listener;
    },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  };

  vm.runInNewContext(source, { self, caches, fetch: fetchMock, URL, Response, Promise, console });

  function dispatchFetch(url: string, init: { method?: string; mode?: string } = {}) {
    const request = { url, method: init.method ?? "GET", mode: init.mode ?? "cors" };
    let responded: Promise<Response> | undefined;

    listeners.fetch({
      request,
      respondWith: (value: Promise<Response>) => {
        responded = value;
      },
    });

    return responded;
  }

  return { listeners, caches, cachePut, cacheAddAll, cached, fetchMock, dispatchFetch };
}

describe("service worker (public/sw.js)", () => {
  let worker: ReturnType<typeof loadWorker>;

  beforeEach(() => {
    worker = loadWorker();
  });

  it("pré-carrega a página offline, os arquivos estáticos que ela usa e os ícones", async () => {
    worker.cached.set(
      "/offline",
      new Response(
        '<link href="/_next/static/css/app.css"><script src="/_next/static/chunks/main.js"></script>' +
          '<script src="/_next/static/chunks/main.js"></script><a href="/api/me">x</a>',
      ),
    );
    let installing: Promise<unknown> | undefined;

    worker.listeners.install({ waitUntil: (value: Promise<unknown>) => (installing = value) });
    await installing;

    const [first] = worker.cacheAddAll.mock.calls[0] as unknown as [string[]];
    const [second] = worker.cacheAddAll.mock.calls[1] as unknown as [string[]];

    expect(first).toContain("/offline");
    expect(first.every((url) => url === "/offline" || /\.png$/.test(url))).toBe(true);
    expect(second).toEqual(["/_next/static/css/app.css", "/_next/static/chunks/main.js"]);
  });

  it.each([
    ["GET", "http://localhost:3000/api/transactions"],
    ["GET", "http://localhost:3000/api/me"],
    ["POST", "http://localhost:3000/api/transactions"],
    ["POST", "http://localhost:3000/api/login"],
  ])("não intercepta %s %s", (method, url) => {
    expect(worker.dispatchFetch(url, { method })).toBeUndefined();
    expect(worker.fetchMock).not.toHaveBeenCalled();
  });

  it("não intercepta outras origens nem o worker do pdf.js", () => {
    expect(worker.dispatchFetch("https://www.google.com/recaptcha/api.js")).toBeUndefined();
    expect(worker.dispatchFetch("http://localhost:3000/pdf.worker.min.mjs")).toBeUndefined();
  });

  it("busca páginas sempre na rede e nunca as guarda em cache", async () => {
    const response = await worker.dispatchFetch("http://localhost:3000/transactions", { mode: "navigate" });

    expect(await response?.text()).toBe("rede");
    expect(worker.cachePut).not.toHaveBeenCalled();
  });

  it("sem rede, redireciona a navegação para /offline (a URL muda e o app hidrata a página certa)", async () => {
    worker.cached.set("/offline", new Response("offline"));
    worker.fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const response = await worker.dispatchFetch("http://localhost:3000/reports", { mode: "navigate" });

    expect(response?.status).toBe(302);
    expect(response?.headers.get("location")).toBe("http://localhost:3000/offline");
  });

  it("sem rede, a própria /offline vem do cache", async () => {
    worker.cached.set("/offline", new Response("offline"));
    worker.fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const response = await worker.dispatchFetch("http://localhost:3000/offline", { mode: "navigate" });

    expect(await response?.text()).toBe("offline");
  });

  it("guarda em cache os arquivos estáticos do build", async () => {
    const okResponse = new Response("js", { status: 200 });
    Object.defineProperty(okResponse, "type", { value: "basic" });
    worker.fetchMock.mockResolvedValueOnce(okResponse);

    await worker.dispatchFetch("http://localhost:3000/_next/static/chunks/app.js");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(worker.cachePut).toHaveBeenCalledTimes(1);
  });

  it("remove caches de versões antigas ao ativar", async () => {
    let activating: Promise<unknown> | undefined;

    worker.listeners.activate({ waitUntil: (value: Promise<unknown>) => (activating = value) });
    await activating;

    expect(worker.caches.delete).toHaveBeenCalledWith("finance-app-v3-static");
    expect(worker.caches.delete).not.toHaveBeenCalledWith("finance-app-v4-static");
  });
});
