import { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
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
import { reportsApi } from '@/api';
import type { DashboardOverview, DashboardPeriod, DashboardTrend } from '@paint-saas/shared-types';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  'this-month': 'this month',
  'last-month': 'last month',
  'this-week': 'this week',
};

function formatMoney(amount: number) {
  return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
}

function MetricCard({
  label,
  value,
  trend,
  compareLabel,
  accent,
  loading,
}: {
  label: string;
  value: string;
  trend: DashboardTrend;
  compareLabel: string;
  accent?: boolean;
  loading: boolean;
}) {
  const TrendIcon = trend.up ? ArrowUpRight : ArrowDownRight;
  return (
    <article
      className={cn(
        'relative w-full overflow-hidden text-left rounded-[18px] sm:rounded-[20px] p-4 sm:p-5 flex flex-col min-h-[132px] sm:min-h-[148px] h-full',
        accent
          ? 'bg-[var(--brand-primary)] text-white shadow-[0_12px_32px_rgba(19,88,250,0.25)]'
          : 'bg-white border border-[#e8eef5] shadow-[0_4px_16px_rgba(15,23,42,0.04)]'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            'text-[14px] sm:text-[15px] font-medium',
            accent ? 'text-white/85' : 'text-[#64748b]'
          )}
        >
          {label}
        </p>
        <span
          className={cn(
            'inline-flex items-center gap-0.5 text-[12px] font-semibold tabular-nums',
            accent
              ? trend.up
                ? 'text-emerald-100'
                : 'text-rose-100'
              : trend.up
                ? 'text-emerald-600'
                : 'text-rose-500'
          )}
        >
          <TrendIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
          {trend.pct}%
        </span>
      </div>
      <p
        className={cn(
          'mt-4 text-[24px] sm:text-[28px] lg:text-[30px] font-bold tracking-tight leading-none',
          accent ? 'text-white' : 'text-[#0f172a]'
        )}
      >
        {loading ? (
          <Loader2 className={cn('h-6 w-6 animate-spin', accent ? 'text-white/70' : 'text-[#94a3b8]')} />
        ) : (
          value
        )}
      </p>
      <p className={cn('mt-auto pt-3 text-[11px] sm:text-[12px]', accent ? 'text-white/65' : 'text-[#94a3b8]')}>
        {compareLabel}
      </p>
    </article>
  );
}

function StatusCard({
  icon,
  value,
  unit,
  message,
  decoration,
  loading,
}: {
  icon: ReactNode;
  value: number;
  unit: string;
  message: ReactNode;
  decoration?: boolean;
  loading: boolean;
}) {
  return (
    <article className="relative overflow-hidden w-full text-left rounded-[18px] sm:rounded-[20px] bg-white border border-[#e8eef5] shadow-[0_4px_16px_rgba(15,23,42,0.04)] p-4 sm:p-5 flex flex-col min-h-[140px] sm:min-h-[160px] h-full">
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
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#f1f5f9] inline-flex items-center justify-center text-[#64748b]">
          {icon}
        </div>
      </div>
      <div className="relative z-[1] mt-auto pt-3 sm:pt-4">
        <p className="text-[24px] sm:text-[28px] lg:text-[32px] font-bold tracking-tight text-[#0f172a] leading-none">
          {loading ? <Loader2 className="h-6 w-6 animate-spin text-[#94a3b8]" /> : value}{' '}
          {!loading && (
            <span className="text-[14px] sm:text-[16px] font-semibold text-[#64748b]">{unit}</span>
          )}
        </p>
        <p className="mt-2 text-[12px] sm:text-[13px] text-[#64748b] leading-snug line-clamp-2">
          {message}
        </p>
      </div>
    </article>
  );
}

const emptyOverview: DashboardOverview = {
  period: 'this-month',
  compareLabel: 'This month vs last',
  metrics: {
    revenue: 0,
    revenueTrend: { pct: '0,00', up: true },
    totalDue: 0,
    totalDueTrend: { pct: '0,00', up: true },
    totalExpenses: 0,
    totalExpensesTrend: { pct: '0,00', up: true },
    netRevenue: 0,
    netRevenueTrend: { pct: '0,00', up: true },
  },
  awaitingBills: 0,
  waitingCustomers: 0,
  revenueBars: [],
  categoryData: [{ name: 'No sales in this period', value: 100, color: '#cbd5e1' }],
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  const [period, setPeriod] = useState<DashboardPeriod>('this-month');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<DashboardOverview>(emptyOverview);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await reportsApi.overview(period);
        if (!cancelled) setOverview(data);
      } catch {
        if (!cancelled) toast.error('Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [period]);

  const { metrics, revenueBars, categoryData, awaitingBills, waitingCustomers, compareLabel } =
    overview;

  return (
    <div className="min-h-full bg-[var(--brand-space)] px-4 sm:px-6 lg:px-8 py-5 sm:py-6 lg:py-7 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="w-full max-w-[1440px] mx-auto space-y-5 sm:space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[26px] sm:text-[30px] lg:text-[34px] font-bold text-[#0f172a] tracking-tight leading-tight">
              Hello, {firstName}! 👋
            </h1>
            <p className="mt-1.5 text-[13px] sm:text-[14px] text-[#64748b] leading-relaxed">
              This is what&apos;s happening in your store {PERIOD_LABELS[period]}.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <Select value={period} onValueChange={(v: string) => setPeriod(v as DashboardPeriod)}>
              <SelectTrigger className="h-10 rounded-full border-[#e2e8f0] bg-white px-4 min-w-[132px] sm:min-w-[148px] text-[13px] sm:text-[14px] font-medium text-[#334155] shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[#e2e8f0]">
                <SelectItem className="rounded-lg" value="this-month">
                  This month
                </SelectItem>
                <SelectItem className="rounded-lg" value="last-month">
                  Last month
                </SelectItem>
                <SelectItem className="rounded-lg" value="this-week">
                  This week
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            label="Total revenue"
            value={formatMoney(metrics.revenue)}
            trend={metrics.revenueTrend}
            compareLabel={compareLabel}
            accent
            loading={loading}
          />
          <MetricCard
            label="Total Due"
            value={formatMoney(metrics.totalDue)}
            trend={metrics.totalDueTrend}
            compareLabel={compareLabel}
            loading={loading}
          />
          <MetricCard
            label="Total Expenses"
            value={formatMoney(metrics.totalExpenses)}
            trend={metrics.totalExpensesTrend}
            compareLabel={compareLabel}
            loading={loading}
          />
          <MetricCard
            label="Net revenue"
            value={formatMoney(metrics.netRevenue)}
            trend={metrics.netRevenueTrend}
            compareLabel={compareLabel}
            loading={loading}
          />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-4 lg:gap-5 items-stretch">
          <div className="xl:col-span-8 rounded-[18px] sm:rounded-[20px] bg-white border border-[#e8eef5] shadow-[0_4px_16px_rgba(15,23,42,0.04)] p-4 sm:p-5 flex flex-col min-h-[360px] xl:min-h-0">
            <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4 shrink-0">
              <div className="min-w-0">
                <h2 className="text-[16px] sm:text-[18px] font-bold text-[#0f172a]">Revenue</h2>
                <p className="text-[12px] sm:text-[13px] text-[#94a3b8]">{compareLabel}</p>
              </div>
            </div>
            <div className="relative flex-1 w-full min-h-[260px] sm:min-h-[280px]">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-[#94a3b8]" />
                </div>
              ) : revenueBars.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-[13px] text-[#94a3b8]">
                  No revenue data for this period
                </div>
              ) : (
                <div className="absolute inset-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={revenueBars}
                      barCategoryGap="18%"
                      margin={{ top: 12, right: 12, left: 4, bottom: 8 }}
                    >
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                        minTickGap={24}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        width={52}
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        tickFormatter={(v) =>
                          `₹${Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : v}`
                        }
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(19,88,250,0.06)' }}
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 8px 20px rgba(15,23,42,0.08)',
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                        formatter={(value) => [formatMoney(Number(value ?? 0)), 'Revenue']}
                      />
                      <Bar
                        dataKey="value"
                        fill="#1358fa"
                        radius={[8, 8, 8, 8]}
                        maxBarSize={40}
                        isAnimationActive={false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="xl:col-span-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3 sm:gap-4 lg:gap-5 content-start">
            <StatusCard
              icon={<Check className="w-5 h-5" strokeWidth={2.25} />}
              value={awaitingBills}
              unit="bills"
              loading={loading}
              message={
                <>
                  {awaitingBills} bills{' '}
                  <span className="text-[#ef4444] font-medium">are awaiting payment.</span>
                </>
              }
            />
            <StatusCard
              icon={<User className="w-5 h-5" strokeWidth={2.25} />}
              value={waitingCustomers}
              unit="customers"
              decoration
              loading={loading}
              message={
                <>
                  {waitingCustomers} customers{' '}
                  <span className="text-[#ef4444] font-medium">have outstanding dues.</span>
                </>
              }
            />

            <div className="sm:col-span-2 xl:col-span-1 rounded-[18px] sm:rounded-[20px] bg-white border border-[#e8eef5] shadow-[0_4px_16px_rgba(15,23,42,0.04)] p-4 sm:p-5 flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-3 shrink-0">
                <div className="min-w-0">
                  <h2 className="text-[16px] sm:text-[18px] font-bold text-[#0f172a]">
                    Sales by Category
                  </h2>
                  <p className="text-[12px] sm:text-[13px] text-[#94a3b8]">{compareLabel}</p>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-[168px]">
                  <Loader2 className="h-7 w-7 animate-spin text-[#94a3b8]" />
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row xl:flex-col 2xl:flex-row items-center gap-4">
                  <div className="w-[160px] h-[160px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={72}
                          paddingAngle={2}
                          stroke="none"
                          isAnimationActive={false}
                        >
                          {categoryData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                          <LabelList
                            dataKey="value"
                            position="inside"
                            formatter={(v) => `${v}%`}
                            style={{ fill: '#fff', fontSize: 9, fontWeight: 600 }}
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
                  <ul className="w-full flex-1 min-w-0 space-y-2.5">
                    {categoryData.map((item) => (
                      <li key={item.name} className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[13px] text-[#334155] truncate flex-1">
                          {item.name}
                        </span>
                        <span className="text-[13px] font-semibold text-[#64748b] tabular-nums shrink-0">
                          {item.value}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
