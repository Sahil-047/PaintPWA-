import { Types } from 'mongoose';
import { AppError } from '../../utils/appError.js';
import { generateMemoNo } from '../../utils/invoice.number.js';
import { generateCashMemoPdf } from '../../utils/pdf.generator.js';
import { buildPdfKey, savePdfByKey } from '../../utils/pdf.storage.js';
import * as accountsService from '../accounts/accounts.service.js';
import { CustomerModel } from '../accounts/customer.model.js';
import { TenantModel } from '../auth/auth.model.js';
import { CashMemoModel } from './cashmemo.model.js';
import type { CreateCashMemoInput } from './cashmemo.validator.js';

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

  await accountsService.addPaymentToAccount(
    tenantId,
    customer._id as Types.ObjectId,
    memo._id as Types.ObjectId,
    input.amountPaid,
    { asAdvance: true }
  );

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

  const pdfBuffer = await generateCashMemoPdf({
    memoNo: memo.memoNo,
    firmName,
    customerName: customer?.name ?? '—',
    amountPaid: memo.amountPaid,
    paymentMode: memo.paymentMode,
    chequeNo: undefined,
    date: memo.paidAt.toISOString(),
  });

  const pdfKey = memo.pdfUrl ?? buildPdfKey(String(tenantId), 'cashmemo', memo.memoNo);
  await savePdfByKey(pdfKey, pdfBuffer);
  if (!memo.pdfUrl) {
    memo.pdfUrl = pdfKey;
    await memo.save();
  }

  return pdfBuffer;
}
