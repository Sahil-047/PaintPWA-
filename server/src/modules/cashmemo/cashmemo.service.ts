import { Types } from 'mongoose';
import { AppError } from '../../utils/appError.js';
import { generateMemoNo } from '../../utils/invoice.number.js';
import { buildPdfKey } from '../../utils/pdf.storage.js';
import { queueCashMemoPdfJob, resolveCashMemoPdf } from '../../utils/pdf.job.js';
import type { PdfCashMemoData } from '../../types/pdf.types.js';
import * as accountsService from '../accounts/accounts.service.js';
import { CustomerModel } from '../accounts/customer.model.js';
import { TenantModel } from '../auth/auth.model.js';
import { CashMemoModel } from './cashmemo.model.js';
import type { CreateCashMemoInput } from './cashmemo.validator.js';

function buildCashMemoPdfData(
  memo: { memoNo: string; amountPaid: number; paymentMode: string; paidAt: Date },
  firmName: string,
  customerName: string
): PdfCashMemoData {
  return {
    memoNo: memo.memoNo,
    firmName,
    customerName,
    amountPaid: memo.amountPaid,
    paymentMode: memo.paymentMode,
    chequeNo: undefined,
    date: memo.paidAt.toISOString(),
  };
}

export async function createCashMemo(tenantId: Types.ObjectId, input: CreateCashMemoInput) {
  const customer = await CustomerModel.findOne({ _id: input.customerId, tenantId });
  if (!customer) throw new AppError('Customer not found', 404);

  const memo = await CashMemoModel.create({
    tenantId,
    memoNo: generateMemoNo(),
    customerId: customer._id,
    amountPaid: input.amountPaid,
    paymentMode: input.paymentMode ?? 'cash',
    paidAt: new Date(),
  });

  // Advance money becomes store credit and is immediately allocated to pending
  // bills (oldest first, partial allowed); the leftover stays as store credit.
  await accountsService.addAdvanceCredit(
    tenantId,
    customer._id as Types.ObjectId,
    input.amountPaid
  );

  const tenant = await TenantModel.findById(tenantId).lean();
  const firmName = tenant?.name?.trim() || 'Shop';
  const pdfKey = buildPdfKey(String(tenantId), 'cashmemo', memo.memoNo);
  const pdfData = buildCashMemoPdfData(memo, firmName, customer.name ?? '—');

  memo.pdfUrl = pdfKey;
  await memo.save();
  await queueCashMemoPdfJob(String(tenantId), String(memo._id), memo.memoNo, pdfData, pdfKey);

  return memo;
}

export async function listCashMemos(tenantId: Types.ObjectId) {
  return CashMemoModel.find({ tenantId })
    .populate('customerId', 'name phone')
    .sort({ paidAt: -1 });
}

export async function getCashMemo(tenantId: Types.ObjectId, memoId: string) {
  const memo = await CashMemoModel.findOne({ _id: memoId, tenantId }).populate(
    'customerId',
    'name phone address'
  );
  if (!memo) throw new AppError('Cash memo not found', 404);
  return memo;
}

export async function getCashMemoPdf(tenantId: Types.ObjectId, memoId: string) {
  const memo = await getCashMemo(tenantId, memoId);
  const customer = memo.customerId as { name?: string } | null;
  const tenant = await TenantModel.findById(tenantId).lean();
  const firmName = tenant?.name?.trim() || 'Shop';
  const pdfData = buildCashMemoPdfData(memo, firmName, customer?.name ?? '—');

  return resolveCashMemoPdf(
    String(tenantId),
    String(memo._id),
    memo.memoNo,
    pdfData,
    memo.pdfUrl
  );
}
