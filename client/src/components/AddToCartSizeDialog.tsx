import { useMemo } from 'react';
import type { Product } from '@paint-saas/shared-types';
import { PAINT_SIZES } from '@paint-saas/shared-types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn, formatCurrency } from '@/lib/utils';
import ProductImage from '@/components/ProductImage';

export interface SizeOption {
  size: string;
  stock: number;
  price: number;
}

export function getProductSizeOptions(product: Product): SizeOption[] {
  const fromSizes = PAINT_SIZES.map((size) => ({
    size,
    stock: product.stockBySize?.[size] ?? 0,
    price:
      (product.priceBySize?.[size] ?? 0) > 0
        ? (product.priceBySize?.[size] ?? 0)
        : product.price ?? product.salePrice ?? 0,
  })).filter((s) => s.stock > 0);

  if (fromSizes.length > 0) return fromSizes;

  const total = product.stockQty ?? product.stock ?? 0;
  if (total > 0) {
    return [
      {
        size: product.unit || 'unit',
        stock: total,
        price: product.salePrice ?? product.price ?? 0,
      },
    ];
  }
  return [];
}

interface AddToCartSizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSelect: (option: SizeOption) => void;
  inCartCounts: Record<string, number>;
}

export default function AddToCartSizeDialog({
  open,
  onOpenChange,
  product,
  onSelect,
  inCartCounts,
}: AddToCartSizeDialogProps) {
  const options = useMemo(
    () => (product ? getProductSizeOptions(product) : []),
    [product]
  );

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <ProductImage
              src={product.productImage}
              alt={product.name}
              className="w-14 h-14 rounded-xl"
            />
            <div>
              <DialogTitle>Select pack size</DialogTitle>
              <DialogDescription className="text-[#64748b]">
                {product.name} — choose a unit with available stock
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="grid gap-2 py-2 max-h-[320px] overflow-y-auto">
          {options.length === 0 ? (
            <p className="text-sm text-center text-[#94a3b8] py-6">No stock available</p>
          ) : (
            options.map((opt) => {
              const inCart = inCartCounts[opt.size] ?? 0;
              const left = opt.stock - inCart;
              return (
                <button
                  key={opt.size}
                  type="button"
                  disabled={left <= 0}
                  onClick={() => {
                    onSelect(opt);
                    onOpenChange(false);
                  }}
                  className={cn(
                    'flex items-center justify-between w-full rounded-xl border px-4 py-3 text-left transition-colors',
                    left > 0
                      ? 'border-[#e2e8f0] hover:border-[#2563eb] hover:bg-[#eff6ff]'
                      : 'border-[#f1f5f9] opacity-50 cursor-not-allowed'
                  )}
                >
                  <div>
                    <p className="font-semibold text-[#0f172a]">{opt.size}</p>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      {left > 0 ? `${left} available` : 'In cart / out of stock'}
                      {inCart > 0 && left > 0 && ` · ${inCart} in cart`}
                    </p>
                  </div>
                  <p className="font-semibold text-[#2563eb] tabular-nums">
                    {formatCurrency(opt.price)}
                  </p>
                </button>
              );
            })
          )}
        </div>
        <Button variant="outline" className="w-full rounded-xl" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}
