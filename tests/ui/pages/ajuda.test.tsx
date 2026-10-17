import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HelpPage from "@/app/ajuda/page";
import { renderUi } from "../helpers/render";

const sectionTitles = [
  "Instale no celular",
  "Saiba onde fica cada coisa",
  "Registre um gasto em segundos",
  "Confira como está o mês",
  "Encontre, corrija ou apague um lançamento",
  "Importe a fatura do cartão",
  "Planeje com orçamentos e metas",
  "Organize categorias e regras",
  "Veja relatórios e investimentos",
  "Dúvidas comuns",
];

describe("Guia /ajuda", () => {
  it("tem título, índice com âncoras para cada parte e um h2 por parte", () => {
    render(<HelpPage />);

    expect(screen.getByRole("heading", { name: "Como usar o Finance-app", level: 1 })).toBeInTheDocument();

    const index = screen.getByRole("navigation", { name: "Nesta página" });
    const links = within(index).getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual(sectionTitles);

    for (const link of links) {
      const target = link.getAttribute("href")?.slice(1) ?? "";
      const section = document.getElementById(target);

      expect(section, target).not.toBeNull();
      expect(within(section as HTMLElement).getByRole("heading", { level: 2 })).toHaveTextContent(
        link.textContent ?? "",
      );
    }
  });

  it("mostra as capturas com texto alternativo descritivo", () => {
    render(<HelpPage />);

    const images = screen.getAllByRole("img");

    expect(images).toHaveLength(8);
    for (const image of images) {
      expect(image.getAttribute("alt")?.length).toBeGreaterThan(20);
      expect(image.getAttribute("src")).toContain("ajuda");
    }
  });

  it("explica em que mês entram as compras da fatura e que o PDF não sai do aparelho", () => {
    render(<HelpPage />);

    const importSection = document.getElementById("importar") as HTMLElement;

    expect(importSection).toHaveTextContent("No mês em que a fatura vence");
    expect(importSection).toHaveTextContent("Usar a data de cada compra");
    expect(importSection).toHaveTextContent("O PDF é lido no seu aparelho e não é enviado.");
  });

  it("dúvidas comuns abrem e fecham", async () => {
    const { user } = renderUi(<HelpPage />);
    const question = screen.getByText("Como baixo uma cópia dos meus dados?");
    const details = question.closest("details") as HTMLDetailsElement;

    expect(details.open).toBe(false);
    await user.click(question);
    expect(details.open).toBe(true);
    expect(details).toHaveTextContent("Exportar dados");
  });

  it("leva de volta ao app", () => {
    render(<HelpPage />);

    expect(screen.getByRole("link", { name: "Abrir o app" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Abrir o Finance-app" })).toHaveAttribute("href", "/");
  });
});
