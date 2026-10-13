import path from "node:path";
import dotenv from "dotenv";

export const ROOT_DIR = path.resolve(__dirname, "../../..");

dotenv.config({ path: path.join(ROOT_DIR, ".env"), quiet: true });

export const E2E_PORT = Number(process.env.E2E_PORT ?? 3100);
export const BASE_URL = `http://localhost:${E2E_PORT}`;
export const PG_DATA_DIR = path.join(ROOT_DIR, ".e2e-pg", "data");

/**
 * "Agora" fixo usado pelo relógio do navegador nos testes (12h em São Paulo).
 * Mantém a suíte determinística: o app calcula "hoje" e o mês corrente no
 * cliente, então os valores esperados mudariam conforme o dia/hora reais.
 * Os casos de borda (22h30, último dia do mês) trocam o relógio via `clockNow`.
 */
export const E2E_NOW = "2026-10-15T15:00:00.000Z";
export const E2E_MONTH = "2026-10";
export const E2E_MONTH_LABEL = "outubro de 2026";
export const E2E_TIMEZONE = "America/Sao_Paulo";

/** Senha de todos os usuários criados pela suíte (não é segredo: só existe no banco local descartável). */
export const E2E_PASSWORD = "SenhaForte#123";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export type DatabaseConfig = {
  url: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

/**
 * Lê DATABASE_URL/DIRECT_URL do .env e garante que ambas apontam para um
 * Postgres local. A suíte E2E NUNCA deve rodar contra um banco remoto.
 */
export function getDatabaseConfig(): DatabaseConfig {
  const url = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;

  if (!url || !directUrl) {
    throw new Error("[e2e] DATABASE_URL e DIRECT_URL precisam estar definidas no .env local.");
  }

  for (const candidate of [url, directUrl]) {
    const { hostname } = new URL(candidate);

    if (!LOCAL_HOSTS.has(hostname)) {
      throw new Error(
        `[e2e] Abortado: a URL do banco aponta para "${hostname}". A suíte E2E só roda contra Postgres local.`,
      );
    }
  }

  const parsed = new URL(url);

  return {
    url,
    host: parsed.hostname,
    port: Number(parsed.port || 5432),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
  };
}

export function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("[e2e] SESSION_SECRET ausente ou curta demais no .env local.");
  }

  return secret;
}
