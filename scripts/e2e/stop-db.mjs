#!/usr/bin/env node
// Limpeza manual do Postgres local da suíte E2E.
// Uso: node scripts/e2e/stop-db.mjs
//
// O global-setup do Playwright já encerra o banco ao final de cada execução.
// Este script só é necessário se a execução for interrompida à força (kill -9)
// e o processo `postgres` ficar órfão segurando a porta 54329.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const clusterDir = path.join(rootDir, ".e2e-pg");
const pidFile = path.join(clusterDir, "data", "postmaster.pid");

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function stopPostgres() {
  if (!fs.existsSync(pidFile)) {
    console.log("[e2e] Nenhum Postgres de teste em execução (postmaster.pid não encontrado).");
    return;
  }

  const pid = Number(fs.readFileSync(pidFile, "utf-8").split("\n")[0]);

  if (!Number.isInteger(pid) || !isAlive(pid)) {
    console.log("[e2e] postmaster.pid órfão; apenas removendo o diretório de dados.");
    return;
  }

  // SIGINT = "fast shutdown" do Postgres.
  process.kill(pid, "SIGINT");

  for (let attempt = 0; attempt < 50 && isAlive(pid); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (isAlive(pid)) {
    process.kill(pid, "SIGKILL");
  }

  console.log(`[e2e] Postgres de teste (pid ${pid}) finalizado.`);
}

await stopPostgres();
fs.rmSync(clusterDir, { recursive: true, force: true });
console.log("[e2e] Diretório .e2e-pg removido.");
