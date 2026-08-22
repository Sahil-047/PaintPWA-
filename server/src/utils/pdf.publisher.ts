import { env } from '../config/env.js';
import { publishPdfJob } from '../lib/rabbitmq/index.js';
import type { BillPdfMessage, CashMemoPdfMessage } from '../types/pdf.types.js';

export async function publishBillPdfJob(message: BillPdfMessage): Promise<boolean> {
  const queue = env.BILL_PDF_QUEUE;
  if (!queue) return false;
  return publishPdfJob(queue, message);
}

export async function publishCashMemoPdfJob(message: CashMemoPdfMessage): Promise<boolean> {
  const queue = env.CASHMEMO_PDF_QUEUE;
  if (!queue) return false;
  return publishPdfJob(queue, message);
}

export function isPdfQueueEnabled(): boolean {
  return isBillPdfQueueEnabled() || isCashMemoPdfQueueEnabled();
}

export function isBillPdfQueueEnabled(): boolean {
  return Boolean(env.RABBITMQ_URL && env.BILL_PDF_QUEUE);
}

export function isCashMemoPdfQueueEnabled(): boolean {
  return Boolean(env.RABBITMQ_URL && env.CASHMEMO_PDF_QUEUE);
}
