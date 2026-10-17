import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SettingsPage from "@/app/settings/page";
import { mockApi, networkError, reply, type ApiRoutes } from "../helpers/api";
import { transactions } from "../helpers/fixtures";
import { navigationMock, setPathname } from "../helpers/navigation";
import { renderWithProvider } from "../helpers/render";

function detail(label: string) {
  const term = within(screen.getByRole("main")).getByText(label, { selector: "dt" });

  return term.parentElement as HTMLElement;
}

function navigationErrors(consoleError: ReturnType<typeof vi.spyOn>) {
  return consoleError.mock.calls.filter((args) =>
    args.some((arg) => String((arg as Error)?.message ?? arg).includes("Not implemented: navigation")),
  );
}

async function renderPage(routes: ApiRoutes = {}) {
  const api = mockApi({ "GET /api/transactions": transactions, ...routes });
  const utils = renderWithProvider(<SettingsPage />);

  await waitFor(() => expect(api.callsTo("GET", "/api/me")).toHaveLength(1));
  await waitFor(() => expect(api.callsTo("GET", "/api/transactions")).toHaveLength(1));

  return { api, ...utils };
}

function readBlob(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

function captureDownloads() {
  const downloads: { filename: string; blob: Blob }[] = [];
  let lastBlob: Blob | null = null;

  vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
    lastBlob = blob as Blob;
    return "blob:mock";
  });
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ filename: this.download, blob: lastBlob as Blob });
  });

  return { downloads, revoke };
}

describe("Página de configurações", () => {
  it("mostra nome e e-mail do usuário vindos de GET /api/me", async () => {
    await renderPage();

    expect(screen.getByRole("heading", { name: "Configurações", level: 1 })).toBeInTheDocument();
    await waitFor(() => expect(detail("Nome")).toHaveTextContent("Maria Teste"));
    expect(detail("E-mail")).toHaveTextContent("maria@teste.com");
    expect(detail("Moeda")).toHaveTextContent("Real brasileiro (BRL)");
  });

  it("organiza a página em seções pautadas: Perfil, Exportar dados, Instalar o app e Sessão", async () => {
    await renderPage();

    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "Perfil",
      "Exportar dados",
      "Instalar o app",
      "Sessão",
    ]);
  });

  it("mostra a quantidade de lançamentos carregados e a soma de todos os valores", async () => {
    await renderPage();

    await waitFor(() => expect(detail("Lançamentos")).toHaveTextContent(/^Lançamentos10$/));
    expect(detail("Saldo acumulado")).toHaveTextContent("R$ 2.600,00");
  });

  it("enquanto /api/me não responde mostra 'Carregando…'", async () => {
    mockApi({
      "GET /api/transactions": transactions,
      "GET /api/me": () => new Promise<Response>(() => {}),
    });
    renderWithProvider(<SettingsPage />);

    expect(detail("Nome")).toHaveTextContent("Carregando…");
    expect(detail("E-mail")).toHaveTextContent("Carregando…");
  });

  it("quando /api/me falha (401) o perfil mostra 'Indisponível' em vez de carregar para sempre", async () => {
    await renderPage({ "GET /api/me": reply(401, { error: "Não autenticado." }) });

    await waitFor(() => expect(detail("E-mail")).toHaveTextContent("Indisponível"));
    expect(detail("Nome")).toHaveTextContent("Indisponível");
    expect(detail("Lançamentos")).toHaveTextContent("10");
  });

  it("exporta as transações em JSON (transacoes.json)", async () => {
    const { downloads, revoke } = captureDownloads();
    const { user } = await renderPage();
    await waitFor(() => expect(detail("Lançamentos")).toHaveTextContent("10"));

    await user.click(screen.getByRole("button", { name: "Exportar JSON" }));

    expect(downloads).toHaveLength(1);
    expect(downloads[0].filename).toBe("transacoes.json");
    expect(downloads[0].blob.type).toBe("application/json;charset=utf-8");
    expect(JSON.parse(await readBlob(downloads[0].blob))).toEqual(transactions);
    expect(revoke).toHaveBeenCalledWith("blob:mock");
  });

  it("exporta as transações em CSV com cabeçalho e valores entre aspas (aspas internas duplicadas)", async () => {
    const { downloads } = captureDownloads();
    const { user } = await renderPage({
      "GET /api/transactions": [
        { ...transactions[1], description: 'Aluguel "apê", centro' },
        transactions[8],
      ],
    });
    await waitFor(() => expect(detail("Lançamentos")).toHaveTextContent("2"));

    await user.click(screen.getByRole("button", { name: "Exportar CSV" }));

    expect(downloads[0].filename).toBe("transacoes.csv");
    expect(downloads[0].blob.type).toBe("text/csv;charset=utf-8");
    expect((await readBlob(downloads[0].blob)).split("\n")).toEqual([
      "id,description,amount,category,type,paymentMethod,notes,date",
      '"t2","Aluguel ""apê"", centro","-1500","Moradia","outcome","Boleto","Vence dia 6","2026-10-06T15:00:00.000Z"',
      '"t9","Uber","-100","Transporte","","Pix","","2026-08-10T15:00:00.000Z"',
    ]);
  });

  it("[comportamento atual] exportar sem transações gera um CSV só com o cabeçalho", async () => {
    const { downloads } = captureDownloads();
    const { user } = await renderPage({ "GET /api/transactions": [] });

    await user.click(screen.getByRole("button", { name: "Exportar CSV" }));

    expect(await readBlob(downloads[0].blob)).toBe(
      "id,description,amount,category,type,paymentMethod,notes,date",
    );
  });

  it("explica como instalar o app no iPhone e no Android, sem botão de instalação", async () => {
    await renderPage();

    const section = screen.getByRole("heading", { name: "Instalar o app", level: 2 }).closest("section") as HTMLElement;

    expect(section).toHaveTextContent("Compartilhar → Adicionar à Tela de Início");
    expect(section).toHaveTextContent("Instalar app");
    expect(within(section).queryByRole("button")).toBeNull();
  });

  it("'Sair da conta' chama POST /api/logout e recarrega em /login (limpa a memória)", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { api, user } = await renderPage({ "POST /api/logout": { ok: true } });

    await user.click(screen.getByRole("button", { name: "Sair da conta" }));

    await waitFor(() => expect(api.callsTo("POST", "/api/logout")).toHaveLength(1));
    // jsdom não implementa navegação: `window.location.href = "/login"` vira "Not implemented: navigation".
    await waitFor(() => expect(navigationErrors(consoleError)).toHaveLength(1));
    expect(navigationMock.router.push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Saindo…" })).toBeDisabled();
  });

  it("navega para /login mesmo quando o logout falha no servidor", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { user } = await renderPage({ "POST /api/logout": reply(500, { error: "Erro." }) });

    await user.click(screen.getByRole("button", { name: "Sair da conta" }));

    await waitFor(() => expect(navigationErrors(consoleError)).toHaveLength(1));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("navega para /login mesmo quando a requisição de logout cai por erro de rede", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { api, user } = await renderPage({ "POST /api/logout": networkError() });

    await user.click(screen.getByRole("button", { name: "Sair da conta" }));

    await waitFor(() => expect(navigationErrors(consoleError)).toHaveLength(1));
    expect(api.callsTo("POST", "/api/logout")).toHaveLength(1);
  });

  it("marca 'Configurações' como página atual na navegação", async () => {
    setPathname("/settings");
    await renderPage();

    const links = screen.getAllByRole("link", { name: "Configurações", hidden: true });
    expect(links[0]).toHaveAttribute("href", "/settings");
    expect(links[0]).toHaveAttribute("aria-current", "page");
  });
});
