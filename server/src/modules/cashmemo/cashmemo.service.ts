import { Types } from 'mongoose';
import { AppError } from '../../utils/appError.js';
import { generateMemoNo } from '../../utils/invoice.number.js';
import { generateCashMemoPdf } from '../../utils/pdf.generator.js';
import { buildPdfKey, savePdfByKey } from '../../utils/pdf.storage.js';
import * as accountsService from '../accounts/accounts.service.js';
import { BillModel } from '../billing/billing.model.js';
import { TenantModel } from '../auth/auth.model.js';
import { CashMemoModel } from './cashmemo.model.js';
import type { CreateCashMemoInput } from './cashmemo.validator.js';

async function totalPaidForBill(tenantId: Types.ObjectId, billId: Types.ObjectId) {
  const rows = await CashMemoModel.aggregate([
    { $match: { tenantId, billId } },
    { $group: { _id: null, total: { $sum: '$amountPaid' } } },
  ]);
  return (rows[0]?.total as number | undefined) ?? 0;
}

export async function createCashMemo(tenantId: Types.ObjectId, input: CreateCashMemoInput) {
  const bill = await BillModel.findOne({ _id: input.billId, tenantId });
  if (!bill) throw new AppError('Bill not found', 404);

  const alreadyPaid = await totalPaidForBill(tenantId, bill._id as Types.ObjectId);
  const balanceDue = Math.max(0, bill.grandTotal - alreadyPaid);
  if (input.amountPaid > balanceDue + 0.001) {
    throw new AppError(
      `Amount exceeds balance due (₹${balanceDue.toFixed(2)}) for invoice ${bill.billNo}`,
      400
    );
  }

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

  const paid = alreadyPaid + input.amountPaid;
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

  const bill = memo.billId as { _id?: Types.ObjectId; billNo?: string; grandTotal?: number } | null;
  const customer = memo.customerId as { name?: string } | null;
  const billId = bill?._id ?? (memo.billId as Types.ObjectId);
  const totalPaidOnBill = await totalPaidForBill(tenantId, billId);
  const billTotal = bill?.grandTotal ?? 0;

  const tenant = await TenantModel.findById(tenantId).lean();
  const firmName = tenant?.name?.trim() || 'Shop';

  const pdfBuffer = await generateCashMemoPdf({
    memoNo: memo.memoNo,
    firmName,
    billNo: bill?.billNo ?? '—',
    customerName: customer?.name ?? '—',
    amountPaid: memo.amountPaid,
    paymentMode: memo.paymentMode,
    chequeNo: undefined,
    date: memo.paidAt.toISOString(),
    billTotal,
    totalPaidOnBill,
    balanceDue: Math.max(0, billTotal - totalPaidOnBill),
  });

  const pdfKey = memo.pdfUrl ?? buildPdfKey(String(tenantId), 'cashmemo', memo.memoNo);
  await savePdfByKey(pdfKey, pdfBuffer);
  if (!memo.pdfUrl) {
    memo.pdfUrl = pdfKey;
    await memo.save();
  }

  return pdfBuffer;
}
