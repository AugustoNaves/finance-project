import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SettingsPage from "@/app/settings/page";
import { mockApi, reply, type ApiRoutes } from "../helpers/api";
import { transactions } from "../helpers/fixtures";
import { navigationMock } from "../helpers/navigation";
import { renderWithProvider } from "../helpers/render";

function detail(label: string) {
  return within(screen.getByRole("main")).getByText(label).parentElement as HTMLElement;
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

    expect(screen.getByRole("heading", { name: "Conta e dados", level: 1 })).toBeInTheDocument();
    await waitFor(() => expect(detail("Conta")).toHaveTextContent("Maria Teste"));
    expect(detail("E-mail")).toHaveTextContent("maria@teste.com");
    expect(detail("Moeda padrão")).toHaveTextContent("Real brasileiro (BRL)");
  });

  it("mostra a quantidade de transações carregadas e a soma de todos os valores", async () => {
    await renderPage();

    await waitFor(() => expect(detail("Transações carregadas")).toHaveTextContent("10"));
    expect(detail("Saldo em memória")).toHaveTextContent("R$ 2.600,00");
  });

  it("[bug] quando /api/me falha (401) o e-mail fica em 'Carregando...' para sempre", async () => {
    await renderPage({ "GET /api/me": reply(401, { error: "Não autenticado." }) });

    await waitFor(() => expect(detail("Transações carregadas")).toHaveTextContent("10"));
    expect(detail("Conta")).toHaveTextContent("Usuário autenticado");
    expect(detail("E-mail")).toHaveTextContent("Carregando...");
  });

  it("exporta as transações em JSON (transacoes.json)", async () => {
    const { downloads, revoke } = captureDownloads();
    const { user } = await renderPage();
    await waitFor(() => expect(detail("Transações carregadas")).toHaveTextContent("10"));

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
    await waitFor(() => expect(detail("Transações carregadas")).toHaveTextContent("2"));

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

  it("'Sair da conta' chama POST /api/logout e redireciona para /login", async () => {
    const { api, user } = await renderPage({ "POST /api/logout": { ok: true } });

    await user.click(screen.getByRole("button", { name: "Sair da conta" }));

    await waitFor(() => expect(navigationMock.router.push).toHaveBeenCalledWith("/login"));
    expect(api.callsTo("POST", "/api/logout")).toHaveLength(1);
    expect(navigationMock.router.refresh).toHaveBeenCalledTimes(1);
  });

  it("[comportamento atual] redireciona para /login mesmo quando o logout falha no servidor", async () => {
    const { user } = await renderPage({ "POST /api/logout": reply(500, { error: "Erro." }) });

    await user.click(screen.getByRole("button", { name: "Sair da conta" }));

    await waitFor(() => expect(navigationMock.router.push).toHaveBeenCalledWith("/login"));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("[comportamento atual] depois de sair, as transações continuam em memória no contexto", async () => {
    const { user } = await renderPage({ "POST /api/logout": { ok: true } });
    await waitFor(() => expect(detail("Transações carregadas")).toHaveTextContent("10"));

    await user.click(screen.getByRole("button", { name: "Sair da conta" }));
    await waitFor(() => expect(navigationMock.router.push).toHaveBeenCalled());

    expect(detail("Transações carregadas")).toHaveTextContent("10");
  });

  it("lista as informações de segurança e marca 'Configurações' na navegação", async () => {
    await renderPage();

    expect(screen.getByText("Cookie de sessão assinado com expiração de 30 dias.")).toBeInTheDocument();
    const nav = screen.getAllByRole("navigation", { name: "Navegação principal" })[0];
    expect(within(nav).getByRole("link", { name: "Configurações" })).toHaveAttribute("href", "/settings");
  });
});
