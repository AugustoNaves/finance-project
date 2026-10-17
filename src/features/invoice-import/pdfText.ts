export const MAX_PDF_BYTES = 10 * 1024 * 1024;
export const MAX_PDF_PAGES = 50;

export class PdfPasswordError extends Error {
  constructor(message = "Este PDF é protegido por senha.") {
    super(message);
    this.name = "PdfPasswordError";
  }
}

interface TextItem {
  str: string;
  transform: number[];
}

function isTextItem(item: unknown): item is TextItem {
  return (
    typeof item === "object" &&
    item !== null &&
    typeof (item as TextItem).str === "string" &&
    Array.isArray((item as TextItem).transform)
  );
}

export function groupTextItemsIntoLines(items: TextItem[]) {
  const rows: { y: number; cells: { x: number; text: string }[] }[] = [];

  for (const item of items) {
    const text = item.str.trim();

    if (!text) continue;

    const x = item.transform[4];
    const y = item.transform[5];
    const row = rows.find((currentRow) => Math.abs(currentRow.y - y) <= 2);

    if (row) {
      row.cells.push({ x, text });
    } else {
      rows.push({ y, cells: [{ x, text }] });
    }
  }

  return rows
    .sort((rowA, rowB) => rowB.y - rowA.y)
    .map((row) =>
      row.cells
        .sort((cellA, cellB) => cellA.x - cellB.x)
        .map((cell) => cell.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

export async function hashFile(data: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function extractPdfLines(data: ArrayBuffer, password?: string) {
  const pdfjs = await import("pdfjs-dist");

  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  try {
    const document = await pdfjs.getDocument({
      data: new Uint8Array(data.slice(0)),
      password,
    }).promise;

    if (document.numPages > MAX_PDF_PAGES) {
      throw new Error(`O PDF tem mais de ${MAX_PDF_PAGES} páginas.`);
    }

    const pages: string[][] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();

      const items: TextItem[] = [];

      for (const item of content.items as unknown[]) {
        if (isTextItem(item)) {
          items.push({ str: item.str, transform: item.transform });
        }
      }

      pages.push(groupTextItemsIntoLines(items));
    }

    await document.destroy();

    return pages;
  } catch (error) {
    if (error instanceof Error && error.name === "PasswordException") {
      throw new PdfPasswordError(
        password ? "Senha incorreta. Tente novamente." : "Este PDF é protegido por senha.",
      );
    }

    throw error;
  }
}
