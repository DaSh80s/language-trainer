import { extractText, getDocumentProxy } from 'unpdf';
import type { CvAttachment } from '../types.js';

export type TextExtractor = (attachment: CvAttachment) => Promise<string>;

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * CV attachment → plain text. PDFs via unpdf (pdf.js serverless build — runs on
 * Workers). LinkedIn sends CVs as PDF (verified, D11); anything else unsupported
 * here fails loudly so it surfaces in Slack instead of producing a garbage parse.
 */
export const extractCvText: TextExtractor = async (attachment) => {
  const bytes = base64ToBytes(attachment.contentBase64);
  if (attachment.mimeType === 'text/plain') {
    return new TextDecoder().decode(bytes);
  }
  if (attachment.mimeType === 'application/pdf') {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  }
  throw new Error(`unsupported CV attachment type ${attachment.mimeType} (${attachment.filename})`);
};
