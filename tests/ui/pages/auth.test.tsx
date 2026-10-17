import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPasswordPage from "@/app/forgot-password/page";
import LoginPage from "@/app/login/page";
import ResetPasswordPage from "@/app/reset-password/page";
import { mockApi, networkError, reply, replyRaw } from "../helpers/api";
import { navigationMock, setSearchParams } from "../helpers/navigation";
import { renderUi } from "../helpers/render";

const recaptcha = vi.hoisted(() => ({
  executeRecaptcha: undefined as undefined | ((action: string) => Promise<string>),
}));

vi.mock("react-google-recaptcha-v3", () => ({
  GoogleReCaptchaProvider: ({ children }: { children: ReactNode }) => children,
  useGoogleReCaptcha: () => ({ executeRecaptcha: recaptcha.executeRecaptcha }),
}));

function submitButton(name: string) {
  return within(screen.getByRole("form", { name })).getByRole("button", { name });
}

function modeToggle(name: string) {
  const button = screen.getByRole("button", { name });

  expect(button).toHaveAttribute("type", "button");
  expect(screen.getByRole("form")).not.toContainElement(button);
  return button;
}

describe("Página de login", () => {
  let executeRecaptcha: ReturnType<typeof vi.fn<(action: string) => Promise<string>>>;

  beforeEach(() => {
    executeRecaptcha = vi.fn<(action: string) => Promise<string>>().mockResolvedValue("token-recaptcha");
    recaptcha.executeRecaptcha = executeRecaptcha;
    window.history.replaceState({}, "", "/login");
  });

  async function fillLogin(user: ReturnType<typeof renderUi>["user"]) {
    await user.type(screen.getByLabelText("E-mail"), "maria@teste.com");
    await user.type(screen.getByLabelText("Senha"), "segredo123");
  }

  it("abre no modo login: e-mail, senha, link de recuperação e sem campo de nome", () => {
    mockApi();
    renderUi(<LoginPage />);

    expect(screen.getByRole("heading", { name: "Entrar", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Suas contas do mês, num caderno que cabe no bolso.")).toBeInTheDocument();
    expect(modeToggle("Criar conta")).toBeEnabled();
    expect(screen.getByLabelText("E-mail")).toBeRequired();
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Senha")).toBeRequired();
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password");
    expect(screen.queryByLabelText("Nome")).toBeNull();
    expect(submitButton("Entrar")).toBeEnabled();
    expect(screen.getByRole("link", { name: "Esqueceu a senha?" })).toHaveAttribute("href", "/forgot-password");
  });

  it("não envia com campos vazios", async () => {
    const api = mockApi();
    const { user } = renderUi(<LoginPage />);

    await user.click(submitButton("Entrar"));

    expect(api.calls).toHaveLength(0);
    expect(executeRecaptcha).not.toHaveBeenCalled();
  });

  it("login com sucesso: envia e-mail, senha e token do reCAPTCHA e navega para '/'", async () => {
    // jsdom não implementa navegação: `window.location.href = "/"` vira um erro "Not implemented: navigation".
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const api = mockApi({ "POST /api/login": { ok: true } });
    const { user } = renderUi(<LoginPage />);

    await fillLogin(user);
    await user.click(submitButton("Entrar"));

    await waitFor(() => expect(api.callsTo("POST", "/api/login")).toHaveLength(1));
    expect(executeRecaptcha).toHaveBeenCalledWith("login");
    expect(api.callsTo("POST", "/api/login")[0]).toMatchObject({
      body: { email: "maria@teste.com", senha: "segredo123", recaptchaToken: "token-recaptcha" },
      headers: { "content-type": "application/json" },
    });
    await waitFor(() => expect(submitButton("Entrar")).toBeEnabled());
    expect(screen.queryByText(/Não foi possível|Erro inesperado/)).toBeNull();
    await waitFor(() =>
      expect(
        consoleError.mock.calls.some((args) =>
          args.some((arg) => String((arg as Error)?.message ?? arg).includes("Not implemented: navigation")),
        ),
      ).toBe(true),
    );
  });

  it("credenciais inválidas: mostra a mensagem de erro da API e não navega", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockApi({ "POST /api/login": reply(401, { error: "E-mail ou senha inválidos." }) });
    const { user } = renderUi(<LoginPage />);

    await fillLogin(user);
    await user.click(submitButton("Entrar"));

    expect(await screen.findByText("E-mail ou senha inválidos.")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toHaveValue("maria@teste.com");
    expect(submitButton("Entrar")).toBeEnabled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("erro sem campo 'error' usa a mensagem padrão", async () => {
    mockApi({ "POST /api/login": reply(500, {}) });
    const { user } = renderUi(<LoginPage />);

    await fillLogin(user);
    await user.click(submitButton("Entrar"));

    expect(await screen.findByText("Não foi possível entrar.")).toBeInTheDocument();
  });

  it("avisa quando o reCAPTCHA ainda não carregou e não chama a API", async () => {
    recaptcha.executeRecaptcha = undefined;
    const api = mockApi();
    const { user } = renderUi(<LoginPage />);

    await fillLogin(user);
    await user.click(submitButton("Entrar"));

    expect(await screen.findByText("reCAPTCHA ainda não carregou. Tente novamente.")).toBeInTheDocument();
    expect(api.calls).toHaveLength(0);
  });

  it("falha de rede ou do reCAPTCHA mostra 'Erro inesperado'", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    executeRecaptcha.mockRejectedValueOnce(new Error("recaptcha fora do ar"));
    const api = mockApi({ "POST /api/login": networkError() });
    const { user } = renderUi(<LoginPage />);

    await fillLogin(user);
    await user.click(submitButton("Entrar"));
    expect(await screen.findByText("Erro inesperado. Tente novamente.")).toBeInTheDocument();
    expect(api.calls).toHaveLength(0);

    await user.click(submitButton("Entrar"));
    await waitFor(() => expect(api.callsTo("POST", "/api/login")).toHaveLength(1));
    expect(await screen.findByText("Erro inesperado. Tente novamente.")).toBeInTheDocument();
  });

  it("[comportamento atual] resposta de erro não-JSON vira 'Erro inesperado' (log fala em reCAPTCHA)", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockApi({ "POST /api/login": replyRaw(502, "<html>Bad Gateway</html>") });
    const { user } = renderUi(<LoginPage />);

    await fillLogin(user);
    await user.click(submitButton("Entrar"));

    expect(await screen.findByText("Erro inesperado. Tente novamente.")).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith("Erro ao gerar o token do reCAPTCHA:", expect.anything());
  });

  it("desabilita campos e botão ('Aguarde...') enquanto a requisição está pendente", async () => {
    let respond: (value: unknown) => void = () => {};
    mockApi({ "POST /api/login": () => new Promise((resolve) => (respond = resolve)) });
    const { user } = renderUi(<LoginPage />);

    await fillLogin(user);
    await user.click(submitButton("Entrar"));

    expect(await screen.findByRole("button", { name: "Aguarde..." })).toBeDisabled();
    expect(screen.getByLabelText("E-mail")).toBeDisabled();
    expect(screen.getByLabelText("Senha")).toBeDisabled();
    expect(modeToggle("Criar conta")).toBeDisabled();

    respond(reply(401, { error: "E-mail ou senha inválidos." }));
    await waitFor(() => expect(submitButton("Entrar")).toBeEnabled());
  });

  it("alterna para o modo cadastro (campo Nome, senha mínima de 8, sem link de recuperação) e volta", async () => {
    mockApi({ "POST /api/login": reply(401, { error: "E-mail ou senha inválidos." }) });
    const { user } = renderUi(<LoginPage />);

    expect(screen.getByLabelText("Senha")).not.toHaveAttribute("minlength");
    await fillLogin(user);
    await user.click(submitButton("Entrar"));
    await screen.findByText("E-mail ou senha inválidos.");

    await user.click(modeToggle("Criar conta"));

    expect(screen.getByRole("heading", { name: "Criar conta", level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toBeRequired();
    expect(screen.getByLabelText("Senha")).toHaveAttribute("minlength", "8");
    expect(submitButton("Criar conta")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Esqueceu a senha?" })).toBeNull();
    // Trocar de modo limpa a mensagem, mas mantém o que foi digitado.
    expect(screen.queryByText("E-mail ou senha inválidos.")).toBeNull();
    expect(screen.getByLabelText("E-mail")).toHaveValue("maria@teste.com");

    await user.click(modeToggle("Entrar"));
    expect(screen.queryByLabelText("Nome")).toBeNull();
    expect(submitButton("Entrar")).toBeInTheDocument();
  });

  it("cadastro: exige nome e não envia sem ele", async () => {
    const api = mockApi();
    const { user } = renderUi(<LoginPage />);

    await user.click(modeToggle("Criar conta"));
    await fillLogin(user);
    await user.click(submitButton("Criar conta"));

    expect(api.calls).toHaveLength(0);
  });

  it("cadastro com sucesso: POST /api/register (sem reCAPTCHA), volta ao login com mensagem e limpa a senha", async () => {
    const api = mockApi({ "POST /api/register": reply(201, { id: "u1" }) });
    const { user } = renderUi(<LoginPage />);

    await user.click(modeToggle("Criar conta"));
    await user.type(screen.getByLabelText("Nome"), "Maria Teste");
    await fillLogin(user);
    await user.click(submitButton("Criar conta"));

    expect(
      await screen.findByText("Conta criada. Agora entre com seu e-mail e senha."),
    ).toBeInTheDocument();
    expect(api.calls).toEqual([
      expect.objectContaining({
        method: "POST",
        path: "/api/register",
        body: { name: "Maria Teste", email: "maria@teste.com", senha: "segredo123" },
      }),
    ]);
    expect(executeRecaptcha).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Nome")).toBeNull();
    expect(submitButton("Entrar")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toHaveValue("maria@teste.com");
    expect(screen.getByLabelText("Senha")).toHaveValue("");
  });

  it("cadastro com erro: mostra a mensagem da API e permanece no modo cadastro", async () => {
    mockApi({ "POST /api/register": reply(409, { error: "E-mail já cadastrado." }) });
    const { user } = renderUi(<LoginPage />);

    await user.click(modeToggle("Criar conta"));
    await user.type(screen.getByLabelText("Nome"), "Maria Teste");
    await fillLogin(user);
    await user.click(submitButton("Criar conta"));

    expect(await screen.findByText("E-mail já cadastrado.")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toHaveValue("Maria Teste");
    expect(screen.getByLabelText("Senha")).toHaveValue("segredo123");
    expect(submitButton("Criar conta")).toBeEnabled();
  });

  it("cadastro com erro sem campo 'error' usa a mensagem padrão", async () => {
    mockApi({ "POST /api/register": reply(500, {}) });
    const { user } = renderUi(<LoginPage />);

    await user.click(modeToggle("Criar conta"));
    await user.type(screen.getByLabelText("Nome"), "Maria Teste");
    await fillLogin(user);
    await user.click(submitButton("Criar conta"));

    expect(await screen.findByText("Não foi possível criar a conta.")).toBeInTheDocument();
  });

  it("[a11y] a mensagem de erro é anunciada (role=alert)", async () => {
    mockApi({ "POST /api/login": reply(401, { error: "E-mail ou senha inválidos." }) });
    const { user } = renderUi(<LoginPage />);

    await fillLogin(user);
    await user.click(submitButton("Entrar"));
    await screen.findByText("E-mail ou senha inválidos.");

    expect(screen.getByRole("alert")).toHaveTextContent("E-mail ou senha inválidos.");
  });
});

describe("Página de recuperação de senha (forgot-password)", () => {
  it("mostra o formulário e o link de volta para o login", () => {
    mockApi();
    renderUi(<ForgotPasswordPage />);

    expect(screen.getByRole("heading", { name: "Recuperar senha", level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toBeRequired();
    expect(screen.getByRole("link", { name: "Voltar para o login" })).toHaveAttribute("href", "/login");
  });

  it("não envia sem e-mail", async () => {
    const api = mockApi();
    const { user } = renderUi(<ForgotPasswordPage />);

    await user.click(screen.getByRole("button", { name: "Enviar link" }));

    expect(api.calls).toHaveLength(0);
  });

  it("envia POST /api/auth/forgot-password, mostra a confirmação genérica e limpa o campo", async () => {
    const api = mockApi({ "POST /api/auth/forgot-password": { ok: true } });
    const { user } = renderUi(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText("E-mail"), "maria@teste.com");
    await user.click(screen.getByRole("button", { name: "Enviar link" }));

    expect(
      await screen.findByText(
        "Se este e-mail estiver cadastrado, você vai receber um link para redefinir a senha.",
      ),
    ).toBeInTheDocument();
    expect(api.calls).toEqual([
      expect.objectContaining({
        method: "POST",
        path: "/api/auth/forgot-password",
        body: { email: "maria@teste.com" },
      }),
    ]);
    expect(screen.getByLabelText("E-mail")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Enviar link" })).toBeEnabled();
  });

  it("mostra o erro da API (ou a mensagem padrão) e mantém o e-mail digitado", async () => {
    const api = mockApi({ "POST /api/auth/forgot-password": reply(429, { error: "Muitas tentativas." }) });
    const { user } = renderUi(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText("E-mail"), "maria@teste.com");
    await user.click(screen.getByRole("button", { name: "Enviar link" }));
    expect(await screen.findByText("Muitas tentativas.")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toHaveValue("maria@teste.com");

    api.on("POST /api/auth/forgot-password", reply(500, {}));
    await user.click(screen.getByRole("button", { name: "Enviar link" }));
    expect(await screen.findByText("Erro ao enviar solicitação.")).toBeInTheDocument();
  });

  it("falha de rede mostra 'Erro inesperado'", async () => {
    mockApi({ "POST /api/auth/forgot-password": networkError() });
    const { user } = renderUi(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText("E-mail"), "maria@teste.com");
    await user.click(screen.getByRole("button", { name: "Enviar link" }));

    expect(await screen.findByText("Erro inesperado. Tente novamente.")).toBeInTheDocument();
  });

  it("mostra 'Enviando...' com campo e botão desabilitados durante o envio", async () => {
    let respond: (value: unknown) => void = () => {};
    mockApi({ "POST /api/auth/forgot-password": () => new Promise((resolve) => (respond = resolve)) });
    const { user } = renderUi(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText("E-mail"), "maria@teste.com");
    await user.click(screen.getByRole("button", { name: "Enviar link" }));

    expect(await screen.findByRole("button", { name: "Enviando..." })).toBeDisabled();
    expect(screen.getByLabelText("E-mail")).toBeDisabled();

    respond({ ok: true });
    expect(await screen.findByRole("button", { name: "Enviar link" })).toBeEnabled();
  });
});

describe("Página de redefinição de senha (reset-password)", () => {
  async function fill(user: ReturnType<typeof renderUi>["user"], password: string, confirm = password) {
    await user.type(screen.getByLabelText("Nova senha"), password);
    await user.type(screen.getByLabelText("Confirmar senha"), confirm);
  }

  it("com token na URL mostra o formulário habilitado (senhas com mínimo de 8)", () => {
    setSearchParams({ token: "abc123" });
    mockApi();
    renderUi(<ResetPasswordPage />);

    expect(screen.getByRole("heading", { name: "Nova senha", level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText("Nova senha")).toHaveAttribute("minlength", "8");
    expect(screen.getByLabelText("Confirmar senha")).toBeRequired();
    expect(screen.getByRole("button", { name: "Redefinir senha" })).toBeEnabled();
  });

  it("sem token o botão fica desabilitado e um alerta explica, com link para pedir novo link", () => {
    mockApi();
    renderUi(<ResetPasswordPage />);

    expect(screen.getByRole("button", { name: "Redefinir senha" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Link inválido ou incompleto.");
    expect(
      screen.getByRole("link", { name: "Solicite um novo link de redefinição" }),
    ).toHaveAttribute("href", "/forgot-password");
  });

  it("sem token, forçar o envio mostra 'Token inválido ou ausente.' e não chama a API", async () => {
    const api = mockApi();
    const { user } = renderUi(<ResetPasswordPage />);

    await fill(user, "novasenha123");
    fireEvent.submit(screen.getByLabelText("Nova senha").closest("form")!);

    expect(await screen.findByText("Token inválido ou ausente.")).toBeInTheDocument();
    expect(api.calls).toHaveLength(0);
  });

  it("senhas diferentes: mostra 'As senhas não coincidem.' e não chama a API", async () => {
    setSearchParams({ token: "abc123" });
    const api = mockApi();
    const { user } = renderUi(<ResetPasswordPage />);

    await fill(user, "novasenha123", "outrasenha123");
    await user.click(screen.getByRole("button", { name: "Redefinir senha" }));

    expect(await screen.findByText("As senhas não coincidem.")).toBeInTheDocument();
    expect(api.calls).toHaveLength(0);
  });

  it("senha com menos de 8 caracteres é recusada antes de chamar a API", async () => {
    setSearchParams({ token: "abc123" });
    const api = mockApi();
    const { user } = renderUi(<ResetPasswordPage />);

    await fill(user, "curta");
    // Ignora a validação nativa (minLength) para exercitar a validação do próprio formulário.
    fireEvent.submit(screen.getByLabelText("Nova senha").closest("form")!);

    expect(await screen.findByText("A senha deve ter pelo menos 8 caracteres.")).toBeInTheDocument();
    expect(api.calls).toHaveLength(0);
  });

  it("sucesso: envia token e senha, mostra a confirmação e redireciona para /login após 2s", async () => {
    setSearchParams({ token: "abc123" });
    const api = mockApi({ "POST /api/auth/reset-password": { ok: true } });
    const { user } = renderUi(<ResetPasswordPage />);

    await fill(user, "novasenha123");
    await user.click(screen.getByRole("button", { name: "Redefinir senha" }));

    expect(
      await screen.findByText("Senha redefinida. Redirecionando para o login..."),
    ).toBeInTheDocument();
    expect(api.calls).toEqual([
      expect.objectContaining({
        method: "POST",
        path: "/api/auth/reset-password",
        body: { token: "abc123", password: "novasenha123" },
      }),
    ]);
    expect(navigationMock.router.push).not.toHaveBeenCalled();
    await waitFor(() => expect(navigationMock.router.push).toHaveBeenCalledWith("/login"), {
      timeout: 15000,
    });
  });

  it("token expirado/inválido: mostra o erro da API e não redireciona", async () => {
    setSearchParams({ token: "expirado" });
    mockApi({ "POST /api/auth/reset-password": reply(400, { error: "Token inválido ou expirado." }) });
    const { user } = renderUi(<ResetPasswordPage />);

    await fill(user, "novasenha123");
    await user.click(screen.getByRole("button", { name: "Redefinir senha" }));

    expect(await screen.findByText("Token inválido ou expirado.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Redefinir senha" })).toBeEnabled();
    expect(navigationMock.router.push).not.toHaveBeenCalled();
  });

  it("erro sem mensagem e falha de rede usam as mensagens padrão", async () => {
    setSearchParams({ token: "abc123" });
    const api = mockApi({ "POST /api/auth/reset-password": reply(500, {}) });
    const { user } = renderUi(<ResetPasswordPage />);

    await fill(user, "novasenha123");
    await user.click(screen.getByRole("button", { name: "Redefinir senha" }));
    expect(await screen.findByText("Erro ao redefinir senha.")).toBeInTheDocument();

    api.on("POST /api/auth/reset-password", networkError());
    await user.click(screen.getByRole("button", { name: "Redefinir senha" }));
    expect(await screen.findByText("Erro inesperado. Tente novamente.")).toBeInTheDocument();
  });
});
