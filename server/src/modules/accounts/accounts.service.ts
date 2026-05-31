import { Types } from 'mongoose';
import { AccountModel } from './accounts.model.js';
import { CustomerModel } from './customer.model.js';

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

  account.dueBalance = account.totalBilled - account.totalPaid;
  account.lastActivityAt = new Date();
  await account.save();
  return account;
}

export async function addBillToAccount(
  tenantId: Types.ObjectId,
  customerId: Types.ObjectId,
  billId: Types.ObjectId,
  grandTotal: number
) {
  let account = await AccountModel.findOne({ tenantId, customerId });

  if (!account) {
    account = await AccountModel.create({
      tenantId,
      customerId,
      totalBilled: grandTotal,
      totalPaid: 0,
      dueBalance: grandTotal,
      bills: [billId],
      memos: [],
      lastActivityAt: new Date(),
    });
    return account;
  }

  account.totalBilled += grandTotal;
  account.bills.push(billId);
  account.dueBalance = account.totalBilled - account.totalPaid;
  account.lastActivityAt = new Date();
  await account.save();
  return account;
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
  account.dueBalance = account.totalBilled - account.totalPaid;
  account.lastActivityAt = new Date();
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
