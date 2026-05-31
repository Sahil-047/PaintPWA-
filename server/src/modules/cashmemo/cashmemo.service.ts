import { Types } from 'mongoose';
import { AppError } from '../../utils/appError.js';
import { generateMemoNo } from '../../utils/invoice.number.js';
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
