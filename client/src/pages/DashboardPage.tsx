import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  DollarSign,
  FileText,
  Loader2,
  Package,
  Receipt,
  TrendingUp,
  Users,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import { reportsApi, inventoryApi } from '@/api';
import { formatCurrency, cn } from '@/lib/utils';
import { ROUTES } from '@/config/config';
import { useAuthStore } from '@/store/auth.store';

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSales: 0,
    netSales: 0,
    totalReturns: 0,
    totalCollected: 0,
    totalDue: 0,
    totalCreditLiability: 0,
    totalExpenses: 0,
  });
  const [totalStock, setTotalStock] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const [dashboard, products] = await Promise.all([
          reportsApi.dashboard(),
          inventoryApi.list(),
        ]);
        setStats(dashboard);
        setTotalStock(products.reduce((s, p) => s + p.stockQty, 0));
        setLowStockCount(products.filter((p) => p.stockQty <= p.lowStockAlert).length);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const collectedAgainstSales = Math.max(0, stats.totalCollected - stats.totalCreditLiability);

  const primaryCards = [
    {
      title: 'Net Sales',
      value: formatCurrency(stats.netSales ?? stats.totalSales),
      icon: DollarSign,
      accent: true,
    },
    {
      title: 'Cash Collected',
      value: formatCurrency(stats.totalCollected),
      icon: TrendingUp,
      accent: false,
    },
    {
      title: 'Outstanding Due',
      value: formatCurrency(stats.totalDue),
      icon: FileText,
      accent: false,
    },
  ];

  const secondaryCards = [
    {
      title: 'Collected Against Sales',
      value: formatCurrency(collectedAgainstSales),
      icon: TrendingUp,
    },
    {
      title: 'Total Stock',
      value: loading ? '…' : totalStock.toLocaleString(),
      icon: Package,
    },
  ];

  const quickLinks = [
    { label: 'Create Invoice', path: ROUTES.BILLING, desc: 'Bill customers & deduct stock', icon: Receipt },
    { label: 'Manage Inventory', path: ROUTES.INVENTORY, desc: 'Products, brands & stock', icon: Package },
    { label: 'Customer Accounts', path: ROUTES.ACCOUNTS, desc: 'Dues, payments & cash memos', icon: Users },
    { label: 'View Analytics', path: ROUTES.REPORTS, desc: 'Sales & business insights', icon: BarChart3 },
  ];

  return (
    <div className="min-h-full bg-[var(--brand-space)] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-[1280px] space-y-5 sm:space-y-6">
        {/* Header band */}
        <section className="relative overflow-hidden rounded-[20px] sm:rounded-[24px] bg-[var(--brand-primary)] px-5 py-6 sm:px-7 sm:py-7 lg:px-8 lg:py-8 text-white">
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[var(--brand-secondary)]/30 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-white/10 blur-2xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.16em] text-white/75">
                Dashboard
              </p>
              <h1 className="mt-2 text-[28px] sm:text-[34px] lg:text-[40px] font-bold leading-[1.1] tracking-tight text-white break-words">
                Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
              </h1>
              <p className="mt-2 max-w-xl text-sm sm:text-[15px] text-white/80 leading-relaxed">
                Sales, collections, stock, and dues — updated for today.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(ROUTES.BILLING)}
              className="inline-flex h-11 sm:h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 sm:px-6 text-sm font-semibold text-[var(--brand-primary)] shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition hover:bg-[var(--brand-tertiary)]"
            >
              New invoice
              <ArrowUpRight className="h-4 w-4" strokeWidth={2.25} />
            </button>
          </div>
        </section>

        {/* Primary metrics — equal-height responsive row */}
        <section className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {primaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.title}
                className={cn(
                  'flex min-h-[132px] sm:min-h-[148px] flex-col justify-between rounded-[18px] sm:rounded-[20px] border p-4 sm:p-5',
                  card.accent
                    ? 'border-[var(--brand-primary)]/20 bg-[var(--brand-primary)] text-white shadow-[0_10px_30px_rgba(19,88,250,0.22)]'
                    : 'border-[var(--brand-secondary)]/50 bg-white text-[var(--brand-text)] shadow-[0_4px_20px_rgba(19,88,250,0.06)]'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <p
                    className={cn(
                      'text-[13px] sm:text-sm font-medium',
                      card.accent ? 'text-white/80' : 'text-black/55'
                    )}
                  >
                    {card.title}
                  </p>
                  <div
                    className={cn(
                      'flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-[12px]',
                      card.accent ? 'bg-white/15' : 'bg-[var(--brand-tertiary)]'
                    )}
                  >
                    <Icon
                      className={cn('h-5 w-5', card.accent ? 'text-white' : 'text-[var(--brand-primary)]')}
                      strokeWidth={2.1}
                    />
                  </div>
                </div>
                <p className="mt-4 text-[26px] sm:text-[30px] lg:text-[32px] font-bold tracking-tight leading-none">
                  {loading ? (
                    <Loader2
                      className={cn(
                        'h-6 w-6 animate-spin',
                        card.accent ? 'text-white/70' : 'text-[var(--brand-secondary)]'
                      )}
                    />
                  ) : (
                    card.value
                  )}
                </p>
              </article>
            );
          })}
        </section>

        {/* Secondary metrics */}
        <section className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
          {secondaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.title}
                className="flex min-h-[112px] sm:min-h-[124px] items-center justify-between gap-4 rounded-[18px] sm:rounded-[20px] border border-[var(--brand-secondary)]/45 bg-[var(--brand-tertiary)] px-4 py-4 sm:px-5 sm:py-5"
              >
                <div className="min-w-0">
                  <p className="text-[13px] sm:text-sm font-medium text-black/55">{card.title}</p>
                  <p className="mt-2 text-[24px] sm:text-[28px] font-bold tracking-tight text-[var(--brand-text)] leading-none truncate">
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-[var(--brand-secondary)]" />
                    ) : (
                      card.value
                    )}
                  </p>
                </div>
                <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-[14px] bg-white border border-[var(--brand-secondary)]/40">
                  <Icon className="h-5 w-5 text-[var(--brand-primary)]" strokeWidth={2.1} />
                </div>
              </article>
            );
          })}
        </section>

        {/* Quick actions */}
        <section>
          <div className="mb-3 sm:mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-bold text-[var(--brand-text)] tracking-tight">
              Quick actions
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.path}
                  type="button"
                  onClick={() => navigate(link.path)}
                  className="group flex min-h-[108px] sm:min-h-[116px] flex-col items-start rounded-[18px] sm:rounded-[20px] border border-[var(--brand-secondary)]/40 bg-white p-4 sm:p-5 text-left shadow-[0_4px_18px_rgba(19,88,250,0.05)] transition hover:border-[var(--brand-primary)]/35 hover:shadow-[0_10px_28px_rgba(19,88,250,0.12)]"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--brand-tertiary)] text-[var(--brand-primary)] transition group-hover:bg-[var(--brand-primary)] group-hover:text-white">
                    <Icon className="h-5 w-5" strokeWidth={2.1} />
                  </div>
                  <p className="text-[15px] font-semibold text-[var(--brand-text)] group-hover:text-[var(--brand-primary)] transition-colors">
                    {link.label}
                  </p>
                  <p className="mt-1 text-[13px] leading-snug text-black/50">{link.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

        {lowStockCount > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-[14px] border border-orange-200 bg-orange-50 px-4 py-3 sm:px-4 sm:py-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-orange-200">
                <AlertTriangle className="h-3.5 w-3.5 text-orange-500" strokeWidth={2.2} />
              </div>
              <p className="text-[13px] sm:text-sm text-orange-950 leading-snug">
                <span className="font-semibold">Low stock:</span>{' '}
                <span className="font-bold text-orange-600">{lowStockCount}</span>{' '}
                product{lowStockCount !== 1 ? 's' : ''} at or below threshold
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(ROUTES.INVENTORY)}
              className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full bg-orange-500 px-3.5 text-xs font-semibold text-white transition hover:bg-orange-600"
            >
              Review inventory
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
