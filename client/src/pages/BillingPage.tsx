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
import { PAINT_SIZES, formatPackSizeLabel } from '@paint-saas/shared-types';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';
import { useBillPdfDownload } from '@/hooks/useBillPdfDownload';
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
  packSizeLabel: string;
  unit?: string;
  productImage?: string;
  price: number;
  quantity: number;
  stockQty: number;
  colorCode: string;
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

function baseBadgeClass(base?: string) {
  if (!base) return 'bg-[#f1f5f9] text-[#64748b] border-[#e2e8f0]';
  if (/silver/i.test(base)) return 'bg-[#e8eaed] text-[#475569] border-[#d1d5db]';
  return 'bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]';
}

/** Fixed product-table column template (matches billing mock proportions). */
/** Desktop table columns; mobile uses a card layout instead. */
const PRODUCT_COLS =
  'hidden md:grid md:grid-cols-[minmax(0,2.2fr)_minmax(100px,1fr)_minmax(72px,0.7fr)_minmax(90px,0.85fr)_64px]';

function sizeSummary(product: Product) {
  const opts = getProductSizeOptions(product);
  if (opts.length === 0) return { total: 0, label: '—' };
  if (opts.length === 1 && !isPaintPackSize(opts[0].size)) {
    return { total: opts[0].stock, label: `${opts[0].stock} ${opts[0].label}` };
  }
  const total = opts.reduce((s, o) => s + o.stock, 0);
  const label = opts.map((o) => `${o.label}:${o.stock}`).join(' · ');
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
  const [misc, setMisc] = useState('0');
  const [miscChecked, setMiscChecked] = useState(false);
  const [miscRemark, setMiscRemark] = useState('');

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null);
  const { requestPdf, dialog: pdfFormatDialog } = useBillPdfDownload();

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
    const packSizeLabel = opt.label;
    const lineId = cartLineId(product._id, packSize);
    const existing = cart.find((c) => c.cartItemId === lineId);

    if (existing) {
      if (existing.quantity >= opt.stock) {
        toast.error(`Only ${opt.stock} in stock for ${packSizeLabel}`);
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
          packSizeLabel,
          unit: product.unit,
          productImage: product.productImage,
          price: 0,
          quantity: 1,
          stockQty: opt.stock,
          colorCode: '',
        },
      ]);
    }
    toast.success(`${product.name} (${packSizeLabel}) added`);
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
      cart.map((item) => {
        if (item.cartItemId !== cartItemId) return item;
        const qty = item.quantity + delta;
        if (qty < 1) {
          toast.error('Quantity must be at least 1');
          return item;
        }
        if (qty > item.stockQty) {
          toast.error(`Only ${item.stockQty} in stock for ${item.packSizeLabel || item.packSize}`);
          return item;
        }
        return { ...item, quantity: qty };
      })
    );
  }

  function setQty(cartItemId: string, value: string) {
    if (value.trim() === '') {
      toast.error('Quantity must be at least 1');
      return;
    }
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return;
    if (parsed < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }

    setCart(
      cart.map((item) => {
        if (item.cartItemId !== cartItemId) return item;
        if (parsed > item.stockQty) {
          toast.error(`Only ${item.stockQty} in stock for ${item.packSizeLabel || item.packSize}`);
          return { ...item, quantity: item.stockQty };
        }
        return { ...item, quantity: parsed };
      })
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

  function setColorCode(cartItemId: string, value: string) {
    setCart(
      cart.map((item) =>
        item.cartItemId === cartItemId ? { ...item, colorCode: value } : item
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
      toast.error(`${opt.label} already in cart — adjust quantity there`);
      return;
    }
    setCart(
      cart.map((c) =>
        c.cartItemId === item.cartItemId
          ? {
              ...c,
              cartItemId: newLineId,
              packSize: newSize,
              packSizeLabel: opt.label,
              unit: product.unit,
              stockQty: opt.stock,
              quantity: Math.min(c.quantity, opt.stock),
            }
          : c
      )
    );
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountNum = discountChecked ? parseFloat(discount) || 0 : 0;
  const miscNum = miscChecked ? parseFloat(misc) || 0 : 0;
  const grandTotal = Math.max(0, subtotal - discountNum + miscNum);

  function openCheckout() {
    if (cart.length === 0) {
      toast.error('Add items to cart first');
      return;
    }
    if (cart.some((i) => !i.price || i.price <= 0)) {
      toast.error('Set a unit price for every cart item');
      return;
    }
    if (cart.some((i) => !i.quantity || i.quantity < 1)) {
      toast.error('Quantity must be at least 1 for every cart item');
      return;
    }
    if (miscNum > 0 && !miscRemark.trim()) {
      toast.error('Add a remark for the miscellaneous charge');
      return;
    }
    setCheckoutOpen(true);
  }

  async function handleCheckout(payload: {
    customer: { name: string; phone?: string; address?: string };
    amountPaid: number;
    paymentMode: string;
  }) {
    if (cart.some((i) => !i.price || i.price <= 0)) {
      toast.error('Set a unit price for every cart item');
      return;
    }
    if (cart.some((i) => !i.quantity || i.quantity < 1)) {
      toast.error('Quantity must be at least 1 for every cart item');
      return;
    }
    if (miscNum > 0 && !miscRemark.trim()) {
      toast.error('Add a remark for the miscellaneous charge');
      return;
    }
    setSubmitting(true);
    try {
      const result = await billingApi.create({
        customer: payload.customer,
        items: cart.map((i) => ({
          productId: i.productId,
          qty: i.quantity,
          rate: i.price,
          size: isPaintPackSize(i.packSize) ? i.packSize : undefined,
          colorCode: i.colorCode.trim() || undefined,
        })),
        discount: discountNum,
        miscAmount: miscNum,
        miscRemark: miscNum > 0 ? miscRemark.trim() : undefined,
        amountPaid: payload.amountPaid,
        paymentMode: payload.paymentMode,
      });
      const billTotal = Math.max(
        0,
        cart.reduce((s, i) => s + i.price * i.quantity, 0) - discountNum + miscNum
      );
      const creditUsed = result.bill?.creditApplied ?? result.creditApplied ?? 0;
      const cashPaid =
        payload.paymentMode === 'store_credit' ? 0 : payload.amountPaid;
      const received = Number((cashPaid + creditUsed).toFixed(2));
      if (creditUsed > 0.001 && received >= billTotal - 0.001) {
        toast.success(
          `Invoice created - paid in full with ${formatCurrency(creditUsed)} store credit`
        );
      } else if (creditUsed > 0.001) {
        toast.success(
          `Invoice created - ${formatCurrency(creditUsed)} store credit applied`
        );
      } else if (cashPaid <= 0) {
        toast.success('Invoice created - full amount due');
      } else if (cashPaid < billTotal) {
        toast.success('Invoice created - partial payment shown on the bill PDF');
      } else {
        toast.success('Invoice created - paid in full');
      }
      setCart([]);
      setCheckoutOpen(false);
      setDiscount('0');
      setDiscountChecked(false);
      setMisc('0');
      setMiscChecked(false);
      setMiscRemark('');
      await loadProducts(1, false);

      const billId = result.bill?._id;
      if (billId) {
        requestPdf(billId, result.bill.billNo);
      }
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })
        ?.response?.data;
      const fieldErrors = data?.errors
        ? Object.values(data.errors).flat().filter(Boolean)
        : [];
      const msg =
        fieldErrors[0] ||
        data?.message ||
        'Failed to create bill';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-full bg-[var(--brand-space)] px-4 sm:px-6 lg:px-8 py-5 sm:py-6 lg:py-8">
      {pdfFormatDialog}
      <div className="relative overflow-hidden rounded-[18px] sm:rounded-[20px] bg-white border border-[#e2e8f0] shadow-[0_1px_3px_rgba(15,23,42,0.06)] mb-5 sm:mb-6">
        <div className="absolute inset-y-0 right-0 w-[55%] bg-gradient-to-l from-[#eff6ff] via-[#f0f9ff] to-transparent pointer-events-none hidden sm:block" />
        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 sm:gap-6 px-5 sm:px-8 lg:px-10 py-6 sm:py-8 lg:py-9">
          <div className="flex-1 max-w-lg w-full">
            <h1 className="text-[26px] sm:text-[30px] lg:text-[32px] font-bold text-[#0f172a] tracking-tight mb-2 leading-tight">
              Billing & Payments
            </h1>
            <p className="text-[#64748b] text-[14px] sm:text-[15px] leading-relaxed mb-5 sm:mb-6 max-w-md">
              Manage your cash flow, track pending invoices, and review payment history all in one
              serene place.
            </p>
            <Button
              onClick={openCheckout}
              className="rounded-full bg-gradient-to-r from-[#2563eb] to-[#3b82f6] hover:from-[#1d4ed8] hover:to-[#2563eb] text-white px-6 sm:px-7 h-11 text-[14px] sm:text-[15px] font-semibold shadow-[0_4px_14px_rgba(37,99,235,0.4)] gap-2 border-0 w-full sm:w-auto"
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

      <div className="relative mb-4">
        <Search
          className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#94a3b8]"
          strokeWidth={2.25}
        />
        <Input
          type="text"
          placeholder="Search products by name, brand, code or base"
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          className="pl-11 sm:pl-12 h-12 sm:h-[52px] rounded-full bg-[#f1f5f9] border-0 shadow-none text-[14px] text-[#334155] placeholder:text-[#94a3b8] focus-visible:ring-[#2563eb]/30"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4 sm:gap-5 items-start">
        <div className="bg-white rounded-[18px] sm:rounded-[20px] border border-[#e2e8f0] shadow-[0_1px_3px_rgba(15,23,42,0.05)] overflow-hidden flex flex-col min-h-[420px] sm:min-h-[520px] xl:h-[640px]">
          <div
            className={cn(
              'gap-3 px-4 sm:px-6 py-4 border-b border-[#f1f5f9] text-[13px] font-semibold text-[#94a3b8] shrink-0',
              PRODUCT_COLS
            )}
          >
            <span>Product</span>
            <span>Brand</span>
            <span>Base</span>
            <span>Price</span>
            <span className="text-right">Stock</span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-7 w-7 animate-spin text-[#cbd5e1]" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 px-6 text-[#94a3b8] text-sm">No products found</div>
            ) : (
              products.map((product) => {
                const { total } = sizeSummary(product);
                const inCart = cartQtyForProduct(product._id);
                return (
                  <div key={product._id} className="border-b border-dashed border-[#e2e8f0] last:border-0">
                    {/* Mobile card */}
                    <div className="md:hidden px-4 py-4 flex gap-3">
                      <ProductImage
                        src={product.productImage}
                        alt={product.name}
                        className="w-12 h-12 rounded-xl shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[#0f172a] text-[14px] leading-snug">
                          {product.name}
                        </p>
                        <p className="text-[12px] text-[#64748b] mt-0.5 truncate">
                          {productBrandLabel(product) || '—'}
                          {product.base ? ` · ${product.base}` : ''}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex min-w-[32px] justify-center px-2 py-0.5 rounded-full text-[11px] font-bold border',
                              stockBadgeClass(total)
                            )}
                          >
                            {total}
                          </span>
                          <span className="text-[12px] text-[#94a3b8]">Set at billing</span>
                          {inCart > 0 && (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#dcfce7] text-[#15803d]">
                              {inCart} in cart
                            </span>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={total === 0}
                            onClick={() => startAddProduct(product)}
                            className="h-7 ml-auto rounded-md border-[#2563eb] text-[#2563eb] hover:bg-[#eff6ff] text-[11px] font-medium px-2.5"
                          >
                            <Plus className="w-3 h-3 mr-0.5" strokeWidth={2.5} />
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Desktop row */}
                    <div
                      className={cn(
                        'gap-3 items-center px-4 sm:px-6 py-[16px]',
                        PRODUCT_COLS
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ProductImage
                          src={product.productImage}
                          alt={product.name}
                          className="w-11 h-11 rounded-xl shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-[#0f172a] text-[14px] leading-snug truncate">
                            {product.name}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={total === 0}
                              onClick={() => startAddProduct(product)}
                              className="h-7 rounded-md border-[#2563eb] text-[#2563eb] hover:bg-[#eff6ff] text-[11px] font-medium px-2"
                            >
                              <Plus className="w-3 h-3 mr-0.5" strokeWidth={2.5} />
                              Add
                            </Button>
                            {inCart > 0 && (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#dcfce7] text-[#15803d]">
                                {inCart} in cart
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-[13px] text-[#64748b] truncate">
                        {productBrandLabel(product) || '—'}
                      </span>
                      <div>
                        {product.base ? (
                          <span
                            className={cn(
                              'inline-flex max-w-full truncate px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
                              baseBadgeClass(product.base)
                            )}
                            title={product.base}
                          >
                            {product.base}
                          </span>
                        ) : (
                          <span className="text-[13px] text-[#94a3b8]">—</span>
                        )}
                      </div>
                      <span className="text-[13px] text-[#94a3b8]">Set at billing</span>
                      <div className="flex justify-end">
                        <span
                          className={cn(
                            'inline-flex min-w-[36px] justify-center px-2.5 py-0.5 rounded-full text-[12px] font-bold border',
                            stockBadgeClass(total)
                          )}
                          title={sizeSummary(product).label}
                        >
                          {total}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {!loading && products.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 sm:px-6 py-3.5 border-t border-[#f1f5f9] bg-[#fafafa] shrink-0">
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

        <div className="bg-white rounded-[18px] sm:rounded-[20px] border border-[#e2e8f0] shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-4 sm:p-6 xl:sticky xl:top-6 flex flex-col min-h-[360px] sm:min-h-[420px] xl:h-[640px] w-full xl:w-[320px]">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#f1f5f9] shrink-0">
            <div className="flex items-center gap-2.5">
              <ShoppingCart className="w-5 h-5 text-[#334155]" strokeWidth={2.25} />
              <h3 className="font-bold text-[#0f172a] text-[16px]">Cart</h3>
            </div>
            <span className="text-[12px] font-medium text-[#64748b] bg-[#f1f5f9] px-3 py-1 rounded-full">
              {cart.length} item{cart.length !== 1 ? 's' : ''}
            </span>
          </div>

          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-[#94a3b8] px-2">
              <ShoppingCart className="h-12 w-12 mb-3 opacity-30" strokeWidth={1.75} />
              <p className="text-sm">Oops! looks like your cart is empty</p>
            </div>
          ) : (
            <>
              <div className="space-y-0 mb-2 flex-1 min-h-0 overflow-y-auto">
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
                                <SelectTrigger className="h-8 w-[100px] text-xs border-[#e2e8f0]">
                                  <SelectValue>
                                    {item.packSizeLabel ||
                                      formatPackSizeLabel(item.packSize, item.unit)}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                  {sizeOptions.map((o) => (
                                    <SelectItem key={o.size} value={o.size} className="bg-white">
                                      {o.label} ({o.stock})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs font-semibold text-[#2563eb] bg-[#eff6ff] px-2 py-1 rounded-md border border-[#bfdbfe]">
                                {item.packSizeLabel ||
                                  formatPackSizeLabel(item.packSize, item.unit || product?.unit)}
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
                          <div className="flex items-center gap-2 mt-2">
                            <Label className="text-[11px] text-[#64748b] shrink-0">Color</Label>
                            <Input
                              type="text"
                              value={item.colorCode}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setColorCode(item.cartItemId, e.target.value)
                              }
                              placeholder=""
                              className="h-8 w-[100px] text-[13px] font-semibold border-[#e2e8f0] rounded-lg uppercase"
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
                          <input
                            type="number"
                            min={1}
                            max={item.stockQty}
                            step={1}
                            value={item.quantity}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setQty(item.cartItemId, e.target.value)
                            }
                            onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                            className="w-12 h-8 border-x border-[#e2e8f0] bg-white text-center text-[14px] font-bold text-[#0f172a] tabular-nums outline-none focus:bg-[#eff6ff]"
                            aria-label={`Quantity for ${item.name}`}
                          />
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

              <div className="space-y-2.5 text-[14px] pt-4 border-t border-dashed border-[#e2e8f0] shrink-0">
                <div className="flex justify-between text-[#64748b]">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#0f172a]">₹ {subtotal.toFixed(2)}</span>
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
                    placeholder="Discount amount"
                  />
                )}
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="flex items-center gap-2.5 text-[#64748b]">
                    <input
                      type="checkbox"
                      checked={miscChecked}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMiscChecked(e.target.checked)}
                      className="accent-[#2563eb]"
                    />
                    Miscellaneous
                  </span>
                  {miscChecked && miscNum > 0 && (
                    <span className="font-semibold text-[#ea580c]">+ ₹ {miscNum.toFixed(2)}</span>
                  )}
                </label>
                {miscChecked && (
                  <div className="space-y-2">
                    <Input
                      type="number"
                      min="0"
                      value={misc}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMisc(e.target.value)}
                      className="h-9 text-sm border-[#e2e8f0]"
                      placeholder="Extra amount"
                    />
                    <Input
                      type="text"
                      value={miscRemark}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMiscRemark(e.target.value)}
                      className="h-9 text-sm border-[#e2e8f0]"
                      placeholder="Remark (required)"
                    />
                  </div>
                )}
                <div className="flex justify-between text-[17px] font-bold text-[#0f172a] pt-3 border-t border-[#f1f5f9]">
                  <span>Total</span>
                  <span>₹ {grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={openCheckout}
                className="w-full mt-5 h-12 rounded-xl border-[#0f172a] bg-white hover:bg-[#f8fafc] text-[#0f172a] font-semibold gap-2 shrink-0"
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
        misc={miscNum}
        miscEnabled={miscChecked}
        miscAmount={misc}
        miscRemark={miscRemark}
        onMiscChange={setMiscChecked}
        onMiscAmountChange={setMisc}
        onMiscRemarkChange={setMiscRemark}
        onSubmit={handleCheckout}
        submitting={submitting}
      />

    </div>
  );
}
