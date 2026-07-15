import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Loader2, Paintbrush, HandCoins } from 'lucide-react';
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
import { expensesApi, paintersApi } from '@/api';
import type { Expense, PainterWithStats } from '@paint-saas/shared-types';
import { painterDetailPath } from '@/config/config';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const emptyPainterForm = { name: '', phone: '', notes: '' };
const emptyPayForm = {
  amount: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
};

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

function isThisMonth(dateString?: string) {
  if (!dateString) return false;
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function isPainterExpense(e: Expense) {
  return Boolean(e.painterId) || e.category === 'Painter';
}

function PainterAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-[#eff6ff] text-[#2563eb] text-sm font-semibold border border-[#dbeafe] flex items-center justify-center shrink-0">
      {initials || '?'}
    </div>
  );
}

function SummaryCard({
  label,
  amount,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  loading,
  isCount,
}: {
  label: string;
  amount: number;
  subtitle: string;
  icon: typeof Paintbrush;
  iconBg: string;
  iconColor: string;
  loading: boolean;
  isCount?: boolean;
}) {
  const { whole, dec } = formatMoneyParts(amount);
  return (
    <article className="bg-white rounded-[16px] border border-[#e8eef5] shadow-[0_4px_16px_rgba(15,23,42,0.04)] p-5 flex flex-col min-h-[148px]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-medium text-[#64748b]">{label}</p>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} strokeWidth={2} />
        </div>
      </div>
      <p className="mt-4 text-[28px] lg:text-[32px] font-bold text-[#0f172a] tracking-tight leading-none">
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-[#94a3b8]" />
        ) : isCount ? (
          amount
        ) : (
          <>
            {whole}
            <span className="text-[18px] font-semibold text-[#94a3b8]">{dec}</span>
          </>
        )}
      </p>
      <div className="mt-auto pt-4">
        <p className="text-[12px] text-[#94a3b8]">{subtitle}</p>
      </div>
    </article>
  );
}

export default function PaintersPage() {
  const navigate = useNavigate();

  const [painters, setPainters] = useState<PainterWithStats[]>([]);
  const [painterPaidMonth, setPainterPaidMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyPainterForm);
  const [adding, setAdding] = useState(false);

  const [payOpen, setPayOpen] = useState(false);
  const [payPainter, setPayPainter] = useState<PainterWithStats | null>(null);
  const [payForm, setPayForm] = useState(emptyPayForm);
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [painterList, expenseList] = await Promise.all([
        paintersApi.list(),
        expensesApi.list(),
      ]);
      setPainters(painterList);
      setPainterPaidMonth(
        expenseList
          .filter((e) => isPainterExpense(e) && isThisMonth(e.date))
          .reduce((s, e) => s + (e.amount ?? 0), 0)
      );
    } catch {
      toast.error('Failed to load painters');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [painterList, expenseList] = await Promise.all([
          paintersApi.list(),
          expensesApi.list(),
        ]);
        if (cancelled) return;
        setPainters(painterList);
        setPainterPaidMonth(
          expenseList
            .filter((e) => isPainterExpense(e) && isThisMonth(e.date))
            .reduce((s, e) => s + (e.amount ?? 0), 0)
        );
      } catch {
        if (!cancelled) toast.error('Failed to load painters');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalPaidAll = useMemo(
    () => painters.reduce((s, p) => s + (p.totalPaid ?? 0), 0),
    [painters]
  );

  const filteredPainters = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return painters;
    return painters.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.phone ?? '').toLowerCase().includes(q) ||
        (p.notes ?? '').toLowerCase().includes(q)
    );
  }, [painters, search]);

  function openPay(painter: PainterWithStats, e?: MouseEvent) {
    e?.stopPropagation();
    setPayPainter(painter);
    setPayForm(emptyPayForm);
    setPayOpen(true);
  }

  async function handleAddPainter() {
    if (!addForm.name.trim()) {
      toast.error('Painter name is required');
      return;
    }
    setAdding(true);
    try {
      await paintersApi.create({
        name: addForm.name.trim(),
        phone: addForm.phone.trim() || undefined,
        notes: addForm.notes.trim() || undefined,
      });
      toast.success('Painter added');
      setAddOpen(false);
      setAddForm(emptyPainterForm);
      await load();
    } catch {
      toast.error('Failed to add painter');
    } finally {
      setAdding(false);
    }
  }

  async function handleRecordPayment() {
    if (!payPainter) return;
    const amount = Number(payForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setPaying(true);
    try {
      await paintersApi.recordPayment(payPainter._id, {
        amount,
        description: payForm.description.trim() || undefined,
        date: payForm.date || undefined,
      });
      toast.success(`Payment to ${payPainter.name} recorded`);
      setPayOpen(false);
      setPayPainter(null);
      setPayForm(emptyPayForm);
      await load();
    } catch {
      toast.error('Failed to record payment');
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[#0f172a] tracking-tight">
            Painters
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">
            Manage painters and record payments per painter.
          </p>
        </div>
        <Button className={cn('h-10 rounded-xl gap-2', btnPrimary)} onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" />
          Add painter
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <SummaryCard
          label="Painters"
          amount={painters.length}
          subtitle="Registered painters"
          icon={Paintbrush}
          iconBg="bg-[#eff6ff]"
          iconColor="text-[#2563eb]"
          loading={loading}
          isCount
        />
        <SummaryCard
          label="Paid this month"
          amount={painterPaidMonth}
          subtitle="Painter payments this month"
          icon={HandCoins}
          iconBg="bg-[#ecfdf5]"
          iconColor="text-[#059669]"
          loading={loading}
        />
        <SummaryCard
          label="Total paid"
          amount={totalPaidAll}
          subtitle="All-time painter payments"
          icon={HandCoins}
          iconBg="bg-[#fff7ed]"
          iconColor="text-[#ea580c]"
          loading={loading}
        />
      </div>

      <div className="bg-white rounded-[16px] border border-[#e8eef5] shadow-[0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="p-4 border-b border-[#eef2f7]">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
            <Input
              type="search"
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              placeholder="Search painters…"
              className={cn(inputClass, 'pl-9')}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[220px]">Painter</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Total paid</TableHead>
                <TableHead className="text-right w-[140px]">Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-[#94a3b8]">
                    <Loader2 className="inline h-5 w-5 animate-spin mr-2" />
                    Loading painters…
                  </TableCell>
                </TableRow>
              ) : filteredPainters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-[#94a3b8]">
                    No painters yet. Add one, then record payments per painter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPainters.map((painter) => {
                  const money = formatMoneyParts(painter.totalPaid ?? 0);
                  return (
                    <TableRow
                      key={painter._id}
                      className="cursor-pointer"
                      onClick={() => navigate(painterDetailPath(painter._id))}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <PainterAvatar name={painter.name} />
                          <div>
                            <p className="font-semibold text-[#0f172a]">{painter.name}</p>
                            <p className="text-xs text-[#94a3b8]">
                              Added {shortDate(painter.createdAt)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-[#475569]">{painter.phone || '—'}</TableCell>
                      <TableCell className="text-[#64748b] max-w-[240px] truncate">
                        {painter.notes || '—'}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-[#0f172a]">
                        {money.whole}
                        <span className="text-[#94a3b8] font-medium">{money.dec}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          className={cn('h-9 rounded-xl gap-1.5', btnPrimary)}
                          onClick={(e) => openPay(painter, e)}
                        >
                          <HandCoins className="w-3.5 h-3.5" />
                          Pay
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add painter</DialogTitle>
            <DialogDescription>
              Register a painter. You can add payments anytime with Pay.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="painter-name">Name</Label>
              <Input
                id="painter-name"
                type="text"
                className={inputClass}
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Painter name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="painter-phone">Phone</Label>
              <Input
                id="painter-phone"
                type="text"
                className={inputClass}
                value={addForm.phone}
                onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="painter-notes">Notes</Label>
              <Input
                id="painter-notes"
                type="text"
                className={inputClass}
                value={addForm.notes}
                onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button className={cn('rounded-xl', btnPrimary)} disabled={adding} onClick={handleAddPainter}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={payOpen}
        onOpenChange={(open) => {
          setPayOpen(open);
          if (!open) setPayPainter(null);
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Pay {payPainter?.name ?? 'painter'}</DialogTitle>
            <DialogDescription>
              Payment is saved against this painter and counted toward shop expenses.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pay-amount">Amount</Label>
              <Input
                id="pay-amount"
                type="number"
                min={0}
                step="0.01"
                className={inputClass}
                value={payForm.amount}
                onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-date">Date</Label>
              <Input
                id="pay-date"
                type="date"
                className={inputClass}
                value={payForm.date}
                onChange={(e) => setPayForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-note">Note</Label>
              <Input
                id="pay-note"
                type="text"
                className={inputClass}
                value={payForm.description}
                onChange={(e) => setPayForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={payPainter ? `Payment to ${payPainter.name}` : 'Optional'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button
              className={cn('rounded-xl', btnPrimary)}
              disabled={paying}
              onClick={handleRecordPayment}
            >
              {paying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
