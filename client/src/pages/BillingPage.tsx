import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import BillingHeroIllustration from '@/components/BillingHeroIllustration';
import { inventoryApi, billingApi } from '@/api';
import type { Product } from '@paint-saas/shared-types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  FileText,
  Loader2,
  Package,
} from 'lucide-react';

interface CartItem {
  cartItemId: string;
  productId: string;
  name: string;
  brand: string;
  variant: string;
  price: number;
  quantity: number;
  stockQty: number;
}

function productStock(p: Product) {
  return p.stockQty ?? p.stock ?? 0;
}

function productPrice(p: Product) {
  return p.salePrice ?? p.price ?? 0;
}

function productBrandLabel(p: Product) {
  return p.brandName ?? p.brand ?? '';
}

function productVariantLabel(p: Product) {
  return p.type ?? '';
}

function stockBadgeClass(qty: number) {
  if (qty === 0) return 'bg-[#fee2e2] text-[#dc2626] border-[#fecaca]';
  if (qty <= 120) return 'bg-[#fef9c3] text-[#a16207] border-[#fde047]';
  return 'bg-[#dcfce7] text-[#15803d] border-[#bbf7d0]';
}

export default function BillingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
  const [amountPaid, setAmountPaid] = useState('');
  const [discount, setDiscount] = useState('0');
  const [discountChecked, setDiscountChecked] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    try {
      const data = await inventoryApi.list();
      setProducts(data);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  const filtered = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      productBrandLabel(p).toLowerCase().includes(q) ||
      p.type?.toLowerCase().includes(q) ||
      p.productCode?.toLowerCase().includes(q)
    );
  });

  function isInCart(productId: string) {
    return cart.some((c) => c.productId === productId);
  }

  function addToCart(product: Product) {
    const stock = productStock(product);
    if (stock <= 0) {
      toast.error('Out of stock');
      return;
    }
    const existing = cart.find((c) => c.productId === product._id);
    if (existing) {
      if (existing.quantity >= stock) {
        toast.error(`Only ${stock} in stock`);
        return;
      }
      setCart(
        cart.map((c) =>
          c.productId === product._id ? { ...c, quantity: c.quantity + 1 } : c
        )
      );
    } else {
      setCart([
        ...cart,
        {
          cartItemId: product._id,
          productId: product._id,
          name: product.name,
          brand: productBrandLabel(product),
          variant: productVariantLabel(product),
          price: productPrice(product),
          quantity: 1,
          stockQty: stock,
        },
      ]);
    }
    toast.success(`${product.name} added to cart`);
  }

  function updateQty(cartItemId: string, delta: number) {
    setCart(
      cart
        .map((item) => {
          if (item.cartItemId !== cartItemId) return item;
          const qty = item.quantity + delta;
          if (qty <= 0) return null;
          if (qty > item.stockQty) {
            toast.error(`Only ${item.stockQty} in stock`);
            return item;
          }
          return { ...item, quantity: qty };
        })
        .filter(Boolean) as CartItem[]
    );
  }

  function updatePrice(cartItemId: string, value: string) {
    const price = value === '' ? 0 : parseFloat(value);
    setCart(
      cart.map((item) =>
        item.cartItemId === cartItemId
          ? { ...item, price: Number.isFinite(price) ? Math.max(0, price) : item.price }
          : item
      )
    );
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountNum = discountChecked ? parseFloat(discount) || 0 : 0;
  const grandTotal = Math.max(0, subtotal - discountNum);
  const gstDisplay = subtotal * 0.18;
  const displayTotal = Math.max(0, subtotal + gstDisplay - discountNum);

  function openCheckout() {
    if (cart.length === 0) {
      toast.error('Add items to cart first');
      return;
    }
    if (cart.some((i) => !i.price || i.price <= 0)) {
      toast.error('Set a unit price for every cart item');
      return;
    }
    setCheckoutOpen(true);
  }

  async function handleCheckout() {
    if (!customer.name.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (cart.some((i) => !i.price || i.price <= 0)) {
      toast.error('Set a unit price for every cart item');
      return;
    }
    try {
      await billingApi.create({
        customer,
        items: cart.map((i) => ({
          productId: i.productId,
          qty: i.quantity,
          rate: i.price,
        })),
        discount: discountNum,
        amountPaid: parseFloat(amountPaid) || 0,
        paymentMode: 'cash',
      });
      toast.success('Bill created successfully!');
      setCart([]);
      setCheckoutOpen(false);
      setCustomer({ name: '', phone: '', address: '' });
      setAmountPaid('');
      setDiscount('0');
      setDiscountChecked(false);
      await loadProducts();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create bill';
      toast.error(msg);
    }
  }

  return (
    <div className="p-8">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-[20px] bg-white border border-[#e2e8f0] shadow-[0_1px_3px_rgba(15,23,42,0.06)] mb-6">
        <div className="absolute inset-y-0 right-0 w-[55%] bg-gradient-to-l from-[#eff6ff] via-[#f0f9ff] to-transparent pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6 px-10 py-9">
          <div className="flex-1 max-w-lg">
            <h1 className="text-[32px] font-bold text-[#0f172a] tracking-tight mb-2.5 leading-tight">
              Billing & Payments
            </h1>
            <p className="text-[#64748b] text-[15px] leading-relaxed mb-6 max-w-md">
              Manage your cash flow, track pending invoices, and review payment history all in one
              serene place.
            </p>
            <Button
              onClick={openCheckout}
              className="rounded-full bg-gradient-to-r from-[#2563eb] to-[#3b82f6] hover:from-[#1d4ed8] hover:to-[#2563eb] text-white px-7 h-11 text-[15px] font-semibold shadow-[0_4px_14px_rgba(37,99,235,0.4)] gap-2 border-0"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Create Invoice
            </Button>
          </div>
          <div className="hidden lg:flex shrink-0 items-end justify-end pr-2">
            <BillingHeroIllustration />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        {/* Products panel */}
        <div>
          <div className="relative mb-4">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#94a3b8]" strokeWidth={2.25} />
            <Input
              placeholder="Search products by name, brand, code or base (paints only)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-[52px] rounded-full bg-[#f1f5f9] border-0 shadow-none text-[14px] text-[#334155] placeholder:text-[#94a3b8] focus-visible:ring-[#2563eb]/30"
            />
          </div>

          <div className="bg-white rounded-[20px] border border-[#e2e8f0] shadow-[0_1px_3px_rgba(15,23,42,0.05)] overflow-hidden">
            <div className="grid grid-cols-[minmax(0,2.2fr)_1fr_0.9fr_1fr_72px] gap-3 px-6 py-4 border-b border-[#f1f5f9] text-[13px] font-semibold text-[#94a3b8]">
              <span>Product</span>
              <span>Brand</span>
              <span>Base</span>
              <span>Price</span>
              <span className="text-right">Stock</span>
            </div>

            <div className="max-h-[540px] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-7 w-7 animate-spin text-[#cbd5e1]" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-20 px-6 text-[#94a3b8] text-sm">
                  No products found
                </div>
              ) : (
                filtered.map((product) => {
                  const added = isInCart(product._id);
                  return (
                    <div
                      key={product._id}
                      className="grid grid-cols-[minmax(0,2.2fr)_1fr_0.9fr_1fr_72px] gap-3 items-center px-6 py-[18px] border-b border-dashed border-[#e2e8f0] last:border-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-[#94a3b8]" strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#0f172a] text-[14px] leading-snug">
                            {product.name}
                          </p>
                          {added ? (
                            <span className="inline-flex items-center mt-1.5 px-3 py-0.5 rounded-full text-[12px] font-semibold bg-[#dcfce7] text-[#15803d]">
                              Added
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addToCart(product)}
                              disabled={productStock(product) === 0}
                              className="inline-flex items-center gap-0.5 mt-1.5 text-[12px] font-medium text-[#64748b] hover:text-[#2563eb] disabled:opacity-40 transition-colors"
                            >
                              <Plus className="w-3 h-3" strokeWidth={2.5} /> Add
                            </button>
                          )}
                        </div>
                      </div>
                      <span className="text-[13px] text-[#64748b] truncate">{productBrandLabel(product)}</span>
                      <span>
                        {productVariantLabel(product) ? (
                          <span className="inline-flex px-2.5 py-1 rounded-lg text-[12px] font-medium bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]">
                            {productVariantLabel(product)}
                          </span>
                        ) : (
                          <span className="text-[#cbd5e1]">—</span>
                        )}
                      </span>
                      <span className="text-[13px] text-[#64748b]">
                        {productPrice(product) > 0 ? (
                          <>₹ {productPrice(product).toLocaleString('en-IN')}</>
                        ) : (
                          <span className="text-[#94a3b8] italic">Set in cart</span>
                        )}
                      </span>
                      <div className="flex justify-end">
                        <span
                          className={cn(
                            'inline-flex min-w-[36px] justify-center px-2.5 py-1 rounded-full text-[12px] font-bold border',
                            stockBadgeClass(productStock(product))
                          )}
                        >
                          {productStock(product)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Cart panel */}
        <div className="bg-white rounded-[20px] border border-[#e2e8f0] shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-6 xl:sticky xl:top-6 h-fit">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#f1f5f9]">
            <div className="flex items-center gap-2.5">
              <ShoppingCart className="w-5 h-5 text-[#334155]" strokeWidth={2.25} />
              <h3 className="font-bold text-[#0f172a] text-[16px]">Cart</h3>
            </div>
            <span className="text-[12px] font-medium text-[#64748b] bg-[#f1f5f9] px-3 py-1 rounded-full">
              {cart.length} item{cart.length !== 1 ? 's' : ''}
            </span>
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-14 text-[#94a3b8]">
              <ShoppingCart className="h-11 w-11 mx-auto mb-3 opacity-30" strokeWidth={1.75} />
              <p className="text-sm">Cart is empty</p>
            </div>
          ) : (
            <>
              <div className="space-y-0 mb-2 max-h-[300px] overflow-y-auto">
                {cart.map((item) => (
                  <div
                    key={item.cartItemId}
                    className="py-4 border-b border-dashed border-[#e2e8f0] last:border-0"
                  >
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <div>
                        <p className="font-bold text-[#0f172a] text-[14px] leading-snug">
                          {item.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          {item.variant && (
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] font-medium">
                              {item.variant}
                            </span>
                          )}
                          <span className="text-[12px] text-[#64748b]">{item.brand}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Label className="text-[11px] text-[#64748b] shrink-0">Unit price ₹</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.price || ''}
                            onChange={(e) => updatePrice(item.cartItemId, e.target.value)}
                            className="h-8 w-[100px] text-[13px] font-semibold border-[#e2e8f0] rounded-lg"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setCart(cart.filter((c) => c.cartItemId !== item.cartItemId))
                        }
                        className="text-[#94a3b8] hover:text-[#dc2626] transition-colors p-0.5"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={2} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-0 bg-[#f8fafc] rounded-lg border border-[#e2e8f0] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateQty(item.cartItemId, -1)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-white text-[#475569] transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </button>
                        <span className="w-9 text-center text-[14px] font-bold text-[#0f172a] border-x border-[#e2e8f0] h-8 flex items-center justify-center bg-white">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.cartItemId, 1)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-white text-[#475569] transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </button>
                      </div>
                      <span className="font-bold text-[#0f172a] text-[15px]">
                        ₹ {(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5 text-[14px] pt-4 border-t border-dashed border-[#e2e8f0]">
                <div className="flex justify-between text-[#64748b]">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#0f172a]">₹ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#64748b]">
                  <span>G.S.T (18%)</span>
                  <span className="font-semibold text-[#0f172a]">₹ {gstDisplay.toFixed(2)}</span>
                </div>
                <div className="pt-1">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="flex items-center gap-2.5 text-[#64748b]">
                      <input
                        type="checkbox"
                        checked={discountChecked}
                        onChange={(e) => setDiscountChecked(e.target.checked)}
                        className="w-4 h-4 rounded border-[#cbd5e1] text-[#2563eb] focus:ring-[#2563eb]/30 accent-[#2563eb]"
                      />
                      Discount
                    </span>
                    {discountChecked && discountNum > 0 && (
                      <span className="font-semibold text-[#16a34a]">
                        - ₹ {discountNum.toFixed(2)}
                      </span>
                    )}
                  </label>
                  {discountChecked && (
                    <div className="mt-2 pl-6">
                      <Input
                        type="number"
                        min="0"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        placeholder="Enter discount amount"
                        className="h-9 text-sm border-[#e2e8f0]"
                      />
                      {discountNum > 0 && cart.length > 0 && (
                        <p className="text-[11px] text-[#16a34a] mt-1.5">
                          Extra discount applied on {cart.length} item(s)
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-[17px] font-bold text-[#0f172a] pt-3 border-t border-[#f1f5f9]">
                  <span>Total</span>
                  <span>₹ {displayTotal.toFixed(2)}</span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={openCheckout}
                className="w-full mt-5 h-12 rounded-xl border-[#0f172a] bg-white hover:bg-[#f8fafc] text-[#0f172a] font-semibold gap-2 text-[14px] shadow-none"
              >
                <FileText className="w-4 h-4" strokeWidth={2.25} />
                Generate Invoice
              </Button>
            </>
          )}
        </div>
      </div>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Customer & Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Amount Paid (₹)</Label>
              <Input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0 for full due"
              />
            </div>
            <p className="text-lg font-bold">Bill amount: ₹ {grandTotal.toFixed(2)}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCheckout}
              className="bg-[#2563eb] hover:bg-[#1d4ed8]"
            >
              Create Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
