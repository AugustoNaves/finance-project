import { defineConfig, devices } from "@playwright/test";
import { BASE_URL, E2E_PORT, E2E_TIMEZONE, getDatabaseConfig } from "./tests/e2e/support/env";

// Falha cedo se o .env apontar para qualquer coisa que não seja Postgres local.
getDatabaseConfig();

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
  globalSetup: "./tests/e2e/global-setup.ts",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // 1 nova tentativa: o `next dev` às vezes trava alguns segundos (recompilação/GC)
  // e o Playwright sinaliza o teste como "flaky" em vez de falhar a suíte.
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 4,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: BASE_URL,
    locale: "pt-BR",
    timezoneId: E2E_TIMEZONE,
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${E2E_PORT}`,
    url: `${BASE_URL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
    env: { PORT: String(E2E_PORT) },
  },
});
