import { useEffect, useState } from 'react';
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
import {
  Calendar,
  FileText,
  Loader2,
  Package,
  Printer,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

export interface InvoiceCartLine {
  cartItemId: string;
  productId: string;
  name: string;
  brand: string;
  variant: string;
  base?: string;
  packSize: string;
  productImage?: string;
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
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function DateField({
  label,
  value,
  onChange,
  inputClass,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputClass: string;
}) {
  return (
    <div>
      <Label className="text-[13px] font-medium text-[#334155]">{label}</Label>
      <div className="relative mt-1.5">
        <Input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputClass, 'pr-10')}
        />
        <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
      </div>
    </div>
  );
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
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('new');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [issuedDate, setIssuedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [paymentMode, setPaymentMode] = useState('upi');
  const [invoiceNo] = useState(() => `INV-${Date.now().toString().slice(-4)}`);

  useEffect(() => {
    if (!open) return;
    accountsApi
      .customers()
      .then(setCustomers)
      .catch(() => setCustomers([]));
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSelectedCustomerId('new');
      setFirstName('');
      setLastName('');
      setAddress('');
      setPhone('');
      setGstin('');
      setIssuedDate(new Date().toISOString().slice(0, 10));
      setDueDate('');
      setPaymentMode('upi');
    }
  }, [open]);

  const gst = subtotal * 0.18;
  const grandTotal = Math.max(0, subtotal + gst - discount);
  const fullName = `${firstName} ${lastName}`.trim();

  const billedBy = {
    name: tenant?.name ?? 'Paint ERP',
    email: user?.email ?? '',
  };

  function applyCustomer(c: Customer) {
    setSelectedCustomerId(c._id);
    const parts = c.name.trim().split(/\s+/);
    setFirstName(parts[0] ?? '');
    setLastName(parts.slice(1).join(' '));
    setPhone(c.phone ?? '');
    setAddress(c.address ?? '');
    setGstin(c.gstin ?? '');
  }

  function handleCustomerSelect(value: string) {
    if (value === 'new') {
      setSelectedCustomerId('new');
      setFirstName('');
      setLastName('');
      setAddress('');
      setPhone('');
      setGstin('');
      return;
    }
    const customer = customers.find((c) => c._id === value);
    if (customer) applyCustomer(customer);
  }

  async function handleGenerate() {
    if (!fullName) {
      toast.error('Enter customer name');
      return;
    }
    await onSubmit({
      customer: {
        name: fullName,
        phone: phone || undefined,
        address: address || undefined,
        gstin: gstin || undefined,
      },
      amountPaid: grandTotal,
      paymentMode,
    });
  }

  function handlePrint() {
    const el = document.getElementById('invoice-preview-print');
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${invoiceNo}</title>
  <style>
    @page {
      size: 3.9in 8.3in;
      margin: 0.28in 0.24in;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #0f172a;
      font-family: 'Work Sans', ui-sans-serif, system-ui, -apple-system, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .invoice-dl {
      width: 100%;
      max-width: 3.42in;
      margin: 0 auto;
      font-size: 10px;
      line-height: 1.35;
    }
    .invoice-dl * { color: inherit; }
  </style>
</head>
<body>${el.outerHTML}</body>
</html>`);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
    }, 250);
  }

  const inputClass =
    'h-10 rounded-lg border-[#e2e8f0] bg-white text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus-visible:border-[#2563eb] focus-visible:ring-[#2563eb]/20';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'fixed top-[50%] left-[50%] z-50 translate-x-[-50%] translate-y-[-50%]',
          'flex flex-col gap-0 p-0 overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-2xl',
          'w-[min(1080px,calc(100vw-16px))] max-w-[min(1080px,calc(100vw-16px))] sm:max-w-[min(1080px,calc(100vw-24px))]',
          'h-[min(780px,calc(100vh-16px))] sm:h-[min(780px,calc(100vh-24px))]'
        )}
      >
        <div className="flex h-full min-h-0 flex-col lg:flex-row">
          {/* ——— Form (left) ——— */}
          <div className="flex w-full lg:w-[480px] lg:shrink-0 lg:max-w-[480px] min-h-0 flex-col border-b lg:border-b-0 lg:border-r border-[#e2e8f0] bg-white max-h-[55%] lg:max-h-none">
            <div className="flex shrink-0 items-start justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
              <div>
                <h2 className="text-[18px] sm:text-[22px] font-bold tracking-tight text-[#0f172a]">
                  Invoice Details
                </h2>
                <p className="mt-0.5 text-[13px] text-[#64748b]">Enter invoice details</p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg p-2 text-[#94a3b8] hover:bg-[#f1f5f9]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6 pb-4 space-y-4">
              <div>
                <Label className="text-[13px] font-medium text-[#334155]">Existing Customer</Label>
                <Select value={selectedCustomerId} onValueChange={handleCustomerSelect}>
                  <SelectTrigger className={cn(inputClass, 'mt-1.5 w-full')}>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New customer</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                        {c.phone ? ` · ${c.phone}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[13px] font-medium text-[#334155]">First Name</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      setSelectedCustomerId('new');
                    }}
                    placeholder="Ex. Sayandeep"
                    className={cn(inputClass, 'mt-1.5')}
                  />
                </div>
                <div>
                  <Label className="text-[13px] font-medium text-[#334155]">Last Name</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      setSelectedCustomerId('new');
                    }}
                    placeholder="Ex. Ghosh"
                    className={cn(inputClass, 'mt-1.5')}
                  />
                </div>
              </div>

              <div>
                <Label className="text-[13px] font-medium text-[#334155]">Address</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex. 123 Budge Budge Trunk Road, Kolkata, West Bengal"
                  className={cn(inputClass, 'mt-1.5')}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[13px] font-medium text-[#334155]">Invoice Number</Label>
                  <Input value={invoiceNo} readOnly className={cn(inputClass, 'mt-1.5 bg-[#f8fafc]')} />
                </div>
                <div>
                  <Label className="text-[13px] font-medium text-[#334155]">Currency</Label>
                  <div
                    className={cn(
                      inputClass,
                      'mt-1.5 flex items-center gap-2 px-3 text-[#0f172a]'
                    )}
                  >
                    <span className="text-base leading-none" aria-hidden>
                      🇮🇳
                    </span>
                    <span className="truncate text-sm">INR Indian Rupees</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <DateField
                  label="Issued Date"
                  value={issuedDate}
                  onChange={setIssuedDate}
                  inputClass={inputClass}
                />
                <DateField
                  label="Due Date"
                  value={dueDate}
                  onChange={setDueDate}
                  inputClass={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[13px] font-medium text-[#334155]">Payment Method</Label>
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger className={cn(inputClass, 'mt-1.5 w-full')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="bank">Bank transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[13px] font-medium text-[#334155]">Phone</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Optional"
                    className={cn(inputClass, 'mt-1.5')}
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 text-[15px] font-semibold text-[#0f172a]">Product Details</p>
                <div className="rounded-xl border border-[#e2e8f0] overflow-hidden">
                  <div className="grid grid-cols-[minmax(0,1.5fr)_64px_48px_72px] gap-2 bg-[#f8fafc] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                    <span>Item</span>
                    <span>Base</span>
                    <span>Qty</span>
                    <span>Unit</span>
                  </div>
                  <div className="divide-y divide-[#f1f5f9] max-h-[160px] overflow-y-auto">
                    {cart.length === 0 ? (
                      <p className="px-3 py-6 text-center text-xs text-[#94a3b8]">No products in cart</p>
                    ) : (
                      cart.map((item) => (
                        <div
                          key={item.cartItemId}
                          className="grid grid-cols-[minmax(0,1.5fr)_64px_48px_72px] gap-2 items-center px-3 py-2.5"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-[#e2e8f0] bg-[#f8fafc]">
                              {item.productImage ? (
                                <img
                                  src={item.productImage}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Package className="h-3.5 w-3.5 text-[#94a3b8]" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-semibold text-[#0f172a]">
                                {item.name}
                              </p>
                              <p className="truncate text-[10px] text-[#64748b]">
                                INR {item.price.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <span className="truncate text-[11px] font-medium text-[#334155]" title={item.base}>
                            {item.base || '—'}
                          </span>
                          <span className="text-[12px] font-semibold text-[#0f172a] tabular-nums">
                            {item.quantity}
                          </span>
                          <span className="truncate text-[11px] text-[#64748b]">{item.packSize || '—'}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[15px] font-semibold text-[#0f172a]">Additional Options</p>
                <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-[#334155]">
                  <input
                    type="checkbox"
                    checked={discountEnabled}
                    onChange={(e) => onDiscountChange(e.target.checked)}
                    className="h-4 w-4 accent-[#2563eb]"
                  />
                  Add Discount
                </label>
                {discountEnabled && (
                  <Input
                    type="number"
                    min={0}
                    value={discountAmount}
                    onChange={(e) => onDiscountAmountChange(e.target.value)}
                    placeholder="Discount amount (₹)"
                    className={cn(inputClass, 'mt-2 max-w-[200px]')}
                  />
                )}
              </div>
            </div>

            <div className="flex shrink-0 gap-3 border-t border-[#f1f5f9] bg-white px-6 py-4">
              <Button
                variant="outline"
                className="h-11 flex-1 rounded-xl border-[#e2e8f0] text-[#0f172a]"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                className="h-11 flex-1 rounded-xl border-[#0f172a] bg-white text-[#0f172a] gap-2 hover:bg-[#f8fafc]"
                disabled={!fullName || submitting || cart.length === 0}
                onClick={handleGenerate}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Generate Invoice
              </Button>
            </div>
          </div>

          {/* ——— Preview (right) — DL slip ——— */}
          <div className="flex w-full min-h-0 flex-1 flex-col bg-[#eef2f6] lg:min-w-0">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#e2e8f0] bg-[#eef2f6] px-5 py-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#64748b]">
                DL · 3.9″ × 8.3″
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg border-[#e2e8f0] bg-white text-[12px] text-[#334155]"
                  onClick={() => toast.message('Drafts coming soon')}
                >
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  Save as draft
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg border-[#e2e8f0] bg-white text-[12px] text-[#334155]"
                  onClick={handlePrint}
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Print
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">
              <div
                id="invoice-preview-print"
                className="invoice-dl mx-auto bg-white text-[#0f172a] shadow-[0_8px_30px_rgba(15,23,42,0.08)]"
                style={{
                  width: '3.9in',
                  minHeight: '8.3in',
                  padding: '0.42in 0.32in 0.36in',
                  boxSizing: 'border-box',
                }}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0f172a] text-[15px] font-bold text-white">
                    ₹
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="text-[15px] font-bold tracking-tight leading-none">INVOICE</p>
                    <p className="mt-1.5 text-[10px] font-semibold tabular-nums text-[#334155]">
                      {invoiceNo}
                    </p>
                  </div>
                </div>

                <div className="mt-3 border-b border-[#e2e8f0] pb-3">
                  <p className="text-[11px] font-semibold leading-snug">{billedBy.name}</p>
                  {billedBy.email && (
                    <p className="mt-0.5 text-[9px] text-[#64748b] leading-snug">{billedBy.email}</p>
                  )}
                  <p className="mt-0.5 text-[9px] capitalize text-[#64748b]">
                    Payment · {paymentMode}
                  </p>
                </div>

                {/* Parties */}
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">
                      From
                    </p>
                    <p className="mt-1 text-[10px] font-semibold leading-snug">{billedBy.name}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">
                      Bill to
                    </p>
                    <p className="mt-1 text-[10px] font-semibold leading-snug">{fullName || '—'}</p>
                    {phone && <p className="mt-0.5 text-[9px] text-[#64748b]">{phone}</p>}
                    {address && (
                      <p className="mt-0.5 text-[9px] leading-snug text-[#64748b]">{address}</p>
                    )}
                  </div>
                </div>

                {/* Dates */}
                <div className="mt-3 flex gap-4 border-y border-[#f1f5f9] py-2.5 text-[9px]">
                  <div>
                    <p className="text-[#94a3b8]">Issued</p>
                    <p className="mt-0.5 font-semibold">
                      {issuedDate ? formatPreviewDate(new Date(issuedDate)) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#94a3b8]">Due</p>
                    <p className="mt-0.5 font-semibold">
                      {dueDate ? formatPreviewDate(new Date(dueDate)) : '—'}
                    </p>
                  </div>
                </div>

                {/* Line items — one row per product */}
                <div className="mt-3 border-t border-[#0f172a]">
                  <div className="grid grid-cols-[1fr_28px_42px_52px] gap-1 border-b border-[#cbd5e1] py-1.5 text-[8px] font-semibold uppercase tracking-wide text-[#64748b]">
                    <span>Item</span>
                    <span className="text-center">Qty</span>
                    <span className="text-center">Unit</span>
                    <span className="text-right">Amt</span>
                  </div>
                  <div className="divide-y divide-[#f1f5f9]">
                    {cart.map((item) => (
                      <div
                        key={item.cartItemId}
                        className="grid grid-cols-[1fr_28px_42px_52px] gap-1 py-2 text-[9px]"
                      >
                        <div className="min-w-0">
                          <p className="font-medium leading-snug">{item.name}</p>
                          {item.base && (
                            <p className="text-[8px] text-[#94a3b8]">Base {item.base}</p>
                          )}
                        </div>
                        <p className="text-center tabular-nums">{item.quantity}</p>
                        <p className="text-center text-[#64748b]">{item.packSize || '—'}</p>
                        <p className="text-right tabular-nums font-medium">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="mt-3 space-y-1 border-t border-[#e2e8f0] pt-2.5 text-[9px]">
                  <div className="flex justify-between text-[#64748b]">
                    <span>Subtotal</span>
                    <span className="tabular-nums text-[#0f172a]">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#64748b]">
                    <span>G.S.T (18%)</span>
                    <span className="tabular-nums text-[#0f172a]">{formatCurrency(gst)}</span>
                  </div>
                  {discountEnabled && discount > 0 && (
                    <div className="flex justify-between text-[#64748b]">
                      <span>Discount</span>
                      <span className="tabular-nums text-[#0f172a]">− {formatCurrency(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-[#0f172a] pt-2 text-[12px] font-bold text-[#0f172a]">
                    <span>Total</span>
                    <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>

                <p className="mt-5 text-center text-[8px] leading-relaxed text-[#94a3b8]">
                  Thank you for your purchase.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
