import { env } from '../config/env.js';
import type { PdfBillData, PdfCashMemoData } from '../types/pdf.types.js';

export type BillPdfFormat = 'standard' | 'dl';

const PDF_KEY_HEADER = 'X-PDF-Service-Key';

function pdfServiceBaseUrl(): string {
  const url = (env.PDF_SERVICE_URL ?? '').replace(/\/$/, '');
  if (!url) {
    throw new Error(
      'PDF_SERVICE_URL is not set — start pdf-service and point the API at it (e.g. http://localhost:7690)'
    );
  }
  return url;
}

function pdfServiceHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/pdf',
  };

  const secret = env.PDF_SERVICE_SECRET?.trim();
  if (!secret) {
    throw new Error('PDF_SERVICE_SECRET is not set — required to call pdf-service securely');
  }
  headers[PDF_KEY_HEADER] = secret;

  return headers;
}

async function postPdf(path: string, body: unknown): Promise<Buffer> {
  const res = await fetch(`${pdfServiceBaseUrl()}${path}`, {
    method: 'POST',
    headers: pdfServiceHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`pdf-service ${path} failed (${res.status}): ${text.slice(0, 200)}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

export async function renderBillPdfViaService(
  pdfData: PdfBillData,
  format: BillPdfFormat = 'standard'
): Promise<Buffer> {
  return postPdf('/pdf/bill/render', { pdfData, format });
}

export async function renderCashMemoPdfViaService(pdfData: PdfCashMemoData): Promise<Buffer> {
  return postPdf('/pdf/cashmemo/render', { pdfData });
}
