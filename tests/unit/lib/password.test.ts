import { beforeAll, describe, expect, it } from "vitest";
import { comparePassword, hashPassword } from "@/lib/password";

const BCRYPT_TIMEOUT_MS = 60_000;
const knownHash = "$2b$04$2gAfiLxwVpuLeDjtd/bPYeOV4Nl7fZ26LWlREWIGnKWh3YOqyftPy";

let firstHash: string;
let secondHash: string;

beforeAll(async () => {
  firstHash = await hashPassword("senha-secreta");
  secondHash = await hashPassword("senha-secreta");
}, BCRYPT_TIMEOUT_MS);

describe("hashPassword", () => {
  it("gera um hash bcrypt com custo 12 diferente da senha original", () => {
    expect(firstHash).not.toBe("senha-secreta");
    expect(firstHash).toMatch(/^\$2[aby]\$12\$.{53}$/);
  });

  it("gera hashes diferentes para a mesma senha (salt aleatório)", () => {
    expect(firstHash).not.toBe(secondHash);
  });
});

describe("comparePassword", () => {
  it(
    "retorna true para a senha correta contra um hash recém-gerado",
    async () => {
      await expect(comparePassword("senha-secreta", firstHash)).resolves.toBe(true);
    },
    BCRYPT_TIMEOUT_MS,
  );

  it("retorna true para a senha correta contra um hash conhecido", async () => {
    await expect(comparePassword("senha-teste", knownHash)).resolves.toBe(true);
  });

  it("retorna false para a senha incorreta", async () => {
    await expect(comparePassword("senha-errada", knownHash)).resolves.toBe(false);
  });

  it("diferencia maiúsculas de minúsculas", async () => {
    await expect(comparePassword("Senha-Teste", knownHash)).resolves.toBe(false);
  });

  it("retorna false para hash inválido", async () => {
    await expect(comparePassword("senha-teste", "hash-invalido")).resolves.toBe(false);
  });

  it("retorna false para senha vazia", async () => {
    await expect(comparePassword("", knownHash)).resolves.toBe(false);
  });
});
