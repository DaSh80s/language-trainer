import { describe, expect, it } from 'vitest';
import { extractCvText } from '../src/core/cvText.js';

/** Builds a valid one-page PDF showing `text`, computing xref offsets for real. */
function minimalPdf(text: string): string {
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return btoa(pdf);
}

describe('extractCvText', () => {
  it('extracts text from a real PDF via unpdf', async () => {
    const text = await extractCvText({
      filename: 'cv.pdf',
      mimeType: 'application/pdf',
      contentBase64: minimalPdf('Maya Cohen maya@example.com'),
    });
    expect(text).toContain('Maya Cohen');
    expect(text).toContain('maya@example.com');
  });

  it('decodes plain text attachments as UTF-8', async () => {
    const utf8 = new TextEncoder().encode('Zoë Müller — Senior Engineer');
    let binary = '';
    for (const b of utf8) binary += String.fromCharCode(b);
    const text = await extractCvText({ filename: 'cv.txt', mimeType: 'text/plain', contentBase64: btoa(binary) });
    expect(text).toBe('Zoë Müller — Senior Engineer');
  });

  it('rejects unsupported types loudly (surfaces in Slack, not a garbage parse)', async () => {
    await expect(
      extractCvText({ filename: 'cv.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', contentBase64: btoa('x') }),
    ).rejects.toThrow(/unsupported CV attachment type/);
  });
});
