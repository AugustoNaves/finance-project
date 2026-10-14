import { randomUUID } from "node:crypto";
import { BASE_URL, E2E_PASSWORD } from "./support/env";
import {
  applySchema,
  dropLegacyBudgetIndex,
  startLocalPostgres,
  waitForDatabase,
} from "./support/postgres";
import { createSessionToken, SESSION_COOKIE_NAME } from "./support/session";

const PAGES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/",
  "/transactions",
  "/import",
  "/categories",
  "/investments",
  "/planning",
  "/budgets",
  "/reports",
  "/settings",
];
const API_ROUTES = [
  "/api/me",
  "/api/transactions",
  "/api/categories",
  "/api/budgets",
  "/api/goals",
  "/api/imports",
];

/**
 * Compila todas as rotas uma vez (o `next dev` compila sob demanda) para que
 * o primeiro teste de cada página não pague o custo do cold start.
 */
async function warmUp() {
  const email = `modelo-${randomUUID().slice(0, 8)}@teste.local`;
  const register = await fetch(`${BASE_URL}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Usuário modelo", email, senha: E2E_PASSWORD }),
  });

  if (register.status !== 201) {
    throw new Error(`[e2e] Falha no cadastro de aquecimento: ${register.status} ${await register.text()}`);
  }

  const { user } = (await register.json()) as { user: { id: string; email: string } };
  const cookie = `${SESSION_COOKIE_NAME}=${createSessionToken(user)}`;

  // Usuário modelo: as fixtures clonam o hash de senha e as categorias padrão dele.
  process.env.E2E_TEMPLATE_USER_ID = user.id;

  for (const route of [...API_ROUTES, ...PAGES]) {
    const publicRoute = ["/login", "/forgot-password", "/reset-password"].includes(route);

    await fetch(`${BASE_URL}${route}`, {
      headers: publicRoute ? {} : { cookie },
      redirect: "manual",
    }).catch(() => undefined);
  }

  // Rotas dinâmicas e de escrita (ids inexistentes: só para compilar).
  for (const resource of ["transactions", "categories", "budgets", "goals"]) {
    await fetch(`${BASE_URL}/api/${resource}/warm-up`, { method: "DELETE", headers: { cookie } }).catch(
      () => undefined,
    );
  }

  await fetch(`${BASE_URL}/api/logout`, { method: "POST" }).catch(() => undefined);
}

export default async function globalSetup() {
  const startedAt = Date.now();
  const stopPostgres = await startLocalPostgres();

  try {
    await waitForDatabase();
    applySchema();

    if (await dropLegacyBudgetIndex()) {
      // Lido pelo teste "histórico de migrations..." em 08-multi-tenancy.spec.ts.
      process.env.E2E_LEGACY_BUDGET_INDEX = "1";
      console.warn(
        "[e2e] ATENÇÃO: as migrations deixaram o índice único global budgets_category_month_key " +
          "(categoria+mês, sem userId). Ele foi removido SÓ no banco de teste para a suíte rodar; " +
          "o bug está registrado em 08-multi-tenancy.spec.ts.",
      );
    }
    await warmUp();
  } catch (error) {
    await stopPostgres();
    throw error;
  }

  console.log(`[e2e] Ambiente pronto em ${Math.round((Date.now() - startedAt) / 1000)}s (${BASE_URL}).`);

  return async () => {
    await stopPostgres();
  };
}
