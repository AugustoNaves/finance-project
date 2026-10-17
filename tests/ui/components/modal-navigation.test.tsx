import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppNavigation } from "@/components/AppNavigation";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/CustomModal";
import { Header } from "@/components/Header";
import { PeriodFilter } from "@/components/PeriodFilter";
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
  const expectedLinks = [
    ["Início", "/"],
    ["Transações", "/transactions"],
    ["Importar", "/import"],
    ["Categorias", "/categories"],
    ["Investimentos", "/investments"],
    ["Planejamento", "/planning"],
    ["Relatórios", "/reports"],
    ["Configurações", "/settings"],
  ];

  function desktopNav() {
    return screen.getAllByRole("navigation", { name: "Navegação principal" })[0];
  }

  /** O item ativo só é distinguível pelo estilo (styled-components gera uma classe diferente). */
  function activeLabels(nav: HTMLElement) {
    const items = within(nav)
      .getAllByRole("link")
      .map((link) => link.parentElement as HTMLElement);
    const count = new Map<string, number>();

    items.forEach((item) => count.set(item.className, (count.get(item.className) ?? 0) + 1));

    return items
      .filter((item) => count.get(item.className) === 1)
      .map((item) => item.textContent);
  }

  it("exibe a marca e os 8 links na navegação desktop", () => {
    render(<AppNavigation />);

    expect(
      within(desktopNav())
        .getAllByRole("link")
        .map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual(expectedLinks);
    expect(screen.getAllByRole("link", { name: "Ir para o início" })[0]).toHaveAttribute("href", "/");
  });

  it("repete os mesmos links no menu mobile (drawer)", () => {
    render(<AppNavigation />);

    const drawer = screen.getByRole("dialog", { name: "Navegação principal", hidden: true });

    expect(
      within(drawer)
        .getAllByRole("link", { hidden: true })
        .filter((link) => !link.getAttribute("aria-label"))
        .map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual(expectedLinks);
  });

  it.each([
    ["/", "Início"],
    ["/transactions", "Transações"],
    ["/import", "Importar"],
    ["/categories", "Categorias"],
    ["/investments", "Investimentos"],
    ["/planning", "Planejamento"],
    ["/reports", "Relatórios"],
    ["/settings", "Configurações"],
  ])("destaca o item da rota atual: %s -> %s", (pathname, label) => {
    setPathname(pathname);
    render(<AppNavigation />);

    expect(activeLabels(desktopNav())).toEqual([label]);
  });

  it("mantém o item ativo em sub-rotas e 'Início' só casa com a raiz exata", () => {
    setPathname("/transactions/123");
    render(<AppNavigation />);

    expect(activeLabels(desktopNav())).toEqual(["Transações"]);
  });

  it("abre e fecha o menu mobile, refletindo em aria-expanded/aria-hidden", async () => {
    const { user } = renderUi(<AppNavigation />);
    const menuButton = screen.getByText("Menu", { selector: "button" });
    const drawer = screen.getByRole("dialog", { hidden: true });
    const overlay = drawer.parentElement as HTMLElement;

    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(menuButton).toHaveAttribute("aria-controls", drawer.id);
    expect(overlay).toHaveAttribute("aria-hidden", "true");

    await user.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    expect(overlay).toHaveAttribute("aria-hidden", "false");

    await user.click(within(drawer).getByText("Fechar", { selector: "button" }));
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });

  it("fecha o menu mobile ao clicar em um link ou no fundo, mas não ao clicar no painel", async () => {
    const { user } = renderUi(<AppNavigation />);
    const menuButton = screen.getByText("Menu", { selector: "button" });
    const drawer = screen.getByRole("dialog", { hidden: true });

    await user.click(menuButton);
    fireEvent.click(drawer);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");

    await user.click(within(drawer).getByText("Relatórios", { selector: "a" }));
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(navigationMock.linkClicks).toEqual(["/reports"]);

    await user.click(menuButton);
    fireEvent.click(drawer.parentElement as HTMLElement);
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });

  it("[comportamento atual] não há opção de sair (logout) na navegação; só em Configurações", () => {
    render(<AppNavigation />);

    expect(screen.queryByRole("button", { name: /sair/i, hidden: true })).toBeNull();
    expect(screen.queryByRole("link", { name: /sair/i, hidden: true })).toBeNull();
  });

  it("[a11y] marca o link ativo com aria-current='page'", () => {
    setPathname("/reports");
    render(<AppNavigation />);

    expect(within(desktopNav()).getByRole("link", { name: "Relatórios" })).toHaveAttribute(
      "aria-current",
      "page",
    );
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
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText("Menu", { selector: "button" })).toBeInTheDocument();
  });
});

describe("Header (componente legado, não usado por nenhuma página)", () => {
  it("mostra a marca e aciona onNewTransaction no botão", async () => {
    const onNewTransaction = vi.fn();
    const { user } = renderUi(<Header onNewTransaction={onNewTransaction} />);

    expect(screen.getByText("Finanças")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "+ Nova Transação" }));

    expect(onNewTransaction).toHaveBeenCalledTimes(1);
  });

  it("[comportamento atual] não oferece logout", () => {
    render(<Header />);

    expect(screen.getAllByRole("button")).toHaveLength(1);
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
});
