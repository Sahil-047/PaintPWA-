import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Loader2,
  Download,
  Filter,
  ArrowUpDown,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Package,
  HandCoins,
  ShoppingCart,
  Wallet,
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
import { accountsApi, billingApi } from '@/api';
import type { AccountWithCustomer, Bill } from '@paint-saas/shared-types';
import { accountDetailPath } from '@/config/config';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PAGE_SIZE = 10;
const emptyCustomerForm = { name: '', phone: '', address: '' };
const btnPrimary =
  'bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-[0_4px_14px_rgba(37,99,235,0.28)] border-0';
const inputClass =
  'h-10 rounded-xl border-[#e2e8f0] bg-white focus-visible:border-[#2563eb] focus-visible:ring-[#2563eb]/20';

type StatusTab = 'all' | 'active' | 'inactive';
type SortKey = 'newest' | 'name' | 'due-high' | 'due-low';

function formatMoneyParts(amount: number) {
  const rounded = Math.round(amount * 100) / 100;
  const [whole, dec] = rounded.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).split('.');
  return { whole: `₹ ${whole}`, dec: `.${dec ?? '00'}` };
}

function shortDate(dateString?: string) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function isActiveAccount(a: AccountWithCustomer) {
  return (
    (a.totalBilled ?? 0) > 0 ||
    (a.dueBalance ?? 0) > 0 ||
    (a.totalPaid ?? 0) > 0 ||
    (a.creditBalance ?? 0) > 0
  );
}

function CustomerAvatar({ name }: { name: string }) {
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
        <p className="text-[12px] text-[#94a3b8]">
          Last month: {last.whole}
          <span className="text-[#cbd5e1]">{last.dec}</span>
        </p>
      </div>
    </article>
  );
}

export default function AccountsPage() {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<AccountWithCustomer[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);

  const [editOpen, setEditOpen] = useState(false);
  const [editCustomerId, setEditCustomerId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyCustomerForm);
  const [saving, setSaving] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyCustomerForm);
  const [adding, setAdding] = useState(false);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const [accountList, billList] = await Promise.all([accountsApi.list(), billingApi.list()]);
      setAccounts(accountList);
      setBills(billList);
    } catch {
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [accountList, billList] = await Promise.all([accountsApi.list(), billingApi.list()]);
        if (cancelled) return;
        setAccounts(accountList);
        setBills(billList);
      } catch {
        if (!cancelled) toast.error('Failed to load accounts');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const monthRanges = useMemo(() => {
    const now = new Date();
    const lastFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastTo = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { lastFrom, lastTo };
  }, []);

  const summary = useMemo(() => {
    const totalOrders = accounts.reduce((s, a) => s + (a.totalBilled ?? 0), 0);
    const paymentReceived = accounts.reduce((s, a) => s + (a.totalPaid ?? 0), 0);
    const paymentDue = accounts.reduce((s, a) => s + (a.dueBalance ?? 0), 0);
    const storeCredit = accounts.reduce((s, a) => s + (a.creditBalance ?? 0), 0);

    let lastOrders = 0;
    let lastReceived = 0;
    for (const bill of bills) {
      const d = new Date(bill.createdAt);
      if (d >= monthRanges.lastFrom && d <= monthRanges.lastTo) {
        lastOrders += bill.grandTotal ?? 0;
        if (bill.status === 'paid') lastReceived += bill.grandTotal ?? 0;
        else if (bill.status === 'partial') lastReceived += (bill.grandTotal ?? 0) * 0.5;
      }
    }
    const lastDue = Math.max(0, lastOrders - lastReceived);

    return {
      totalOrders,
      paymentReceived,
      paymentDue,
      storeCredit,
      lastOrders,
      lastReceived,
      lastDue,
    };
  }, [accounts, bills, monthRanges]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = accounts.filter((a) => {
      const active = isActiveAccount(a);
      if (statusTab === 'active' && !active) return false;
      if (statusTab === 'inactive' && active) return false;
      if (!q) return true;
      const c = a.customerId;
      return (
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        (c.address?.toLowerCase().includes(q) ?? false)
      );
    });

    rows = [...rows].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.customerId.name ?? '').localeCompare(b.customerId.name ?? '');
        case 'due-high':
          return (b.dueBalance ?? 0) - (a.dueBalance ?? 0);
        case 'due-low':
          return (a.dueBalance ?? 0) - (b.dueBalance ?? 0);
        case 'newest':
        default:
          return (
            new Date(b.lastActivityAt || b.customerId.createdAt || 0).getTime() -
            new Date(a.lastActivityAt || a.customerId.createdAt || 0).getTime()
          );
      }
    });

    return rows;
  }, [accounts, search, statusTab, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [search, statusTab, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function openEditDialog(account: AccountWithCustomer) {
    const customer = account.customerId;
    setEditCustomerId(customer._id);
    setEditForm({
      name: customer.name,
      phone: customer.phone ?? '',
      address: customer.address ?? '',
    });
    setEditOpen(true);
  }

  async function handleSaveCustomer() {
    if (!editCustomerId) return;
    setSaving(true);
    try {
      await accountsApi.updateCustomer(editCustomerId, editForm);
      toast.success('Profile saved');
      setEditOpen(false);
      setEditCustomerId(null);
      await loadAccounts();
    } catch {
      toast.error('Failed to update customer');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCustomer() {
    if (!addForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setAdding(true);
    try {
      const customer = await accountsApi.createCustomer(addForm);
      toast.success('Customer created');
      setAddOpen(false);
      setAddForm(emptyCustomerForm);
      await loadAccounts();
      navigate(accountDetailPath(customer._id));
    } catch {
      toast.error('Failed to create customer');
    } finally {
      setAdding(false);
    }
  }

  function exportCsv() {
    const header = [
      'Name',
      'Phone',
      'Date',
      'Status',
      'Total Billed',
      'Paid',
      'Due',
      'Credit',
    ];
    const lines = filtered.map((a) => {
      const c = a.customerId;
      const active = isActiveAccount(a) ? 'Active' : 'Inactive';
      return [
        `"${(c.name ?? '').replace(/"/g, '""')}"`,
        c.phone ?? '',
        shortDate(a.lastActivityAt || c.createdAt),
        active,
        String(a.totalBilled ?? 0),
        String(a.totalPaid ?? 0),
        String(a.dueBalance ?? 0),
        String(a.creditBalance ?? 0),
      ].join(',');
    });
    const blob = new Blob([[header.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accounts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported accounts CSV');
  }

  return (
    <div className="min-h-full bg-[var(--brand-space)] px-4 sm:px-6 lg:px-8 py-5 lg:py-6">
      <div className="w-full max-w-[1400px] mx-auto space-y-5 lg:space-y-6">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="w-9 h-9 rounded-xl border border-[#e2e8f0] bg-white text-[#64748b] inline-flex items-center justify-center hover:bg-[#f8fafc] shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2.25} />
          </button>
          <h1 className="text-[24px] sm:text-[28px] lg:text-[32px] font-bold text-[#0f172a] tracking-tight">
            Accounts
          </h1>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          <SummaryCard
            label="Total Orders"
            amount={summary.totalOrders}
            lastMonth={summary.lastOrders}
            icon={Package}
            iconBg="bg-[#dbeafe]"
            iconColor="text-[#2563eb]"
            loading={loading}
          />
          <SummaryCard
            label="Payment Received"
            amount={summary.paymentReceived}
            lastMonth={summary.lastReceived}
            icon={HandCoins}
            iconBg="bg-[#dcfce7]"
            iconColor="text-[#16a34a]"
            loading={loading}
          />
          <SummaryCard
            label="Payment Due"
            amount={summary.paymentDue}
            lastMonth={summary.lastDue}
            icon={ShoppingCart}
            iconBg="bg-[#fee2e2]"
            iconColor="text-[#dc2626]"
            loading={loading}
          />
          <SummaryCard
            label="Store Credit"
            amount={summary.storeCredit}
            lastMonth={0}
            icon={Wallet}
            iconBg="bg-[#e0e7ff]"
            iconColor="text-[#4338ca]"
            loading={loading}
          />
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-4 sm:gap-6 border-b border-[#e2e8f0] overflow-x-auto">
            {([
              ['all', 'All'],
              ['active', 'Active'],
              ['inactive', 'Inactive'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusTab(key)}
                className={cn(
                  'pb-3 text-[14px] font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0',
                  statusTab === key
                    ? 'text-[#2563eb] border-[#2563eb]'
                    : 'text-[#94a3b8] border-transparent hover:text-[#64748b]'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
              <Input
                type="text"
                placeholder="Search by name or phone"
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                className="pl-10 h-11 rounded-full border-[#e2e8f0] bg-[#f8fafc] text-sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Select value={statusTab} onValueChange={(v: string) => setStatusTab(v as StatusTab)}>
                <SelectTrigger className="h-11 rounded-xl border-[#e2e8f0] bg-white w-full sm:w-[120px] text-[#64748b]">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <SelectValue placeholder="Filter" />
                  </div>
                </SelectTrigger>
                <SelectContent className="">
                  <SelectItem className="" value="all">All</SelectItem>
                  <SelectItem className="" value="active">Active</SelectItem>
                  <SelectItem className="" value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v: string) => setSortBy(v as SortKey)}>
                <SelectTrigger className="h-11 rounded-xl border-[#e2e8f0] bg-white w-full sm:w-[130px] text-[#64748b]">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4" />
                    <SelectValue placeholder="Sort by" />
                  </div>
                </SelectTrigger>
                <SelectContent className="">
                  <SelectItem className="" value="newest">Newest</SelectItem>
                  <SelectItem className="" value="name">Name</SelectItem>
                  <SelectItem className="" value="due-high">Due · High</SelectItem>
                  <SelectItem className="" value="due-low">Due · Low</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={() => setAddOpen(true)}
                variant="outline"
                className="h-11 rounded-xl border-[#e2e8f0] bg-white text-[#334155] gap-2 flex-1 sm:flex-none"
              >
                <Plus className="w-4 h-4" /> Add
              </Button>

              <Button
                onClick={exportCsv}
                className={cn('h-11 rounded-xl gap-2 px-5 flex-1 sm:flex-none', btnPrimary)}
              >
                <Download className="w-4 h-4" /> Export
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-[16px] border border-[#e8eef5] shadow-[0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[860px]">
                <TableHeader>
                  <TableRow className="bg-[#f8fafc] hover:bg-[#f8fafc] border-[#f1f5f9]">
                    <TableHead className="pl-6 text-[#64748b] font-semibold text-xs uppercase tracking-wide">
                      Customer
                    </TableHead>
                    <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wide">
                      Date
                    </TableHead>
                    <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wide text-right">
                      Due
                    </TableHead>
                    <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wide text-right">
                      Credit
                    </TableHead>
                    <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wide">
                      Status
                    </TableHead>
                    <TableHead className="pr-6 text-[#64748b] font-semibold text-xs uppercase tracking-wide text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-20 text-center">
                        <Loader2 className="h-7 w-7 animate-spin mx-auto text-[#94a3b8]" />
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16 text-center text-[#64748b]">
                        No customers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paged.map((account) => {
                      const customer = account.customerId;
                      const active = isActiveAccount(account);
                      const due = account.dueBalance ?? 0;
                      const credit = account.creditBalance ?? 0;
                      return (
                        <TableRow
                          key={account._id}
                          className="border-[#f1f5f9] hover:bg-[#f8fafc]/80 cursor-pointer"
                          onClick={() => navigate(accountDetailPath(customer._id))}
                        >
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-3 min-w-0 py-1">
                              <CustomerAvatar name={customer.name} />
                              <div className="min-w-0">
                                <p className="text-[14px] font-semibold text-[#0f172a] truncate">
                                  {customer.name}
                                </p>
                                <p className="text-[12px] text-[#94a3b8] truncate">
                                  {customer.phone || customer.address || 'No contact'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-[14px] text-[#334155] whitespace-nowrap">
                            {shortDate(account.lastActivityAt || customer.createdAt)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-[14px] font-semibold tabular-nums text-right whitespace-nowrap',
                              due > 0.001 ? 'text-[#dc2626]' : 'text-[#0f172a]'
                            )}
                          >
                            ₹{due.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-[14px] font-semibold tabular-nums text-right whitespace-nowrap',
                              credit > 0.001 ? 'text-[#4338ca]' : 'text-[#94a3b8]'
                            )}
                          >
                            ₹{credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                'inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold',
                                active
                                  ? 'bg-[#dcfce7] text-[#15803d]'
                                  : 'bg-[#fee2e2] text-[#dc2626]'
                              )}
                            >
                              {active ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <Button
                              size="sm"
                              className={cn('h-9 rounded-lg gap-1.5 px-3', btnPrimary)}
                              onClick={(e: MouseEvent<HTMLButtonElement>) => {
                                e.stopPropagation();
                                openEditDialog(account);
                              }}
                            >
                              <Pencil className="w-3.5 h-3.5" /> Edit
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

          {!loading && filtered.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-[#f1f5f9] bg-[#fafafa]">
              <p className="text-[13px] text-[#64748b]">
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to{' '}
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}{' '}
                customers
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>New customer</DialogTitle>
            <DialogDescription>Add to your ledger for billing and payments.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {(['name', 'phone', 'address'] as const).map((field) => (
              <div key={field}>
                <Label className="capitalize text-slate-600">
                  {field === 'name' ? 'Full name *' : field}
                </Label>
                <Input
                  type="text"
                  value={addForm[field]}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setAddForm({ ...addForm, [field]: e.target.value })
                  }
                  className={cn(inputClass, 'mt-1.5')}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleAddCustomer}
              disabled={adding}
              className={cn('rounded-xl', btnPrimary)}
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open: boolean) => {
          setEditOpen(open);
          if (!open) setEditCustomerId(null);
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit customer details</DialogTitle>
            <DialogDescription>Update customer profile information.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {(['name', 'phone', 'address'] as const).map((field) => (
              <div key={field}>
                <Label className="text-slate-600 capitalize">
                  {field === 'name' ? 'Full name' : field}
                </Label>
                <Input
                  type="text"
                  value={editForm[field]}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setEditForm({ ...editForm, [field]: e.target.value })
                  }
                  className={cn(inputClass, 'mt-1.5')}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleSaveCustomer}
              disabled={saving}
              className={cn('rounded-xl', btnPrimary)}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save profile'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
