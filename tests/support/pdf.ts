const WIN_ANSI_EXTRAS: Record<string, number> = {
  "€": 0x80,
  "‘": 0x91,
  "’": 0x92,
  "“": 0x93,
  "”": 0x94,
  "•": 0x95,
  "–": 0x96,
  "—": 0x97,
};

const FIRST_PAGE_OBJECT = 4;
const TOP = 800;
const LINE_HEIGHT = 14;

function toWinAnsi(text: string) {
  return Array.from(text, (char) => {
    const code = WIN_ANSI_EXTRAS[char] ?? char.charCodeAt(0);

    return code > 0xff ? "?" : String.fromCharCode(code);
  }).join("");
}

function escapeText(text: string) {
  return toWinAnsi(text).replace(/[\\()]/g, (char) => `\\${char}`);
}

function buildContent(lines: string[]) {
  return lines
    .map((line, index) => `BT /F1 10 Tf 50 ${TOP - index * LINE_HEIGHT} Td (${escapeText(line)}) Tj ET`)
    .join("\n");
}

function buildObjects(pages: string[][]) {
  const pageIds = pages.map((_, index) => FIRST_PAGE_OBJECT + index * 2);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  ];

  pages.forEach((lines, index) => {
    const content = buildContent(lines);

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageIds[index] + 1} 0 R >>`,
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    );
  });

  return objects;
}

function toBytes(document: string) {
  return Uint8Array.from(document, (char) => char.charCodeAt(0));
}

export function buildPdf(pages: string[][]): Uint8Array {
  const objects = buildObjects(pages.length > 0 ? pages : [[]]);
  const offsets: number[] = [];
  let document = "%PDF-1.4\n";

  objects.forEach((body, index) => {
    offsets.push(document.length);
    document += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = document.length;
  const entries = offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");

  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${entries}`;
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return toBytes(document);
}
