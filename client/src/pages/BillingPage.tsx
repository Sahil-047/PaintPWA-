import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import BillingHeroIllustration from '@/components/BillingHeroIllustration';
import InvoiceCheckoutDialog from '@/components/InvoiceCheckoutDialog';
import AddToCartSizeDialog, {
  getProductSizeOptions,
  type SizeOption,
} from '@/components/AddToCartSizeDialog';
import ProductImage from '@/components/ProductImage';
import { billingApi, type PaginationMeta } from '@/api';
import type { Product } from '@paint-saas/shared-types';
import { PAINT_SIZES } from '@paint-saas/shared-types';
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
} from 'lucide-react';

interface CartItem {
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
  stockQty: number;
}

function cartLineId(productId: string, packSize: string) {
  return `${productId}::${packSize}`;
}

function isPaintPackSize(size: string) {
  return PAINT_SIZES.includes(size as (typeof PAINT_SIZES)[number]);
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

function sizeSummary(product: Product) {
  const opts = getProductSizeOptions(product);
  if (opts.length === 0) return { total: 0, label: '—' };
  if (opts.length === 1 && !isPaintPackSize(opts[0].size)) {
    return { total: opts[0].stock, label: `${opts[0].stock} ${opts[0].size}` };
  }
  const total = opts.reduce((s, o) => s + o.stock, 0);
  const label = opts.map((o) => `${o.size}:${o.stock}`).join(' · ');
  return { total, label };
}

const PAGE_SIZE = 20;

export default function BillingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    pages: 1,
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [discount, setDiscount] = useState('0');
  const [discountChecked, setDiscountChecked] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
    loadProducts(1, false);
  }, [debouncedSearch]);

  async function loadProducts(targetPage: number, append: boolean) {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const { items, pagination: meta } = await billingApi.listProducts({
        page: targetPage,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
      });
      setPagination(meta);
      setPage(meta.page);
      setProducts((prev) => (append ? [...prev, ...items] : items));
    } catch {
      toast.error('Failed to load products');
      if (!append) setProducts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function loadNextPage() {
    if (page < pagination.pages && !loadingMore && !loading) {
      loadProducts(page + 1, true);
    }
  }

  const pickerInCartCounts = useMemo(() => {
    const m: Record<string, number> = {};
    if (!pickerProduct) return m;
    cart
      .filter((c) => c.productId === pickerProduct._id)
      .forEach((c) => {
        m[c.packSize] = (m[c.packSize] ?? 0) + c.quantity;
      });
    return m;
  }, [cart, pickerProduct]);

  function addToCartWithSize(product: Product, opt: SizeOption) {
    const packSize = opt.size;
    const lineId = cartLineId(product._id, packSize);
    const existing = cart.find((c) => c.cartItemId === lineId);

    if (existing) {
      if (existing.quantity >= opt.stock) {
        toast.error(`Only ${opt.stock} in stock for ${packSize}`);
        return;
      }
      setCart(
        cart.map((c) =>
          c.cartItemId === lineId ? { ...c, quantity: c.quantity + 1 } : c
        )
      );
    } else {
      setCart([
        ...cart,
        {
          cartItemId: lineId,
          productId: product._id,
          name: product.name,
          brand: productBrandLabel(product),
          variant: productVariantLabel(product),
          base: product.base,
          packSize,
          productImage: product.productImage,
          price: opt.price,
          quantity: 1,
          stockQty: opt.stock,
        },
      ]);
    }
    toast.success(`${product.name} (${packSize}) added`);
  }

  function startAddProduct(product: Product) {
    const options = getProductSizeOptions(product);
    if (options.length === 0) {
      toast.error('Out of stock');
      return;
    }
    if (options.length === 1) {
      addToCartWithSize(product, options[0]);
      return;
    }
    setPickerProduct(product);
    setPickerOpen(true);
  }

  function cartQtyForProduct(productId: string) {
    return cart.filter((c) => c.productId === productId).reduce((s, c) => s + c.quantity, 0);
  }

  function updateQty(cartItemId: string, delta: number) {
    setCart(
      cart
        .map((item) => {
          if (item.cartItemId !== cartItemId) return item;
          const qty = item.quantity + delta;
          if (qty <= 0) return null;
          if (qty > item.stockQty) {
            toast.error(`Only ${item.stockQty} in stock for ${item.packSize}`);
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

  function changeCartSize(item: CartItem, newSize: string, product: Product) {
    const options = getProductSizeOptions(product);
    const opt = options.find((o) => o.size === newSize);
    if (!opt) return;
    const newLineId = cartLineId(item.productId, newSize);
    const existing = cart.find((c) => c.cartItemId === newLineId);
    if (existing && existing.cartItemId !== item.cartItemId) {
      toast.error(`${newSize} already in cart — adjust quantity there`);
      return;
    }
    setCart(
      cart.map((c) =>
        c.cartItemId === item.cartItemId
          ? {
              ...c,
              cartItemId: newLineId,
              packSize: newSize,
              price: opt.price,
              stockQty: opt.stock,
              quantity: Math.min(c.quantity, opt.stock),
            }
          : c
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

  async function handleCheckout(payload: {
    customer: { name: string; phone?: string; address?: string; gstin?: string };
    amountPaid: number;
    paymentMode: string;
  }) {
    if (cart.some((i) => !i.price || i.price <= 0)) {
      toast.error('Set a unit price for every cart item');
      return;
    }
    setSubmitting(true);
    try {
      await billingApi.create({
        customer: payload.customer,
        items: cart.map((i) => ({
          productId: i.productId,
          qty: i.quantity,
          rate: i.price,
          size: isPaintPackSize(i.packSize) ? i.packSize : undefined,
        })),
        discount: discountNum,
        amountPaid: payload.amountPaid,
        paymentMode: payload.paymentMode,
      });
      toast.success('Invoice created successfully!');
      setCart([]);
      setCheckoutOpen(false);
      setDiscount('0');
      setDiscountChecked(false);
      await loadProducts(1, false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create bill';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-8">
      <div className="relative overflow-hidden rounded-[20px] bg-white border border-[#e2e8f0] shadow-[0_1px_3px_rgba(15,23,42,0.06)] mb-6">
        <div className="absolute inset-y-0 right-0 w-[55%] bg-gradient-to-l from-[#eff6ff] via-[#f0f9ff] to-transparent pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6 px-10 py-9">
          <div className="flex-1 max-w-lg">
            <h1 className="text-[32px] font-bold text-[#0f172a] tracking-tight mb-2.5 leading-tight">
              Billing & Payments
            </h1>
            <p className="text-[#64748b] text-[15px] leading-relaxed mb-6 max-w-md">
              Add products by pack size (50ml, 1L, 4L…), then generate invoices with customer details.
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

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5">
        <div>
          <div className="relative mb-4">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#94a3b8]" strokeWidth={2.25} />
            <Input type="text"
              placeholder="Search products by name, brand, code or base"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-12 h-[52px] rounded-full bg-[#f1f5f9] border-0 shadow-none text-[14px] text-[#334155] placeholder:text-[#94a3b8] focus-visible:ring-[#2563eb]/30"
            />
          </div>

          <div className="bg-white rounded-[20px] border border-[#e2e8f0] shadow-[0_1px_3px_rgba(15,23,42,0.05)] overflow-hidden">
            <div className="grid grid-cols-[minmax(0,2fr)_1fr_1.2fr_72px] gap-3 px-6 py-4 border-b border-[#f1f5f9] text-[13px] font-semibold text-[#94a3b8]">
              <span>Product</span>
              <span>Brand</span>
              <span>Pack sizes (stock)</span>
              <span className="text-right">Add</span>
            </div>

            <div className="max-h-[540px] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-7 w-7 animate-spin text-[#cbd5e1]" />
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-20 px-6 text-[#94a3b8] text-sm">No products found</div>
              ) : (
                products.map((product) => {
                  const { total, label } = sizeSummary(product);
                  const inCart = cartQtyForProduct(product._id);
                  const sizeOpts = getProductSizeOptions(product);
                  return (
                    <div
                      key={product._id}
                      className="grid grid-cols-[minmax(0,2fr)_1fr_1.2fr_72px] gap-3 items-center px-6 py-[18px] border-b border-dashed border-[#e2e8f0] last:border-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ProductImage
                          src={product.productImage}
                          alt={product.name}
                          className="w-12 h-12 rounded-xl"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-[#0f172a] text-[14px] leading-snug">
                            {product.name}
                          </p>
                          {productVariantLabel(product) && (
                            <span className="inline-flex mt-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]">
                              {productVariantLabel(product)}
                            </span>
                          )}
                          {inCart > 0 && (
                            <span className="inline-flex ml-1.5 mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#dcfce7] text-[#15803d]">
                              {inCart} in cart
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[13px] text-[#64748b] truncate">
                        {productBrandLabel(product)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] text-[#64748b] leading-snug truncate" title={label}>
                          {label}
                        </p>
                        <span
                          className={cn(
                            'inline-flex mt-1 min-w-[28px] justify-center px-2 py-0.5 rounded-full text-[11px] font-bold border',
                            stockBadgeClass(total)
                          )}
                        >
                          {total}
                        </span>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={total === 0}
                          onClick={() => startAddProduct(product)}
                          className="h-8 rounded-lg border-[#2563eb] text-[#2563eb] hover:bg-[#eff6ff] text-xs font-medium"
                        >
                          {sizeOpts.length > 1 ? 'Size' : 'Add'}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {!loading && products.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[#f1f5f9] bg-[#fafafa]">
                <p className="text-xs text-[#64748b]">
                  Showing {products.length} of {pagination.total} products
                  {debouncedSearch ? ` · “${debouncedSearch}”` : ''}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || loadingMore}
                    onClick={() => loadProducts(page - 1, false)}
                    className="h-8 rounded-lg text-xs"
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-2 text-xs text-[#64748b] tabular-nums">
                    {pagination.page} / {pagination.pages}
                  </span>
                  {page < pagination.pages ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loadingMore}
                      onClick={loadNextPage}
                      className="h-8 rounded-lg text-xs"
                    >
                      {loadingMore ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        'Load more'
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled
                      className="h-8 rounded-lg text-xs opacity-50"
                    >
                      End
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[20px] border border-[#e2e8f0] shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-6 xl:sticky xl:top-6 h-fit">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#f1f5f9]">
            <div className="flex items-center gap-2.5">
              <ShoppingCart className="w-5 h-5 text-[#334155]" strokeWidth={2.25} />
              <h3 className="font-bold text-[#0f172a] text-[16px]">Cart</h3>
            </div>
            <span className="text-[12px] font-medium text-[#64748b] bg-[#f1f5f9] px-3 py-1 rounded-full">
              {cart.length} line{cart.length !== 1 ? 's' : ''}
            </span>
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-14 text-[#94a3b8]">
              <ShoppingCart className="h-11 w-11 mx-auto mb-3 opacity-30" strokeWidth={1.75} />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs mt-1">Pick a pack size when adding products</p>
            </div>
          ) : (
            <>
              <div className="space-y-0 mb-2 max-h-[340px] overflow-y-auto">
                {cart.map((item) => {
                  const product = products.find((p) => p._id === item.productId);
                  const sizeOptions = product ? getProductSizeOptions(product) : [];
                  return (
                    <div
                      key={item.cartItemId}
                      className="py-4 border-b border-dashed border-[#e2e8f0] last:border-0"
                    >
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div className="min-w-0 flex-1 flex gap-3">
                          <ProductImage
                            src={item.productImage ?? product?.productImage}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg shrink-0"
                            iconClassName="w-4 h-4"
                          />
                          <div className="min-w-0">
                          <p className="font-bold text-[#0f172a] text-[14px] leading-snug">
                            {item.name}
                          </p>
                          <p className="text-[12px] text-[#64748b] mt-0.5">{item.brand}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Label className="text-[11px] text-[#64748b] shrink-0">Pack</Label>
                            {sizeOptions.length > 1 ? (
                              <Select
                                value={item.packSize}
                                onValueChange={(v: string) =>
                                  product && changeCartSize(item, v, product)
                                }
                              >
                                <SelectTrigger className="h-8 w-[88px] text-xs border-[#e2e8f0]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                  {sizeOptions.map((o) => (
                                    <SelectItem key={o.size} value={o.size} className="bg-white">
                                      {o.size} ({o.stock})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs font-semibold text-[#2563eb] bg-[#eff6ff] px-2 py-1 rounded-md border border-[#bfdbfe]">
                                {item.packSize}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Label className="text-[11px] text-[#64748b] shrink-0">Rate ₹</Label>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={item.price || ''}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updatePrice(item.cartItemId, e.target.value)}
                              className="h-8 w-[100px] text-[13px] font-semibold border-[#e2e8f0] rounded-lg"
                            />
                          </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setCart(cart.filter((c) => c.cartItemId !== item.cartItemId))
                          }
                          className="text-[#94a3b8] hover:text-[#dc2626] p-0.5 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={2} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-0 bg-[#f8fafc] rounded-lg border border-[#e2e8f0] overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateQty(item.cartItemId, -1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-white text-[#475569]"
                          >
                            <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                          </button>
                          <span className="w-9 text-center text-[14px] font-bold text-[#0f172a] border-x border-[#e2e8f0] h-8 flex items-center justify-center bg-white">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.cartItemId, 1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-white text-[#475569]"
                          >
                            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                          </button>
                        </div>
                        <span className="font-bold text-[#0f172a] text-[15px] tabular-nums">
                          ₹ {(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
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
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="flex items-center gap-2.5 text-[#64748b]">
                    <input
                      type="checkbox"
                      checked={discountChecked}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDiscountChecked(e.target.checked)}
                      className="accent-[#2563eb]"
                    />
                    Discount
                  </span>
                  {discountChecked && discountNum > 0 && (
                    <span className="font-semibold text-[#16a34a]">- ₹ {discountNum.toFixed(2)}</span>
                  )}
                </label>
                {discountChecked && (
                  <Input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDiscount(e.target.value)}
                    className="h-9 text-sm border-[#e2e8f0]"
                  />
                )}
                <div className="flex justify-between text-[17px] font-bold text-[#0f172a] pt-3 border-t border-[#f1f5f9]">
                  <span>Total</span>
                  <span>₹ {displayTotal.toFixed(2)}</span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={openCheckout}
                className="w-full mt-5 h-12 rounded-xl border-[#0f172a] bg-white hover:bg-[#f8fafc] text-[#0f172a] font-semibold gap-2"
              >
                <FileText className="w-4 h-4" strokeWidth={2.25} />
                Generate Invoice
              </Button>
            </>
          )}
        </div>
      </div>

      <AddToCartSizeDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        product={pickerProduct}
        inCartCounts={pickerInCartCounts}
        onSelect={(opt: SizeOption) => pickerProduct && addToCartWithSize(pickerProduct, opt)}
      />

      <InvoiceCheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        cart={cart}
        subtotal={subtotal}
        discount={discountNum}
        discountEnabled={discountChecked}
        discountAmount={discount}
        onDiscountChange={setDiscountChecked}
        onDiscountAmountChange={setDiscount}
        onSubmit={handleCheckout}
        submitting={submitting}
      />
    </div>
  );
}
