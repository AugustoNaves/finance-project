import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";
import { ROOT_DIR } from "../e2e/support/env";

/**
 * Gera os ícones do PWA e as telas de abertura do iPhone com a fonte Literata do app.
 * Uso: npx vite-node tests/pwa/gerar-imagens.ts (sobe o app em modo dev na porta 3201).
 * Depois de mudar a arte, incremente VERSION em public/sw.js.
 */

const APP_NAME = "Finance App";
const PORT = 3201;
const BASE = `http://localhost:${PORT}`;
const PAPER = { light: "#eef2ea", dark: "#121815" };
const RULE = { light: "#d3dccf", dark: "#26332c" };
const INK = { light: "#2f5d50", dark: "#8cc7ad" };
const TEXT = { light: "#1f2b26", dark: "#e3ebe4" };
const SPLASH_SIZES: [number, number][] = [
  [1170, 2532],
  [1179, 2556],
  [1290, 2796],
  [1125, 2436],
  [750, 1334],
];

type Theme = "light" | "dark";

function mark(size: number, { scale = 1, radius = 0, theme = "light" as Theme } = {}) {
  const glyph = size * scale;
  const step = Math.round(size * 0.1);
  const line = Math.max(1, Math.round(size / 160));
  const rule = Math.max(1, glyph * 0.022);

  return `<div style="width:${size}px;height:${size}px;border-radius:${radius}px;overflow:hidden;display:grid;place-items:center;background:${PAPER[theme]} repeating-linear-gradient(to bottom, transparent 0 ${step - line}px, ${RULE[theme]} ${step - line}px ${step}px)">
    <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(${glyph * 0.02}px)">
      <span style="font-family:var(--font-figures);font-weight:500;font-size:${glyph * 0.6}px;line-height:.9;color:${INK[theme]}">F</span>
      <span style="display:block;box-sizing:border-box;width:${glyph * 0.44}px;height:${Math.max(3, glyph * 0.075)}px;margin-top:${glyph * 0.03}px;border-top:${rule}px solid ${INK[theme]};border-bottom:${rule}px solid ${INK[theme]}"></span>
    </div>
  </div>`;
}

function splash(width: number, height: number, theme: Theme) {
  const icon = Math.round(width * 0.26);

  return `<div style="width:${width}px;height:${height}px;background:${PAPER[theme]};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${width * 0.05}px">
    <div style="border-radius:${icon * 0.22}px;overflow:hidden">${mark(icon, { theme })}</div>
    <span style="font-family:var(--font-figures);font-weight:500;font-size:${width * 0.065}px;color:${TEXT[theme]}">${APP_NAME}</span>
  </div>`;
}

async function shoot(page: Page, html: string, width: number, height: number, file: string, transparent = false) {
  await page.setViewportSize({ width, height });
  await page.evaluate((markup) => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    document.body.innerHTML = `<div id="cap" style="position:fixed;inset:0">${markup}</div>`;
  }, html);
  await page.evaluate(() => document.fonts.ready);

  const target = path.join(ROOT_DIR, file);

  fs.mkdirSync(path.dirname(target), { recursive: true });
  await page.locator("#cap > div").first().screenshot({ path: target, omitBackground: transparent });
  console.log(`  ✓ ${file}`);
}

async function waitForApp(url: string, timeoutMs = 180_000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // ainda subindo
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`O app não respondeu em ${url}`);
}

async function main() {
  const app: ChildProcess = spawn("npx", ["next", "dev", "--port", String(PORT)], {
    cwd: ROOT_DIR,
    env: { ...process.env, PORT: String(PORT) },
    stdio: "ignore",
  });

  try {
    await waitForApp(`${BASE}/offline`);

    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto(`${BASE}/offline`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    await shoot(page, mark(512, { radius: 112, scale: 0.9 }), 512, 512, "public/icons/icon-512.png", true);
    await shoot(page, mark(192, { radius: 42, scale: 0.9 }), 192, 192, "public/icons/icon-192.png", true);
    await shoot(page, mark(512, { scale: 0.72 }), 512, 512, "public/icons/maskable-512.png");
    await shoot(page, mark(192, { scale: 0.72 }), 192, 192, "public/icons/maskable-192.png");
    await shoot(page, mark(180, { scale: 0.86 }), 180, 180, "src/app/apple-icon.png");
    await shoot(page, mark(96, { radius: 20, scale: 0.95 }), 96, 96, "src/app/icon.png", true);

    for (const [width, height] of SPLASH_SIZES) {
      for (const theme of ["light", "dark"] as const) {
        await shoot(page, splash(width, height, theme), width, height, `public/splash/splash-${width}x${height}-${theme}.png`);
      }
    }

    await browser.close();
  } finally {
    app.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
