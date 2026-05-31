import { Types } from 'mongoose';
import { AccountModel } from '../accounts/accounts.model.js';
import { BillModel } from '../billing/billing.model.js';
import { CashMemoModel } from '../cashmemo/cashmemo.model.js';
import { ExpenseModel } from '../expenses/expenses.model.js';
import { ReportSnapshotModel } from './reports.model.js';

function getMonthRange(period: string) {
  const [year, month] = period.split('-').map(Number);
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0, 23, 59, 59, 999);
  return { from, to };
}

export async function getLiveDashboard(tenantId: Types.ObjectId) {
  const [salesAgg, collectedAgg, dueAgg, expenseAgg, topProducts] = await Promise.all([
    BillModel.aggregate([
      { $match: { tenantId } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } },
    ]),
    CashMemoModel.aggregate([
      { $match: { tenantId } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } },
    ]),
    AccountModel.aggregate([
      { $match: { tenantId } },
      { $group: { _id: null, total: { $sum: '$dueBalance' } } },
    ]),
    ExpenseModel.aggregate([
      { $match: { tenantId } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    BillModel.aggregate([
      { $match: { tenantId } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.productName' },
          qty: { $sum: '$items.qty' },
          revenue: { $sum: '$items.total' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ]),
  ]);

  return {
    totalSales: salesAgg[0]?.total ?? 0,
    totalCollected: collectedAgg[0]?.total ?? 0,
    totalDue: dueAgg[0]?.total ?? 0,
    totalExpenses: expenseAgg[0]?.total ?? 0,
    topProducts: topProducts.map((p) => ({
      productId: p._id?.toString(),
      name: p.name,
      qty: p.qty,
      revenue: p.revenue,
    })),
  };
}

export async function buildMonthlySnapshot(tenantId: Types.ObjectId, period: string) {
  const { from, to } = getMonthRange(period);

  const [salesAgg, collectedAgg, dueAgg, expenseAgg, topProducts] = await Promise.all([
    BillModel.aggregate([
      { $match: { tenantId, createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } },
    ]),
    CashMemoModel.aggregate([
      { $match: { tenantId, paidAt: { $gte: from, $lte: to } } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } },
    ]),
    AccountModel.aggregate([
      { $match: { tenantId } },
      { $group: { _id: null, total: { $sum: '$dueBalance' } } },
    ]),
    ExpenseModel.aggregate([
      { $match: { tenantId, date: { $gte: from, $lte: to } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    BillModel.aggregate([
      { $match: { tenantId, createdAt: { $gte: from, $lte: to } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.productName' },
          qty: { $sum: '$items.qty' },
          revenue: { $sum: '$items.total' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]),
  ]);

  return ReportSnapshotModel.findOneAndUpdate(
    { tenantId, period },
    {
      tenantId,
      period,
      totalSales: salesAgg[0]?.total ?? 0,
      totalCollected: collectedAgg[0]?.total ?? 0,
      totalDue: dueAgg[0]?.total ?? 0,
      totalExpenses: expenseAgg[0]?.total ?? 0,
      topProducts: topProducts.map((p) => ({
        productId: p._id?.toString(),
        name: p.name,
        qty: p.qty,
        revenue: p.revenue,
      })),
    },
    { upsert: true, new: true }
  );
}

export async function getSnapshot(tenantId: Types.ObjectId, period: string) {
  return ReportSnapshotModel.findOne({ tenantId, period });
}

export async function listSnapshots(tenantId: Types.ObjectId) {
  return ReportSnapshotModel.find({ tenantId }).sort({ period: -1 });
}
