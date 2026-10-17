import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppNavigation } from "@/components/AppNavigation";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/CustomModal";
import { PeriodFilter } from "@/components/PeriodFilter";
import { EntrySheetContext } from "@/contexts/EntrySheetContext";
import { mockApi } from "../helpers/api";
import { navigationMock, setPathname } from "../helpers/navigation";
import { getModalByTitle, getModalCloseButton, renderUi } from "../helpers/render";

describe("Modal (CustomModal)", () => {
  it("não renderiza nada quando fechado", () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Título">
        <p>conteúdo</p>
      </Modal>,
    );

    expect(screen.queryByText("Título")).toBeNull();
    expect(screen.queryByText("conteúdo")).toBeNull();
  });

  it("renderiza título e conteúdo em um portal no body", () => {
    const { container } = render(
      <Modal isOpen onClose={vi.fn()} title="Título">
        <p>conteúdo</p>
      </Modal>,
    );

    expect(screen.getByRole("heading", { name: "Título", level: 2 })).toBeInTheDocument();
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it("fecha pelo botão ✕ e pelo clique no fundo, mas não pelo clique no conteúdo", async () => {
    const onClose = vi.fn();
    const { user } = renderUi(
      <Modal isOpen onClose={onClose} title="Título">
        <p>conteúdo</p>
      </Modal>,
    );

    await user.click(screen.getByText("conteúdo"));
    expect(onClose).not.toHaveBeenCalled();

    await user.click(getModalCloseButton(getModalByTitle("Título")));
    expect(onClose).toHaveBeenCalledTimes(1);

    const overlay = getModalByTitle("Título").parentElement as HTMLElement;
    await user.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("trava o scroll do body enquanto aberto e restaura ao fechar", () => {
    document.body.style.overflow = "auto";
    const { rerender } = render(
      <Modal isOpen onClose={vi.fn()} title="Título">
        <p>conteúdo</p>
      </Modal>,
    );

    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <Modal isOpen={false} onClose={vi.fn()} title="Título">
        <p>conteúdo</p>
      </Modal>,
    );

    expect(document.body.style.overflow).toBe("auto");
    document.body.style.overflow = "";
  });

  it("aplica a largura máxima informada", () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Estreito" maxWidth="420px">
        <p>conteúdo</p>
      </Modal>,
    );

    expect(getComputedStyle(getModalByTitle("Estreito")).maxWidth).toBe("420px");
  });

  it("[a11y] expõe role=dialog com aria-modal e nome acessível", () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Título">
        <p>conteúdo</p>
      </Modal>,
    );

    expect(screen.getByRole("dialog", { name: "Título" })).toHaveAttribute("aria-modal", "true");
  });

  it("[a11y] fecha com a tecla Escape", async () => {
    const onClose = vi.fn();
    const { user } = renderUi(
      <Modal isOpen onClose={onClose} title="Título">
        <button type="button">foco</button>
      </Modal>,
    );

    await user.click(screen.getByRole("button", { name: "foco" }));
    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalled();
  });

  it("[a11y] com modais empilhados, Escape fecha apenas o modal do topo", async () => {
    const onCloseOuter = vi.fn();
    const onCloseInner = vi.fn();
    const renderStack = (innerOpen: boolean) => (
      <Modal isOpen onClose={() => onCloseOuter()} title="Externo">
        <Modal isOpen={innerOpen} onClose={() => onCloseInner()} title="Interno">
          <p>conteúdo</p>
        </Modal>
      </Modal>
    );
    const { user, rerender } = renderUi(renderStack(false));

    rerender(renderStack(true));
    rerender(renderStack(true));
    await user.keyboard("{Escape}");

    expect(onCloseInner).toHaveBeenCalledTimes(1);
    expect(onCloseOuter).not.toHaveBeenCalled();
  });

  it("[a11y] o botão de fechar tem nome acessível 'Fechar'", () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Título">
        <p>conteúdo</p>
      </Modal>,
    );

    expect(screen.getByRole("button", { name: "Fechar" })).toBe(
      getModalCloseButton(getModalByTitle("Título")),
    );
  });
});

describe("ConfirmDialog", () => {
  function renderDialog(props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    const utils = renderUi(
      <ConfirmDialog
        isOpen
        title="Confirmar exclusão"
        message="Tem certeza?"
        onClose={onClose}
        onConfirm={onConfirm}
        {...props}
      />,
    );

    return { onClose, onConfirm, ...utils };
  }

  it("não aparece quando isOpen é false", () => {
    renderDialog({ isOpen: false });

    expect(screen.queryByText("Tem certeza?")).toBeNull();
  });

  it("mostra título, mensagem e os botões Cancelar/Confirmar (rótulo padrão)", () => {
    renderDialog();

    expect(screen.getByRole("heading", { name: "Confirmar exclusão" })).toBeInTheDocument();
    expect(screen.getByText("Tem certeza?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeInTheDocument();
  });

  it("usa o rótulo de confirmação customizado e chama onConfirm sem fechar sozinho", async () => {
    const { onConfirm, onClose, user } = renderDialog({ confirmLabel: "Excluir de vez" });

    await user.click(screen.getByRole("button", { name: "Excluir de vez" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("Cancelar chama apenas onClose", async () => {
    const { onConfirm, onClose, user } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("desabilita o botão de confirmar enquanto onConfirm está pendente (evita duplo clique)", async () => {
    let finish: () => void = () => {};
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const { user } = renderDialog({ onConfirm });

    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    finish();
    await waitFor(() => expect(screen.getByRole("button", { name: "Confirmar" })).toBeEnabled());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("quando onConfirm rejeita mostra a mensagem em role=alert, continua aberto e reabilita o botão", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("Erro ao deletar."));
    const { onClose, user } = renderDialog({ onConfirm });

    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Erro ao deletar.");
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeEnabled();
  });

  it("usa mensagem genérica quando a rejeição não é um Error", async () => {
    const onConfirm = vi.fn().mockRejectedValue("falhou");
    const { user } = renderDialog({ onConfirm });

    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível concluir a ação.");
  });

  it("uma nova tentativa bem-sucedida e o cancelamento limpam o erro", async () => {
    const onConfirm = vi.fn().mockRejectedValueOnce(new Error("Erro ao deletar.")).mockResolvedValue(undefined);
    const { onClose, user } = renderDialog({ onConfirm });

    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    await screen.findByRole("alert");

    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(onConfirm).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("AppNavigation", () => {
  const dailyLinks = [
    ["Mês", "/"],
    ["Lançamentos", "/transactions"],
    ["Planejar", "/planning"],
  ];
  const organizeLinks = [
    ["Importar fatura", "/import"],
    ["Categorias e regras", "/categories"],
    ["Investimentos", "/investments"],
    ["Relatórios", "/reports"],
    ["Configurações", "/settings"],
    ["Como usar", "/ajuda"],
  ];

  function renderNav() {
    const entrySheet = { openNewEntry: vi.fn(), openEditEntry: vi.fn() };
    const utils = renderUi(
      <EntrySheetContext.Provider value={entrySheet}>
        <AppNavigation />
      </EntrySheetContext.Provider>,
    );

    return { entrySheet, ...utils };
  }

  // A coluna lateral só aparece a partir de 960px (display: none no jsdom).
  const desktop = { hidden: true };

  function linksOf(element: HTMLElement) {
    return within(element)
      .getAllByRole("link", desktop)
      .map((link) => [
        link.textContent?.replace(/[›↗]/, "").replace(" (abre em nova aba)", ""),
        link.getAttribute("href"),
      ]);
  }

  function tabBar() {
    return screen.getByRole("navigation", { name: "Navegação principal" });
  }

  it("a coluna do desktop tem a marca, Registrar e os grupos Dia a dia e Organizar", () => {
    renderNav();

    expect(screen.getByRole("link", { name: "Finance App, ir para o mês", ...desktop })).toHaveAttribute("href", "/");
    expect(screen.getByRole("button", { name: "+ Registrar", ...desktop })).toBeInTheDocument();
    expect(linksOf(screen.getByRole("navigation", { name: "Dia a dia", ...desktop }))).toEqual(dailyLinks);
    expect(linksOf(screen.getByRole("navigation", { name: "Organizar", ...desktop }))).toEqual(organizeLinks);
  });

  it("a barra inferior tem Mês, Lançamentos, Registrar, Planejar e Mais", () => {
    renderNav();

    expect(linksOf(tabBar())).toEqual([
      ["Mês", "/"],
      ["Lançamentos", "/transactions"],
      ["Planejar", "/planning"],
    ]);
    expect(
      within(tabBar())
        .getAllByRole("button")
        .map((button) => button.getAttribute("aria-label") ?? button.textContent),
    ).toEqual(["Registrar", "Mais"]);
  });

  it("'Como usar' abre o guia em nova aba, com aviso para leitor de tela, na coluna e na folha 'Mais'", async () => {
    const { user } = renderNav();
    const sideLink = within(screen.getByRole("navigation", { name: "Organizar", ...desktop })).getByRole("link", {
      name: "Como usar (abre em nova aba)",
      ...desktop,
    });

    expect(sideLink).toHaveAttribute("target", "_blank");
    expect(sideLink).toHaveAttribute("rel", "noopener noreferrer");

    await user.click(within(tabBar()).getByRole("button", { name: "Mais" }));
    const sheetLink = within(screen.getByRole("dialog", { name: "Mais" })).getByRole("link", {
      name: "Como usar (abre em nova aba)",
    });

    expect(sheetLink).toHaveAttribute("href", "/ajuda");
    expect(sheetLink).toHaveAttribute("target", "_blank");
    expect(within(screen.getByRole("dialog", { name: "Mais" })).getByRole("link", { name: /^Relatórios/ })).not.toHaveAttribute("target");
  });

  it("Registrar (barra e coluna) abre a folha de novo lançamento", async () => {
    const { entrySheet, user } = renderNav();

    await user.click(within(tabBar()).getByRole("button", { name: "Registrar" }));
    await user.click(screen.getByRole("button", { name: "+ Registrar", ...desktop }));

    expect(entrySheet.openNewEntry).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["/", "Mês"],
    ["/transactions", "Lançamentos"],
    ["/planning", "Planejar"],
    ["/budgets", "Planejar"],
    ["/import", "Importar fatura"],
    ["/categories", "Categorias e regras"],
    ["/investments", "Investimentos"],
    ["/reports", "Relatórios"],
    ["/settings", "Configurações"],
  ])("marca o item da rota atual com aria-current: %s -> %s", (pathname, label) => {
    setPathname(pathname);
    renderNav();

    const current = [
      ...within(screen.getByRole("navigation", { name: "Dia a dia", ...desktop })).getAllByRole("link", desktop),
      ...within(screen.getByRole("navigation", { name: "Organizar", ...desktop })).getAllByRole("link", desktop),
    ].filter((link) => link.getAttribute("aria-current") === "page");

    expect(current.map((link) => link.textContent)).toEqual([label]);
  });

  it("mantém o item ativo em sub-rotas e 'Mês' só casa com a raiz exata", () => {
    setPathname("/transactions/123");
    renderNav();

    expect(within(tabBar()).getByRole("link", { name: "Lançamentos" })).toHaveAttribute("aria-current", "page");
    expect(within(tabBar()).getByRole("link", { name: "Mês" })).not.toHaveAttribute("aria-current");
  });

  it("'Mais' abre a folha com as áreas de organizar e Sair; um link fecha a folha", async () => {
    const { user } = renderNav();
    const more = within(tabBar()).getByRole("button", { name: "Mais" });

    expect(more).toHaveAttribute("aria-expanded", "false");
    await user.click(more);
    expect(more).toHaveAttribute("aria-expanded", "true");

    const sheet = screen.getByRole("dialog", { name: "Mais" });
    expect(linksOf(sheet)).toEqual(organizeLinks);
    expect(within(sheet).getByRole("button", { name: "Sair" })).toBeInTheDocument();

    await user.click(within(sheet).getByRole("link", { name: /Relatórios/ }));
    expect(navigationMock.linkClicks).toEqual(["/reports"]);
    expect(screen.queryByRole("dialog", { name: "Mais" })).toBeNull();
  });

  it("Sair chama o logout e recarrega em /login", async () => {
    const api = mockApi({ "POST /api/logout": { message: "ok" } });
    const location = { href: "/" };
    vi.stubGlobal("location", location);
    const { user } = renderNav();

    await user.click(screen.getAllByRole("button", { name: "Sair", ...desktop })[0]);

    await waitFor(() => expect(location.href).toBe("/login"));
    expect(api.callsTo("POST", "/api/logout")).toHaveLength(1);
    vi.unstubAllGlobals();
  });
});

describe("AppShell", () => {
  it("envolve o conteúdo em <main> junto com a navegação", () => {
    render(
      <AppShell>
        <p>conteúdo da página</p>
      </AppShell>,
    );

    expect(within(screen.getByRole("main")).getByText("conteúdo da página")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navegação principal" })).toBeInTheDocument();
  });
});

describe("PeriodFilter", () => {
  it("mostra o mês selecionado no campo 'Período'", () => {
    render(<PeriodFilter value="2026-10" onChange={vi.fn()} />);

    expect(screen.getByLabelText("Período")).toHaveValue("2026-10");
    expect(screen.getByLabelText("Período")).toHaveAttribute("type", "month");
  });

  it("notifica o novo mês e string vazia ao limpar", () => {
    const onChange = vi.fn();
    render(<PeriodFilter value="2026-10" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Período"), { target: { value: "2026-08" } });
    expect(onChange).toHaveBeenLastCalledWith("2026-08");

    fireEvent.change(screen.getByLabelText("Período"), { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("mostra o mês por extenso em português e as setas trocam de mês, virando o ano", () => {
    const onChange = vi.fn();
    const { rerender } = render(<PeriodFilter value="2026-01" onChange={onChange} />);

    expect(screen.getByText("janeiro de 2026")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mês anterior" }));
    expect(onChange).toHaveBeenLastCalledWith("2025-12");

    rerender(<PeriodFilter value="2026-12" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
    expect(onChange).toHaveBeenLastCalledWith("2027-01");
  });
});
