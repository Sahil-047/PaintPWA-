import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  HandCoins,
  Loader2,
  Paintbrush,
  Pencil,
  Plus,
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
import { paintersApi } from '@/api';
import type { PainterDetail } from '@paint-saas/shared-types';
import { ROUTES } from '@/config/config';
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

export default function PainterDetailsPage() {
  const { painterId } = useParams<{ painterId: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<PainterDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
  });
  const [paying, setPaying] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!painterId) return;
    setLoading(true);
    try {
      const data = await paintersApi.get(painterId);
      setDetail(data);
    } catch {
      toast.error('Failed to load painter');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [painterId]);

  useEffect(() => {
    let cancelled = false;
    if (!painterId) return;
    (async () => {
      setLoading(true);
      try {
        const data = await paintersApi.get(painterId);
        if (!cancelled) setDetail(data);
      } catch {
        if (!cancelled) {
          toast.error('Failed to load painter');
          setDetail(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [painterId]);

  function openEdit() {
    if (!detail) return;
    setEditForm({
      name: detail.painter.name,
      phone: detail.painter.phone ?? '',
      notes: detail.painter.notes ?? '',
    });
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!painterId || !editForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      await paintersApi.update(painterId, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        notes: editForm.notes.trim(),
      });
      toast.success('Painter updated');
      setEditOpen(false);
      await load();
    } catch {
      toast.error('Failed to update painter');
    } finally {
      setSaving(false);
    }
  }

  async function handleRecordPayment() {
    if (!painterId) return;
    const amount = Number(payForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setPaying(true);
    try {
      await paintersApi.recordPayment(painterId, {
        amount,
        description: payForm.description.trim() || undefined,
        date: payForm.date || undefined,
      });
      toast.success('Payment recorded as expense');
      setPayOpen(false);
      setPayForm({
        amount: '',
        description: '',
        date: new Date().toISOString().slice(0, 10),
      });
      await load();
    } catch {
      toast.error('Failed to record payment');
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-full p-8 flex items-center justify-center text-[#94a3b8]">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading painter…
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-full p-8 space-y-4">
        <Button
          variant="outline"
          className="rounded-xl gap-2"
          onClick={() => navigate(ROUTES.PAINTERS)}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <p className="text-[#64748b]">Painter not found.</p>
      </div>
    );
  }

  const { painter, payments, totalPaid } = detail;
  const totalMoney = formatMoneyParts(totalPaid);

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl shrink-0"
            onClick={() => navigate(ROUTES.PAINTERS)}
            aria-label="Back to painters"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-[28px] font-bold text-[#0f172a] tracking-tight truncate">
                {painter.name}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#eff6ff] text-[#2563eb] text-xs font-medium">
                <Paintbrush className="w-3 h-3" />
                Painter
              </span>
            </div>
            <p className="mt-1 text-sm text-[#64748b]">
              {painter.phone || 'No phone'}
              {painter.notes ? ` · ${painter.notes}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl gap-2 h-10" onClick={openEdit}>
            <Pencil className="w-4 h-4" />
            Edit
          </Button>
          <Button
            className={cn('rounded-xl gap-2 h-10', btnPrimary)}
            onClick={() => setPayOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Record payment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <article className="bg-white rounded-[16px] border border-[#e8eef5] shadow-[0_4px_16px_rgba(15,23,42,0.04)] p-5">
          <div className="flex items-start justify-between">
            <p className="text-[15px] font-medium text-[#64748b]">Total paid</p>
            <div className="w-10 h-10 rounded-xl bg-[#ecfdf5] flex items-center justify-center">
              <HandCoins className="w-5 h-5 text-[#059669]" />
            </div>
          </div>
          <p className="mt-4 text-[28px] font-bold text-[#0f172a] tracking-tight leading-none">
            {totalMoney.whole}
            <span className="text-[18px] font-semibold text-[#94a3b8]">{totalMoney.dec}</span>
          </p>
          <p className="mt-4 text-[12px] text-[#94a3b8]">Recorded as Painter expenses</p>
        </article>
        <article className="bg-white rounded-[16px] border border-[#e8eef5] shadow-[0_4px_16px_rgba(15,23,42,0.04)] p-5">
          <div className="flex items-start justify-between">
            <p className="text-[15px] font-medium text-[#64748b]">Payments</p>
            <div className="w-10 h-10 rounded-xl bg-[#eff6ff] flex items-center justify-center">
              <Paintbrush className="w-5 h-5 text-[#2563eb]" />
            </div>
          </div>
          <p className="mt-4 text-[28px] font-bold text-[#0f172a] tracking-tight leading-none">
            {payments.length}
          </p>
          <p className="mt-4 text-[12px] text-[#94a3b8]">All-time payment entries</p>
        </article>
      </div>

      <div className="bg-white rounded-[16px] border border-[#e8eef5] shadow-[0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#eef2f7]">
          <h2 className="text-base font-semibold text-[#0f172a]">Payment history</h2>
          <p className="text-sm text-[#64748b]">
            Payments you add here are linked to this painter and counted in Expenses.
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-28 text-center text-[#94a3b8]">
                    No payments yet. Record the first labour payment.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => {
                  const money = formatMoneyParts(payment.amount ?? 0);
                  return (
                    <TableRow key={payment._id}>
                      <TableCell className="text-[#475569]">{shortDate(payment.date)}</TableCell>
                      <TableCell className="text-[#64748b]">
                        {payment.description || 'Payment'}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-[#0f172a]">
                        {money.whole}
                        <span className="text-[#94a3b8] font-medium">{money.dec}</span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              This creates an expense (category Painter) linked to {painter.name}.
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
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setPayForm((f) => ({ ...f, amount: e.target.value }))
                }
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
              <Label htmlFor="pay-desc">Note</Label>
              <Input
                id="pay-desc"
                className={inputClass}
                value={payForm.description}
                onChange={(e) => setPayForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={`Payment to ${painter.name}`}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button className={cn('rounded-xl', btnPrimary)} disabled={paying} onClick={handleRecordPayment}>
              {paying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit painter</DialogTitle>
            <DialogDescription>Update painter details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                className={inputClass}
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                className={inputClass}
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Input
                id="edit-notes"
                className={inputClass}
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button className={cn('rounded-xl', btnPrimary)} disabled={saving} onClick={handleSaveEdit}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
