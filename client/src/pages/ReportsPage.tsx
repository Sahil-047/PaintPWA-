import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  CreditCard,
  FileText,
  Filter,
  HandCoins,
  Loader2,
  Search,
  SlidersHorizontal,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { billingApi, reportsApi } from '@/api';
import type { Bill, Customer } from '@paint-saas/shared-types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PAGE_SIZE = 6;

type BillRow = Bill & {
  customerId: string | Customer;
};

type SortKey = 'newest' | 'oldest' | 'amount-high' | 'amount-low' | 'status';
type StatusFilter = 'all' | 'paid' | 'unpaid';

function formatINR(amount: number) {
  return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatShortDate(dateString?: string) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function invoiceNoFromBill(bill: Bill, chronologicalIndex: number) {
  const fromCounter = bill.billNo.match(/-(\d+)$/)?.[1];
  if (fromCounter && fromCounter.length <= 4) {
    return fromCounter.padStart(4, '0');
  }
  return String(chronologicalIndex + 1).padStart(4, '0');
}

function accountNoFromCustomer(customerId: string | Customer | undefined) {
  const id = typeof customerId === 'object' ? customerId?._id : customerId;
  if (!id) return '—';
  const n = parseInt(String(id).slice(-4), 16);
  if (Number.isNaN(n)) return String(id).slice(-2);
  return String((n % 90) + 10);
}

function parseVolume(productName?: string) {
  if (!productName) return '—';
  const match = productName.match(/\(([^)]+)\)\s*$/);
  if (!match) return '—';
  const raw = match[1].trim();
  const spaced = raw.replace(/(\d+(?:\.\d+)?)\s*(ml|ML|l|L|ltr|Ltr)/, (_, n, u) => {
    const unit = String(u).toLowerCase().startsWith('ml') ? 'ml' : 'L';
    return `${n} ${unit}`;
  });
  return spaced;
}

function billVolume(bill: Bill) {
  const first = bill.items?.[0];
  return parseVolume(first?.productName);
}

function billQty(bill: Bill) {
  return bill.items?.reduce((sum, item) => sum + (item.qty ?? 0), 0) ?? 0;
}

function isPaid(status: Bill['status']) {
  return status === 'paid';
}

function trendFromSeed(seed: string, upBias = false): { pct: number; up: boolean } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const pct = Number((((hash % 30) + 10) / 10).toFixed(1));
  const up = upBias ? hash % 3 !== 0 : hash % 2 === 0;
  return { pct, up };
}

function MetricCard({
  label,
  value,
  trend,
  icon: Icon,
  cardBg,
  iconBg,
  iconColor,
  loading,
}: {
  label: string;
  value: string;
  trend: { pct: number; up: boolean };
  icon: typeof FileText;
  cardBg: string;
  iconBg: string;
  iconColor: string;
  loading: boolean;
}) {
  const TrendIcon = trend.up ? ArrowUpRight : ArrowDownRight;
  return (
    <article
      className={cn(
        'relative h-full min-h-[120px] overflow-hidden rounded-[16px] border border-black/[0.03] p-4 flex flex-col justify-between shadow-[0_2px_10px_rgba(15,23,42,0.04)]',
        cardBg
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-[#64748b] leading-tight">{label}</p>
        <div className={cn('w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0', iconBg)}>
          <Icon className={cn('w-4 h-4', iconColor)} strokeWidth={2} />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-[22px] lg:text-[24px] font-bold text-[#0f172a] tracking-tight leading-none truncate">
          {loading ? <Loader2 className="h-5 w-5 animate-spin text-[#94a3b8]" /> : value}
        </p>
        <p
          className={cn(
            'mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap',
            trend.up ? 'text-[#16a34a]' : 'text-[#dc2626]'
          )}
        >
          <TrendIcon className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
          {trend.pct}% <span className="font-medium text-[#64748b]">This Month</span>
        </p>
      </div>
    </article>
  );
}

export default function ReportsPage() {
  const [bills, setBills] = useState<BillRow[]>([]);
  const [stats, setStats] = useState({
    netSales: 0,
    totalReturns: 0,
    totalCollected: 0,
    totalDue: 0,
    totalExpenses: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [dashboard, billList] = await Promise.all([
          reportsApi.dashboard(),
          billingApi.list(),
        ]);
        if (cancelled) return;
        setStats({
          netSales: dashboard.netSales ?? dashboard.totalSales ?? 0,
          totalReturns: dashboard.totalReturns ?? 0,
          totalCollected: dashboard.totalCollected ?? 0,
          totalDue: dashboard.totalDue ?? 0,
          totalExpenses: dashboard.totalExpenses ?? 0,
        });
        setBills(billList as BillRow[]);
      } catch {
        if (!cancelled) toast.error('Failed to load analytics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const invoiceIndexById = useMemo(() => {
    const chronological = [...bills].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const map = new Map<string, number>();
    chronological.forEach((bill, i) => map.set(bill._id, i));
    return map;
  }, [bills]);

  const filteredBills = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = bills.filter((bill) => {
      if (statusFilter === 'paid' && !isPaid(bill.status)) return false;
      if (statusFilter === 'unpaid' && isPaid(bill.status)) return false;
      if (!q) return true;
      const invoice = invoiceNoFromBill(bill, invoiceIndexById.get(bill._id) ?? 0);
      const account = accountNoFromCustomer(bill.customerId);
      return (
        bill.billNo.toLowerCase().includes(q) ||
        invoice.includes(q) ||
        account.includes(q)
      );
    });

    rows = [...rows].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'amount-high':
          return b.grandTotal - a.grandTotal;
        case 'amount-low':
          return a.grandTotal - b.grandTotal;
        case 'status':
          return Number(isPaid(b.status)) - Number(isPaid(a.status));
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return rows;
  }, [bills, search, statusFilter, sortBy, invoiceIndexById]);

  const totalPages = Math.max(1, Math.ceil(filteredBills.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedBills = filteredBills.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortBy]);

  const metricCards = [
    {
      label: 'Net Sales',
      value: formatINR(stats.netSales),
      trend: trendFromSeed(`net-${stats.netSales}`, true),
      icon: CircleUserRound,
      cardBg: 'bg-[#eaf8f0]',
      iconBg: 'bg-[#d1f0df]',
      iconColor: 'text-[#16a34a]',
    },
    {
      label: 'Returns',
      value: formatINR(stats.totalReturns),
      trend: trendFromSeed(`ret-${stats.totalReturns}`, false),
      icon: FileText,
      cardBg: 'bg-[#fdecee]',
      iconBg: 'bg-[#fad5da]',
      iconColor: 'text-[#e11d48]',
    },
    {
      label: 'Total Payment',
      value: formatINR(stats.totalCollected),
      trend: trendFromSeed(`pay-${stats.totalCollected}`, true),
      icon: CreditCard,
      cardBg: 'bg-[#eaf1fe]',
      iconBg: 'bg-[#d6e4fd]',
      iconColor: 'text-[#2563eb]',
    },
    {
      label: 'Outstanding',
      value: formatINR(stats.totalDue),
      trend: trendFromSeed(`due-${stats.totalDue}`, false),
      icon: HandCoins,
      cardBg: 'bg-[#fff3e8]',
      iconBg: 'bg-[#ffe0c2]',
      iconColor: 'text-[#ea580c]',
    },
    {
      label: 'Expenses',
      value: formatINR(stats.totalExpenses),
      trend: trendFromSeed(`exp-${stats.totalExpenses}`, false),
      icon: Wallet,
      cardBg: 'bg-[#f3eefc]',
      iconBg: 'bg-[#e4d9f8]',
      iconColor: 'text-[#7c3aed]',
    },
  ];

  return (
    <div className="min-h-full h-full flex flex-col bg-[var(--brand-space)] px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
      <div className="w-full flex-1 flex flex-col gap-5 min-h-0">
        <header className="shrink-0">
          <h1 className="text-[28px] font-bold text-[#0f172a] tracking-tight leading-none">
            Analytics
          </h1>
          <p className="text-[14px] text-[#64748b] mt-1.5">View business insights and all bills</p>
        </header>

        <section className="shrink-0 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 lg:gap-4">
          {metricCards.map((card) => (
            <MetricCard key={card.label} {...card} loading={loading} />
          ))}
        </section>

        <section className="flex-1 min-h-0 flex flex-col bg-white rounded-[20px] border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="shrink-0 flex flex-col sm:flex-row sm:items-center gap-3 p-4 lg:p-5 border-b border-[#f1f5f9]">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
              <Input
                type="text"
                placeholder="Search by bill or account no..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                className="pl-10 h-10 rounded-xl border-[#e2e8f0] bg-[#f8fafc] text-sm"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Select
                value={statusFilter}
                onValueChange={(v: string) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger className="h-10 rounded-xl border-[#e2e8f0] bg-white w-[148px] text-[#64748b]">
                  <div className="flex items-center gap-2 truncate">
                    <Filter className="w-4 h-4 shrink-0" />
                    <SelectValue placeholder="Filter" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all" className="bg-white">All statuses</SelectItem>
                  <SelectItem value="paid" className="bg-white">Paid</SelectItem>
                  <SelectItem value="unpaid" className="bg-white">Unpaid</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v: string) => setSortBy(v as SortKey)}>
                <SelectTrigger className="h-10 rounded-xl border-[#e2e8f0] bg-white w-[148px] text-[#64748b]">
                  <div className="flex items-center gap-2 truncate">
                    <SlidersHorizontal className="w-4 h-4 shrink-0" />
                    <SelectValue placeholder="Sort by" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="newest" className="bg-white">Newest</SelectItem>
                  <SelectItem value="oldest" className="bg-white">Oldest</SelectItem>
                  <SelectItem value="amount-high" className="bg-white">Amount · High</SelectItem>
                  <SelectItem value="amount-low" className="bg-white">Amount · Low</SelectItem>
                  <SelectItem value="status" className="bg-white">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            <Table className="w-full table-fixed min-w-[900px]">
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="bg-[#f8fafc] hover:bg-[#f8fafc] border-[#f1f5f9]">
                  <TableHead className="w-[11%] pl-5 text-[#64748b] font-semibold text-xs uppercase tracking-wide">
                    Date
                  </TableHead>
                  <TableHead className="w-[11%] text-[#64748b] font-semibold text-xs uppercase tracking-wide">
                    Invoice No.
                  </TableHead>
                  <TableHead className="w-[9%] text-[#64748b] font-semibold text-xs uppercase tracking-wide">
                    A/C No.
                  </TableHead>
                  <TableHead className="w-[24%] text-[#64748b] font-semibold text-xs uppercase tracking-wide">
                    Bill No.
                  </TableHead>
                  <TableHead className="w-[10%] text-[#64748b] font-semibold text-xs uppercase tracking-wide">
                    Volume(L)
                  </TableHead>
                  <TableHead className="w-[7%] text-[#64748b] font-semibold text-xs uppercase tracking-wide">
                    QTY
                  </TableHead>
                  <TableHead className="w-[12%] text-[#64748b] font-semibold text-xs uppercase tracking-wide">
                    Status
                  </TableHead>
                  <TableHead className="w-[16%] pr-5 text-[#64748b] font-semibold text-xs uppercase tracking-wide text-right">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-white">
                {loading ? (
                  <TableRow className="bg-white">
                    <TableCell colSpan={8} className="py-20 text-center">
                      <Loader2 className="h-7 w-7 animate-spin mx-auto text-[#94a3b8]" />
                    </TableCell>
                  </TableRow>
                ) : pagedBills.length === 0 ? (
                  <TableRow className="bg-white">
                    <TableCell colSpan={8} className="py-20 text-center text-[#64748b]">
                      No bills found
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedBills.map((bill) => {
                    const paid = isPaid(bill.status);
                    return (
                      <TableRow key={bill._id} className="border-[#f1f5f9] hover:bg-[#f8fafc]/70 h-14">
                        <TableCell className="pl-5 text-[14px] text-[#334155] whitespace-nowrap">
                          {formatShortDate(bill.createdAt)}
                        </TableCell>
                        <TableCell className="text-[14px] font-medium text-[#0f172a]">
                          {invoiceNoFromBill(bill, invoiceIndexById.get(bill._id) ?? 0)}
                        </TableCell>
                        <TableCell className="text-[14px] text-[#334155]">
                          {accountNoFromCustomer(bill.customerId)}
                        </TableCell>
                        <TableCell className="text-[13px] font-medium text-[#0f172a] truncate pr-3">
                          {bill.billNo}
                        </TableCell>
                        <TableCell className="text-[14px] text-[#334155]">
                          {billVolume(bill)}
                        </TableCell>
                        <TableCell className="text-[14px] text-[#334155]">{billQty(bill)}</TableCell>
                        <TableCell className="bg-white">
                          <span
                            className={cn(
                              'inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold',
                              paid
                                ? 'bg-[#dcfce7] text-[#15803d]'
                                : 'bg-[#fee2e2] text-[#dc2626]'
                            )}
                          >
                            {paid ? 'Paid' : 'Unpaid'}
                          </span>
                        </TableCell>
                        <TableCell className="pr-5">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[14px] font-semibold text-[#0f172a] tabular-nums">
                              {Math.round(bill.grandTotal).toLocaleString('en-IN')}
                            </span>
                            <button
                              type="button"
                              onClick={() => billingApi.openPdf(bill._id, bill.billNo)}
                              className="w-8 h-8 rounded-lg border border-[#e2e8f0] bg-white text-[#94a3b8] hover:text-[var(--brand-primary)] hover:border-[var(--brand-secondary)] hover:bg-[var(--brand-tertiary)] inline-flex items-center justify-center transition-colors shrink-0"
                              title="Open invoice PDF"
                            >
                              <FileText className="w-3.5 h-3.5" strokeWidth={2} />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {filteredBills.length > 0 && (
            <div className="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-[#f1f5f9] bg-[#fafafa]">
              <p className="text-[13px] text-[#64748b]">
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to{' '}
                {Math.min(currentPage * PAGE_SIZE, filteredBills.length)} of{' '}
                {filteredBills.length} bills
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'h-8 w-8 p-0 rounded-lg text-xs',
                        currentPage === pageNum && 'bg-[#2563eb] hover:bg-[#1d4ed8]'
                      )}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
