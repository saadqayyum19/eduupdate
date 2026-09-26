/**
 * Tiny dependency-free PDF writer.
 *
 * Invoices, receipts and report cards are simple text documents, so instead of pulling in a
 * heavy PDF library the API writes a valid PDF 1.4 file using the two standard fonts every
 * reader ships with (Helvetica / Helvetica-Bold). No fonts are embedded, the output stays
 * a few kilobytes and there is nothing to keep patched.
 */

export interface PdfLine {
  text: string;
  size?: number;
  bold?: boolean;
  /** Space above this line. */
  gap?: number;
}

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MAX_CHARS = 110;

function escapeText(value: string): string {
  return value
    .replace(/[^\u0000-\u00ff]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrap(line: PdfLine): PdfLine[] {
  const size = line.size ?? 10;
  const perLine = Math.max(40, Math.floor(MAX_CHARS * (10 / size)));
  if (line.text.length <= perLine) return [line];

  const words = line.text.split(' ');
  const lines: PdfLine[] = [];
  let current = '';

  for (const word of words) {
    if ((current + word).length > perLine) {
      lines.push({ ...line, text: current.trim() });
      current = `${word} `;
    } else {
      current += `${word} `;
    }
  }
  if (current.trim()) lines.push({ ...line, text: current.trim() });

  return lines.map((item, index) => ({ ...item, gap: index === 0 ? line.gap : 0 }));
}

export interface PdfDocumentInput {
  title: string;
  subtitle?: string;
  lines: PdfLine[];
}

export function buildPdf(input: PdfDocumentInput): Buffer {
  const body = input.lines.flatMap(wrap);

  const content: string[] = [
    'BT',
    `/F2 18 Tf 50 ${PAGE_HEIGHT - 60} Td (${escapeText(input.title)}) Tj`,
  ];

  if (input.subtitle) {
    content.push(`/F1 10 Tf 0 -22 Td (${escapeText(input.subtitle)}) Tj`);
  }

  content.push('0 -24 Td');
  for (const line of body) {
    const size = line.size ?? 10;
    const font = line.bold ? 'F2' : 'F1';
    content.push(`/${font} ${size} Tf 0 ${-(line.gap ?? 0) - size - 4} Td (${escapeText(line.text)}) Tj`);
  }
  content.push('ET');

  const stream = content.join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'latin1');
}

/** `Rs 1,200.00` style money line used by invoices and receipts. */
export function money(amount: number, symbol: string): string {
  return `${symbol} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
