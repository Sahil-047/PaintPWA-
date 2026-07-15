import { Types } from 'mongoose';
import { AccountModel } from '../accounts/accounts.model.js';
import { BillModel } from '../billing/billing.model.js';
import { ExpenseModel } from '../expenses/expenses.model.js';
import { ReturnItemModel } from '../returns/returns.model.js';

export type DashboardPeriod = 'this-month' | 'last-month' | 'this-week';

const CATEGORY_COLORS = ['#f97316', '#3b82f6', '#eab308', '#ec4899', '#22c55e'];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function getPeriodRange(period: DashboardPeriod, base = new Date()): { from: Date; to: Date } {
  const now = new Date(base);
  if (period === 'this-week') {
    const from = startOfDay(now);
    from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
    const to = endOfDay(new Date(from));
    to.setDate(from.getDate() + 6);
    return { from, to: to > now ? endOfDay(now) : to };
  }
  if (period === 'last-month') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
    return { from: startOfDay(from), to };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: startOfDay(from), to: endOfDay(now) };
}

function getPreviousPeriodRange(period: DashboardPeriod, base = new Date()): { from: Date; to: Date } {
  const now = new Date(base);
  if (period === 'this-week') {
    const thisWeek = getPeriodRange('this-week', now);
    const from = new Date(thisWeek.from);
    from.setDate(from.getDate() - 7);
    const to = endOfDay(new Date(from));
    to.setDate(from.getDate() + 6);
    return { from: startOfDay(from), to };
  }
  if (period === 'last-month') {
    const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const to = endOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 0));
    return { from: startOfDay(from), to };
  }
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
  return { from: startOfDay(from), to };
}

function pctChange(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) return { pct: '0,00', up: true };
    return { pct: '100,00', up: true };
  }
  const change = ((current - previous) / Math.abs(previous)) * 100;
  return {
    pct: Math.abs(change).toFixed(2).replace('.', ','),
    up: change >= 0,
  };
}

function eachDay(from: Date, to: Date) {
  const days: Date[] = [];
  const cursor = startOfDay(from);
  const end = startOfDay(to);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function dayKey(d: Date) {
  // Local calendar date — must match Mongo $dateToString timezone below
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayLabel(d: Date) {
  return `${d.getDate()} ${d.toLocaleString('en-IN', { month: 'short' }).toUpperCase()}`;
}

function compareLabelFor(period: DashboardPeriod) {
  if (period === 'this-week') return 'This week vs last';
  if (period === 'last-month') return 'Last month vs prior';
  return 'This month vs last';
}

/**
 * Single store-home dashboard payload.
 * Bills use $facet + $lookup(customers); accounts lookup customers for overdue dues.
 */
export async function getStoreDashboardOverview(
  tenantId: Types.ObjectId,
  period: DashboardPeriod = 'this-month'
) {
  const range = getPeriodRange(period);
  const prevRange = getPreviousPeriodRange(period);

  const [billFacet, expenseFacet, returnFacet, waitingAgg] = await Promise.all([
    BillModel.aggregate([
      { $match: { tenantId } },
      {
        $facet: {
          current: [
            { $match: { createdAt: { $gte: range.from, $lte: range.to } } },
            {
              $lookup: {
                from: 'customers',
                localField: 'customerId',
                foreignField: '_id',
                as: 'customer',
              },
            },
            {
              $project: {
                grandTotal: 1,
                status: 1,
                createdAt: 1,
                items: 1,
                customerId: 1,
                customerName: { $arrayElemAt: ['$customer.name', 0] },
              },
            },
          ],
          previous: [
            { $match: { createdAt: { $gte: prevRange.from, $lte: prevRange.to } } },
            {
              $project: {
                grandTotal: 1,
                createdAt: 1,
                customerId: 1,
              },
            },
          ],
          topProducts: [
            { $match: { createdAt: { $gte: range.from, $lte: range.to } } },
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.productName',
                revenue: { $sum: '$items.total' },
              },
            },
            { $sort: { revenue: -1 } },
            { $limit: 5 },
          ],
          dailyRevenue: [
            { $match: { createdAt: { $gte: range.from, $lte: range.to } } },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$createdAt',
                    timezone: 'Asia/Kolkata',
                  },
                },
                value: { $sum: '$grandTotal' },
              },
            },
          ],
        },
      },
    ]),
    ExpenseModel.aggregate([
      { $match: { tenantId } },
      {
        $facet: {
          current: [
            { $match: { date: { $gte: range.from, $lte: range.to } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ],
          previous: [
            { $match: { date: { $gte: prevRange.from, $lte: prevRange.to } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ],
        },
      },
    ]),
    ReturnItemModel.aggregate([
      { $match: { tenantId } },
      {
        $facet: {
          current: [
            { $match: { createdAt: { $gte: range.from, $lte: range.to } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ],
          previous: [
            { $match: { createdAt: { $gte: prevRange.from, $lte: prevRange.to } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ],
        },
      },
    ]),
    AccountModel.aggregate([
      { $match: { tenantId, dueBalance: { $gt: 0 } } },
      {
        $lookup: {
          from: 'customers',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customer',
        },
      },
      {
        $project: {
          customerId: 1,
          dueBalance: 1,
          customerName: { $arrayElemAt: ['$customer.name', 0] },
        },
      },
    ]),
  ]);

  const bills = billFacet[0] ?? {
    current: [],
    previous: [],
    topProducts: [],
    dailyRevenue: [],
  };
  const currentBills = bills.current as Array<{
    grandTotal?: number;
    status?: string;
    customerId?: Types.ObjectId;
  }>;
  const previousBills = bills.previous as Array<{
    grandTotal?: number;
    customerId?: Types.ObjectId;
  }>;

  const periodRevenue = currentBills.reduce((s, b) => s + (b.grandTotal ?? 0), 0);
  const prevRevenue = previousBills.reduce((s, b) => s + (b.grandTotal ?? 0), 0);
  const orders = currentBills.length;
  const prevOrders = previousBills.length;

  const customerIds = new Set(
    currentBills.map((b) => String(b.customerId ?? '')).filter(Boolean)
  );
  const prevCustomerIds = new Set(
    previousBills.map((b) => String(b.customerId ?? '')).filter(Boolean)
  );

  const periodExpense = expenseFacet[0]?.current?.[0]?.total ?? 0;
  const prevExpense = expenseFacet[0]?.previous?.[0]?.total ?? 0;
  const periodReturns = returnFacet[0]?.current?.[0]?.total ?? 0;
  const prevReturns = returnFacet[0]?.previous?.[0]?.total ?? 0;

  const netProfit = Math.max(0, periodRevenue - periodExpense - periodReturns);
  const prevProfit = Math.max(0, prevRevenue - prevExpense - prevReturns);

  const awaitingBills = currentBills.filter((b) => b.status !== 'paid').length;

  const dueAccounts = waitingAgg as Array<{ customerId?: Types.ObjectId }>;
  let waitingCustomers = dueAccounts.length;
  if (customerIds.size > 0) {
    waitingCustomers = dueAccounts.filter((a) =>
      customerIds.has(String(a.customerId ?? ''))
    ).length;
  }

  const dailyMap = new Map(
    (bills.dailyRevenue as Array<{ _id: string; value: number }>).map((d) => [d._id, d.value])
  );
  const revenueBars = eachDay(range.from, range.to).map((d) => {
    const key = dayKey(d);
    return {
      key,
      label: dayLabel(d),
      value: dailyMap.get(key) ?? 0,
    };
  });

  const topProducts = bills.topProducts as Array<{ _id: string; revenue: number }>;
  const rankedTotal = topProducts.reduce((s, p) => s + (p.revenue ?? 0), 0) || 1;
  const categoryData =
    topProducts.length === 0
      ? [{ name: 'No sales in this period', value: 100, color: '#cbd5e1' }]
      : topProducts.map((p, i) => ({
          name: p._id || 'Unknown',
          value: Math.max(1, Math.round(((p.revenue ?? 0) / rankedTotal) * 100)),
          color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
        }));

  return {
    period,
    compareLabel: compareLabelFor(period),
    metrics: {
      revenue: periodRevenue,
      revenueTrend: pctChange(periodRevenue, prevRevenue),
      orders,
      ordersTrend: pctChange(orders, prevOrders),
      customers: customerIds.size,
      customersTrend: pctChange(customerIds.size, prevCustomerIds.size),
      netProfit,
      profitTrend: pctChange(netProfit, prevProfit),
    },
    awaitingBills,
    waitingCustomers,
    revenueBars,
    categoryData,
  };
}
