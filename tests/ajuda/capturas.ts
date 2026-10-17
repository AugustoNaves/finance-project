import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";
import { buildPdf } from "../support/pdf";
import { E2E_PASSWORD, E2E_TIMEZONE, ROOT_DIR } from "../e2e/support/env";
import { applySchema, startLocalPostgres, waitForDatabase } from "../e2e/support/postgres";
import { createSessionToken } from "../e2e/support/session";

/**
 * Gera as capturas do guia /ajuda (public/ajuda/*.jpg) com dados fictícios.
 * Uso: npx vite-node tests/ajuda/capturas.ts
 * Sobe o Postgres local (o mesmo do E2E) e o app em modo dev na porta 3200.
 */

const PORT = 3200;
const BASE = `http://localhost:${PORT}`;
const OUT_DIR = path.join(ROOT_DIR, "public", "ajuda");
const NOW = "2026-10-15T15:00:00.000Z";

const TRANSACTIONS: [string, number, "income" | "outcome" | "investment", string, string][] = [
  ["Salário", 6200, "income", "Salário", "2026-10-05"],
  ["Projeto de design", 1400, "income", "Freelance", "2026-10-12"],
  ["Aluguel", 1900, "outcome", "Moradia", "2026-10-05"],
  ["Mercado da semana", 412.3, "outcome", "Alimentação", "2026-10-08"],
  ["Padaria", 18.5, "outcome", "Alimentação", "2026-10-14"],
  ["Ônibus", 9.4, "outcome", "Transporte", "2026-10-15"],
  ["Conta de luz", 164.9, "outcome", "Contas", "2026-10-10"],
  ["Internet", 99.9, "outcome", "Contas", "2026-10-10"],
  ["Cinema", 52, "outcome", "Lazer", "2026-10-11"],
  ["Farmácia", 37.8, "outcome", "Saúde", "2026-10-13"],
  ["Tesouro Selic", 600, "investment", "Renda Fixa", "2026-10-06"],
  ["Salário", 6200, "income", "Salário", "2026-09-05"],
  ["Aluguel", 1900, "outcome", "Moradia", "2026-09-05"],
  ["Mercado", 520, "outcome", "Alimentação", "2026-09-09"],
  ["Tesouro Selic", 600, "investment", "Renda Fixa", "2026-09-06"],
];

const INVOICE_LINES = [
  "Nubank",
  "Fatura de cartão de crédito",
  "Vencimento 10/10/2026",
  "Total da fatura R$ 248,70",
  "12/09 RESTAURANTE SABOR 64,90",
  "13/09 POSTO DE GASOLINA 120,00",
  "18/09 LIVRARIA CENTRAL 2/3 63,80",
  "05/09 PAGAMENTO RECEBIDO -310,00",
];

async function waitForApp(url: string, timeoutMs = 180_000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);

      if (response.ok) return;
    } catch {
      // ainda subindo
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`O app não respondeu em ${url}`);
}

async function seedAccount() {
  const email = `guia-${Date.now()}@teste.local`;
  const register = await fetch(`${BASE}/api/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Ana", email, senha: E2E_PASSWORD }),
  });
  const { user } = (await register.json()) as { user: { id: string } };
  const token = createSessionToken({ id: user.id, email });
  const headers = { "content-type": "application/json", cookie: `session_token=${token}` };
  const post = (route: string, body: object) =>
    fetch(`${BASE}${route}`, { method: "POST", headers, body: JSON.stringify(body) });

  for (const [description, amount, type, category, date] of TRANSACTIONS) {
    const signed = type === "income" ? amount : -amount;

    await post("/api/transactions", { description, amount: signed, type, category, date, paymentMethod: "Pix" });
  }

  await post("/api/budgets", { category: "Alimentação", amount: 550, month: "2026-10" });
  await post("/api/budgets", { category: "Lazer", amount: 250, month: "2026-10" });
  await post("/api/budgets", { category: "Contas", amount: 300, month: "2026-10" });
  await post("/api/goals", { name: "Reserva de emergência", targetAmount: 20000, currentAmount: 7400, deadline: "2027-06-30" });
  await post("/api/goals", { name: "Viagem de férias", targetAmount: 6000, currentAmount: 1500, deadline: "2027-01-15" });

  return token;
}

async function shot(page: Page, name: string) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.jpg`), type: "jpeg", quality: 82 });
  console.log(`  ✓ ${name}.jpg`);
}

async function capture(token: string) {
  const browser = await chromium.launch({ args: ["--lang=pt-BR"] });
  const context = await browser.newContext({
    viewport: { width: 390, height: 780 },
    deviceScaleFactor: 2,
    locale: "pt-BR",
    timezoneId: E2E_TIMEZONE,
    colorScheme: "light",
  });

  await context.clock.install({ time: new Date(NOW) });
  await context.clock.resume();
  await context.addCookies([{ name: "session_token", value: token, domain: "localhost", path: "/" }]);

  const page = await context.newPage();
  const tabBar = page.getByRole("navigation", { name: "Navegação principal" });

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await shot(page, "mes");

  await tabBar.getByRole("button", { name: "Registrar" }).click();
  await page.getByRole("dialog", { name: "Registrar" }).getByRole("radio", { name: "Alimentação" }).waitFor();
  await page.getByLabel("Valor").fill("32,90");
  await page.getByLabel("Descrição").fill("Almoço");
  await page.getByLabel("Valor").focus();
  await shot(page, "registrar");
  await page.keyboard.press("Escape");

  await page.goto(`${BASE}/transactions`, { waitUntil: "networkidle" });
  await shot(page, "lancamentos");

  await page.getByRole("main").getByRole("button", { name: /^Cinema,/ }).click();
  await page.getByRole("dialog", { name: "Editar lançamento" }).waitFor();
  await shot(page, "editar");
  await page.keyboard.press("Escape");

  await page.goto(`${BASE}/import`, { waitUntil: "networkidle" });
  await page.getByLabel("Arquivo PDF da fatura").setInputFiles({
    name: "fatura-outubro.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(buildPdf([INVOICE_LINES])),
  });
  await page.getByRole("heading", { name: "Conferir os lançamentos" }).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -16));
  await shot(page, "importar");

  await page.goto(`${BASE}/planning`, { waitUntil: "networkidle" });
  await shot(page, "planejar");

  await page.goto(`${BASE}/categories`, { waitUntil: "networkidle" });
  await shot(page, "categorias");

  await page.goto(`${BASE}/reports`, { waitUntil: "networkidle" });
  await shot(page, "relatorios");

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await tabBar.getByRole("button", { name: "Mais" }).click();
  await page.getByRole("dialog", { name: "Mais" }).waitFor();
  await shot(page, "mais");

  await browser.close();
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const stopDatabase = await startLocalPostgres();
  let app: ChildProcess | null = null;

  try {
    await waitForDatabase();
    applySchema();

    app = spawn("npx", ["next", "dev", "--port", String(PORT)], {
      cwd: ROOT_DIR,
      env: { ...process.env, PORT: String(PORT) },
      stdio: "ignore",
    });
    await waitForApp(`${BASE}/login`);

    console.log("Gerando capturas do guia em public/ajuda/ …");
    await capture(await seedAccount());
  } finally {
    app?.kill("SIGTERM");
    await stopDatabase();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
