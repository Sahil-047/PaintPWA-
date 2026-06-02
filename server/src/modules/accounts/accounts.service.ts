import { Types } from 'mongoose';
import { AppError } from '../../utils/appError.js';
import { BillModel } from '../billing/billing.model.js';
import { CashMemoModel } from '../cashmemo/cashmemo.model.js';
import { syncAccountLedger } from './account-ledger.js';
import { AccountModel, type IAccount } from './accounts.model.js';
import { CustomerModel } from './customer.model.js';
import type { CreateCustomerInput, UpdateCustomerInput } from './accounts.validator.js';

export async function upsertCustomer(
  tenantId: Types.ObjectId,
  data: { name: string; phone?: string; address?: string; gstin?: string }
) {
  if (data.phone) {
    const existing = await CustomerModel.findOne({ tenantId, phone: data.phone });
    if (existing) return existing;
  }
  return CustomerModel.create({ tenantId, ...data });
}

export async function recalcDue(
  tenantId: Types.ObjectId,
  customerId: Types.ObjectId
) {
  const account = await AccountModel.findOne({ tenantId, customerId });
  if (!account) return null;

  syncAccountLedger(account);
  await account.save();
  return account;
}

export async function applyCustomerCredit(
  tenantId: Types.ObjectId,
  customerId: Types.ObjectId,
  maxAmount: number
): Promise<number> {
  const account = await AccountModel.findOne({ tenantId, customerId });
  if (!account || account.creditBalance <= 0 || maxAmount <= 0) return 0;

  const applied = Math.min(account.creditBalance, maxAmount);
  account.creditBalance = Number((account.creditBalance - applied).toFixed(2));
  syncAccountLedger(account);
  await account.save();
  return applied;
}

export async function addBillToAccount(
  tenantId: Types.ObjectId,
  customerId: Types.ObjectId,
  billId: Types.ObjectId,
  grandTotal: number
): Promise<{ account: IAccount; creditApplied: number }> {
  let account = await AccountModel.findOne({ tenantId, customerId });

  if (!account) {
    const created = await AccountModel.create({
      tenantId,
      customerId,
      totalBilled: grandTotal,
      totalPaid: 0,
      dueBalance: grandTotal,
      creditBalance: 0,
      bills: [billId],
      memos: [],
      lastActivityAt: new Date(),
    });
    return { account: created, creditApplied: 0 };
  }

  const creditBefore = account.creditBalance;
  account.totalBilled += grandTotal;
  account.bills.push(billId);
  syncAccountLedger(account);
  await account.save();
  const creditApplied = Number(Math.max(0, creditBefore - account.creditBalance).toFixed(2));
  return { account, creditApplied };
}

export async function addPaymentToAccount(
  tenantId: Types.ObjectId,
  customerId: Types.ObjectId,
  memoId: Types.ObjectId,
  amountPaid: number
) {
  const account = await AccountModel.findOne({ tenantId, customerId });
  if (!account) return null;

  account.totalPaid += amountPaid;
  account.memos.push(memoId);
  syncAccountLedger(account);
  await account.save();
  return account;
}

export async function listAccounts(tenantId: Types.ObjectId) {
  return AccountModel.find({ tenantId })
    .populate('customerId', 'name phone address')
    .sort({ dueBalance: -1 });
}

export async function listCustomers(tenantId: Types.ObjectId) {
  return CustomerModel.find({ tenantId }).sort({ name: 1 });
}

export async function createCustomer(tenantId: Types.ObjectId, input: CreateCustomerInput) {
  if (input.phone) {
    const existing = await CustomerModel.findOne({ tenantId, phone: input.phone });
    if (existing) throw new AppError('Customer with this phone already exists', 409);
  }
  return CustomerModel.create({ tenantId, ...input });
}

export async function updateCustomer(
  tenantId: Types.ObjectId,
  customerId: string,
  input: UpdateCustomerInput
) {
  const customer = await CustomerModel.findOneAndUpdate(
    { _id: customerId, tenantId },
    { $set: input },
    { new: true, runValidators: true }
  );
  if (!customer) throw new AppError('Customer not found', 404);
  return customer;
}

export async function getCustomerDetail(tenantId: Types.ObjectId, customerId: string) {
  const customer = await CustomerModel.findOne({ _id: customerId, tenantId });
  if (!customer) throw new AppError('Customer not found', 404);

  const account = await AccountModel.findOne({ tenantId, customerId });
  const bills = await BillModel.find({ tenantId, customerId }).sort({ createdAt: -1 });

  const memos = await CashMemoModel.find({ tenantId, customerId })
    .populate('billId', 'billNo grandTotal')
    .sort({ paidAt: -1 });

  const billIds = bills.map((b) => b._id);
  const paidAgg =
    billIds.length > 0
      ? await CashMemoModel.aggregate([
          { $match: { tenantId, billId: { $in: billIds } } },
          { $group: { _id: '$billId', total: { $sum: '$amountPaid' } } },
        ])
      : [];

  const paidMap = new Map(paidAgg.map((p) => [String(p._id), p.total as number]));

  const billsWithPaid = bills.map((bill) => {
    const amountPaid = paidMap.get(String(bill._id)) ?? 0;
    return {
      ...bill.toObject(),
      amountPaid,
      balanceDue: Math.max(0, bill.grandTotal - amountPaid),
      billCredit: Math.max(0, amountPaid - bill.grandTotal),
    };
  });

  return { customer, account, bills: billsWithPaid, memos };
}
