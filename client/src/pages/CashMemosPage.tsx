import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { ChevronLeft, ChevronRight, FileText, Loader2, Plus, Search } from 'lucide-react';
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
import { accountsApi, cashmemoApi } from '@/api';
import type { CashMemoWithRefs, Customer } from '@paint-saas/shared-types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PAGE_SIZE = 10;
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

function customerNameOf(memo: CashMemoWithRefs) {
  if (!memo.customerId || typeof memo.customerId === 'string') return 'Customer';
  return memo.customerId.name ?? 'Customer';
}

function customerPhoneOf(memo: CashMemoWithRefs) {
  if (!memo.customerId || typeof memo.customerId === 'string') return '';
  return memo.customerId.phone ?? '';
}

export default function CashMemosPage() {
  const [loading, setLoading] = useState(true);
  const [memos, setMemos] = useState<CashMemoWithRefs[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [memoList, customerList] = await Promise.all([
        cashmemoApi.list(),
        accountsApi.customers(),
      ]);
      setMemos(memoList);
      setCustomers(customerList);
    } catch {
      toast.error('Failed to load cash memos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    const all = memos.reduce((s, m) => s + (m.amountPaid ?? 0), 0);
    const now = new Date();
    const month = memos
      .filter((m) => {
        const d = new Date(m.paidAt);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((s, m) => s + (m.amountPaid ?? 0), 0);
    return { all, month, count: memos.length };
  }, [memos]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return memos;
    return memos.filter((m) => {
      const name = customerNameOf(m).toLowerCase();
      const phone = customerPhoneOf(m).toLowerCase();
      return (
        m.memoNo.toLowerCase().includes(q) ||
        name.includes(q) ||
        phone.includes(q)
      );
    });
  }, [memos, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function openCreate() {
    setCustomerId(customers[0]?._id ?? '');
    setAmount('');
    setPaymentMode('cash');
    setDialogOpen(true);
  }

  async function handleCreate() {
    const paid = Number(amount);
    if (!customerId) {
      toast.error('Select a customer');
      return;
    }
    if (!paid || paid <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSubmitting(true);
    try {
      const memo = await cashmemoApi.create({
        customerId,
        amountPaid: paid,
        paymentMode,
      });
      toast.success('Cash memo saved — opening token PDF');
      setDialogOpen(false);
      await load();
      try {
        await cashmemoApi.openPdf(memo._id);
      } catch {
        /* non-blocking */
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create cash memo';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[#0f172a] tracking-tight">
            Cash memos
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">
            Record money received from existing customers as a token for future buying.
          </p>
        </div>
        <Button className={cn('h-10 rounded-xl gap-2', btnPrimary)} onClick={openCreate}>
          <Plus className="w-4 h-4" />
          New cash memo
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <article className="bg-white rounded-[16px] border border-[#e8eef5] shadow-[0_4px_16px_rgba(15,23,42,0.04)] p-5 min-h-[120px]">
          <p className="text-[13px] text-[#64748b] font-medium">Advances received</p>
          <p className="mt-3 text-[24px] font-bold text-[#0f172a] tabular-nums">
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-[#94a3b8]" />
            ) : (
              `${formatMoneyParts(totals.all).whole}${formatMoneyParts(totals.all).dec}`
            )}
          </p>
          <p className="mt-2 text-[12px] text-[#94a3b8]">
            This month: {formatMoneyParts(totals.month).whole}
            {formatMoneyParts(totals.month).dec}
          </p>
        </article>
        <article className="bg-white rounded-[16px] border border-[#e8eef5] shadow-[0_4px_16px_rgba(15,23,42,0.04)] p-5 min-h-[120px]">
          <p className="text-[13px] text-[#64748b] font-medium">Memos issued</p>
          <p className="mt-3 text-[24px] font-bold text-[#0f172a] tabular-nums">
            {loading ? <Loader2 className="h-6 w-6 animate-spin text-[#94a3b8]" /> : totals.count}
          </p>
          <p className="mt-2 text-[12px] text-[#94a3b8]">Saved as customer credit for future bills</p>
        </article>
      </div>

      <div className="bg-white rounded-[16px] border border-[#e8eef5] shadow-[0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="p-4 border-b border-[#eef2f7]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
            <Input
              type="search"
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              placeholder="Search by customer, phone, or memo no…"
              className={cn(inputClass, 'pl-9')}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Date</TableHead>
                <TableHead>Memo</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-[#94a3b8]">
                    <Loader2 className="inline h-5 w-5 animate-spin mr-2" />
                    Loading cash memos…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-[#94a3b8]">
                    No cash memos yet. Record an advance for an existing customer.
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((memo) => {
                  const money = formatMoneyParts(memo.amountPaid ?? 0);
                  return (
                    <TableRow key={memo._id}>
                      <TableCell className="text-[#475569]">{shortDate(memo.paidAt)}</TableCell>
                      <TableCell className="font-medium text-[#0f172a]">{memo.memoNo}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-[#0f172a]">{customerNameOf(memo)}</p>
                          {customerPhoneOf(memo) ? (
                            <p className="text-[12px] text-[#94a3b8]">{customerPhoneOf(memo)}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-[#475569]">
                        {memo.paymentMode || 'cash'}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-[#0f172a]">
                        {money.whole}
                        <span className="text-[#94a3b8] font-medium">{money.dec}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-lg gap-1.5 text-[12px]"
                          onClick={() => cashmemoApi.openPdf(memo._id)}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-[#f1f5f9] bg-[#fafafa]">
            <p className="text-[13px] text-[#64748b]">
              Showing {(currentPage - 1) * PAGE_SIZE + 1} to{' '}
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} memos
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
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>New cash memo</DialogTitle>
            <DialogDescription>
              Save the amount received from an existing customer. A PDF token will open as proof of
              this advance for future buying.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[13px]">Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className={cn(inputClass, 'mt-1.5')}>
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
            <div>
              <Label className="text-[13px]">Amount received (₹)</Label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={cn(inputClass, 'mt-1.5')}
                placeholder="5000"
              />
            </div>
            <div>
              <Label className="text-[13px]">Payment mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger className={cn(inputClass, 'mt-1.5')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank">Bank transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button className={cn('rounded-xl', btnPrimary)} disabled={submitting} onClick={handleCreate}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save & open PDF'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
