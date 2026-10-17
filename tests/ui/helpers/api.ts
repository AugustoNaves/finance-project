import { vi } from "vitest";

export interface ApiCall {
  method: string;
  path: string;
  /** Corpo já convertido de JSON (undefined quando a requisição não tem corpo). */
  body: unknown;
  headers: Record<string, string>;
}

interface ReplyDescriptor {
  status?: number;
  body?: unknown;
  /** Corpo cru (não JSON), para simular respostas HTML/texto. */
  rawBody?: string;
}

type RouteValue = object | string | number | boolean | null;

type RouteHandler = RouteValue | ((call: ApiCall) => unknown);

export type ApiRoutes = Record<string, RouteHandler>;

const REPLY = Symbol("reply");

interface TaggedReply extends ReplyDescriptor {
  [REPLY]: true;
}

/** Resposta com status/corpo customizados. */
export function reply(status: number, body?: unknown): TaggedReply {
  return { [REPLY]: true, status, body };
}

/** Resposta de erro cujo corpo não é JSON (ex.: página HTML de erro 500). */
export function replyRaw(status: number, rawBody: string): TaggedReply {
  return { [REPLY]: true, status, rawBody };
}

/** Faz o fetch rejeitar (queda de rede). */
export function networkError(message = "Failed to fetch") {
  return () => {
    throw new TypeError(message);
  };
}

function isTaggedReply(value: unknown): value is TaggedReply {
  return typeof value === "object" && value !== null && REPLY in value;
}

function toResponse(value: unknown): Response {
  if (isTaggedReply(value)) {
    const status = value.status ?? 200;

    if (value.rawBody !== undefined) {
      return new Response(value.rawBody, {
        status,
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response(JSON.stringify(value.body ?? {}), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(value ?? {}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

const defaultRoutes: ApiRoutes = {
  "GET /api/transactions": [],
  "GET /api/categories": [],
  "GET /api/category-rules": [],
  "GET /api/budgets": [],
  "GET /api/goals": [],
  "GET /api/imports": [],
  "GET /api/me": { user: { name: "Maria Teste", email: "maria@teste.com" } },
};

/**
 * Substitui `globalThis.fetch` por um roteador "MÉTODO /caminho" -> resposta.
 * - valor simples => 200 com JSON
 * - `reply(status, body)` => status customizado
 * - função => recebe a chamada (com body já parseado) e devolve qualquer um dos anteriores
 * Rotas GET de listagem têm default `[]`; rotas não mapeadas respondem 404 e ficam em `unhandled`.
 */
export function mockApi(routes: ApiRoutes = {}) {
  const table: ApiRoutes = { ...defaultRoutes, ...routes };
  const calls: ApiCall[] = [];
  const unhandled: ApiCall[] = [];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const path = url.replace(/^https?:\/\/[^/]+/, "");
    const method = (init?.method ?? "GET").toUpperCase();
    const headers: Record<string, string> = {};

    new Headers(init?.headers).forEach((value, key) => {
      headers[key] = value;
    });

    let body: unknown;

    if (typeof init?.body === "string") {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }

    const call: ApiCall = { method, path, body, headers };
    calls.push(call);

    const key = `${method} ${path}`;

    if (!(key in table)) {
      unhandled.push(call);
      return toResponse(reply(404, { error: `Rota não mockada: ${key}` }));
    }

    const handler = table[key];
    const result = typeof handler === "function" ? await handler(call) : handler;

    return toResponse(result);
  });

  vi.stubGlobal("fetch", fetchMock);

  return {
    fetchMock,
    calls,
    unhandled,
    /** Altera/adiciona uma rota depois do mock criado. */
    on(key: string, handler: RouteHandler) {
      table[key] = handler;
    },
    callsTo(method: string, path: string) {
      return calls.filter((call) => call.method === method && call.path === path);
    },
    /** Chamadas que alteram dados (tudo que não é GET). */
    mutations() {
      return calls.filter((call) => call.method !== "GET");
    },
  };
}

export type MockedApi = ReturnType<typeof mockApi>;
