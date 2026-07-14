import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Loader2,
  Paintbrush,
  HandCoins,
  Wallet,
  Trash2,
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
import { expensesApi, paintersApi } from '@/api';
import type { Expense, PainterWithStats } from '@paint-saas/shared-types';
import { painterDetailPath } from '@/config/config';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const emptyPainterForm = { name: '', phone: '', notes: '' };
const emptyExpenseForm = {
  category: 'Rent',
  description: '',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
};
const emptyPayForm = {
  amount: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
};

/** Shop expenses only — painter payments are added per painter. */
const SHOP_EXPENSE_CATEGORIES = [
  'Rent',
  'Utilities',
  'Transport',
  'Salaries',
  'Supplies',
  'Miscellaneous',
] as const;

const btnPrimary =
  'bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-[0_4px_14px_rgba(37,99,235,0.28)] border-0';
const inputClass =
  'h-10 rounded-xl border-[#e2e8f0] bg-white focus-visible:border-[#2563eb] focus-visible:ring-[#2563eb]/20';

type ModuleTab = 'painters' | 'expenses';
type ExpenseFilter = 'all' | 'shop' | 'painter';

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

function painterNameFromExpense(e: Expense) {
  if (e.painterId && typeof e.painterId === 'object' && 'name' in e.painterId) {
    return e.painterId.name;
  }
  return null;
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

  const [tab, setTab] = useState<ModuleTab>('painters');
  const [expenseFilter, setExpenseFilter] = useState<ExpenseFilter>('all');
  const [painters, setPainters] = useState<PainterWithStats[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyPainterForm);
  const [adding, setAdding] = useState(false);

  const [payOpen, setPayOpen] = useState(false);
  const [payPainter, setPayPainter] = useState<PainterWithStats | null>(null);
  const [payForm, setPayForm] = useState(emptyPayForm);
  const [paying, setPaying] = useState(false);

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);
  const [savingExpense, setSavingExpense] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [painterList, expenseList] = await Promise.all([
        paintersApi.list(),
        expensesApi.list(),
      ]);
      setPainters(painterList);
      setExpenses(expenseList);
    } catch {
      toast.error('Failed to load painters module');
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
        setExpenses(expenseList);
      } catch {
        if (!cancelled) toast.error('Failed to load painters module');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(() => {
    const painterExpenses = expenses.filter(isPainterExpense);
    const paintersPaidMonth = painterExpenses
      .filter((e) => isThisMonth(e.date))
      .reduce((s, e) => s + (e.amount ?? 0), 0);
    const expensesTotal = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);
    const expensesMonth = expenses
      .filter((e) => isThisMonth(e.date))
      .reduce((s, e) => s + (e.amount ?? 0), 0);
    return {
      painterCount: painters.length,
      paintersPaidMonth,
      expensesTotal,
      expensesMonth,
    };
  }, [painters, expenses]);

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

  const filteredExpenses = useMemo(() => {
    let list = expenses;
    if (expenseFilter === 'painter') list = list.filter(isPainterExpense);
    if (expenseFilter === 'shop') list = list.filter((e) => !isPainterExpense(e));

    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((e) => {
      const painterName = painterNameFromExpense(e)?.toLowerCase() ?? '';
      return (
        e.category.toLowerCase().includes(q) ||
        (e.description ?? '').toLowerCase().includes(q) ||
        painterName.includes(q)
      );
    });
  }, [expenses, search, expenseFilter]);

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
      toast.success(`Payment to ${payPainter.name} recorded in expenses`);
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

  async function handleAddExpense() {
    const amount = Number(expenseForm.amount);
    if (!expenseForm.category.trim()) {
      toast.error('Category is required');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSavingExpense(true);
    try {
      await expensesApi.create({
        category: expenseForm.category.trim(),
        description: expenseForm.description.trim() || undefined,
        amount,
        date: expenseForm.date || undefined,
      });
      toast.success('Expense recorded');
      setExpenseOpen(false);
      setExpenseForm(emptyExpenseForm);
      await load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to record expense'
      );
    } finally {
      setSavingExpense(false);
    }
  }

  async function handleDeleteExpense(id: string) {
    setDeletingId(id);
    try {
      await expensesApi.remove(id);
      toast.success('Expense removed');
      await load();
    } catch {
      toast.error('Failed to delete expense');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[#0f172a] tracking-tight">
            Painter Module
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">
            Pay each painter separately — those payments are added to Expenses automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tab === 'painters' ? (
            <Button className={cn('h-10 rounded-xl gap-2', btnPrimary)} onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4" />
              Add painter
            </Button>
          ) : (
            <Button
              className={cn('h-10 rounded-xl gap-2', btnPrimary)}
              onClick={() => setExpenseOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Add shop expense
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <SummaryCard
          label="Painters"
          amount={totals.painterCount}
          subtitle="Registered painters"
          icon={Paintbrush}
          iconBg="bg-[#eff6ff]"
          iconColor="text-[#2563eb]"
          loading={loading}
          isCount
        />
        <SummaryCard
          label="Painter paid (month)"
          amount={totals.paintersPaidMonth}
          subtitle="Per-painter payments this month"
          icon={HandCoins}
          iconBg="bg-[#ecfdf5]"
          iconColor="text-[#059669]"
          loading={loading}
        />
        <SummaryCard
          label="All expenses"
          amount={totals.expensesTotal}
          subtitle={`Includes painter + shop · Month: ${formatMoneyParts(totals.expensesMonth).whole}${formatMoneyParts(totals.expensesMonth).dec}`}
          icon={Wallet}
          iconBg="bg-[#fff7ed]"
          iconColor="text-[#ea580c]"
          loading={loading}
        />
      </div>

      <div className="bg-white rounded-[16px] border border-[#e8eef5] shadow-[0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="flex flex-col gap-3 p-4 border-b border-[#eef2f7]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="inline-flex rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-1">
              {(
                [
                  { key: 'painters', label: 'Painters' },
                  { key: 'expenses', label: 'Expenses' },
                ] as const
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setTab(item.key);
                    setSearch('');
                    setExpenseFilter('all');
                  }}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    tab === item.key
                      ? 'bg-white text-[#0f172a] shadow-sm'
                      : 'text-[#64748b] hover:text-[#0f172a]'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
              <Input
                type="search"
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                placeholder={
                  tab === 'painters' ? 'Search painters…' : 'Search expenses…'
                }
                className={cn(inputClass, 'pl-9')}
              />
            </div>
          </div>

          {tab === 'expenses' && (
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: 'all', label: 'All' },
                  { key: 'painter', label: 'Painter payments' },
                  { key: 'shop', label: 'Shop expenses' },
                ] as const
              ).map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setExpenseFilter(f.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    expenseFilter === f.key
                      ? 'bg-[#eff6ff] text-[#2563eb] ring-1 ring-[#bfdbfe]'
                      : 'bg-[#f8fafc] text-[#64748b] hover:text-[#0f172a]'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {tab === 'painters' ? (
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
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-14" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-[#94a3b8]">
                      <Loader2 className="inline h-5 w-5 animate-spin mr-2" />
                      Loading expenses…
                    </TableCell>
                  </TableRow>
                ) : filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-[#94a3b8]">
                      No expenses in this view yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => {
                    const money = formatMoneyParts(expense.amount ?? 0);
                    const painterLinked = isPainterExpense(expense);
                    const painterName = painterNameFromExpense(expense);
                    return (
                      <TableRow key={expense._id}>
                        <TableCell className="text-[#475569]">{shortDate(expense.date)}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex px-2.5 py-1 rounded-lg text-xs font-medium',
                              painterLinked
                                ? 'bg-[#eff6ff] text-[#2563eb]'
                                : 'bg-[#f1f5f9] text-[#475569]'
                            )}
                          >
                            {painterLinked ? 'Painter payment' : expense.category}
                          </span>
                        </TableCell>
                        <TableCell className="text-[#64748b] max-w-[320px]">
                          <p className="truncate font-medium text-[#334155]">
                            {painterName ? painterName : expense.description || '—'}
                          </p>
                          {painterName && expense.description ? (
                            <p className="truncate text-xs text-[#94a3b8]">{expense.description}</p>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-[#0f172a]">
                          {money.whole}
                          <span className="text-[#94a3b8] font-medium">{money.dec}</span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-[#94a3b8] hover:text-red-600"
                            disabled={deletingId === expense._id}
                            onClick={() => handleDeleteExpense(expense._id)}
                            aria-label="Delete expense"
                          >
                            {deletingId === expense._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add painter */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add painter</DialogTitle>
            <DialogDescription>
              Register a painter. You can add payments to them anytime from the Pay button.
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

      {/* Per-painter payment */}
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
              This payment is saved against this painter and counted in Expenses.
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

      {/* Shop expense (not painter) */}
      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add shop expense</DialogTitle>
            <DialogDescription>
              For rent, utilities, and other costs. Painter payments are added from the Painters tab.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={expenseForm.category}
                onValueChange={(v) => setExpenseForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHOP_EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-amount">Amount</Label>
              <Input
                id="expense-amount"
                type="number"
                min={0}
                step="0.01"
                className={inputClass}
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-date">Date</Label>
              <Input
                id="expense-date"
                type="date"
                className={inputClass}
                value={expenseForm.date}
                onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-desc">Description</Label>
              <Input
                id="expense-desc"
                type="text"
                className={inputClass}
                value={expenseForm.description}
                onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setExpenseOpen(false)}>
              Cancel
            </Button>
            <Button
              className={cn('rounded-xl', btnPrimary)}
              disabled={savingExpense}
              onClick={handleAddExpense}
            >
              {savingExpense ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
