import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  HandCoins,
  Loader2,
  Package,
  Search,
  ShoppingCart,
  Upload,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { accountsApi } from '@/api';
import type { BillWithPayments, CustomerDetail } from '@paint-saas/shared-types';
import { ROUTES } from '@/config/config';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type TxTab = 'all' | 'paid' | 'unpaid';
type DatePreset = 'this-month' | 'last-month' | 'all';

function formatMoneyParts(amount: number) {
  const rounded = Math.round(amount * 100) / 100;
  const [whole, dec] = rounded
    .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .split('.');
  return { whole: `₹ ${whole}`, dec: `.${dec ?? '00'}` };
}

function shortDate(dateString?: string) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function invoiceLabel(billNo: string) {
  const suffix = billNo.match(/(\d+)$/)?.[1];
  if (suffix) return `#INV-${suffix.padStart(4, '0')}`;
  return `#${billNo}`;
}

function parseVolume(productName?: string) {
  if (!productName) return '—';
  const match = productName.match(/\(([^)]+)\)\s*$/);
  if (!match) return '—';
  return match[1].trim().replace(/(\d+(?:\.\d+)?)\s*(ml|ML|l|L)/, (_, n, u) => {
    const unit = String(u).toLowerCase().startsWith('ml') ? 'ml' : 'L';
    return `${n} ${unit}`;
  });
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

function getPresetRange(preset: DatePreset): { from: Date | null; to: Date | null; label: string } {
  const now = new Date();
  if (preset === 'all') return { from: null, to: null, label: 'All time' };
  if (preset === 'last-month') {
    const from = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const to = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
    const label = `${from.getDate()} ${from.toLocaleString('en-IN', { month: 'short' })} ${from.getFullYear()} - ${to.getDate()} ${to.toLocaleString('en-IN', { month: 'short' })} ${to.getFullYear()}`;
    return { from, to, label };
  }
  const from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  const to = endOfDay(now);
  const label = `${from.getDate()} ${from.toLocaleString('en-IN', { month: 'short' })} ${from.getFullYear()} - ${to.getDate()} ${to.toLocaleString('en-IN', { month: 'short' })} ${to.getFullYear()}`;
  return { from, to, label };
}

function inRange(dateStr: string | undefined, from: Date | null, to: Date | null) {
  if (!from || !to) return true;
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= from && d <= to;
}

function monthBounds(offset: number) {
  const now = new Date();
  const from = startOfDay(new Date(now.getFullYear(), now.getMonth() + offset, 1));
  const to = endOfDay(new Date(now.getFullYear(), now.getMonth() + offset + 1, 0));
  return { from, to };
}

function CustomerAvatar({ name, size = 'lg' }: { name: string; size?: 'md' | 'lg' }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={cn(
        'rounded-full bg-[#eff6ff] text-[#2563eb] font-semibold border border-[#dbeafe] flex items-center justify-center shrink-0',
        size === 'lg' ? 'w-16 h-16 text-xl' : 'w-10 h-10 text-sm'
      )}
    >
      {initials || '?'}
    </div>
  );
}

function SummaryCard({
  label,
  amount,
  lastMonth,
  icon: Icon,
  iconBg,
  iconColor,
  loading,
}: {
  label: string;
  amount: number;
  lastMonth: number;
  icon: typeof Package;
  iconBg: string;
  iconColor: string;
  loading: boolean;
}) {
  const { whole, dec } = formatMoneyParts(amount);
  const last = formatMoneyParts(lastMonth);
  return (
    <article className="bg-white rounded-[16px] border border-[#e8eef5] shadow-[0_4px_16px_rgba(15,23,42,0.04)] p-5 flex flex-col min-h-[140px]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-medium text-[#64748b]">{label}</p>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} strokeWidth={2} />
        </div>
      </div>
      <p className="mt-4 text-[28px] lg:text-[32px] font-bold text-[#0f172a] tracking-tight leading-none">
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-[#94a3b8]" />
        ) : (
          <>
            {whole}
            <span className="text-[18px] font-semibold text-[#94a3b8]">{dec}</span>
          </>
        )}
      </p>
      <p className="mt-auto pt-4 text-[12px] text-[#94a3b8]">
        Last month: {last.whole}
        <span className="text-[#cbd5e1]">{last.dec}</span>
      </p>
    </article>
  );
}

type TxRow = {
  bill: BillWithPayments;
  itemIndex: number;
  productName: string;
  volume: string;
  qty: number;
  amount: number;
};

export default function CustomerDetailsPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [tab, setTab] = useState<TxTab>('all');
  const [search, setSearch] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('this-month');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const data = await accountsApi.getCustomer(customerId);
      setDetail(data);
    } catch {
      toast.error('Failed to load customer details');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  const dateRange = useMemo(() => getPresetRange(datePreset), [datePreset]);

  const summary = useMemo(() => {
    const bills = detail?.bills ?? [];
    const totalOrders = bills.reduce((s, b) => s + (b.grandTotal ?? 0), 0);
    const paymentReceived = bills.reduce((s, b) => s + (b.amountPaid ?? 0), 0);
    const paymentDue = bills.reduce((s, b) => s + (b.balanceDue ?? 0), 0);

    const last = monthBounds(-1);
    const lastBills = bills.filter((b) => inRange(b.createdAt, last.from, last.to));
    const lastOrders = lastBills.reduce((s, b) => s + (b.grandTotal ?? 0), 0);
    const lastReceived = lastBills.reduce((s, b) => s + (b.amountPaid ?? 0), 0);
    const lastDue = lastBills.reduce((s, b) => s + (b.balanceDue ?? 0), 0);

    return { totalOrders, paymentReceived, paymentDue, lastOrders, lastReceived, lastDue };
  }, [detail]);

  const rows = useMemo(() => {
    const bills = detail?.bills ?? [];
    const list: TxRow[] = [];

    for (const bill of bills) {
      if (!inRange(bill.createdAt, dateRange.from, dateRange.to)) continue;
      const paid = bill.status === 'paid' || (bill.balanceDue ?? 0) <= 0;
      if (tab === 'paid' && !paid) continue;
      if (tab === 'unpaid' && paid) continue;

      const items = bill.items?.length ? bill.items : [{ productName: '—', qty: 0, total: bill.grandTotal, productId: '', rate: 0 }];
      items.forEach((item, idx) => {
        list.push({
          bill,
          itemIndex: idx,
          productName: item.productName,
          volume: parseVolume(item.productName),
          qty: item.qty ?? 0,
          amount: item.total ?? bill.grandTotal ?? 0,
        });
      });
    }

    const q = search.trim().toLowerCase();
    const filtered = !q
      ? list
      : list.filter(
          (r) =>
            r.bill.billNo.toLowerCase().includes(q) ||
            invoiceLabel(r.bill.billNo).toLowerCase().includes(q) ||
            r.productName.toLowerCase().includes(q)
        );

    return filtered.sort(
      (a, b) => new Date(b.bill.createdAt).getTime() - new Date(a.bill.createdAt).getTime()
    );
  }, [detail, dateRange, tab, search]);

  function toggleExpand(billId: string) {
    setExpanded((prev) => ({ ...prev, [billId]: !prev[billId] }));
  }

  function exportCsv() {
    const header = ['Date', 'Invoice No.', 'Details', 'Volume(L)', 'QTY', 'Amount', 'Status'];
    const lines = rows.map((r) => {
      const paid = r.bill.status === 'paid' || (r.bill.balanceDue ?? 0) <= 0;
      return [
        shortDate(r.bill.createdAt),
        invoiceLabel(r.bill.billNo),
        `"${r.productName.replace(/"/g, '""')}"`,
        r.volume,
        String(r.qty),
        String(r.amount),
        paid ? 'Paid' : 'Unpaid',
      ].join(',');
    });
    const blob = new Blob([[header.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer-${customerId}-transactions.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported transactions');
  }

  const customer = detail?.customer;

  return (
    <div className="min-h-full bg-[var(--brand-space)] px-5 sm:px-6 lg:px-8 py-5 lg:py-6">
      <div className="w-full max-w-[1400px] mx-auto space-y-5 lg:space-y-6">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(ROUTES.ACCOUNTS)}
            className="w-9 h-9 rounded-xl border border-[#e2e8f0] bg-white text-[#64748b] inline-flex items-center justify-center hover:bg-[#f8fafc]"
            aria-label="Back to accounts"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2.25} />
          </button>
          <h1 className="text-[28px] lg:text-[32px] font-bold text-[#0f172a] tracking-tight">
            Customer Details
          </h1>
        </header>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-[#2563eb]" />
          </div>
        ) : !customer ? (
          <div className="bg-white rounded-[16px] border border-[#e8eef5] p-12 text-center text-[#64748b]">
            Customer not found
          </div>
        ) : (
          <>
            <section className="flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-10">
              <div className="flex items-center gap-4 min-w-0">
                <CustomerAvatar name={customer.name} />
                <h2 className="text-[24px] lg:text-[28px] font-bold text-[#0f172a] tracking-tight truncate">
                  {customer.name}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-10 flex-1 min-w-0">
                <div>
                  <p className="text-[12px] text-[#94a3b8] mb-1">Email address</p>
                  <p className="text-[14px] font-medium text-[#0f172a] truncate">
                    {(customer as { email?: string }).email || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-[#94a3b8] mb-1">Phone number</p>
                  <p className="text-[14px] font-medium text-[#0f172a] truncate">
                    {customer.phone ? `(+91) ${customer.phone}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-[#94a3b8] mb-1">Address</p>
                  <p className="text-[14px] font-medium text-[#0f172a] truncate">
                    {customer.address || '—'}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5">
              <SummaryCard
                label="Total Orders"
                amount={summary.totalOrders}
                lastMonth={summary.lastOrders}
                icon={Package}
                iconBg="bg-[#dbeafe]"
                iconColor="text-[#2563eb]"
                loading={false}
              />
              <SummaryCard
                label="Payment Received"
                amount={summary.paymentReceived}
                lastMonth={summary.lastReceived}
                icon={HandCoins}
                iconBg="bg-[#dcfce7]"
                iconColor="text-[#16a34a]"
                loading={false}
              />
              <SummaryCard
                label="Payment Due"
                amount={summary.paymentDue}
                lastMonth={summary.lastDue}
                icon={ShoppingCart}
                iconBg="bg-[#fee2e2]"
                iconColor="text-[#dc2626]"
                loading={false}
              />
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-6 border-b border-[#e2e8f0]">
                {(
                  [
                    ['all', 'All'],
                    ['paid', 'Payment Received'],
                    ['unpaid', 'Unpaid'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={cn(
                      'pb-3 text-[14px] font-semibold border-b-2 -mb-px transition-colors',
                      tab === key
                        ? 'text-[#2563eb] border-[#2563eb]'
                        : 'text-[#94a3b8] border-transparent hover:text-[#64748b]'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                  <Input
                    type="text"
                    placeholder="Search by invoice or details"
                    value={search}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                    className="pl-10 h-11 rounded-full border-[#e2e8f0] bg-[#f8fafc] text-sm"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Select
                    value={datePreset}
                    onValueChange={(v: string) => setDatePreset(v as DatePreset)}
                  >
                    <SelectTrigger className="h-11 rounded-full border-[#e2e8f0] bg-white min-w-[220px] text-[#334155] text-[13px]">
                      <div className="flex items-center gap-2 truncate">
                        <CalendarDays className="w-4 h-4 text-[#64748b] shrink-0" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="">
                      <SelectItem className="" value="this-month">
                        {getPresetRange('this-month').label}
                      </SelectItem>
                      <SelectItem className="" value="last-month">
                        {getPresetRange('last-month').label}
                      </SelectItem>
                      <SelectItem className="" value="all">
                        All time
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={exportCsv}
                    className="h-11 rounded-xl gap-2 px-5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-[0_4px_14px_rgba(37,99,235,0.28)]"
                  >
                    <Upload className="w-4 h-4" /> Export
                  </Button>
                </div>
              </div>

              <div className="bg-white rounded-[16px] border border-[#e8eef5] shadow-[0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f8fafc] hover:bg-[#f8fafc] border-[#f1f5f9]">
                        <TableHead className="pl-5 text-[#64748b] font-semibold text-xs uppercase tracking-wide w-[140px]">
                          Date
                        </TableHead>
                        <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wide">
                          Invoice No.
                        </TableHead>
                        <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wide">
                          Details
                        </TableHead>
                        <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wide">
                          Volume(L)
                        </TableHead>
                        <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wide">
                          QTY
                        </TableHead>
                        <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wide">
                          Amount
                        </TableHead>
                        <TableHead className="pr-5 text-[#64748b] font-semibold text-xs uppercase tracking-wide">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-16 text-center text-[#64748b]">
                            No transactions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.map((row) => {
                          const paid =
                            row.bill.status === 'paid' || (row.bill.balanceDue ?? 0) <= 0;
                          const isFirst = row.itemIndex === 0;
                          const billExpanded = expanded[row.bill._id];
                          const multi = (row.bill.items?.length ?? 0) > 1;

                          if (!isFirst && !billExpanded) return null;

                          return (
                            <TableRow
                              key={`${row.bill._id}-${row.itemIndex}`}
                              className="border-b border-dotted border-[#e2e8f0] hover:bg-[#f8fafc]/60"
                            >
                              <TableCell className="pl-5 text-[14px] text-[#334155] whitespace-nowrap">
                                {isFirst ? (
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5"
                                    onClick={() => multi && toggleExpand(row.bill._id)}
                                  >
                                    {multi && (
                                      <ChevronDown
                                        className={cn(
                                          'w-4 h-4 text-[#94a3b8] transition-transform',
                                          billExpanded && 'rotate-180'
                                        )}
                                      />
                                    )}
                                    {!multi && <span className="w-4" />}
                                    {shortDate(row.bill.createdAt)}
                                  </button>
                                ) : (
                                  <span className="pl-6 text-[#94a3b8]">↳</span>
                                )}
                              </TableCell>
                              <TableCell className="text-[14px] font-medium text-[#0f172a] whitespace-nowrap">
                                {isFirst ? invoiceLabel(row.bill.billNo) : ''}
                              </TableCell>
                              <TableCell className="text-[14px] text-[#334155] max-w-[280px] truncate">
                                {row.productName}
                              </TableCell>
                              <TableCell className="text-[14px] text-[#334155]">
                                {row.volume}
                              </TableCell>
                              <TableCell className="text-[14px] text-[#334155]">{row.qty}</TableCell>
                              <TableCell className="text-[14px] font-semibold text-[#0f172a] tabular-nums">
                                {Math.round(row.amount).toLocaleString('en-IN')}
                              </TableCell>
                              <TableCell className="pr-5">
                                {isFirst && (
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
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
