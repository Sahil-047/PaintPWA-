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

  const creditBefore = account.creditBalance;
  // Cap how much credit can settle this call by temporarily holding the rest aside.
  const hold = Math.max(0, Number((account.creditBalance - maxAmount).toFixed(2)));
  account.creditBalance = Number((account.creditBalance - hold).toFixed(2));
  syncAccountLedger(account, { applyCredit: true });
  account.creditBalance = Number((account.creditBalance + hold).toFixed(2));
  await account.save();
  return Number(Math.max(0, creditBefore - hold - account.creditBalance).toFixed(2));
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

  // Do not auto-consume store credit — checkout must choose “Store credit” as payment.
  account.totalBilled += grandTotal;
  syncAccountLedger(account, { applyCredit: false });
  await account.save();
  await AccountModel.updateOne({ _id: account._id }, { $unset: { bills: 1, memos: 1 } });
  return { account, creditApplied: 0 };
}

export async function addPaymentToAccount(
  tenantId: Types.ObjectId,
  customerId: Types.ObjectId,
  _memoId: Types.ObjectId,
  amountPaid: number,
  options?: { asAdvance?: boolean }
) {
  let account = await AccountModel.findOne({ tenantId, customerId });
  if (!account) {
    account = await AccountModel.create({
      tenantId,
      customerId,
      totalBilled: 0,
      totalPaid: 0,
      dueBalance: 0,
      creditBalance: 0,
      lastActivityAt: new Date(),
    });
  }

  account.totalPaid += amountPaid;
  syncAccountLedger(account, { absorbOverpay: options?.asAdvance ?? false });
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

  const memos = await CashMemoModel.find({ tenantId, customerId }).sort({ paidAt: -1 });

  // Keep ledger aligned with invoice + payment truth (repairs older return sync quirks).
  if (account) {
    const billedFromInvoices = Number(
      bills.reduce((s, b) => s + (b.grandTotal ?? 0), 0).toFixed(2)
    );
    // Cash + store credit applied on invoices both settle the account.
    const paidFromBills = Number(
      bills
        .reduce((s, b) => s + (b.amountPaid ?? 0) + (b.creditApplied ?? 0), 0)
        .toFixed(2)
    );
    const paidFromAdvances = Number(
      memos
        .filter((m) => !m.billId)
        .reduce((s, m) => s + (m.amountPaid ?? 0), 0)
        .toFixed(2)
    );
    const paidFromLegacyMemos = Number(
      memos
        .filter((m) => Boolean(m.billId))
        .reduce((s, m) => s + (m.amountPaid ?? 0), 0)
        .toFixed(2)
    );
    const paidFromSources = Number(
      (paidFromBills + paidFromAdvances + paidFromLegacyMemos).toFixed(2)
    );
    const billedDrift = Math.abs((account.totalBilled ?? 0) - billedFromInvoices) > 0.009;
    const paidDrift = Math.abs((account.totalPaid ?? 0) - paidFromSources) > 0.009;
    if (billedDrift || paidDrift) {
      account.totalBilled = billedFromInvoices;
      account.totalPaid = paidFromSources;
      account.creditBalance = 0;
      syncAccountLedger(account, { absorbOverpay: true });
      await account.save();
    }
    await AccountModel.updateOne({ _id: account._id }, { $unset: { bills: 1, memos: 1 } });
  }

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

  const paidByLegacyMemo = new Map<string, number>();
  for (const memo of memos) {
    if (!memo.billId) continue;
    const bid = String(memo.billId);
    paidByLegacyMemo.set(bid, (paidByLegacyMemo.get(bid) ?? 0) + (memo.amountPaid ?? 0));
  }

  const billsWithPaid = bills.map((bill) => {
    const amountPaid = bill.amountPaid ?? 0;
    const creditApplied = bill.creditApplied ?? 0;
    const legacyPaid = paidByLegacyMemo.get(String(bill._id)) ?? 0;
    const received = Number((amountPaid + creditApplied + legacyPaid).toFixed(2));
    const returnedAmount = returnedByBill.get(String(bill._id)) ?? 0;
    return {
      ...bill.toObject(),
      amountPaid: received,
      balanceDue: Math.max(0, bill.grandTotal - received),
      billCredit: Math.max(0, received - bill.grandTotal),
      returnedAmount,
    };
  });

  return { customer, account, bills: billsWithPaid, memos, returns };
}
