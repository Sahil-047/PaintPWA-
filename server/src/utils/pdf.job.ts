import type {
  BillPdfMessage,
  CashMemoPdfMessage,
  PdfBillData,
  PdfCashMemoData,
} from '../types/pdf.types.js';
import {
  renderBillPdfViaService,
  renderCashMemoPdfViaService,
  type BillPdfFormat,
} from './pdf.client.js';
import {
  isBillPdfQueueEnabled,
  isCashMemoPdfQueueEnabled,
  publishBillPdfJob,
  publishCashMemoPdfJob,
} from './pdf.publisher.js';
import { buildPdfKey, readPdfByKey, savePdfByKey } from './pdf.storage.js';

export type { BillPdfFormat };

const PDF_POLL_ATTEMPTS = 8;
const PDF_POLL_INTERVAL_MS = 500;

async function waitForPdf(key: string): Promise<Buffer | null> {
  for (let attempt = 0; attempt < PDF_POLL_ATTEMPTS; attempt += 1) {
    const buffer = await readPdfByKey(key);
    if (buffer) return buffer;
    await new Promise((resolve) => setTimeout(resolve, PDF_POLL_INTERVAL_MS));
  }
  return null;
}

export async function queueBillPdfJob(
  tenantId: string,
  billId: string,
  billNo: string,
  pdfData: PdfBillData,
  pdfKey?: string | null
): Promise<string> {
  const key = pdfKey ?? buildPdfKey(tenantId, 'bill', billNo);
  if (!isBillPdfQueueEnabled()) return key;

  const message: BillPdfMessage = {
    tenantId,
    billId,
    fileName: `${billNo}.pdf`,
    s3Key: key,
    pdfData,
  };
  await publishBillPdfJob(message);
  return key;
}

export async function queueCashMemoPdfJob(
  tenantId: string,
  memoId: string,
  memoNo: string,
  pdfData: PdfCashMemoData,
  pdfKey?: string | null
): Promise<string> {
  const key = pdfKey ?? buildPdfKey(tenantId, 'cashmemo', memoNo);
  if (!isCashMemoPdfQueueEnabled()) return key;

  const message: CashMemoPdfMessage = {
    tenantId,
    memoId,
    fileName: `${memoNo}.pdf`,
    s3Key: key,
    pdfData,
  };
  await publishCashMemoPdfJob(message);
  return key;
}

export async function resolveBillPdf(
  tenantId: string,
  billId: string,
  billNo: string,
  pdfData: PdfBillData,
  pdfKey?: string | null,
  format: BillPdfFormat = 'standard'
): Promise<Buffer> {
  // Always render through pdf-service (single source of truth for templates).
  const buffer = await renderBillPdfViaService(pdfData, format);

  if (format === 'standard') {
    const key = pdfKey ?? buildPdfKey(tenantId, 'bill', billNo);
    void savePdfByKey(key, buffer).catch(() => undefined);
    if (isBillPdfQueueEnabled()) {
      void queueBillPdfJob(tenantId, billId, billNo, pdfData, key).catch(() => undefined);
    }
  }

  return buffer;
}

export async function resolveCashMemoPdf(
  tenantId: string,
  memoId: string,
  memoNo: string,
  pdfData: PdfCashMemoData,
  pdfKey?: string | null
): Promise<Buffer> {
  const key = pdfKey ?? buildPdfKey(tenantId, 'cashmemo', memoNo);

  const existing = await readPdfByKey(key);
  if (existing) return existing;

  if (isCashMemoPdfQueueEnabled()) {
    await queueCashMemoPdfJob(tenantId, memoId, memoNo, pdfData, key);
    const queued = await waitForPdf(key);
    if (queued) return queued;
  }

  const buffer = await renderCashMemoPdfViaService(pdfData);
  await savePdfByKey(key, buffer);
  return buffer;
}
