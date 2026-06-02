import { Types } from 'mongoose';
import { AppError } from '../../utils/appError.js';
import { syncAccountLedger } from '../accounts/account-ledger.js';
import { AccountModel } from '../accounts/accounts.model.js';
import { BillModel } from '../billing/billing.model.js';
import { CashMemoModel } from '../cashmemo/cashmemo.model.js';
import * as inventoryService from '../inventory/inventory.service.js';
import { ReturnItemModel } from './returns.model.js';
import type { CreateReturnInput, ListReturnsQuery } from './returns.validator.js';

function parseSizeFromProductName(productName: string): string | undefined {
  const m = productName.match(/\(([^)]+)\)\s*$/);
  return m?.[1];
}

export async function createReturn(tenantId: Types.ObjectId, input: CreateReturnInput) {
  const bill = await BillModel.findOne({ _id: input.billId, tenantId });
  if (!bill) throw new AppError('Bill not found', 404);

  if (String(bill.customerId) !== input.customerId) {
    throw new AppError('Bill does not belong to this customer', 400);
  }

  const idx = bill.items.findIndex((it) => String(it.productId) === input.productId);
  if (idx < 0) throw new AppError('Product not found in selected bill', 404);

  const line = bill.items[idx];
  if (input.qty > line.qty) {
    throw new AppError(`Return qty exceeds billed qty (${line.qty})`, 400);
  }

  const returnAmount = Number((input.qty * line.rate).toFixed(2));
  const updatedQty = Number((line.qty - input.qty).toFixed(4));
  if (updatedQty <= 0) bill.items.splice(idx, 1);
  else {
    bill.items[idx].qty = updatedQty;
    bill.items[idx].total = Number((updatedQty * line.rate).toFixed(2));
  }

  bill.subtotal = Number(bill.items.reduce((sum, it) => sum + it.total, 0).toFixed(2));
  bill.grandTotal = Number(Math.max(0, bill.subtotal - bill.discount).toFixed(2));

  const paidAgg = await CashMemoModel.aggregate([
    { $match: { tenantId, billId: bill._id } },
    { $group: { _id: null, total: { $sum: '$amountPaid' } } },
  ]);
  const paid = paidAgg[0]?.total ?? 0;
  if (paid >= bill.grandTotal) bill.status = 'paid';
  else if (paid > 0) bill.status = 'partial';
  else bill.status = 'due';
  await bill.save();

  let creditIssued = 0;
  const account = await AccountModel.findOne({ tenantId, customerId: bill.customerId });
  if (account) {
    const creditBefore = account.creditBalance;
    account.totalBilled = Number(Math.max(0, account.totalBilled - returnAmount).toFixed(2));
    syncAccountLedger(account);
    creditIssued = Number(Math.max(0, account.creditBalance - creditBefore).toFixed(2));
    await account.save();
  }

  await inventoryService.updateProductStock(
    tenantId,
    input.productId,
    parseSizeFromProductName(line.productName),
    input.qty
  );

  const ret = await ReturnItemModel.create({
    tenantId,
    customerId: new Types.ObjectId(input.customerId),
    billId: bill._id,
    productId: new Types.ObjectId(input.productId),
    productName: line.productName,
    qty: input.qty,
    rate: line.rate,
    amount: returnAmount,
    creditIssued,
    reason: input.reason,
  });

  return { ...ret.toObject(), creditIssued };
}

export async function listReturns(tenantId: Types.ObjectId, query: ListReturnsQuery) {
  const filter: Record<string, unknown> = { tenantId };
  if (query.customerId) filter.customerId = query.customerId;
  if (query.billId) filter.billId = query.billId;
  return ReturnItemModel.find(filter)
    .populate('billId', 'billNo')
    .populate('customerId', 'name')
    .sort({ createdAt: -1 });
}

