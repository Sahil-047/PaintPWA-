import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  Search,
  Plus,
  Loader2,
  Undo2,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { accountsApi, returnsApi } from '@/api';
import type { BillWithPayments, Customer, ReturnItem } from '@paint-saas/shared-types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const btnPrimary =
  'bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-[0_4px_14px_rgba(37,99,235,0.28)] border-0';
const inputClass =
  'h-10 rounded-xl border-[#e2e8f0] bg-white focus-visible:border-[#2563eb] focus-visible:ring-[#2563eb]/20';

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

function customerNameOf(row: ReturnItem) {
  if (typeof row.customerId === 'string') return 'Customer';
  return row.customerId?.name ?? 'Customer';
}

function billNoOf(row: ReturnItem) {
  if (typeof row.billId === 'string') return row.billId.slice(-8).toUpperCase();
  return row.billId?.billNo ?? '—';
}

export default function ReturnsPage() {
  const [loading, setLoading] = useState(true);
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingBills, setLoadingBills] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [bills, setBills] = useState<BillWithPayments[]>([]);
  const [billId, setBillId] = useState('');
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [reason, setReason] = useState('');

  const loadReturns = useCallback(async () => {
    setLoading(true);
    try {
      const [list, cust] = await Promise.all([returnsApi.list(), accountsApi.customers()]);
      setReturns(list);
      setCustomers(cust);
    } catch {
      toast.error('Failed to load returns');
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReturns();
  }, [loadReturns]);

  useEffect(() => {
    if (!customerId) {
      setBills([]);
      setBillId('');
      setProductId('');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingBills(true);
      try {
        const detail = await accountsApi.getCustomer(customerId);
        if (cancelled) return;
        const withItems = (detail.bills ?? []).filter((b) => (b.items?.length ?? 0) > 0);
        setBills(withItems);
        setBillId('');
        setProductId('');
        setQty('1');
      } catch {
        if (!cancelled) {
          toast.error('Failed to load customer invoices');
          setBills([]);
        }
      } finally {
        if (!cancelled) setLoadingBills(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const selectedBill = useMemo(
    () => bills.find((b) => b._id === billId) ?? null,
    [bills, billId]
  );

  const billProducts = useMemo(() => selectedBill?.items ?? [], [selectedBill]);

  const selectedProduct = useMemo(
    () => billProducts.find((p) => p.productId === productId) ?? null,
    [billProducts, productId]
  );

  const maxQty = selectedProduct?.qty ?? 0;
  const returnAmount =
    selectedProduct && parseFloat(qty) > 0
      ? Math.round(parseFloat(qty) * selectedProduct.rate * 100) / 100
      : 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return returns;
    return returns.filter((r) => {
      const name = customerNameOf(r).toLowerCase();
      const bill = billNoOf(r).toLowerCase();
      const product = (r.productName ?? '').toLowerCase();
      return name.includes(q) || bill.includes(q) || product.includes(q);
    });
  }, [returns, search]);

  const summary = useMemo(() => {
    const totalAmount = returns.reduce((s, r) => s + (r.amount ?? 0), 0);
    const totalCredit = returns.reduce((s, r) => s + (r.creditIssued ?? 0), 0);
    return { count: returns.length, totalAmount, totalCredit };
  }, [returns]);

  function openDialog() {
    setCustomerId('');
    setBills([]);
    setBillId('');
    setProductId('');
    setQty('1');
    setReason('');
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!customerId) return toast.error('Select a customer');
    if (!billId) return toast.error('Select an invoice');
    if (!productId) return toast.error('Select a product from that invoice');
    const qtyNum = parseFloat(qty);
    if (!qtyNum || qtyNum <= 0) return toast.error('Enter a valid quantity');
    if (qtyNum > maxQty) return toast.error(`Qty cannot exceed billed qty (${maxQty})`);

    setSubmitting(true);
    try {
      await returnsApi.create({
        customerId,
        billId,
        productId,
        qty: qtyNum,
        reason: reason.trim() || undefined,
      });
      toast.success('Return recorded — stock restored');
      setDialogOpen(false);
      await loadReturns();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to record return';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-full bg-[var(--brand-space)] px-4 sm:px-6 lg:px-8 py-5 lg:py-6">
      <div className="w-full max-w-[1400px] mx-auto space-y-5 lg:space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-[26px] sm:text-[30px] font-bold text-[#0f172a] tracking-tight">
              Returns
            </h1>
            <p className="mt-1.5 text-[14px] text-[#64748b]">
              Record product returns against a customer invoice. Stock is restored automatically.
            </p>
          </div>
          <Button onClick={openDialog} className={cn('h-11 rounded-xl gap-2 px-5', btnPrimary)}>
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            New return
          </Button>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <article className="bg-white rounded-[16px] border border-[#e8eef5] p-4 sm:p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <p className="text-[13px] text-[#64748b] font-medium">Total returns</p>
            <p className="mt-2 text-[24px] font-bold text-[#0f172a] tabular-nums">{summary.count}</p>
          </article>
          <article className="bg-white rounded-[16px] border border-[#e8eef5] p-4 sm:p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <p className="text-[13px] text-[#64748b] font-medium">Return value</p>
            <p className="mt-2 text-[24px] font-bold text-[#0f172a] tabular-nums">
              {formatMoneyParts(summary.totalAmount).whole}
              <span className="text-[14px] font-semibold text-[#94a3b8]">
                {formatMoneyParts(summary.totalAmount).dec}
              </span>
            </p>
          </article>
          <article className="bg-white rounded-[16px] border border-[#e8eef5] p-4 sm:p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <p className="text-[13px] text-[#64748b] font-medium">Credit issued</p>
            <p className="mt-2 text-[24px] font-bold text-[#0f172a] tabular-nums">
              {formatMoneyParts(summary.totalCredit).whole}
              <span className="text-[14px] font-semibold text-[#94a3b8]">
                {formatMoneyParts(summary.totalCredit).dec}
              </span>
            </p>
          </article>
        </section>

        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8]" />
          <Input
            type="text"
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Search customer, invoice or product"
            className="pl-10 h-11 rounded-full border-[#e2e8f0] bg-white"
          />
        </div>

        <div className="bg-white rounded-[16px] border border-[#e8eef5] shadow-[0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow className="bg-[#f8fafc] hover:bg-[#f8fafc] border-[#f1f5f9]">
                  <TableHead className="pl-5 text-[#64748b] font-semibold text-xs uppercase tracking-wide">
                    Date
                  </TableHead>
                  <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wide">
                    Customer
                  </TableHead>
                  <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wide">
                    Invoice
                  </TableHead>
                  <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wide">
                    Product
                  </TableHead>
                  <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wide text-right">
                    Qty
                  </TableHead>
                  <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wide text-right">
                    Amount
                  </TableHead>
                  <TableHead className="pr-5 text-[#64748b] font-semibold text-xs uppercase tracking-wide">
                    Reason
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-[#94a3b8] mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center text-[#64748b]">
                      <div className="inline-flex flex-col items-center gap-2">
                        <Undo2 className="w-8 h-8 text-[#cbd5e1]" />
                        <span>No returns yet</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => {
                    const money = formatMoneyParts(row.amount);
                    return (
                      <TableRow key={row._id} className="border-[#f1f5f9]">
                        <TableCell className="pl-5 text-[14px] text-[#334155] whitespace-nowrap">
                          {shortDate(row.createdAt)}
                        </TableCell>
                        <TableCell className="text-[14px] font-semibold text-[#0f172a]">
                          {customerNameOf(row)}
                        </TableCell>
                        <TableCell className="text-[13px] text-[#475569] tabular-nums">
                          {billNoOf(row)}
                        </TableCell>
                        <TableCell className="text-[14px] text-[#334155] max-w-[240px]">
                          <span className="inline-flex items-center gap-1.5 min-w-0">
                            <Package className="w-3.5 h-3.5 text-[#94a3b8] shrink-0" />
                            <span className="truncate">{row.productName}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-[14px] font-medium tabular-nums">
                          {row.qty}
                        </TableCell>
                        <TableCell className="text-right text-[14px] font-semibold text-[#0f172a] tabular-nums">
                          {money.whole}
                          <span className="text-[#94a3b8] font-medium">{money.dec}</span>
                        </TableCell>
                        <TableCell className="pr-5 text-[13px] text-[#64748b] max-w-[180px] truncate">
                          {row.reason || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Record return</DialogTitle>
            <DialogDescription>
              Pick the customer, their invoice, then the product to return. Quantity cannot exceed
              what was billed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select
                value={customerId || undefined}
                onValueChange={(v: string) => setCustomerId(v)}
              >
                <SelectTrigger className={cn(inputClass, 'w-full')}>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                      {c.phone ? ` · ${c.phone}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Invoice</Label>
              <Select
                value={billId || undefined}
                onValueChange={(v: string) => {
                  setBillId(v);
                  setProductId('');
                  setQty('1');
                }}
                disabled={!customerId || loadingBills}
              >
                <SelectTrigger className={cn(inputClass, 'w-full')}>
                  <SelectValue
                    placeholder={
                      loadingBills
                        ? 'Loading invoices…'
                        : !customerId
                          ? 'Select customer first'
                          : bills.length === 0
                            ? 'No invoices with products'
                            : 'Select invoice'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {bills.map((b) => (
                    <SelectItem key={b._id} value={b._id}>
                      {b.billNo} · ₹{Math.round(b.grandTotal).toLocaleString('en-IN')} ·{' '}
                      {shortDate(b.createdAt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Product</Label>
              <Select
                value={productId || undefined}
                onValueChange={(v: string) => {
                  setProductId(v);
                  const line = billProducts.find((p) => p.productId === v);
                  setQty('1');
                }}
                disabled={!billId}
              >
                <SelectTrigger className={cn(inputClass, 'w-full')}>
                  <SelectValue
                    placeholder={!billId ? 'Select invoice first' : 'Select product'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {billProducts.map((p) => (
                    <SelectItem key={`${p.productId}-${p.productName}`} value={p.productId}>
                      {p.productName} · qty {p.qty} · ₹{p.rate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="return-qty">
                  Quantity{maxQty > 0 ? ` (max ${maxQty})` : ''}
                </Label>
                <Input
                  id="return-qty"
                  type="number"
                  min={0.01}
                  max={maxQty || undefined}
                  step="0.01"
                  className={inputClass}
                  value={qty}
                  disabled={!productId}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setQty(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Return amount</Label>
                <div
                  className={cn(
                    inputClass,
                    'flex items-center px-3 font-semibold tabular-nums text-[#0f172a] bg-[#f8fafc]'
                  )}
                >
                  ₹{returnAmount.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="return-reason">Reason (optional)</Label>
              <Input
                id="return-reason"
                className={inputClass}
                value={reason}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
                placeholder="e.g. Damaged can, wrong shade"
              />
            </div>
          </div>

          <DialogFooter className="gap-3 sm:gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              className={btnPrimary}
              onClick={handleSubmit}
              disabled={submitting || !productId}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record return'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
