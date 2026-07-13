import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Loader2,
  User,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { accountsApi, billingApi, expensesApi, returnsApi } from '@/api';
import type { AccountWithCustomer, Bill, Expense, ReturnItem } from '@paint-saas/shared-types';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/config/config';
import { useAuthStore } from '@/store/auth.store';

type Period = 'this-month' | 'last-month' | 'this-week';

const CATEGORY_COLORS = ['#f97316', '#3b82f6', '#eab308', '#ec4899', '#22c55e'];

const PERIOD_LABELS: Record<Period, string> = {
  'this-month': 'this month',
  'last-month': 'last month',
  'this-week': 'this week',
};

function formatMoney(amount: number) {
  return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatCompact(amount: number) {
  return Math.round(amount).toLocaleString('en-IN');
}

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

function getPeriodRange(period: Period, base = new Date()): { from: Date; to: Date } {
  const now = new Date(base);
  if (period === 'this-week') {
    const from = startOfDay(now);
    from.setDate(from.getDate() - ((from.getDay() + 6) % 7)); // Monday
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

function getPreviousPeriodRange(period: Period, base = new Date()): { from: Date; to: Date } {
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

function inRange(dateStr: string | undefined, from: Date, to: Date) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  return d >= from && d <= to;
}

function pctChange(current: number, previous: number): { pct: string; up: boolean } {
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
  return startOfDay(d).toISOString().slice(0, 10);
}

function dayLabel(d: Date) {
  return `${d.getDate()} ${d.toLocaleString('en-IN', { month: 'short' }).toUpperCase()}`;
}

function MetricCard({
  label,
  value,
  trend,
  compareLabel,
  accent,
  loading,
  onClick,
}: {
  label: string;
  value: string;
  trend: { pct: string; up: boolean };
  compareLabel: string;
  accent?: boolean;
  loading: boolean;
  onClick?: () => void;
}) {
  const TrendIcon = trend.up ? ArrowUpRight : ArrowDownRight;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative h-full w-full overflow-hidden text-left rounded-[20px] p-4 lg:p-5 flex flex-col justify-between transition',
        accent
          ? 'bg-[var(--brand-primary)] text-white shadow-[0_12px_32px_rgba(19,88,250,0.25)]'
          : 'bg-white text-[#0f172a] border border-[#e8eef5] shadow-[0_4px_16px_rgba(15,23,42,0.04)]'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn('text-[15px] lg:text-[16px] font-medium', accent ? 'text-white/85' : 'text-[#64748b]')}>
          {label}
        </p>
        <span
          className={cn(
            'w-9 h-9 lg:w-10 lg:h-10 rounded-full inline-flex items-center justify-center shrink-0',
            accent ? 'bg-white text-[#0f172a]' : 'bg-[#f1f5f9] text-[#0f172a]'
          )}
        >
          <ArrowUpRight className="w-4 h-4 lg:w-[18px] lg:h-[18px]" strokeWidth={2.25} />
        </span>
      </div>

      <div className="mt-auto pt-3">
        <p className="text-[26px] sm:text-[30px] lg:text-[34px] font-bold tracking-tight leading-none truncate">
          {loading ? (
            <Loader2 className={cn('h-6 w-6 animate-spin', accent ? 'text-white/70' : 'text-[#94a3b8]')} />
          ) : (
            value
          )}
        </p>
        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 text-[12px] lg:text-[13px] font-semibold',
              trend.up
                ? accent
                  ? 'bg-[#bbf7d0] text-[#166534]'
                  : 'bg-[#dcfce7] text-[#15803d]'
                : accent
                  ? 'bg-[#fecaca] text-[#991b1b]'
                  : 'bg-[#fee2e2] text-[#b91c1c]'
            )}
          >
            <TrendIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
            {trend.pct}%
          </span>
          <span className={cn('text-[12px] lg:text-[13px]', accent ? 'text-white/75' : 'text-[#94a3b8]')}>
            {compareLabel}
          </span>
        </div>
      </div>
    </button>
  );
}

function StatusCard({
  icon,
  value,
  unit,
  message,
  highlight,
  decoration,
  onClick,
  loading,
}: {
  icon: ReactNode;
  value: string | number;
  unit: string;
  message: ReactNode;
  highlight?: boolean;
  decoration?: boolean;
  onClick?: () => void;
  loading: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative overflow-hidden h-full w-full text-left rounded-[20px] bg-white border border-[#e8eef5] shadow-[0_4px_16px_rgba(15,23,42,0.04)] p-4 lg:p-5 flex flex-col justify-between"
    >
      {decoration && (
        <div
          className="pointer-events-none absolute right-0 top-0 h-24 w-28 opacity-50"
          aria-hidden
          style={{
            backgroundImage:
              'radial-gradient(circle at 70% 20%, rgba(59,130,246,0.28), transparent 60%)',
          }}
        />
      )}
      <div className="flex items-start justify-between relative z-[1]">
        <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-[#f1f5f9] inline-flex items-center justify-center text-[#64748b]">
          {icon}
        </div>
        {highlight && (
          <span className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-[#0f172a] text-white inline-flex items-center justify-center">
            <ArrowUpRight className="w-4 h-4" strokeWidth={2.25} />
          </span>
        )}
      </div>
      <div className="relative z-[1] mt-auto pt-4">
        <p className="text-[28px] sm:text-[32px] lg:text-[36px] font-bold tracking-tight text-[#0f172a] leading-none">
          {loading ? <Loader2 className="h-7 w-7 animate-spin text-[#94a3b8]" /> : value}{' '}
          {!loading && (
            <span className="text-[16px] sm:text-[18px] lg:text-[20px] font-semibold text-[#64748b]">
              {unit}
            </span>
          )}
        </p>
        <p className="mt-2.5 text-[13px] sm:text-[14px] text-[#64748b] leading-snug line-clamp-2">
          {message}
        </p>
      </div>
    </button>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  const [period, setPeriod] = useState<Period>('this-month');
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);
  const [accounts, setAccounts] = useState<AccountWithCustomer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [returns, setReturns] = useState<ReturnItem[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [billList, accountList, expenseList, returnList] = await Promise.all([
          billingApi.list(),
          accountsApi.list(),
          expensesApi.list(),
          returnsApi.list(),
        ]);
        setBills(billList);
        setAccounts(accountList);
        setExpenses(expenseList);
        setReturns(returnList);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const range = useMemo(() => getPeriodRange(period), [period]);
  const prevRange = useMemo(() => getPreviousPeriodRange(period), [period]);

  const filteredBills = useMemo(
    () => bills.filter((b) => inRange(b.createdAt, range.from, range.to)),
    [bills, range]
  );
  const prevBills = useMemo(
    () => bills.filter((b) => inRange(b.createdAt, prevRange.from, prevRange.to)),
    [bills, prevRange]
  );

  const filteredExpenses = useMemo(
    () => expenses.filter((e) => inRange(e.date, range.from, range.to)),
    [expenses, range]
  );
  const prevExpenses = useMemo(
    () => expenses.filter((e) => inRange(e.date, prevRange.from, prevRange.to)),
    [expenses, prevRange]
  );

  const periodRevenue = useMemo(
    () => filteredBills.reduce((s, b) => s + (b.grandTotal ?? 0), 0),
    [filteredBills]
  );
  const prevRevenue = useMemo(
    () => prevBills.reduce((s, b) => s + (b.grandTotal ?? 0), 0),
    [prevBills]
  );

  const periodExpenseTotal = useMemo(
    () => filteredExpenses.reduce((s, e) => s + (e.amount ?? 0), 0),
    [filteredExpenses]
  );
  const prevExpenseTotal = useMemo(
    () => prevExpenses.reduce((s, e) => s + (e.amount ?? 0), 0),
    [prevExpenses]
  );

  const periodReturns = useMemo(
    () =>
      returns
        .filter((r) => inRange(r.createdAt, range.from, range.to))
        .reduce((s, r) => s + (r.amount ?? 0), 0),
    [returns, range]
  );

  const netProfit = Math.max(0, periodRevenue - periodExpenseTotal - periodReturns);
  const prevProfit = Math.max(
    0,
    prevRevenue -
      prevExpenseTotal -
      returns
        .filter((r) => inRange(r.createdAt, prevRange.from, prevRange.to))
        .reduce((s, r) => s + (r.amount ?? 0), 0)
  );

  const customerIdsInPeriod = useMemo(() => {
    const ids = new Set<string>();
    for (const bill of filteredBills) {
      const id = typeof bill.customerId === 'object' ? (bill.customerId as { _id?: string })?._id : bill.customerId;
      if (id) ids.add(String(id));
    }
    return ids;
  }, [filteredBills]);

  const prevCustomerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const bill of prevBills) {
      const id = typeof bill.customerId === 'object' ? (bill.customerId as { _id?: string })?._id : bill.customerId;
      if (id) ids.add(String(id));
    }
    return ids;
  }, [prevBills]);

  const periodCustomerCount = customerIdsInPeriod.size;
  const prevCustomerCount = prevCustomerIds.size;

  const awaitingBills = filteredBills.filter((b) => b.status !== 'paid').length;
  const waitingCustomers = accounts.filter((a) => {
    if ((a.dueBalance ?? 0) <= 0) return false;
    if (periodCustomerCount === 0 && period === 'this-month') return true;
    const cust = a.customerId;
    const id = typeof cust === 'object' && cust ? (cust as { _id?: string })._id : cust;
    return id ? customerIdsInPeriod.has(String(id)) : false;
  }).length;

  const revenueBars = useMemo(() => {
    const days = eachDay(range.from, range.to);
    // Cap very long months to keep chart readable — show all days for week, up to 31 for month
    const buckets = days.map((d) => ({
      key: dayKey(d),
      label: dayLabel(d),
      value: 0,
    }));
    const map = new Map(buckets.map((b) => [b.key, b]));
    for (const bill of filteredBills) {
      const key = dayKey(new Date(bill.createdAt));
      const bucket = map.get(key);
      if (bucket) bucket.value += bill.grandTotal ?? 0;
    }
    return buckets;
  }, [filteredBills, range]);

  const categoryData = useMemo(() => {
    const byName = new Map<string, number>();
    for (const bill of filteredBills) {
      for (const item of bill.items ?? []) {
        const name = item.productName || 'Unknown';
        byName.set(name, (byName.get(name) ?? 0) + (item.total ?? 0));
      }
    }
    const ranked = [...byName.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const total = ranked.reduce((s, [, rev]) => s + rev, 0) || 1;
    if (ranked.length === 0) {
      return [{ name: 'No sales in this period', value: 100, color: '#cbd5e1' }];
    }
    return ranked.map(([name, revenue], i) => ({
      name,
      value: Math.max(1, Math.round((revenue / total) * 100)),
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));
  }, [filteredBills]);

  const revenueTrend = pctChange(periodRevenue, prevRevenue);
  const ordersTrend = pctChange(filteredBills.length, prevBills.length);
  const visitorsTrend = pctChange(periodCustomerCount, prevCustomerCount);
  const profitTrend = pctChange(netProfit, prevProfit);

  const compareLabel =
    period === 'this-week'
      ? 'This week vs last'
      : period === 'last-month'
        ? 'Last month vs prior'
        : 'This month vs last';

  function cyclePeriod() {
    setPeriod((p) =>
      p === 'this-month' ? 'this-week' : p === 'this-week' ? 'last-month' : 'this-month'
    );
  }

  return (
    <div className="h-full min-h-0 bg-[var(--brand-space)] px-4 sm:px-5 lg:px-6 py-4 lg:py-5 flex flex-col overflow-hidden">
      <div className="w-full h-full min-h-0 flex flex-col gap-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0">
          <div className="min-w-0">
            <h1 className="text-[28px] sm:text-[32px] lg:text-[36px] font-bold text-[#0f172a] tracking-tight leading-tight">
              Hello, {firstName}! 👋
            </h1>
            <p className="mt-1 text-[14px] sm:text-[15px] text-[#64748b]">
              This is what&apos;s happening in your store {PERIOD_LABELS[period]}.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Select value={period} onValueChange={(v: string) => setPeriod(v as Period)}>
              <SelectTrigger className="h-10 rounded-full border-[#e2e8f0] bg-white px-4 min-w-[140px] text-[14px] font-medium text-[#334155] shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="">
                <SelectItem className="" value="this-month">This month</SelectItem>
                <SelectItem className="" value="last-month">Last month</SelectItem>
                <SelectItem className="" value="this-week">This week</SelectItem>
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={cyclePeriod}
              className="h-10 w-10 rounded-[12px] border border-[#e2e8f0] bg-white text-[#64748b] inline-flex items-center justify-center shadow-sm hover:bg-[#f8fafc]"
              aria-label="Cycle calendar period"
              title="Cycle period"
            >
              <CalendarDays className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
          </div>
        </header>

        {/* Viewport-fit grid: 4 cols × 3 equal fr rows */}
        <section
          className="flex-1 min-h-0 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5"
          style={{ gridTemplateRows: 'repeat(3, minmax(0, 1fr))' }}
        >
          <div className="min-h-0 h-full">
            <MetricCard
              label="Total revenue"
              value={formatMoney(periodRevenue)}
              trend={revenueTrend}
              compareLabel={compareLabel}
              accent
              loading={loading}
              onClick={() => navigate(ROUTES.REPORTS)}
            />
          </div>
          <div className="min-h-0 h-full">
            <MetricCard
              label="Total orders"
              value={String(filteredBills.length)}
              trend={ordersTrend}
              compareLabel={compareLabel}
              loading={loading}
              onClick={() => navigate(ROUTES.BILLING)}
            />
          </div>

          <div className="col-span-2 row-span-2 min-h-0 h-full rounded-[20px] bg-white border border-[#e8eef5] shadow-[0_4px_16px_rgba(15,23,42,0.04)] p-3 sm:p-4 lg:p-5 flex flex-col">
            <div className="flex items-start justify-between gap-3 shrink-0 mb-1">
              <div>
                <h2 className="text-[18px] lg:text-[20px] font-bold text-[#0f172a]">Revenue</h2>
                <p className="text-[13px] text-[#94a3b8]">{compareLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(ROUTES.REPORTS)}
                className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-[#0f172a] text-white inline-flex items-center justify-center hover:opacity-90"
              >
                <ArrowUpRight className="w-4 h-4 lg:w-[18px] lg:h-[18px]" strokeWidth={2.25} />
              </button>
            </div>
            <div className="flex-1 min-h-0 w-full">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-[#94a3b8]" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueBars} barCategoryGap="28%" margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13 }} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 13 }}
                      tickFormatter={(v) =>
                        `₹${Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : v}`
                      }
                      width={48}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(19,88,250,0.06)' }}
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 8px 20px rgba(15,23,42,0.08)',
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                      formatter={(value) => [formatMoney(Number(value ?? 0)), 'Revenue']}
                    />
                    <Bar dataKey="value" fill="var(--brand-primary)" radius={[10, 10, 10, 10]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="min-h-0 h-full">
            <MetricCard
              label="Total customers"
              value={formatCompact(periodCustomerCount)}
              trend={visitorsTrend}
              compareLabel={compareLabel}
              loading={loading}
              onClick={() => navigate(ROUTES.ACCOUNTS)}
            />
          </div>
          <div className="min-h-0 h-full">
            <MetricCard
              label="Net profit"
              value={formatMoney(netProfit)}
              trend={profitTrend}
              compareLabel={compareLabel}
              loading={loading}
              onClick={() => navigate(ROUTES.REPORTS)}
            />
          </div>

          <div className="min-h-0 h-full">
            <StatusCard
              icon={<Check className="w-5 h-5" strokeWidth={2.25} />}
              value={filteredBills.length}
              unit="orders"
              highlight
              loading={loading}
              onClick={() => navigate(ROUTES.BILLING)}
              message={
                <>
                  {awaitingBills} orders{' '}
                  <span className="text-[#ef4444] font-medium">are awaiting confirmation.</span>
                </>
              }
            />
          </div>
          <div className="min-h-0 h-full">
            <StatusCard
              icon={<User className="w-5 h-5" strokeWidth={2.25} />}
              value={periodCustomerCount}
              unit="customers"
              decoration
              loading={loading}
              onClick={() => navigate(ROUTES.ACCOUNTS)}
              message={
                <>
                  {waitingCustomers} customers{' '}
                  <span className="text-[#ef4444] font-medium">are waiting for response.</span>
                </>
              }
            />
          </div>

          <div className="col-span-2 min-h-0 h-full rounded-[20px] bg-white border border-[#e8eef5] shadow-[0_4px_16px_rgba(15,23,42,0.04)] p-3 sm:p-4 lg:p-5 flex flex-col">
            <div className="flex items-start justify-between gap-3 shrink-0">
              <div>
                <h2 className="text-[18px] lg:text-[20px] font-bold text-[#0f172a]">Sales by Category</h2>
                <p className="text-[13px] text-[#94a3b8]">{compareLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(ROUTES.REPORTS)}
                className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-[#0f172a] text-white inline-flex items-center justify-center hover:opacity-90"
              >
                <ArrowUpRight className="w-4 h-4 lg:w-[18px] lg:h-[18px]" strokeWidth={2.25} />
              </button>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-[#94a3b8]" />
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex items-center gap-3 mt-1">
                <div className="h-full aspect-square max-h-full max-w-[42%] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="42%"
                        outerRadius="72%"
                        paddingAngle={2}
                        stroke="none"
                      >
                        {categoryData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                        <LabelList
                          dataKey="value"
                          position="inside"
                          formatter={(v) => `${v}%`}
                          style={{ fill: '#fff', fontSize: 12, fontWeight: 700 }}
                        />
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${value}%`, String(name)]}
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid #e2e8f0',
                          fontSize: 13,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="flex-1 min-w-0 space-y-2 overflow-y-auto max-h-full pr-1">
                  {categoryData.map((item) => (
                    <li key={item.name} className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[13px] lg:text-[14px] text-[#334155] truncate flex-1">
                        {item.name}
                      </span>
                      <span className="text-[13px] lg:text-[14px] font-semibold text-[#64748b] tabular-nums shrink-0">
                        {item.value}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
