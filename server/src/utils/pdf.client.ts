import { env } from '../config/env.js';
import type { PdfBillData, PdfCashMemoData } from '../types/pdf.types.js';

export type BillPdfFormat = 'standard' | 'dl';

function pdfServiceBaseUrl(): string {
  const url = (env.PDF_SERVICE_URL ?? '').replace(/\/$/, '');
  if (!url) {
    throw new Error(
      'PDF_SERVICE_URL is not set — start pdf-service and point the API at it (e.g. http://localhost:7690)'
    );
  }
  return url;
}

async function postPdf(path: string, body: unknown): Promise<Buffer> {
  const res = await fetch(`${pdfServiceBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/pdf' },
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
