import type { Page } from "@playwright/test";
import bcrypt from "bcryptjs";
import { countRows, expireResetToken, getPasswordHash, getResetTokens } from "./support/db";
import { expect, registerAccount, signIn, test, uniqueEmail } from "./support/fixtures";
import { metric } from "./support/ui";

function submitButton(page: Page, name: string) {
  return page.getByRole("form", { name }).getByRole("button", { name, exact: true });
}

function modeToggle(page: Page, name: string) {
  return page.locator("button[type=button]").filter({ hasText: new RegExp(`^${name}$`) });
}

const PROTECTED_ROUTES = [
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

test.describe("Proteção de rotas", () => {
  for (const route of PROTECTED_ROUTES) {
    test(`visitante é redirecionado de ${route} para /login`, async ({ page }) => {
      await page.goto(route);

      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("heading", { name: "Entrar", level: 1 })).toBeVisible();
    });
  }

  test("APIs de dados respondem 401 sem sessão", async ({ request }) => {
    for (const route of ["/api/me", "/api/transactions", "/api/categories", "/api/budgets", "/api/goals"]) {
      const response = await request.get(route);

      expect(response.status(), route).toBe(401);
    }
  });

  test("cookie de sessão adulterado não dá acesso", async ({ page, context }) => {
    await context.addCookies([
      { name: "session_token", value: "eyJ1c2VySWQiOiJ4In0.assinatura-falsa", domain: "localhost", path: "/" },
    ]);
    await page.goto("/transactions");

    await expect(page).toHaveURL(/\/login$/);
  });

  test("usuário logado que abre /login volta para o início", async ({ page, account }) => {
    await page.goto("/login");

    await expect(page).toHaveURL(/localhost:\d+\/$/);
    await expect(page.getByRole("heading", { level: 1, name: / de \d{4}$/ })).toBeVisible();
    expect(account.id).toBeTruthy();
  });

  test("/budgets redireciona usuário logado para Planejamento", async ({ page, account }) => {
    void account;
    await page.goto("/budgets");

    await expect(page).toHaveURL(/\/planning$/);
    await expect(page.getByRole("heading", { name: "Planejar", level: 1 })).toBeVisible();
  });
});

test.describe("Cadastro pela tela de login", () => {
  test("cria conta, mostra confirmação e gera as 18 categorias padrão", async ({ page }) => {
    const email = uniqueEmail("cadastro");

    await page.goto("/login");
    await modeToggle(page, "Criar conta").click();
    await page.getByLabel("Nome").fill("Maria Cadastro");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill("SenhaForte#123");
    await submitButton(page, "Criar conta").click();

    await expect(
      page.getByText("Conta criada. Agora entre com seu e-mail e senha."),
    ).toBeVisible();
    // Volta para o modo login, mantendo o e-mail e limpando a senha.
    await expect(submitButton(page, "Entrar")).toBeVisible();
    await expect(page.getByLabel("Nome")).toHaveCount(0);
    await expect(page.getByLabel("E-mail")).toHaveValue(email);
    await expect(page.getByLabel("Senha")).toHaveValue("");

    expect(await countRows("users", email)).toBe(1);
    expect(await countRows("categories", email)).toBe(18);

    const hash = await getPasswordHash(email);

    expect(hash).not.toContain("SenhaForte#123");
    expect(await bcrypt.compare("SenhaForte#123", hash ?? "")).toBe(true);
  });

  test("alterna entre os modos Entrar e Criar conta", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("link", { name: "Esqueceu a senha?" })).toBeVisible();
    await modeToggle(page, "Criar conta").click();
    await expect(page.getByLabel("Nome")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Criar conta", level: 1 })).toBeVisible();
    await expect(submitButton(page, "Criar conta")).toBeVisible();
    await expect(page.getByRole("link", { name: "Esqueceu a senha?" })).toHaveCount(0);

    await modeToggle(page, "Entrar").click();
    await expect(page.getByLabel("Nome")).toHaveCount(0);
    await expect(submitButton(page, "Entrar")).toBeVisible();
  });

  test("validação nativa bloqueia campos vazios e senha curta", async ({ page }) => {
    let registerCalls = 0;

    await page.route("**/api/register", async (route) => {
      registerCalls += 1;
      await route.continue();
    });
    await page.goto("/login");
    await modeToggle(page, "Criar conta").click();
    await submitButton(page, "Criar conta").click();

    await expect(page.getByLabel("Nome")).toHaveJSProperty("validity.valueMissing", true);

    await page.getByLabel("Nome").fill("Pessoa Teste");
    await page.getByLabel("E-mail").fill("email-invalido");
    await page.getByLabel("Senha").fill("1234567");
    await submitButton(page, "Criar conta").click();

    await expect(page.getByLabel("E-mail")).toHaveJSProperty("validity.typeMismatch", true);
    await expect(page.getByLabel("Senha")).toHaveJSProperty("validity.tooShort", true);
    expect(registerCalls).toBe(0);
  });

  test("mostra o erro do servidor para e-mail sem domínio válido", async ({ page }) => {
    await page.goto("/login");
    await modeToggle(page, "Criar conta").click();
    await page.getByLabel("Nome").fill("Pessoa Teste");
    // Passa na validação do navegador (type=email) mas não na regex da API.
    await page.getByLabel("E-mail").fill("pessoa@semdominio");
    await page.getByLabel("Senha").fill("SenhaForte#123");
    await submitButton(page, "Criar conta").click();

    await expect(page.getByText(/e-mail válido/i)).toBeVisible();
    await expect(submitButton(page, "Criar conta")).toBeEnabled();
    expect(await countRows("users", "pessoa@semdominio")).toBe(0);
  });

  test("recusa e-mail já cadastrado (inclusive com outra capitalização)", async ({ page, request }) => {
    const existing = await registerAccount(request);

    await page.goto("/login");
    await modeToggle(page, "Criar conta").click();
    await page.getByLabel("Nome").fill("Outra Pessoa");
    await page.getByLabel("E-mail").fill(existing.email.toUpperCase());
    await page.getByLabel("Senha").fill("OutraSenha#456");
    await submitButton(page, "Criar conta").click();

    await expect(page.getByText("Já existe uma conta com este e-mail.")).toBeVisible();
    await expect(submitButton(page, "Criar conta")).toBeVisible();
    expect(await countRows("users", existing.email)).toBe(1);
  });
});

test.describe("Login (API /api/login simulada: exige reCAPTCHA real)", () => {
  test("envia e-mail, senha e token do reCAPTCHA e entra no app", async ({ page, context, request }) => {
    const user = await registerAccount(request, { name: "Lia Login" });
    let payload: Record<string, unknown> | null = null;

    await page.route("**/api/login", async (route) => {
      payload = route.request().postDataJSON() as Record<string, unknown>;
      // O backend real gravaria o cookie; aqui o teste faz esse papel.
      await signIn(context, user);
      await route.fulfill({ json: { success: true, mensagem: "Login efetuado!" } });
    });

    await page.goto("/login");
    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Senha").fill(user.password);
    await submitButton(page, "Entrar").click();

    await expect(page).toHaveURL(/localhost:\d+\/$/);
    await expect(page.getByRole("heading", { level: 1, name: / de \d{4}$/ })).toBeVisible();
    expect(payload).toEqual({
      email: user.email,
      senha: user.password,
      recaptchaToken: "e2e-recaptcha-token",
    });

    await page.goto("/settings");
    await expect(metric(page, "Nome")).toContainText("Lia Login");
    await expect(metric(page, "E-mail")).toContainText(user.email);
  });

  test("mostra a mensagem de credenciais inválidas (401)", async ({ page }) => {
    await page.route("**/api/login", (route) =>
      route.fulfill({ status: 401, json: { error: "E-mail ou senha inválidos." } }),
    );
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("ninguem@teste.local");
    await page.getByLabel("Senha").fill("senha-errada");
    await submitButton(page, "Entrar").click();

    await expect(page.getByText("E-mail ou senha inválidos.")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    await expect(submitButton(page, "Entrar")).toBeEnabled();
    await expect(page.getByLabel("E-mail")).toHaveValue("ninguem@teste.local");
  });

  test("mostra o aviso de muitas tentativas (429)", async ({ page }) => {
    await page.route("**/api/login", (route) =>
      route.fulfill({
        status: 429,
        json: { error: "Muitas tentativas. Tente novamente em alguns minutos." },
      }),
    );
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("ninguem@teste.local");
    await page.getByLabel("Senha").fill("senha-errada");
    await submitButton(page, "Entrar").click();

    await expect(page.getByText("Muitas tentativas. Tente novamente em alguns minutos.")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("desabilita o formulário enquanto a requisição está em andamento", async ({ page }) => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    await page.route("**/api/login", async (route) => {
      await gate;
      await route.fulfill({ status: 401, json: { error: "E-mail ou senha inválidos." } });
    });
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("ninguem@teste.local");
    await page.getByLabel("Senha").fill("senha-errada");
    await submitButton(page, "Entrar").click();

    await expect(page.getByRole("button", { name: "Aguarde..." })).toBeDisabled();
    await expect(page.getByLabel("E-mail")).toBeDisabled();
    release();
    await expect(submitButton(page, "Entrar")).toBeEnabled();
  });

  test("API real de login recusa token de reCAPTCHA inválido sem criar sessão", async ({ request }) => {
    const user = await registerAccount(request);
    const response = await request.post("/api/login", {
      data: { email: user.email, senha: user.password, recaptchaToken: "token-falso" },
    });

    // 403 quando o Google responde "inválido"; 500 se a máquina estiver offline.
    expect([403, 500]).toContain(response.status());
    expect(response.headers()["set-cookie"] ?? "").not.toContain("session_token=ey");
  });

  test("API real de login exige e-mail, senha e token", async ({ request }) => {
    const semSenha = await request.post("/api/login", { data: { email: "a@b.co" } });
    const semToken = await request.post("/api/login", { data: { email: "a@b.co", senha: "12345678" } });

    expect(semSenha.status()).toBe(400);
    expect(semToken.status()).toBe(400);
  });
});

test.describe("Logout", () => {
  test("Sair da conta encerra a sessão e bloqueia as rotas protegidas", async ({ page, context, account }) => {
    await page.goto("/settings");
    await expect(metric(page, "E-mail")).toContainText(account.email);

    await page.getByRole("button", { name: "Sair da conta" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Entrar", level: 1 })).toBeVisible();
    expect((await context.cookies()).find((cookie) => cookie.name === "session_token")).toBeUndefined();

    await page.goto("/transactions");
    await expect(page).toHaveURL(/\/login$/);
    expect((await page.request.get("/api/transactions")).status()).toBe(401);
  });
});

test.describe("Recuperação de senha", () => {
  test("solicita o link, redefine a senha pela tela e invalida o token", async ({ page, request }) => {
    const user = await registerAccount(request);
    const oldHash = await getPasswordHash(user.email);

    await page.goto("/login");
    await page.getByRole("link", { name: "Esqueceu a senha?" }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.getByRole("heading", { name: "Recuperar senha" })).toBeVisible();

    const forgotResponse = page.waitForResponse("**/api/auth/forgot-password");

    await page.getByLabel("E-mail").fill(user.email);
    await page.getByRole("button", { name: "Enviar link" }).click();
    await forgotResponse;

    // O token é gravado antes do envio do e-mail (Resend usa chave fictícia aqui).
    await expect.poll(async () => (await getResetTokens(user.email)).length).toBe(1);

    const [{ token, minutesToExpire, used }] = await getResetTokens(user.email);

    // Validade de 1 hora (src/lib/tokens.ts).
    expect(minutesToExpire).toBeGreaterThan(55);
    expect(minutesToExpire).toBeLessThanOrEqual(60.5);
    expect(used).toBe(false);

    await page.goto(`/reset-password?token=${token}`);
    await expect(page.getByRole("heading", { name: "Nova senha" })).toBeVisible();

    await page.getByLabel("Nova senha").fill("NovaSenha#789");
    await page.getByLabel("Confirmar senha").fill("NovaSenha#000");
    await page.getByRole("button", { name: "Redefinir senha" }).click();
    await expect(page.getByText("As senhas não coincidem.")).toBeVisible();
    expect(await getPasswordHash(user.email)).toBe(oldHash);

    await page.getByLabel("Confirmar senha").fill("NovaSenha#789");
    await page.getByRole("button", { name: "Redefinir senha" }).click();
    await expect(
      page.getByText("Senha redefinida. Redirecionando para o login..."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);

    const newHash = await getPasswordHash(user.email);

    expect(newHash).not.toBe(oldHash);
    expect(await bcrypt.compare("NovaSenha#789", newHash ?? "")).toBe(true);
    expect(await bcrypt.compare(user.password, newHash ?? "")).toBe(false);
    expect((await getResetTokens(user.email))[0].used).toBe(true);

    // Reutilizar o mesmo link não funciona.
    await page.goto(`/reset-password?token=${token}`);
    await page.getByLabel("Nova senha").fill("OutraSenha#111");
    await page.getByLabel("Confirmar senha").fill("OutraSenha#111");
    await page.getByRole("button", { name: "Redefinir senha" }).click();
    await expect(page.getByText("Link inválido ou expirado.")).toBeVisible();
    expect(await getPasswordHash(user.email)).toBe(newHash);
  });

  test("token expirado é recusado", async ({ page, request }) => {
    const user = await registerAccount(request);
    const oldHash = await getPasswordHash(user.email);

    await request.post("/api/auth/forgot-password", { data: { email: user.email } });
    await expect.poll(async () => (await getResetTokens(user.email)).length).toBe(1);

    const [{ token }] = await getResetTokens(user.email);

    await expireResetToken(token);
    await page.goto(`/reset-password?token=${token}`);
    await page.getByLabel("Nova senha").fill("NovaSenha#789");
    await page.getByLabel("Confirmar senha").fill("NovaSenha#789");
    await page.getByRole("button", { name: "Redefinir senha" }).click();

    await expect(page.getByText("Link inválido ou expirado.")).toBeVisible();
    expect(await getPasswordHash(user.email)).toBe(oldHash);
  });

  test("token inexistente é recusado e sem token o botão fica desabilitado", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.getByRole("button", { name: "Redefinir senha" })).toBeDisabled();

    await page.goto("/reset-password?token=token-que-nao-existe");
    await page.getByLabel("Nova senha").fill("NovaSenha#789");
    await page.getByLabel("Confirmar senha").fill("NovaSenha#789");
    await page.getByRole("button", { name: "Redefinir senha" }).click();

    await expect(page.getByText("Link inválido ou expirado.")).toBeVisible();
  });

  test("e-mail desconhecido recebe a mesma resposta e não gera token", async ({ page }) => {
    const email = uniqueEmail("fantasma");

    await page.goto("/forgot-password");
    await page.getByLabel("E-mail").fill(email);
    await page.getByRole("button", { name: "Enviar link" }).click();

    await expect(
      page.getByText("Se este e-mail estiver cadastrado, você vai receber um link para redefinir a senha."),
    ).toBeVisible();
    await expect(page.getByLabel("E-mail")).toHaveValue("");
    expect(await getResetTokens(email)).toHaveLength(0);

    await page.getByRole("link", { name: "Voltar para o login" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("link sem token avisa o usuário em vez de mostrar um formulário inútil", async ({ page }) => {
    await page.goto("/reset-password");

    await expect(page.getByText(/token inválido|link inválido/i)).toBeVisible({ timeout: 3000 });
  });
});

test.describe("Guia de uso", () => {
  test("é público e abre pela tela de entrada", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Como funciona o Finance-app?" }).click();

    await expect(page).toHaveURL(/\/ajuda$/);
    await expect(page.getByRole("heading", { name: "Como usar o Finance-app", level: 1 })).toBeVisible();

    await page.getByRole("navigation", { name: "Nesta página" }).getByRole("link", { name: "Importe a fatura do cartão" }).click();
    await expect(page).toHaveURL(/#importar$/);
    await expect(page.getByRole("heading", { name: "Importe a fatura do cartão", level: 2 })).toBeInViewport();
  });

  test("usuário logado chega pelo menu", async ({ page, account }) => {
    void account;
    await page.goto("/settings");
    await page.getByRole("link", { name: "Como usar o app" }).click();

    await expect(page).toHaveURL(/\/ajuda$/);
    await expect(page.getByRole("img", { name: /Folha Registrar/ })).toBeVisible();
  });
});

