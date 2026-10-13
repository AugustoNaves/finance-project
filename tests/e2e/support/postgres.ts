import { execFileSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { Client } from "pg";
import { getDatabaseConfig, PG_DATA_DIR, ROOT_DIR } from "./env";

type StopFn = () => Promise<void>;

function isPortOpen(port: number, host = "127.0.0.1") {
  return new Promise<boolean>((resolve) => {
    const socket = net.connect({ port, host });

    socket.setTimeout(1000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(false));
  });
}

/**
 * Sobe um Postgres real (binários do pacote `embedded-postgres`, sem Docker)
 * na porta definida em DATABASE_URL. O diretório de dados é descartável:
 * cada execução da suíte parte de um cluster novo.
 */
export async function startLocalPostgres(): Promise<StopFn> {
  const config = getDatabaseConfig();

  if (await isPortOpen(config.port)) {
    console.log(`[e2e] Postgres já está escutando em ${config.port}; reutilizando.`);
    return async () => {};
  }

  fs.rmSync(PG_DATA_DIR, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(PG_DATA_DIR), { recursive: true });

  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  const server = new EmbeddedPostgres({
    databaseDir: PG_DATA_DIR,
    user: config.user,
    password: config.password,
    port: config.port,
    persistent: false,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    onLog: () => {},
    onError: (message) => {
      if (process.env.E2E_DEBUG) console.error("[e2e][postgres]", message);
    },
  });

  await server.initialise();
  await server.start();
  await server.createDatabase(config.database);
  console.log(`[e2e] Postgres local iniciado em ${config.host}:${config.port}/${config.database}`);

  return async () => {
    await server.stop();
    fs.rmSync(path.dirname(PG_DATA_DIR), { recursive: true, force: true });
    console.log("[e2e] Postgres local finalizado.");
  };
}

/**
 * Aplica o schema. Tenta o histórico de migrations (`migrate deploy`); se ele
 * falhar em um banco vazio, cai para `db push` e avisa — isso é um achado.
 */
export function applySchema() {
  const prismaBin = path.join(ROOT_DIR, "node_modules", ".bin", "prisma");
  const options = { cwd: ROOT_DIR, env: process.env, stdio: "pipe" as const };

  try {
    execFileSync(prismaBin, ["migrate", "deploy"], options);
    console.log("[e2e] Schema aplicado com `prisma migrate deploy`.");
    return "migrate" as const;
  } catch (error) {
    const output = error instanceof Error && "stderr" in error ? String(error.stderr) : String(error);

    console.warn(
      "[e2e] ATENÇÃO: `prisma migrate deploy` falhou em banco novo; usando `prisma db push`.\n" + output,
    );
    execFileSync(prismaBin, ["db", "push"], options);
    return "push" as const;
  }
}

export async function waitForDatabase() {
  const config = getDatabaseConfig();
  const client = new Client({ connectionString: config.url });

  await client.connect();
  await client.query("select 1");
  await client.end();
}

/**
 * A migration 20260630090000_add_budgets cria o índice único global
 * "budgets_category_month_key" e a 20260701090000 tenta removê-lo com
 * `DROP CONSTRAINT IF EXISTS`, que não remove índices. Num banco criado pelas
 * migrations, dois usuários não conseguem ter orçamento da mesma categoria no
 * mesmo mês. Remove o índice apenas no banco de teste e informa se ele existia.
 */
export async function dropLegacyBudgetIndex() {
  const client = new Client({ connectionString: getDatabaseConfig().url });

  await client.connect();

  try {
    const result = await client.query(
      "select 1 from pg_indexes where tablename = 'budgets' and indexname = 'budgets_category_month_key'",
    );

    if (result.rowCount === 0) return false;

    await client.query('drop index "budgets_category_month_key"');
    return true;
  } finally {
    await client.end();
  }
}
