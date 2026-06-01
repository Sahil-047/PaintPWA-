import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Loader2,
  Download,
  Phone,
  MapPin,
  Receipt,
  Users,
  TrendingUp,
  Wallet,
  FileText,
  ChevronRight,
  Save,
  Banknote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
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
import type {
  AccountWithCustomer,
  BillWithPayments,
  CustomerDetail,
} from '@paint-saas/shared-types';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

const emptyCustomerForm = { name: '', phone: '', address: '', gstin: '' };

/** Matches AppShell / Dashboard: primary #2563eb, surfaces white + #f8fafc */
const cardClass = 'bg-white rounded-2xl border border-slate-200/80 shadow-sm';
const btnPrimary =
  'bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-[0_4px_14px_rgba(37,99,235,0.35)] border-0';
const iconWrap = 'p-3 rounded-xl bg-blue-50';
const iconColor = 'text-[#2563eb]';

function CustomerAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const sizes = {
    sm: 'w-10 h-10 text-xs rounded-xl',
    md: 'w-12 h-12 text-sm rounded-xl',
    lg: 'w-14 h-14 text-base rounded-2xl',
  };
  return (
    <div
      className={cn(
        'bg-[#eff6ff] text-[#2563eb] font-semibold border border-[#dbeafe] flex items-center justify-center shrink-0',
        sizes[size]
      )}
    >
      {initials || '?'}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium capitalize bg-slate-100 text-slate-600 border border-slate-200/80">
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          status === 'paid' ? 'bg-[#2563eb]' : 'bg-slate-400'
        )}
      />
      {status}
    </span>
  );
}

function SummaryStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Users;
}) {
  return (
    <div className={cn(cardClass, 'p-5 flex items-center justify-between')}>
      <div>
        <p className="text-sm text-slate-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-slate-900 tabular-nums truncate">{value}</p>
      </div>
      <div className={iconWrap}>
        <Icon className={cn('w-6 h-6', iconColor)} strokeWidth={2} />
      </div>
    </div>
  );
}

function LedgerStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-xl p-4 border',
        highlight
          ? 'bg-[#eff6ff] border-[#bfdbfe]'
          : 'bg-[#f8fafc] border-slate-200/80'
      )}
    >
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p
        className={cn(
          'text-lg font-semibold mt-1 tabular-nums text-slate-900',
          highlight && 'text-[#2563eb]'
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editForm, setEditForm] = useState(emptyCustomerForm);
  const [saving, setSaving] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyCustomerForm);
  const [adding, setAdding] = useState(false);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentBillId, setPaymentBillId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paying, setPaying] = useState(false);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      setAccounts(await accountsApi.list());
    } catch {
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (customerId: string) => {
    setDetailLoading(true);
    try {
      const data = await accountsApi.getCustomer(customerId);
      setDetail(data);
      setEditForm({
        name: data.customer.name,
        phone: data.customer.phone ?? '',
        address: data.customer.address ?? '',
        gstin: data.customer.gstin ?? '',
      });
    } catch {
      toast.error('Failed to load customer details');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((a) => {
      const c = a.customerId;
      return (
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q)
      );
    });
  }, [accounts, search]);

  const summary = useMemo(
    () =>
      accounts.reduce(
        (acc, a) => ({
          customers: acc.customers + 1,
          totalDue: acc.totalDue + a.dueBalance,
          totalBilled: acc.totalBilled + a.totalBilled,
          totalPaid: acc.totalPaid + a.totalPaid,
        }),
        { customers: 0, totalDue: 0, totalBilled: 0, totalPaid: 0 }
      ),
    [accounts]
  );

  const unpaidBills = useMemo(
    () => detail?.bills.filter((b) => b.balanceDue > 0) ?? [],
    [detail]
  );

  const selectedAccount = accounts.find((a) => a.customerId._id === selectedId);

  async function handleSaveCustomer() {
    if (!selectedId) return;
    setSaving(true);
    try {
      await accountsApi.updateCustomer(selectedId, editForm);
      toast.success('Profile saved');
      await Promise.all([loadAccounts(), loadDetail(selectedId)]);
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
      setSelectedId(customer._id);
    } catch {
      toast.error('Failed to create customer');
    } finally {
      setAdding(false);
    }
  }

  function openPaymentDialog(bill?: BillWithPayments) {
    setPaymentBillId(bill?._id ?? '');
    setPaymentAmount(bill ? String(bill.balanceDue) : '');
    setPaymentMode('cash');
    setPaymentOpen(true);
  }

  async function handleRecordPayment() {
    if (!selectedId || !paymentBillId || !paymentAmount) {
      toast.error('Select a bill and enter amount');
      return;
    }
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    const bill = detail?.bills.find((b) => b._id === paymentBillId);
    if (bill && amount > bill.balanceDue) {
      toast.error(`Max due: ${formatCurrency(bill.balanceDue)}`);
      return;
    }
    setPaying(true);
    try {
      const memo = await cashmemoApi.create({
        billId: paymentBillId,
        customerId: selectedId,
        amountPaid: amount,
        paymentMode,
      });
      toast.success(`Payment recorded · ${memo.memoNo}`);
      setPaymentOpen(false);
      await Promise.all([loadAccounts(), loadDetail(selectedId)]);
      await cashmemoApi.openPdf(memo._id);
    } catch {
      toast.error('Failed to record payment');
    } finally {
      setPaying(false);
    }
  }

  const inputClass =
    'h-10 rounded-xl border-[#e2e8f0] bg-white focus-visible:border-[#2563eb] focus-visible:ring-[#2563eb]/20';

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Accounts</h1>
          <p className="text-slate-600 mt-2 text-sm lg:text-base max-w-xl">
            Manage customers, track dues, record payments, and print cash memos.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className={cn('gap-2 h-10 shrink-0 rounded-xl', btnPrimary)}>
          <Plus className="h-4 w-4" />
          Add customer
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <SummaryStat
          label="Customers"
          value={loading ? '…' : String(summary.customers)}
          icon={Users}
        />
        <SummaryStat
          label="Total billed"
          value={loading ? '…' : formatCurrency(summary.totalBilled)}
          icon={FileText}
        />
        <SummaryStat
          label="Collected"
          value={loading ? '…' : formatCurrency(summary.totalPaid)}
          icon={TrendingUp}
        />
        <SummaryStat
          label="Outstanding"
          value={loading ? '…' : formatCurrency(summary.totalDue)}
          icon={Wallet}
        />
      </div>

      <div>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-[620px]">
          {/* Sidebar */}
          <div className="xl:col-span-4 flex flex-col">
            <Card className={cn('flex-1 flex flex-col overflow-hidden py-0 gap-0', cardClass)}>
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search customers…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-11 rounded-xl border-slate-200 bg-white shadow-sm"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-3 px-1">
                  {filtered.length} customer{filtered.length !== 1 ? 's' : ''}
                </p>
              </div>

              <CardContent className="flex-1 overflow-y-auto p-2 px-3 pb-3">
                {loading ? (
                  <div className="flex justify-center py-24">
                    <Loader2 className="h-7 w-7 animate-spin text-[#2563eb]" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <Users className="h-7 w-7 text-slate-300" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">No customers</p>
                    <p className="text-xs text-slate-400 mt-1">Try a different search or add one.</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {filtered.map((account) => {
                      const customer = account.customerId;
                      const id = customer._id;
                      const active = selectedId === id;
                      const hasDue = account.dueBalance > 0;
                      return (
                        <li key={account._id}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(id)}
                            className={cn(
                              'w-full text-left p-3.5 rounded-xl flex items-center gap-3 transition-all duration-200 group',
                              active
                                ? 'bg-[#eff6ff] ring-1 ring-[#2563eb]/40 border border-[#bfdbfe]'
                                : 'hover:bg-[#f8fafc] border border-transparent hover:border-slate-200/80'
                            )}
                          >
                            <CustomerAvatar name={customer.name} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {customer.name}
                              </p>
                              <p className="text-xs text-slate-500 truncate mt-0.5">
                                {customer.phone || 'No phone'}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {hasDue ? (
                                <span className="text-xs font-semibold text-slate-800 tabular-nums">
                                  {formatCurrency(account.dueBalance)}
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-[#2563eb] bg-[#eff6ff] px-2 py-0.5 rounded-md border border-[#dbeafe]">
                                  Settled
                                </span>
                              )}
                              <ChevronRight
                                className={cn(
                                  'h-4 w-4 text-slate-300 transition-transform',
                                  active && 'text-[#2563eb] translate-x-0.5',
                                  !active && 'opacity-0 group-hover:opacity-100'
                                )}
                              />
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detail */}
          <div className="xl:col-span-8 flex flex-col min-h-[520px]">
            {!selectedId ? (
              <Card
                className={cn(
                  'flex-1 flex flex-col items-center justify-center border-dashed border-2 border-slate-200 py-0',
                  cardClass
                )}
              >
                <CardContent className="flex flex-col items-center text-center py-16">
                  <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center mb-6', iconWrap)}>
                    <Wallet className={cn('h-8 w-8', iconColor)} strokeWidth={1.75} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Pick a customer</h3>
                  <p className="text-sm text-slate-500 mt-2 max-w-sm">
                    Select someone from the list to view their profile, bills, payment history, and
                    record new payments.
                  </p>
                </CardContent>
              </Card>
            ) : detailLoading ? (
              <Card className={cn('flex-1 flex items-center justify-center py-0', cardClass)}>
                <Loader2 className="h-8 w-8 animate-spin text-[#2563eb]" />
              </Card>
            ) : detail ? (
              <div className="flex flex-col gap-5 flex-1 min-h-0">
                {/* Customer header card */}
                <Card className={cn('overflow-hidden py-0 gap-0', cardClass)}>
                  <div className="relative px-6 pt-6 pb-5 bg-[#f8fafc] border-b border-slate-200/80">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <CustomerAvatar name={detail.customer.name} size="lg" />
                        <div className="min-w-0">
                          <h2 className="text-2xl font-semibold text-slate-900 truncate">
                            {detail.customer.name}
                          </h2>
                          <p className="text-sm text-slate-500 mt-1">
                            Member since {formatDate(detail.customer.createdAt)}
                          </p>
                          <div className="flex flex-wrap gap-3 mt-2">
                            {editForm.phone && (
                              <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200/80">
                                <Phone className="h-3.5 w-3.5 text-slate-400" />
                                {editForm.phone}
                              </span>
                            )}
                            {editForm.address && (
                              <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200/80 max-w-xs truncate">
                                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                {editForm.address}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSaveCustomer}
                          disabled={saving}
                          className="h-10 rounded-xl gap-2 border-slate-200 bg-white shadow-sm"
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Save profile
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openPaymentDialog()}
                          disabled={unpaidBills.length === 0}
                          className={cn('h-10 rounded-xl gap-2', btnPrimary)}
                        >
                          <Banknote className="h-4 w-4" />
                          Record payment
                        </Button>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <LedgerStat
                        label="Total billed"
                        value={formatCurrency(detail.account?.totalBilled ?? 0)}
                      />
                      <LedgerStat
                        label="Total paid"
                        value={formatCurrency(detail.account?.totalPaid ?? 0)}
                      />
                      <LedgerStat
                        label="Balance due"
                        value={formatCurrency(detail.account?.dueBalance ?? 0)}
                        highlight={(detail.account?.dueBalance ?? 0) > 0}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Profile + activity */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 flex-1 min-h-0">
                  <Card className={cn('lg:col-span-2 py-0 gap-0 h-fit lg:sticky lg:top-6', cardClass)}>
                    <div className="px-5 py-4 border-b border-slate-100">
                      <h3 className="text-sm font-semibold text-slate-900">Contact details</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Editable customer profile</p>
                    </div>
                    <CardContent className="p-5 space-y-4">
                      <div>
                        <Label className="text-xs text-slate-500">Full name</Label>
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className={cn(inputClass, 'mt-1.5')}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Phone</Label>
                        <Input
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className={cn(inputClass, 'mt-1.5')}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">Address</Label>
                        <Input
                          value={editForm.address}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          className={cn(inputClass, 'mt-1.5')}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">GSTIN</Label>
                        <Input
                          value={editForm.gstin}
                          onChange={(e) => setEditForm({ ...editForm, gstin: e.target.value })}
                          className={cn(inputClass, 'mt-1.5')}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={cn('lg:col-span-3 py-0 gap-0 flex flex-col min-h-[360px]', cardClass)}>
                    <Tabs defaultValue="bills" className="flex flex-col flex-1 min-h-0">
                      <div className="px-5 pt-4 pb-0 flex items-center justify-between border-b border-slate-100">
                        <TabsList className="bg-slate-100/80 p-1 rounded-xl h-10">
                          <TabsTrigger
                            value="bills"
                            className="rounded-lg px-4 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
                          >
                            <Receipt className="h-3.5 w-3.5 mr-1.5 inline" />
                            Bills ({detail.bills.length})
                          </TabsTrigger>
                          <TabsTrigger
                            value="payments"
                            className="rounded-lg px-4 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
                          >
                            <Wallet className="h-3.5 w-3.5 mr-1.5 inline" />
                            Payments ({detail.memos.length})
                          </TabsTrigger>
                        </TabsList>
                        {selectedAccount && selectedAccount.dueBalance > 0 && (
                          <span className="hidden sm:inline text-xs text-slate-500">
                            {formatCurrency(selectedAccount.dueBalance)} outstanding
                          </span>
                        )}
                      </div>

                      <TabsContent
                        value="bills"
                        className="flex-1 overflow-auto p-4 m-0 data-[state=inactive]:hidden"
                      >
                        {detail.bills.length === 0 ? (
                          <div className="py-14 text-center">
                            <Receipt className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm text-slate-500">No bills yet</p>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-slate-100 overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                                  <TableHead className="text-xs font-semibold text-slate-600">
                                    Bill
                                  </TableHead>
                                  <TableHead className="text-xs font-semibold text-slate-600">
                                    Date
                                  </TableHead>
                                  <TableHead className="text-xs font-semibold text-slate-600 text-right">
                                    Total
                                  </TableHead>
                                  <TableHead className="text-xs font-semibold text-slate-600 text-right">
                                    Due
                                  </TableHead>
                                  <TableHead className="text-xs font-semibold text-slate-600">
                                    Status
                                  </TableHead>
                                  <TableHead className="w-20" />
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {detail.bills.map((bill) => (
                                  <TableRow
                                    key={bill._id}
                                    className="hover:bg-[#f8fafc] transition-colors"
                                  >
                                    <TableCell className="font-medium text-slate-900">
                                      {bill.billNo}
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-sm">
                                      {formatDate(bill.createdAt)}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums text-sm">
                                      {formatCurrency(bill.grandTotal)}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums text-sm font-medium">
                                      {formatCurrency(bill.balanceDue)}
                                    </TableCell>
                                    <TableCell>
                                      <StatusBadge status={bill.status} />
                                    </TableCell>
                                    <TableCell>
                                      {bill.balanceDue > 0 && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => openPaymentDialog(bill)}
                                          className="h-8 rounded-lg text-xs border-[#bfdbfe] text-[#2563eb] hover:bg-[#eff6ff]"
                                        >
                                          Pay
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent
                        value="payments"
                        className="flex-1 overflow-auto p-4 m-0 data-[state=inactive]:hidden"
                      >
                        {detail.memos.length === 0 ? (
                          <div className="py-14 text-center">
                            <Banknote className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm text-slate-500">No payments yet</p>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-slate-100 overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                                  <TableHead className="text-xs font-semibold text-slate-600">
                                    Memo
                                  </TableHead>
                                  <TableHead className="text-xs font-semibold text-slate-600">
                                    Bill
                                  </TableHead>
                                  <TableHead className="text-xs font-semibold text-slate-600">
                                    Date
                                  </TableHead>
                                  <TableHead className="text-xs font-semibold text-slate-600 text-right">
                                    Amount
                                  </TableHead>
                                  <TableHead className="w-28" />
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {detail.memos.map((memo) => {
                                  const bill =
                                    typeof memo.billId === 'object' && memo.billId
                                      ? memo.billId
                                      : null;
                                  return (
                                    <TableRow
                                      key={memo._id}
                                      className="hover:bg-[#f8fafc] transition-colors"
                                    >
                                      <TableCell className="font-medium text-slate-900">
                                        {memo.memoNo}
                                      </TableCell>
                                      <TableCell className="text-slate-500 text-sm">
                                        {bill?.billNo ?? '—'}
                                      </TableCell>
                                      <TableCell className="text-slate-500 text-sm">
                                        {formatDate(memo.paidAt)}
                                      </TableCell>
                                      <TableCell className="text-right tabular-nums font-medium text-slate-900">
                                        {formatCurrency(memo.amountPaid)}
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-8 rounded-lg text-xs gap-1.5"
                                          onClick={() => cashmemoApi.openPdf(memo._id)}
                                        >
                                          <Download className="h-3.5 w-3.5" />
                                          Memo
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </Card>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>New customer</DialogTitle>
            <DialogDescription>Add to your ledger for billing and payments.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {(['name', 'phone', 'address', 'gstin'] as const).map((field) => (
              <div key={field}>
                <Label className="capitalize text-slate-600">
                  {field === 'name' ? 'Full name *' : field}
                </Label>
                <Input
                  value={addForm[field]}
                  onChange={(e) => setAddForm({ ...addForm, [field]: e.target.value })}
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

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>Cash memo receipt opens after saving.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label className="text-slate-600">Bill</Label>
              <Select value={paymentBillId} onValueChange={setPaymentBillId}>
                <SelectTrigger className={cn(inputClass, 'mt-1.5 w-full')}>
                  <SelectValue placeholder="Select bill" />
                </SelectTrigger>
                <SelectContent>
                  {unpaidBills.map((bill) => (
                    <SelectItem key={bill._id} value={bill._id}>
                      {bill.billNo} — {formatCurrency(bill.balanceDue)} due
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-600">Amount</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className={cn(inputClass, 'mt-1.5')}
              />
            </div>
            <div>
              <Label className="text-slate-600">Payment mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger className={cn(inputClass, 'mt-1.5 w-full')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank">Bank transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={paying}
              className={cn('rounded-xl gap-2', btnPrimary)}
            >
              {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save & print memo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
