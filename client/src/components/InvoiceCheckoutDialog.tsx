import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { accountsApi } from '@/api';
import type { Customer } from '@paint-saas/shared-types';
import { cn, formatCurrency } from '@/lib/utils';
import { FileText, Loader2, Printer, Search, UserPlus, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

export interface InvoiceCartLine {
  cartItemId: string;
  productId: string;
  name: string;
  brand: string;
  variant: string;
  base?: string;
  packSize: string;
  price: number;
  quantity: number;
}

interface InvoiceCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: InvoiceCartLine[];
  subtotal: number;
  discount: number;
  discountEnabled: boolean;
  onDiscountChange: (enabled: boolean) => void;
  onDiscountAmountChange: (amount: string) => void;
  discountAmount: string;
  onSubmit: (payload: {
    customer: { name: string; phone?: string; address?: string; gstin?: string };
    amountPaid: number;
    paymentMode: string;
  }) => Promise<void>;
  submitting?: boolean;
}

function formatPreviewDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function InvoiceCheckoutDialog({
  open,
  onOpenChange,
  cart,
  subtotal,
  discount,
  discountEnabled,
  onDiscountChange,
  onDiscountAmountChange,
  discountAmount,
  onSubmit,
  submitting = false,
}: InvoiceCheckoutDialogProps) {
  const { tenant, user } = useAuthStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [issuedDate, setIssuedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [invoiceNo] = useState(() => `INV-${Date.now().toString().slice(-6)}`);

  useEffect(() => {
    if (!open) return;
    setLoadingCustomers(true);
    accountsApi
      .customers()
      .then((list) => {
        setCustomers(list);
        if (list.length === 1) selectCustomer(list[0]);
      })
      .catch(() => setCustomers([]))
      .finally(() => setLoadingCustomers(false));
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSelectedCustomerId(null);
      setCustomerName('');
      setAddress('');
      setPhone('');
      setGstin('');
      setAmountPaid('');
      setCustomerSearch('');
      setIssuedDate(new Date().toISOString().slice(0, 10));
      setDueDate('');
      setPaymentMode('cash');
    }
  }, [open]);

  const grandTotal = Math.max(0, subtotal - discount);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  const billedBy = {
    name: tenant?.name ?? 'Paint ERP',
    email: user?.email ?? '',
  };

  function selectCustomer(c: Customer) {
    setSelectedCustomerId(c._id);
    setCustomerName(c.name);
    setPhone(c.phone ?? '');
    setAddress(c.address ?? '');
    setGstin(c.gstin ?? '');
  }

  function clearCustomer() {
    setSelectedCustomerId(null);
    setCustomerName('');
    setPhone('');
    setAddress('');
    setGstin('');
  }

  async function handleGenerate() {
    const name = customerName.trim();
    if (!name) return;
    await onSubmit({
      customer: {
        name,
        phone: phone || undefined,
        address: address || undefined,
        gstin: gstin || undefined,
      },
      amountPaid: parseFloat(amountPaid) || 0,
      paymentMode,
    });
  }

  function handlePrint() {
    const el = document.getElementById('invoice-preview-print');
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(
      `<html><head><title>${invoiceNo}</title><style>body{font-family:system-ui,sans-serif;padding:24px}</style></head><body>${el.innerHTML}</body></html>`
    );
    w.document.close();
    w.print();
  }

  const inputClass =
    'h-10 rounded-lg border-[#e2e8f0] bg-white text-sm focus-visible:border-[#2563eb] focus-visible:ring-[#2563eb]/20';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'fixed top-[50%] left-[50%] z-50 translate-x-[-50%] translate-y-[-50%]',
          'w-[min(1200px,calc(100vw-24px))] max-w-[min(1200px,calc(100vw-24px))] sm:max-w-[min(1200px,calc(100vw-24px))]',
          'h-[min(88vh,800px)] p-0 gap-0 overflow-hidden rounded-2xl border border-[#e2e8f0] shadow-2xl'
        )}
      >
        <div className="flex h-full min-h-0 flex-col lg:flex-row">
          {/* ——— Form (left) ——— */}
          <div className="flex w-full lg:w-[48%] min-h-0 flex-col border-b lg:border-b-0 lg:border-r border-[#e2e8f0] bg-white">
            <div className="flex shrink-0 items-center justify-between border-b border-[#f1f5f9] px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-[#0f172a]">Invoice details</h2>
                <p className="text-xs text-[#64748b]">Customer & payment info</p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg p-2 text-[#94a3b8] hover:bg-[#f1f5f9]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Existing customers — visible list */}
              <div>
                <Label className="text-sm font-medium text-[#334155]">Choose customer</Label>
                <div className="relative mt-1.5">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                  <Input
                    placeholder="Search saved customers…"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className={cn(inputClass, 'pl-9')}
                  />
                </div>

                <div className="mt-2 max-h-[140px] overflow-y-auto rounded-lg border border-[#e2e8f0] bg-[#f8fafc]">
                  {loadingCustomers ? (
                    <p className="px-3 py-4 text-center text-xs text-[#94a3b8]">Loading…</p>
                  ) : filteredCustomers.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-[#94a3b8]">
                      {customers.length === 0 ? 'No saved customers yet' : 'No matches'}
                    </p>
                  ) : (
                    <ul className="p-1">
                      {filteredCustomers.map((c) => (
                        <li key={c._id}>
                          <button
                            type="button"
                            onClick={() => selectCustomer(c)}
                            className={cn(
                              'w-full rounded-md px-3 py-2.5 text-left text-sm transition-colors',
                              selectedCustomerId === c._id
                                ? 'bg-[#2563eb] text-white'
                                : 'text-[#0f172a] hover:bg-white'
                            )}
                          >
                            <span className="font-medium">{c.name}</span>
                            {c.phone && (
                              <span
                                className={cn(
                                  'ml-2 text-xs',
                                  selectedCustomerId === c._id ? 'text-blue-100' : 'text-[#64748b]'
                                )}
                              >
                                {c.phone}
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button
                  type="button"
                  onClick={clearCustomer}
                  className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#2563eb] hover:underline"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Enter as new customer
                </button>
              </div>

              <div>
                <Label className="text-sm text-[#334155]">Customer name *</Label>
                <Input
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setSelectedCustomerId(null);
                  }}
                  placeholder="Full name"
                  className={cn(inputClass, 'mt-1.5')}
                />
              </div>

              <div>
                <Label className="text-sm text-[#334155]">Address</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, city, PIN"
                  className={cn(inputClass, 'mt-1.5')}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm text-[#334155]">Phone</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={cn(inputClass, 'mt-1.5')}
                  />
                </div>
                <div>
                  <Label className="text-sm text-[#334155]">GSTIN</Label>
                  <Input
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    className={cn(inputClass, 'mt-1.5')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm text-[#334155]">Issued date</Label>
                  <Input
                    type="date"
                    value={issuedDate}
                    onChange={(e) => setIssuedDate(e.target.value)}
                    className={cn(inputClass, 'mt-1.5')}
                  />
                </div>
                <div>
                  <Label className="text-sm text-[#334155]">Due date</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={cn(inputClass, 'mt-1.5')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm text-[#334155]">Payment</Label>
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
                <div>
                  <Label className="text-sm text-[#334155]">Amount paid (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0 = due"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className={cn(inputClass, 'mt-1.5')}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-[#64748b]">
                <input
                  type="checkbox"
                  checked={discountEnabled}
                  onChange={(e) => onDiscountChange(e.target.checked)}
                  className="accent-[#2563eb]"
                />
                Discount (₹)
              </label>
              {discountEnabled && (
                <Input
                  type="number"
                  min={0}
                  value={discountAmount}
                  onChange={(e) => onDiscountAmountChange(e.target.value)}
                  className={inputClass}
                />
              )}
            </div>

            <div className="flex shrink-0 gap-3 border-t border-[#f1f5f9] bg-[#fafafa] px-5 py-4">
              <Button
                variant="outline"
                className="h-11 flex-1 rounded-xl"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                className="h-11 flex-1 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white gap-2 disabled:opacity-50"
                disabled={!customerName.trim() || submitting}
                onClick={handleGenerate}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Generate invoice
              </Button>
            </div>
          </div>

          {/* ——— Preview (right) ——— */}
          <div className="flex w-full lg:w-[52%] min-h-[320px] lg:min-h-0 flex-col bg-[#f1f5f9]">
            <div className="flex shrink-0 justify-end border-b border-[#e2e8f0] px-4 py-2.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg bg-white text-xs"
                onClick={handlePrint}
              >
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                Print
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
              <div
                id="invoice-preview-print"
                className="mx-auto w-full max-w-[480px] rounded-xl border border-[#e2e8f0] bg-white p-6 sm:p-8 text-[#0f172a] shadow-sm"
              >
                <div className="mb-6 flex items-start justify-between gap-4">
                  <h3 className="text-2xl font-bold sm:text-3xl">Invoice</h3>
                  <div className="text-right text-xs sm:text-sm">
                    <p className="text-[#94a3b8]">No.</p>
                    <p className="font-semibold">{invoiceNo}</p>
                  </div>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                      Billed by
                    </p>
                    <p className="font-semibold">{billedBy.name}</p>
                    {billedBy.email && (
                      <p className="mt-0.5 text-xs text-[#64748b]">{billedBy.email}</p>
                    )}
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                      Billed to
                    </p>
                    <p className="font-semibold">{customerName.trim() || '—'}</p>
                    {phone && <p className="mt-0.5 text-xs text-[#64748b]">{phone}</p>}
                    {address && (
                      <p className="mt-0.5 text-xs leading-snug text-[#64748b]">{address}</p>
                    )}
                  </div>
                </div>

                <div className="mb-5 flex flex-wrap gap-4 border-b border-[#f1f5f9] pb-4 text-xs">
                  <div>
                    <span className="text-[#94a3b8]">Issued </span>
                    <span className="font-medium">
                      {issuedDate ? formatPreviewDate(new Date(issuedDate)) : '—'}
                    </span>
                  </div>
                  {dueDate && (
                    <div>
                      <span className="text-[#94a3b8]">Due </span>
                      <span className="font-medium">{formatPreviewDate(new Date(dueDate))}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-[#94a3b8]">Payment </span>
                    <span className="font-medium capitalize">{paymentMode}</span>
                  </div>
                </div>

                <table className="mb-5 w-full table-fixed text-sm">
                  <colgroup>
                    <col />
                    <col className="w-10" />
                    <col className="w-12" />
                    <col className="w-[72px]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-[#e2e8f0] text-[10px] uppercase text-[#94a3b8]">
                      <th className="pb-2 text-left font-medium">Description</th>
                      <th className="pb-2 text-center font-medium">Qty</th>
                      <th className="pb-2 text-center font-medium">Unit</th>
                      <th className="pb-2 text-right font-medium">Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item) => (
                      <tr key={item.cartItemId} className="border-b border-[#f8fafc]">
                        <td className="py-2.5 pr-2 align-top">
                          <p className="font-medium leading-snug">{item.name}</p>
                          {item.brand && (
                            <p className="text-[10px] text-[#94a3b8]">{item.brand}</p>
                          )}
                        </td>
                        <td className="py-2.5 text-center align-top">{item.quantity}</td>
                        <td className="py-2.5 text-center align-top text-xs text-[#64748b]">
                          {item.packSize || '—'}
                        </td>
                        <td className="py-2.5 text-right align-top tabular-nums font-medium">
                          {formatCurrency(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="ml-auto max-w-[200px] space-y-1.5 text-sm">
                  <div className="flex justify-between text-[#64748b]">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {discountEnabled && discount > 0 && (
                    <div className="flex justify-between text-[#64748b]">
                      <span>Discount</span>
                      <span>− {formatCurrency(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-[#e2e8f0] pt-2 text-base font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(grandTotal)}</span>
                  </div>
                </div>

                <p className="mt-8 text-center text-[10px] text-[#94a3b8]">
                  Thank you for your business.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
