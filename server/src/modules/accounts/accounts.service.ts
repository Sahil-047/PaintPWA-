import { Types } from 'mongoose';
import { AppError } from '../../utils/appError.js';
import { BillModel } from '../billing/billing.model.js';
import { CashMemoModel } from '../cashmemo/cashmemo.model.js';
import { ReturnItemModel } from '../returns/returns.model.js';
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
  _billId: Types.ObjectId,
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
      lastActivityAt: new Date(),
    });
    return { account: created, creditApplied: 0 };
  }

  const creditBefore = account.creditBalance;
  account.totalBilled += grandTotal;
  syncAccountLedger(account);
  await account.save();
  // Drop legacy embedded id arrays if still present on older docs.
  await AccountModel.updateOne({ _id: account._id }, { $unset: { bills: 1, memos: 1 } });
  const creditApplied = Number(Math.max(0, creditBefore - account.creditBalance).toFixed(2));
  return { account, creditApplied };
}

export async function addPaymentToAccount(
  tenantId: Types.ObjectId,
  customerId: Types.ObjectId,
  _memoId: Types.ObjectId,
  amountPaid: number
) {
  const account = await AccountModel.findOne({ tenantId, customerId });
  if (!account) return null;

  account.totalPaid += amountPaid;
  syncAccountLedger(account);
  await account.save();
  await AccountModel.updateOne({ _id: account._id }, { $unset: { bills: 1, memos: 1 } });
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

  let account = await AccountModel.findOne({ tenantId, customerId });
  const bills = await BillModel.find({ tenantId, customerId }).sort({ createdAt: -1 });

  const memos = await CashMemoModel.find({ tenantId, customerId })
    .populate('billId', 'billNo grandTotal')
    .sort({ paidAt: -1 });

  // Keep ledger aligned with invoice + payment truth (repairs older return sync quirks).
  if (account) {
    const billedFromInvoices = Number(
      bills.reduce((s, b) => s + (b.grandTotal ?? 0), 0).toFixed(2)
    );
    const paidFromMemos = Number(memos.reduce((s, m) => s + (m.amountPaid ?? 0), 0).toFixed(2));
    const billedDrift = Math.abs((account.totalBilled ?? 0) - billedFromInvoices) > 0.009;
    const paidDrift = Math.abs((account.totalPaid ?? 0) - paidFromMemos) > 0.009;
    if (billedDrift || paidDrift) {
      account.totalBilled = billedFromInvoices;
      account.totalPaid = paidFromMemos;
      account.creditBalance = 0;
      syncAccountLedger(account, { absorbOverpay: true });
      await account.save();
    }
    await AccountModel.updateOne({ _id: account._id }, { $unset: { bills: 1, memos: 1 } });
  }

  const billIds = bills.map((b) => b._id);
  const paidAgg =
    billIds.length > 0
      ? await CashMemoModel.aggregate([
          { $match: { tenantId, billId: { $in: billIds } } },
          { $group: { _id: '$billId', total: { $sum: '$amountPaid' } } },
        ])
      : [];

  const paidMap = new Map(paidAgg.map((p) => [String(p._id), p.total as number]));

  const returns = await ReturnItemModel.find({ tenantId, customerId })
    .populate('billId', 'billNo')
    .sort({ createdAt: -1 });

  const returnedByBill = new Map<string, number>();
  for (const ret of returns) {
    const bid =
      typeof ret.billId === 'object' && ret.billId && '_id' in ret.billId
        ? String((ret.billId as { _id: Types.ObjectId })._id)
        : String(ret.billId);
    returnedByBill.set(bid, (returnedByBill.get(bid) ?? 0) + (ret.amount ?? 0));
  }

  const billsWithPaid = bills.map((bill) => {
    const amountPaid = paidMap.get(String(bill._id)) ?? 0;
    const returnedAmount = returnedByBill.get(String(bill._id)) ?? 0;
    return {
      ...bill.toObject(),
      amountPaid,
      balanceDue: Math.max(0, bill.grandTotal - amountPaid),
      billCredit: Math.max(0, amountPaid - bill.grandTotal),
      returnedAmount,
    };
  });

  return { customer, account, bills: billsWithPaid, memos, returns };
}
