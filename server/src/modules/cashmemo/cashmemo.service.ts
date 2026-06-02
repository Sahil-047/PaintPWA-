import { Types } from 'mongoose';
import { AppError } from '../../utils/appError.js';
import { generateMemoNo } from '../../utils/invoice.number.js';
import { generateCashMemoPdf } from '../../utils/pdf.generator.js';
import { buildPdfKey, readPdfByKey, savePdfByKey } from '../../utils/pdf.storage.js';
import * as accountsService from '../accounts/accounts.service.js';
import { BillModel } from '../billing/billing.model.js';
import { CashMemoModel } from './cashmemo.model.js';
import type { CreateCashMemoInput } from './cashmemo.validator.js';

export async function createCashMemo(tenantId: Types.ObjectId, input: CreateCashMemoInput) {
  const bill = await BillModel.findOne({ _id: input.billId, tenantId });
  if (!bill) throw new AppError('Bill not found', 404);

  const memo = await CashMemoModel.create({
    tenantId,
    memoNo: generateMemoNo(),
    billId: bill._id,
    customerId: input.customerId,
    amountPaid: input.amountPaid,
    paymentMode: input.paymentMode ?? 'cash',
    paidAt: new Date(),
  });

  await accountsService.addPaymentToAccount(
    tenantId,
    new Types.ObjectId(input.customerId),
    memo._id as Types.ObjectId,
    input.amountPaid
  );

  const totalPaidOnBill = await CashMemoModel.aggregate([
    { $match: { tenantId, billId: bill._id } },
    { $group: { _id: null, total: { $sum: '$amountPaid' } } },
  ]);

  const paid = totalPaidOnBill[0]?.total ?? 0;
  if (paid >= bill.grandTotal) bill.status = 'paid';
  else if (paid > 0) bill.status = 'partial';
  else bill.status = 'due';
  await bill.save();

  return memo;
}

export async function listCashMemos(tenantId: Types.ObjectId) {
  return CashMemoModel.find({ tenantId })
    .populate('billId', 'billNo grandTotal')
    .populate('customerId', 'name phone')
    .sort({ paidAt: -1 });
}

export async function getCashMemo(tenantId: Types.ObjectId, memoId: string) {
  const memo = await CashMemoModel.findOne({ _id: memoId, tenantId })
    .populate('billId', 'billNo grandTotal')
    .populate('customerId', 'name phone address');
  if (!memo) throw new AppError('Cash memo not found', 404);
  return memo;
}

export async function getCashMemoPdf(tenantId: Types.ObjectId, memoId: string) {
  const memo = await getCashMemo(tenantId, memoId);
  if (memo.pdfUrl) {
    const cached = await readPdfByKey(memo.pdfUrl);
    if (cached) return cached;
  }

  const bill = memo.billId as { billNo?: string } | null;
  const customer = memo.customerId as { name?: string } | null;

  const pdfBuffer = await generateCashMemoPdf({
    memoNo: memo.memoNo,
    firmName: 'paintapp',
    billNo: bill?.billNo ?? '—',
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
