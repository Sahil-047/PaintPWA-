import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
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
  Download,
  Undo2,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { accountsApi, billingApi, cashmemoApi } from '@/api';
import { useBillPdfDownload } from '@/hooks/useBillPdfDownload';
import type { BillWithPayments, CustomerDetail, ReturnItem } from '@paint-saas/shared-types';
import { ROUTES } from '@/config/config';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type TxTab = 'all' | 'paid' | 'unpaid' | 'returns';
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
  amountClassName,
  loading,
}: {
  label: string;
  amount: number;
  lastMonth: number;
  icon: typeof Package;
  iconBg: string;
  iconColor: string;
  amountClassName?: string;
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
      <p
        className={cn(
          'mt-4 text-[28px] lg:text-[32px] font-bold tracking-tight leading-none',
          amountClassName ?? 'text-[#0f172a]'
        )}
      >
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-[#94a3b8]" />
        ) : (
          <>
            {whole}
            <span className="text-[18px] font-semibold opacity-50">{dec}</span>
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

type BillRow = {
  bill: BillWithPayments;
  productName: string;
  volume: string;
  qty: number;
  amount: number;
  payments: { id: string; date: string; mode: string; amount: number }[];
  returns: ReturnItem[];
};

function paymentModeLabel(mode: string) {
  const m = mode.trim().toLowerCase();
  if (m === 'cash') return 'Paid in cash';
  if (m === 'upi') return 'Paid in UPI';
  if (m === 'card') return 'Paid in card';
  if (m === 'cheque' || m === 'check') return 'Paid in cheque';
  if (m === 'bank' || m === 'bank transfer') return 'Paid by bank';
  return `Paid in ${mode || 'other'}`;
}

function memoBillId(memo: { billId?: { _id: string } | string }): string {
  if (!memo.billId) return '';
  return typeof memo.billId === 'string' ? memo.billId : memo.billId._id;
}

function returnBillId(ret: ReturnItem): string {
  if (typeof ret.billId === 'string') return ret.billId;
  return ret.billId._id;
}

function billStatusMeta(bill: BillWithPayments) {
  const due = (bill.balanceDue ?? 0) > 0.001;
  const hasReturn = (bill.returnedAmount ?? 0) > 0.001;
  const hasCredit = (bill.billCredit ?? 0) > 0.001;
  const isPaid = bill.status === 'paid' || !due;
  const receivedOnBill = bill.amountPaid ?? 0;
  const isPartial = bill.status === 'partial' || (due && receivedOnBill > 0);

  if (hasReturn) {
    if (due) {
      return {
        label: 'Returned · Due',
        className: 'bg-[#ffedd5] text-[#c2410c]',
        due,
        hasReturn,
      };
    }
    if (hasCredit) {
      return {
        label: 'Returned · Credit',
        className: 'bg-[#e0e7ff] text-[#4338ca]',
        due,
        hasReturn,
      };
    }
    return {
      label: 'Returned',
      className: 'bg-[#ffedd5] text-[#c2410c]',
      due,
      hasReturn,
    };
  }

  if (isPaid) {
    return {
      label: hasCredit ? 'Paid · Credit' : 'Paid',
      className: hasCredit ? 'bg-[#e0e7ff] text-[#4338ca]' : 'bg-[#dcfce7] text-[#15803d]',
      due,
      hasReturn,
    };
  }
  if (isPartial) {
    return { label: 'Partial', className: 'bg-[#fef9c3] text-[#a16207]', due, hasReturn };
  }
  return { label: 'Due', className: 'bg-[#fee2e2] text-[#dc2626]', due, hasReturn };
}

export default function CustomerDetailsPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [tab, setTab] = useState<TxTab>('all');
  const [search, setSearch] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [payOpen, setPayOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payBill, setPayBill] = useState<BillWithPayments | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('cash');
  const { requestPdf, dialog: pdfFormatDialog } = useBillPdfDownload();

  async function reloadDetail() {
    if (!customerId) return;
    const data = await accountsApi.getCustomer(customerId);
    setDetail(data);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!customerId) return;
      setLoading(true);
      try {
        const data = await accountsApi.getCustomer(customerId);
        if (!cancelled) setDetail(data);
      } catch {
        if (!cancelled) {
          toast.error('Failed to load customer details');
          setDetail(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  function openRecordPayment(bill: BillWithPayments) {
    setPayBill(bill);
    setPayAmount(bill.balanceDue > 0 ? String(bill.balanceDue) : '');
    setPayMode('cash');
    setPayOpen(true);
  }

  async function submitFollowUpPayment() {
    if (!payBill || !customerId) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amount > payBill.balanceDue + 0.001) {
      toast.error(`Amount cannot exceed balance due (₹${payBill.balanceDue.toFixed(2)})`);
      return;
    }

    setPaying(true);
    try {
      await billingApi.recordPayment(payBill._id, {
        amountPaid: amount,
        paymentMode: payMode,
      });
      toast.success('Payment updated — bill PDF refreshed');
      setPayOpen(false);
      await reloadDetail();
      requestPdf(payBill._id, payBill.billNo);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to record payment';
      toast.error(msg);
    } finally {
      setPaying(false);
    }
  }

  const dateRange = useMemo(() => getPresetRange(datePreset), [datePreset]);

  const summary = useMemo(() => {
    const bills = detail?.bills ?? [];
    const returns = detail?.returns ?? [];
    const account = detail?.account;

    const totalOrders = account?.totalBilled ?? bills.reduce((s, b) => s + (b.grandTotal ?? 0), 0);
    const paymentReceived =
      account?.totalPaid ?? bills.reduce((s, b) => s + (b.amountPaid ?? 0), 0);
    const paymentDue =
      account?.dueBalance ?? bills.reduce((s, b) => s + (b.balanceDue ?? 0), 0);
    const storeCredit = account?.creditBalance ?? 0;
    const returnedTotal = returns.reduce((s, r) => s + (r.amount ?? 0), 0);

    const last = monthBounds(-1);
    const lastBills = bills.filter((b) => inRange(b.createdAt, last.from, last.to));
    const lastOrders = lastBills.reduce((s, b) => s + (b.grandTotal ?? 0), 0);
    const lastReceived = lastBills.reduce((s, b) => s + (b.amountPaid ?? 0), 0);
    const lastDue = lastBills.reduce((s, b) => s + (b.balanceDue ?? 0), 0);
    const lastReturns = returns.filter((r) => inRange(r.createdAt, last.from, last.to));
    const lastReturned = lastReturns.reduce((s, r) => s + (r.amount ?? 0), 0);

    return {
      totalOrders,
      paymentReceived,
      paymentDue,
      storeCredit,
      returnedTotal,
      lastOrders,
      lastReceived,
      lastDue,
      lastReturned,
    };
  }, [detail]);

  const rows = useMemo(() => {
    const bills = detail?.bills ?? [];
    const memos = detail?.memos ?? [];
    const returns = detail?.returns ?? [];
    const list: BillRow[] = [];

    const memosByBill = new Map<string, typeof memos>();
    for (const memo of memos) {
      const id = memoBillId(memo);
      if (!id) continue;
      if (!memosByBill.has(id)) memosByBill.set(id, []);
      memosByBill.get(id)!.push(memo);
    }

    const returnsByBill = new Map<string, ReturnItem[]>();
    for (const ret of returns) {
      const id = returnBillId(ret);
      if (!returnsByBill.has(id)) returnsByBill.set(id, []);
      returnsByBill.get(id)!.push(ret);
    }

    for (const bill of bills) {
      if (!inRange(bill.createdAt, dateRange.from, dateRange.to)) continue;
      const paid = bill.status === 'paid' || (bill.balanceDue ?? 0) <= 0;
      const billReturns = returnsByBill.get(bill._id) ?? [];
      if (tab === 'paid' && !paid) continue;
      if (tab === 'unpaid' && paid) continue;
      if (tab === 'returns' && billReturns.length === 0) continue;

      const items = bill.items ?? [];
      const first = items[0];
      const productName =
        items.length === 0
          ? (bill.amountPaid ?? 0) > 0 && (bill.grandTotal ?? 0) === 0
            ? 'Advance / credit payment'
            : 'No line items'
          : items.length === 1
            ? first.productName
            : `${first.productName} +${items.length - 1} more`;

      const qty = items.reduce((s, i) => s + (i.qty ?? 0), 0) || (first?.qty ?? 0);
      const volume =
        items.length === 1
          ? parseVolume(first?.productName)
          : items.length > 1
            ? `${items.length} items`
            : '—';

      const billMemos = [...(memosByBill.get(bill._id) ?? [])].sort(
        (a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime()
      );

      list.push({
        bill,
        productName,
        volume,
        qty,
        amount: bill.grandTotal || bill.amountPaid || 0,
        payments: billMemos.map((m) => ({
          id: m._id,
          date: m.paidAt,
          mode: m.paymentMode,
          amount: m.amountPaid,
        })),
        returns: [...billReturns].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      });
    }

    const q = search.trim().toLowerCase();
    const filtered = !q
      ? list
      : list.filter(
          (r) =>
            r.bill.billNo.toLowerCase().includes(q) ||
            invoiceLabel(r.bill.billNo).toLowerCase().includes(q) ||
            r.productName.toLowerCase().includes(q) ||
            r.payments.some((p) => paymentModeLabel(p.mode).toLowerCase().includes(q)) ||
            r.returns.some(
              (ret) =>
                ret.productName.toLowerCase().includes(q) ||
                (ret.reason ?? '').toLowerCase().includes(q)
            )
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
    const lines = rows.flatMap((r) => {
      const status = billStatusMeta(r.bill).label;
      const main = [
        shortDate(r.bill.createdAt),
        invoiceLabel(r.bill.billNo),
        `"${r.productName.replace(/"/g, '""')}"`,
        r.volume,
        String(r.qty),
        String(r.amount),
        status,
      ].join(',');
      const payments = r.payments.map((p) =>
        [
          shortDate(p.date),
          '',
          `"${paymentModeLabel(p.mode)}"`,
          '',
          '',
          String(p.amount),
          'Payment',
        ].join(',')
      );
      const returnLines = r.returns.map((ret) =>
        [
          shortDate(ret.createdAt),
          '',
          `"Return: ${ret.productName.replace(/"/g, '""')}${ret.reason ? ` — ${ret.reason.replace(/"/g, '""')}` : ''}"`,
          '',
          String(ret.qty),
          String(-ret.amount),
          'Returned',
        ].join(',')
      );
      return [main, ...payments, ...returnLines];
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
    <div className="min-h-full bg-[var(--brand-space)] px-4 sm:px-6 lg:px-8 py-5 lg:py-6">
      {pdfFormatDialog}
      <div className="w-full max-w-[1400px] mx-auto space-y-5 lg:space-y-6">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(ROUTES.ACCOUNTS)}
            className="w-9 h-9 rounded-xl border border-[#e2e8f0] bg-white text-[#64748b] inline-flex items-center justify-center hover:bg-[#f8fafc] shrink-0"
            aria-label="Back to accounts"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2.25} />
          </button>
          <h1 className="text-[24px] sm:text-[28px] lg:text-[32px] font-bold text-[#0f172a] tracking-tight">
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

            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5">
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
                amountClassName={summary.paymentDue > 0.001 ? 'text-[#dc2626]' : 'text-[#0f172a]'}
                loading={false}
              />
              <SummaryCard
                label="Store Credit"
                amount={summary.storeCredit}
                lastMonth={summary.lastReturned}
                icon={Wallet}
                iconBg="bg-[#e0e7ff]"
                iconColor="text-[#4338ca]"
                amountClassName={summary.storeCredit > 0.001 ? 'text-[#4338ca]' : 'text-[#0f172a]'}
                loading={false}
              />
            </section>

            {(summary.returnedTotal > 0 || summary.storeCredit > 0) && (
              <p className="text-[13px] text-[#64748b] -mt-2">
                Returns recorded:{' '}
                <span className="font-semibold text-[#c2410c]">
                  ₹{summary.returnedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                {summary.storeCredit > 0.001 && (
                  <>
                    {' '}
                    · Available credit applied against future dues automatically
                  </>
                )}
              </p>
            )}

            <section className="space-y-4">
              <div className="flex items-center gap-6 border-b border-[#e2e8f0] overflow-x-auto">
                {(
                  [
                    ['all', 'All'],
                    ['paid', 'Payment Received'],
                    ['unpaid', 'Unpaid'],
                    ['returns', 'Returns'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={cn(
                      'pb-3 text-[14px] font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0',
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
                    <SelectContent>
                      <SelectItem value="this-month">This month</SelectItem>
                      <SelectItem value="last-month">Last month</SelectItem>
                      <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={exportCsv}
                    className="h-11 rounded-xl gap-2 px-5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-[0_4px_14px_rgba(37,99,235,0.28)]"
                  >
                    <Download className="w-4 h-4" /> Export
                  </Button>
                </div>
              </div>

              <div className="bg-white rounded-[16px] border border-[#e8eef5] shadow-[0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden">
                <div className="overflow-x-auto">
                  <Table className="min-w-[760px]">
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
                        <TableHead className="pr-5 text-[#64748b] font-semibold text-xs uppercase tracking-wide text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="py-16 text-center text-[#64748b]">
                            No transactions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.flatMap((row) => {
                          const statusMeta = billStatusMeta(row.bill);
                          const due = statusMeta.due;
                          const billExpanded = !!expanded[row.bill._id];
                          const canExpand = row.payments.length > 0 || row.returns.length > 0;

                          const mainRow = (
                            <TableRow
                              key={row.bill._id}
                              className="border-b border-dotted border-[#e2e8f0] hover:bg-[#f8fafc]/60"
                            >
                              <TableCell className="pl-5 text-[14px] text-[#334155] whitespace-nowrap">
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1.5"
                                  disabled={!canExpand}
                                  onClick={() => canExpand && toggleExpand(row.bill._id)}
                                  aria-expanded={canExpand ? billExpanded : undefined}
                                  aria-label={
                                    canExpand
                                      ? billExpanded
                                        ? 'Hide details'
                                        : 'Show payment and return details'
                                      : undefined
                                  }
                                >
                                  {canExpand ? (
                                    <ChevronDown
                                      className={cn(
                                        'w-4 h-4 text-[#94a3b8] transition-transform',
                                        billExpanded && 'rotate-180'
                                      )}
                                    />
                                  ) : (
                                    <span className="w-4" />
                                  )}
                                  {shortDate(row.bill.createdAt)}
                                </button>
                              </TableCell>
                              <TableCell className="text-[14px] font-medium text-[#0f172a] whitespace-nowrap">
                                {invoiceLabel(row.bill.billNo)}
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
                              <TableCell>
                                <span
                                  className={cn(
                                    'inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold',
                                    statusMeta.className
                                  )}
                                >
                                  {statusMeta.label}
                                </span>
                              </TableCell>
                              <TableCell className="pr-5 text-right">
                                {due && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-8 rounded-lg border-[#2563eb] text-[#2563eb] hover:bg-[#eff6ff] text-[11px] font-semibold gap-1"
                                    onClick={() => openRecordPayment(row.bill)}
                                  >
                                    <HandCoins className="w-3.5 h-3.5" />
                                    Record payment
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );

                          if (!canExpand || !billExpanded) return [mainRow];

                          const paymentRows = row.payments.map((p) => (
                            <TableRow
                              key={`${row.bill._id}-${p.id}`}
                              className="border-b border-dotted border-[#e2e8f0] bg-[#f8fafc]"
                            >
                              <TableCell className="pl-5 text-[14px] text-[#64748b] whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5 pl-5">
                                  {shortDate(p.date)}
                                </span>
                              </TableCell>
                              <TableCell />
                              <TableCell className="text-[14px]">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold bg-[#dcfce7] text-[#15803d]">
                                  {paymentModeLabel(p.mode)}
                                </span>
                              </TableCell>
                              <TableCell />
                              <TableCell />
                              <TableCell className="text-[14px] font-semibold text-[#0f172a] tabular-nums">
                                {Math.round(p.amount).toLocaleString('en-IN')}
                              </TableCell>
                              <TableCell className="text-[12px] text-[#64748b]">Challan</TableCell>
                              <TableCell className="pr-5 text-right">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-[11px] text-[#2563eb] hover:text-[#1d4ed8]"
                                  onClick={() => cashmemoApi.openPdf(p.id)}
                                >
                                  Open challan
                                </Button>
                              </TableCell>
                            </TableRow>
                          ));

                          const returnRows = row.returns.map((ret) => (
                            <TableRow
                              key={`${row.bill._id}-ret-${ret._id}`}
                              className="border-b border-dotted border-[#e2e8f0] bg-[#fff7ed]"
                            >
                              <TableCell className="pl-5 text-[14px] text-[#64748b] whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5 pl-5">
                                  {shortDate(ret.createdAt)}
                                </span>
                              </TableCell>
                              <TableCell />
                              <TableCell className="text-[14px] text-[#9a3412] max-w-[280px]">
                                <span className="inline-flex items-start gap-1.5">
                                  <Undo2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                  <span className="min-w-0">
                                    <span className="font-medium">Return: {ret.productName}</span>
                                    {ret.reason ? (
                                      <span className="block text-[12px] text-[#c2410c]/80 truncate">
                                        {ret.reason}
                                      </span>
                                    ) : null}
                                  </span>
                                </span>
                              </TableCell>
                              <TableCell className="text-[14px] text-[#64748b]">
                                {parseVolume(ret.productName)}
                              </TableCell>
                              <TableCell className="text-[14px] text-[#9a3412]">{ret.qty}</TableCell>
                              <TableCell className="text-[14px] font-semibold text-[#c2410c] tabular-nums">
                                −{Math.round(ret.amount).toLocaleString('en-IN')}
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold bg-[#ffedd5] text-[#c2410c]">
                                  {(ret.creditIssued ?? 0) > 0.001 ? 'Credit issued' : 'Returned'}
                                </span>
                              </TableCell>
                              <TableCell />
                            </TableRow>
                          ));

                          return [mainRow, ...paymentRows, ...returnRows];
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

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              {payBill
                ? `Record a follow-up payment for ${invoiceLabel(payBill.billNo)}. The invoice PDF will show Total, Received, and Balance due.`
                : 'Record a follow-up payment against an unpaid invoice.'}
            </DialogDescription>
          </DialogHeader>

          {payBill && (
            <div className="rounded-xl border border-[#e8eef5] bg-[#f8fafc] px-4 py-3 text-[13px] space-y-1.5">
              <div className="flex justify-between text-[#64748b]">
                <span>Invoice total</span>
                <span className="font-semibold text-[#0f172a] tabular-nums">
                  ₹{payBill.grandTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[#64748b]">
                <span>Already paid</span>
                <span className="font-semibold text-[#16a34a] tabular-nums">
                  ₹{(payBill.amountPaid ?? 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#e2e8f0] pt-1.5">
                <span className="font-medium text-[#334155]">Balance due</span>
                <span className="font-bold text-[#dc2626] tabular-nums">
                  ₹{(payBill.balanceDue ?? 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label htmlFor="followup-amount">Amount received now</Label>
              <Input
                id="followup-amount"
                type="number"
                min={0}
                step="0.01"
                className="h-10 rounded-xl border-[#e2e8f0]"
                value={payAmount}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPayAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select value={payMode} onValueChange={setPayMode}>
                <SelectTrigger className="h-10 w-full rounded-xl border-[#e2e8f0]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="bank">Bank transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-3 sm:gap-3">
            <Button variant="outline" onClick={() => setPayOpen(false)} disabled={paying}>
              Cancel
            </Button>
            <Button
              className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white border-0"
              onClick={submitFollowUpPayment}
              disabled={paying || !payBill}
            >
              {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save & open challan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
