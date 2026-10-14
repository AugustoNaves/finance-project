import { describe, expect, it } from "vitest";
import { buildPdf } from "../../support/pdf";

const pages = [
  ["Fatura Nubank - Vencimento 10/10/2026", "12/09 UBER *TRIP SAO PAULO BR 23,90", "13/09 Pão de Açúcar (loja 12) R$ 45,00"],
  ["14/09 Estação Café \\ Bistrô 3/10 1.234,56", "Total da fatura R$ 1.303,46"],
];

function toLatin1(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
}

async function extractLines(data: Uint8Array) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await getDocument({ data, useSystemFonts: false, isEvalSupported: false }).promise;
  const result: string[][] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const rows = new Map<number, string[]>();

    for (const item of content.items) {
      if ("str" in item && item.str.trim()) {
        const y = Math.round(item.transform[5]);

        rows.set(y, [...(rows.get(y) ?? []), item.str]);
      }
    }

    result.push([...rows.entries()].sort(([a], [b]) => b - a).map(([, parts]) => parts.join(" ")));
  }

  await document.destroy();

  return result;
}

describe("tests/support/pdf — buildPdf", () => {
  it("gera um PDF 1.4 com cabeçalho e fim de arquivo", () => {
    const text = toLatin1(buildPdf(pages));

    expect(text.startsWith("%PDF-1.4\n")).toBe(true);
    expect(text.endsWith("%%EOF")).toBe(true);
    expect(text).toContain("/BaseFont /Helvetica");
    expect(text).toContain("/Encoding /WinAnsiEncoding");
    expect(text).toContain(`/Count ${pages.length}`);
  });

  it("aponta cada entrada da xref para o início do objeto correspondente", () => {
    const text = toLatin1(buildPdf(pages));
    const xrefOffset = Number(/startxref\n(\d+)\n%%EOF$/.exec(text)?.[1]);
    const xref = text.slice(xrefOffset);
    const size = Number(/^xref\n0 (\d+)\n/.exec(xref)?.[1]);
    const entries = [...xref.matchAll(/^(\d{10}) (\d{5}) ([nf]) $/gm)];

    expect(size).toBe(3 + pages.length * 2 + 1);
    expect(entries).toHaveLength(size);
    expect(entries[0].slice(1)).toEqual(["0000000000", "65535", "f"]);
    expect(xref).toContain(`/Size ${size}`);

    entries.slice(1).forEach((entry, index) => {
      expect(text.startsWith(`${index + 1} 0 obj\n`, Number(entry[1]))).toBe(true);
    });
  });

  it("declara o tamanho exato de cada stream de conteúdo", () => {
    const text = toLatin1(buildPdf(pages));
    const streams = [...text.matchAll(/<< \/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/g)];

    expect(streams).toHaveLength(pages.length);
    streams.forEach((stream) => expect(stream[2]).toHaveLength(Number(stream[1])));
  });

  it("posiciona cada linha em um y distinto e escapa caracteres especiais", () => {
    const text = toLatin1(buildPdf(pages));

    expect(text).toContain("BT /F1 10 Tf 50 800 Td (Fatura Nubank - Vencimento 10/10/2026) Tj ET");
    expect(text).toContain("BT /F1 10 Tf 50 786 Td (12/09 UBER *TRIP SAO PAULO BR 23,90) Tj ET");
    expect(text).toContain("BT /F1 10 Tf 50 772 Td (13/09 Pão de Açúcar \\(loja 12\\) R$ 45,00) Tj ET");
    expect(text).toContain("(14/09 Estação Café \\\\ Bistrô 3/10 1.234,56)");
  });

  it("codifica um byte por caractere, inclusive os acentuados", () => {
    const bytes = buildPdf([["ção"]]);
    const text = toLatin1(bytes);
    const start = text.indexOf("(") + 1;

    expect(Array.from(bytes.slice(start, start + 3))).toEqual([0xe7, 0xe3, 0x6f]);
  });

  it("gera um PDF válido com uma página vazia quando não há páginas", () => {
    const text = toLatin1(buildPdf([]));

    expect(text).toContain("/Count 1");
    expect(text.endsWith("%%EOF")).toBe(true);
  });

  it("permite ao pdf.js extrair exatamente as linhas originais", async () => {
    expect(await extractLines(buildPdf(pages))).toEqual(pages);
  });
});
