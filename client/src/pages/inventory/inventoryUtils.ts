import type { Brand, Product } from '@paint-saas/shared-types';

export type DeleteTarget = {
  kind: 'brand' | 'type' | 'product';
  id: string;
  label: string;
};

export type InventoryHash =
  | 'overview'
  | 'brands'
  | 'types'
  | 'products'
  | 'stock'
  | 'transfers'
  | 'drilldown';

export function parseInventoryHash(raw: string): InventoryHash {
  const h = raw.replace('#', '') || 'brands';
  if (
    ['overview', 'brands', 'types', 'products', 'stock', 'transfers', 'drilldown'].includes(h)
  ) {
    return h as InventoryHash;
  }
  return 'brands';
}

/** Sidebar list views — entering one exits brand/type drill-down */
export function isInventoryListView(hash: InventoryHash) {
  return hash === 'overview' || hash === 'brands' || hash === 'types' || hash === 'products' || hash === 'stock';
}

export function apiError(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    fallback
  );
}

export function brandNameById(brands: Brand[], id: string) {
  return brands.find((b) => b._id === id)?.name ?? '—';
}

export function productSearchMatch(p: Product, q: string) {
  if (!q) return true;
  const s = q.toLowerCase();
  return (
    p.name.toLowerCase().includes(s) ||
    p.productCode.toLowerCase().includes(s) ||
    (p.type?.toLowerCase().includes(s) ?? false)
  );
}
