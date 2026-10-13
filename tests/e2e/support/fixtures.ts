import { randomUUID } from "node:crypto";
import {
  test as base,
  expect,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { cloneTemplateUser } from "./db";
import { BASE_URL, E2E_NOW, E2E_PASSWORD } from "./env";
import { createSessionToken, sessionCookie } from "./session";

export type Account = {
  id: string;
  name: string;
  email: string;
  password: string;
};

export type TransactionKind = "income" | "outcome" | "investment";

export type SeedTransaction = {
  description: string;
  value: number;
  type: TransactionKind;
  category: string;
  date: string;
  paymentMethod?: string;
  notes?: string | null;
};

export type ApiRecord = { id: string } & Record<string, unknown>;

const RECAPTCHA_STUB = `
window.grecaptcha = {
  ready: function (callback) { callback(); },
  execute: function () { return Promise.resolve("e2e-recaptcha-token"); },
  render: function () { return 0; },
  reset: function () {},
  getResponse: function () { return ""; },
};
`;

/**
 * O `next dev` fecha conexões keep-alive ociosas; o cliente HTTP do Playwright
 * às vezes reutiliza um socket já encerrado (ECONNRESET). Só esse erro é repetido.
 */
const NETWORK_RETRIES = 2;
const API_TIMEOUT = 45_000;

export function uniqueEmail(prefix = "e2e") {
  return `${prefix}-${randomUUID().slice(0, 12)}@teste.local`;
}

export async function registerAccount(
  request: APIRequestContext,
  overrides: Partial<Omit<Account, "id">> = {},
): Promise<Account> {
  const account = {
    name: overrides.name ?? "Usuária E2E",
    email: overrides.email ?? uniqueEmail(),
    password: overrides.password ?? E2E_PASSWORD,
  };
  const response = await request.post("/api/register", {
    data: { name: account.name, email: account.email, senha: account.password },
    maxRetries: NETWORK_RETRIES,
    timeout: API_TIMEOUT,
  });

  expect(response.status(), await response.text()).toBe(201);

  const body = (await response.json()) as { user: { id: string } };

  return { ...account, id: body.user.id };
}

/**
 * Usuário novo para montar cenários. Clona o usuário modelo cadastrado pela API
 * real no global-setup (rápido); sem modelo disponível, cadastra pela API.
 * Os testes de cadastro em si usam `registerAccount`/a tela de login.
 */
export async function createAccount(
  request: APIRequestContext,
  overrides: { name?: string } = {},
): Promise<Account> {
  const templateUserId = process.env.E2E_TEMPLATE_USER_ID;

  if (!templateUserId) {
    return registerAccount(request, overrides);
  }

  const account = {
    name: overrides.name ?? "Usuária E2E",
    email: uniqueEmail(),
    password: E2E_PASSWORD,
  };

  return { ...account, id: await cloneTemplateUser(templateUserId, account) };
}

/** Autentica o contexto gravando o cookie de sessão assinado (sem reCAPTCHA). */
export async function signIn(context: BrowserContext, account: Pick<Account, "id" | "email">) {
  await context.addCookies([sessionCookie(createSessionToken(account))]);
}

/**
 * Prepara um contexto: relógio fixo e stub do script do reCAPTCHA (a suíte não
 * depende do Google; o provider do login carrega api.js de www.google.com).
 */
export async function prepareContext(context: BrowserContext, clockNow: string | null) {
  if (clockNow) {
    await context.clock.setFixedTime(new Date(clockNow));
  }

  await context.route(/^https:\/\/www\.(google|gstatic|recaptcha)\.(com|net)\/recaptcha\//, (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: RECAPTCHA_STUB }),
  );
}

export class Api {
  constructor(private readonly request: APIRequestContext) {}

  private async send(method: "post" | "patch", url: string, data: unknown) {
    const response = await this.request[method](url, { data, maxRetries: NETWORK_RETRIES, timeout: API_TIMEOUT });

    expect(response.ok(), `${method.toUpperCase()} ${url} -> ${response.status()} ${await response.text()}`).toBe(true);

    return (await response.json()) as ApiRecord;
  }

  async list(resource: "transactions" | "categories" | "budgets" | "goals") {
    const response = await this.request.get(`/api/${resource}`, { maxRetries: NETWORK_RETRIES, timeout: API_TIMEOUT });

    expect(response.status()).toBe(200);

    return (await response.json()) as ApiRecord[];
  }

  /** Mesmo contrato do formulário: receitas positivas, despesas/aportes negativos. */
  createTransaction(seed: SeedTransaction) {
    return this.send("post", "/api/transactions", {
      description: seed.description,
      amount: seed.type === "income" ? seed.value : -seed.value,
      category: seed.category,
      type: seed.type,
      paymentMethod: seed.paymentMethod ?? "Pix",
      notes: seed.notes ?? null,
      date: seed.date,
    });
  }

  createCategory(data: { name: string; type: TransactionKind; color?: string; icon?: string }) {
    return this.send("post", "/api/categories", { color: "#00c48c", ...data });
  }

  createBudget(data: { category: string; amount: number; month: string }) {
    return this.send("post", "/api/budgets", data);
  }

  createGoal(data: {
    name: string;
    targetAmount: number;
    currentAmount?: number;
    deadline?: string | null;
    color?: string;
  }) {
    return this.send("post", "/api/goals", {
      currentAmount: 0,
      deadline: null,
      color: "#00c48c",
      ...data,
    });
  }
}

export type Session = {
  context: BrowserContext;
  page: Page;
  account: Account;
  api: Api;
};

/** Cria um segundo usuário, isolado em outro contexto de navegador. */
export async function newSession(
  browser: Browser,
  options: { clockNow?: string | null; name?: string } = {},
): Promise<Session> {
  const context = await browser.newContext({ baseURL: BASE_URL });

  await prepareContext(context, options.clockNow === undefined ? E2E_NOW : options.clockNow);

  const account = await createAccount(context.request, { name: options.name });

  await signIn(context, account);

  return { context, page: await context.newPage(), account, api: new Api(context.request) };
}

type Fixtures = {
  /** Instante fixo do relógio do navegador (null = relógio real). */
  clockNow: string | null;
  /** Usuário novo (com as categorias padrão) já autenticado no contexto. */
  account: Account;
  /** Chamadas à API com o cookie do `account`, para montar cenários. */
  api: Api;
};

export const test = base.extend<Fixtures>({
  clockNow: [E2E_NOW, { option: true }],

  // O 2º argumento das fixtures chama-se `provide` (e não `use`) só para não
  // disparar o falso positivo de react-hooks/rules-of-hooks do ESLint.
  context: async ({ context, clockNow }, provide) => {
    await prepareContext(context, clockNow);
    await provide(context);
  },

  account: async ({ context }, provide) => {
    const account = await createAccount(context.request);

    await signIn(context, account);
    await provide(account);
  },

  api: async ({ context, account }, provide) => {
    void account;
    await provide(new Api(context.request));
  },
});

/**
 * Marca o teste como bug conhecido do app: a expectativa descreve o
 * comportamento CORRETO e hoje falha. Rode com E2E_SHOW_BUGS=1 para ver as
 * falhas reais. Quando o bug for corrigido o teste "passa inesperadamente" e
 * basta remover a marcação.
 */
export function knownBug(reason: string) {
  test.fail(!process.env.E2E_SHOW_BUGS, `BUG conhecido: ${reason}`);
}

export { expect };
