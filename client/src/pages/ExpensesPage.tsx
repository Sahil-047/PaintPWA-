import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Loader2,
  Wallet,
  HandCoins,
  Paintbrush,
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
import { expensesApi } from '@/api';
import type { Expense } from '@paint-saas/shared-types';
import { ROUTES } from '@/config/config';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const emptyExpenseForm = {
  category: 'Miscellaneous',
  description: '',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
};

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

function SummaryCard({
  label,
  amount,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  loading,
}: {
  label: string;
  amount: number;
  subtitle: string;
  icon: typeof Wallet;
  iconBg: string;
  iconColor: string;
  loading: boolean;
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

export default function ExpensesPage() {
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ExpenseFilter>('all');

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyExpenseForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setExpenses(await expensesApi.list());
    } catch {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await expensesApi.list();
        if (!cancelled) setExpenses(list);
      } catch {
        if (!cancelled) toast.error('Failed to load expenses');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(() => {
    const painter = expenses.filter(isPainterExpense);
    const shop = expenses.filter((e) => !isPainterExpense(e));
    const sum = (list: Expense[]) => list.reduce((s, e) => s + (e.amount ?? 0), 0);
    const monthSum = (list: Expense[]) =>
      list.filter((e) => isThisMonth(e.date)).reduce((s, e) => s + (e.amount ?? 0), 0);

    return {
      all: sum(expenses),
      allMonth: monthSum(expenses),
      shop: sum(shop),
      shopMonth: monthSum(shop),
      painter: sum(painter),
      painterMonth: monthSum(painter),
    };
  }, [expenses]);

  const filtered = useMemo(() => {
    let list = expenses;
    if (filter === 'painter') list = list.filter(isPainterExpense);
    if (filter === 'shop') list = list.filter((e) => !isPainterExpense(e));

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
  }, [expenses, search, filter]);

  async function handleAdd() {
    const amount = Number(form.amount);
    if (!form.category.trim()) {
      toast.error('Category is required');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      await expensesApi.create({
        category: form.category.trim(),
        description: form.description.trim() || undefined,
        amount,
        date: form.date || undefined,
      });
      toast.success('Expense recorded');
      setAddOpen(false);
      setForm(emptyExpenseForm);
      await load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to record expense'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
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
            Expenses
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">
            Track shop miscellaneous costs and painter payments in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="h-10 rounded-xl gap-2 border-[#e2e8f0]"
            onClick={() => navigate(ROUTES.PAINTERS)}
          >
            <Paintbrush className="w-4 h-4" />
            Pay painters
          </Button>
          <Button className={cn('h-10 rounded-xl gap-2', btnPrimary)} onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" />
            Add expense
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <SummaryCard
          label="All expenses"
          amount={totals.all}
          subtitle={`This month: ${formatMoneyParts(totals.allMonth).whole}${formatMoneyParts(totals.allMonth).dec}`}
          icon={Wallet}
          iconBg="bg-[#fff7ed]"
          iconColor="text-[#ea580c]"
          loading={loading}
        />
        <SummaryCard
          label="Shop / misc"
          amount={totals.shop}
          subtitle={`This month: ${formatMoneyParts(totals.shopMonth).whole}${formatMoneyParts(totals.shopMonth).dec}`}
          icon={Wallet}
          iconBg="bg-[#eff6ff]"
          iconColor="text-[#2563eb]"
          loading={loading}
        />
        <SummaryCard
          label="Painter payments"
          amount={totals.painter}
          subtitle={`This month: ${formatMoneyParts(totals.painterMonth).whole}${formatMoneyParts(totals.painterMonth).dec}`}
          icon={HandCoins}
          iconBg="bg-[#ecfdf5]"
          iconColor="text-[#059669]"
          loading={loading}
        />
      </div>

      <div className="bg-white rounded-[16px] border border-[#e8eef5] shadow-[0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="flex flex-col gap-3 p-4 border-b border-[#eef2f7]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="inline-flex flex-wrap rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-1 gap-0.5">
              {(
                [
                  { key: 'all', label: 'All' },
                  { key: 'shop', label: 'Shop / misc' },
                  { key: 'painter', label: 'Painter payments' },
                ] as const
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={cn(
                    'px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    filter === item.key
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
                placeholder="Search expenses…"
                className={cn(inputClass, 'pl-9')}
              />
            </div>
          </div>
        </div>

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
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-[#94a3b8]">
                    No expenses in this view yet.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((expense) => {
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
                          onClick={() => handleDelete(expense._id)}
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
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add shop expense</DialogTitle>
            <DialogDescription>
              Record rent, utilities, supplies, and other miscellaneous costs. Painter payments are
              added from the Painters module.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
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
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-date">Date</Label>
              <Input
                id="expense-date"
                type="date"
                className={inputClass}
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-desc">Description</Label>
              <Input
                id="expense-desc"
                type="text"
                className={inputClass}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button className={cn('rounded-xl', btnPrimary)} disabled={saving} onClick={handleAdd}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
