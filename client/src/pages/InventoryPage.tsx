import { useState, useEffect, useCallback, useMemo, type ChangeEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { inventoryApi } from '@/api';
import type { Brand, Product, ProductType } from '@paint-saas/shared-types';
import { PAINT_SIZES, PRODUCT_UNITS, emptySizeMap, formatPackSizeLabel, totalContainers } from '@paint-saas/shared-types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import {
  apiError,
  brandNameById,
  isInventoryListView,
  parseInventoryHash,
  productSearchMatch,
  type DeleteTarget,
} from '@/pages/inventory/inventoryUtils';
import {
  Search,
  Plus,
  Loader2,
  Pencil,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  Bell,
  SlidersHorizontal,
  Paintbrush,
  Droplets,
  Shield,
  Layers,
  Package,
  Palette,
  FlaskConical,
  Home,
  Brush,
  ShoppingBag,
  Box,
  Trash2,
} from 'lucide-react';

const PAGE_SIZE = 10;
const BRAND_PAGE_SIZE = 6;

const emptyProductForm = () => ({
  name: '',
  brand: '',
  type: '',
  productCode: '',
  productImage: '',
  description: '',
  base: '',
  unit: 'L',
  lowStockThreshold: 5,
  stockBySize: emptySizeMap(),
});

function stockOf(p: Product) {
  return totalContainers(p.stockBySize) || p.stock || p.stockQty || 0;
}

function qtyStatus(qty: number, threshold: number): 'in' | 'low' | 'out' {
  if (qty <= 0) return 'out';
  if (qty <= threshold) return 'low';
  return 'in';
}

type ProductSizeRow = {
  product: Product;
  size: string;
  qty: number;
};

/** One table row per pack size that has stock (or a single empty row if none). */
function expandProductsBySize(list: Product[]): ProductSizeRow[] {
  const rows: ProductSizeRow[] = [];
  for (const product of list) {
    const sizesWithStock = PAINT_SIZES.filter((s) => (product.stockBySize?.[s] ?? 0) > 0);
    if (sizesWithStock.length === 0) {
      rows.push({ product, size: '', qty: 0 });
      continue;
    }
    for (const size of sizesWithStock) {
      rows.push({ product, size, qty: product.stockBySize?.[size] ?? 0 });
    }
  }
  return rows;
}

const TYPE_ICON_OPTIONS = [
  { key: 'paintbrush', Icon: Paintbrush, bg: 'bg-[#dbeafe]', color: 'text-[#2563eb]', label: 'Emulsion' },
  { key: 'droplets', Icon: Droplets, bg: 'bg-[#ffedd5]', color: 'text-[#ea580c]', label: 'Distemper' },
  { key: 'layers', Icon: Layers, bg: 'bg-[#f3e8ff]', color: 'text-[#9333ea]', label: 'Primer' },
  { key: 'shield', Icon: Shield, bg: 'bg-[#dcfce7]', color: 'text-[#16a34a]', label: 'Waterproof' },
  { key: 'palette', Icon: Palette, bg: 'bg-[#fce7f3]', color: 'text-[#db2777]', label: 'Colors' },
  { key: 'flask', Icon: FlaskConical, bg: 'bg-[#e0e7ff]', color: 'text-[#4f46e5]', label: 'Chemical' },
  { key: 'home', Icon: Home, bg: 'bg-[#fef3c7]', color: 'text-[#d97706]', label: 'Exterior' },
  { key: 'brush', Icon: Brush, bg: 'bg-[#ccfbf1]', color: 'text-[#0d9488]', label: 'Enamel' },
  { key: 'package', Icon: Package, bg: 'bg-[#f1f5f9]', color: 'text-[#64748b]', label: 'Other' },
] as const;

type TypeIconKey = (typeof TYPE_ICON_OPTIONS)[number]['key'];

function resolveTypeIcon(iconKey?: string, name?: string) {
  const match = TYPE_ICON_OPTIONS.find((o) => o.key === iconKey);
  if (match) return match;

  const n = (name ?? '').toLowerCase();
  if (n.includes('emulsion')) return TYPE_ICON_OPTIONS[0];
  if (n.includes('distemper')) return TYPE_ICON_OPTIONS[1];
  if (n.includes('primer')) return TYPE_ICON_OPTIONS[2];
  if (n.includes('water')) return TYPE_ICON_OPTIONS[3];
  return TYPE_ICON_OPTIONS[8];
}

function brandInitials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function brandTagline(name: string) {
  const taglines: Record<string, string> = {
    'asian paints': "India's leading paint brand",
    berger: 'Trusted quality since 1929',
    nerolac: 'Beautiful homes, beautiful lives',
    dulux: 'Premium decorative coatings',
    'jsw paints': 'Green & eco-friendly paints',
    'shalimar paints': 'Heritage paint manufacturer',
  };
  return taglines[name.toLowerCase()] ?? 'Premium paint products';
}

function ColoredSparkline({ seed, color }: { seed: string; color: string }) {
  const points = useMemo(() => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * (i + 1)) % 100;
    return Array.from({ length: 14 }, (_, i) => {
      h = (h * 1103515245 + 12345 + i) % 100;
      return 10 + (h % 36);
    });
  }, [seed]);

  const d = points
    .map((y, i) => `${(i / (points.length - 1)) * 100},${52 - y}`)
    .join(' L ');

  const gradId = `sg-${seed}-${color.replace('#', '')}`;

  return (
    <svg viewBox="0 0 100 52" className="w-[128px] h-[56px] sm:w-[140px] sm:h-[64px] shrink-0 self-center" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M 0,52 L ${d} L 100,52 Z`} fill={`url(#${gradId})`} />
      <path d={`M ${d}`} fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({
  label,
  value,
  trend,
  icon: Icon,
  iconBg,
  iconColor,
  sparkColor,
  seed,
}: {
  label: string;
  value: string;
  trend: string;
  icon: typeof Package;
  iconBg: string;
  iconColor: string;
  sparkColor: string;
  seed: string;
}) {
  return (
    <div className="bg-white rounded-[16px] border border-[#e2e8f0] shadow-sm p-5 flex items-center justify-between gap-4 min-h-[128px]">
      <div className="min-w-0">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} strokeWidth={2} />
        </div>
        <p className="text-[13px] text-[#64748b] font-medium">{label}</p>
        <p className="text-[26px] font-bold text-[#0f172a] tracking-tight mt-0.5 leading-none">{value}</p>
        <p className="text-[12px] text-[#16a34a] font-medium mt-2">{trend}</p>
      </div>
      <ColoredSparkline seed={seed} color={sparkColor} />
    </div>
  );
}

function PaginationBar({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0 rounded-lg"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
        let pageNum: number;
        if (totalPages <= 5) pageNum = i + 1;
        else if (page <= 3) pageNum = i + 1;
        else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
        else pageNum = page - 2 + i;
        return (
          <Button
            key={pageNum}
            variant={page === pageNum ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-8 w-8 p-0 rounded-lg text-xs',
              page === pageNum && 'bg-[#2563eb] hover:bg-[#1d4ed8]'
            )}
            onClick={() => onPageChange(pageNum)}
          >
            {pageNum}
          </Button>
        );
      })}
      {totalPages > 5 && page < totalPages - 2 && (
        <>
          <span className="px-1 text-[#94a3b8]">…</span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 rounded-lg text-xs"
            onClick={() => onPageChange(totalPages)}
          >
            {totalPages}
          </Button>
        </>
      )}
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0 rounded-lg"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default function InventoryPage() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [allTypes, setAllTypes] = useState<ProductType[]>([]);
  const [types, setTypes] = useState<ProductType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedType, setSelectedType] = useState<ProductType | null>(null);

  const [typeSearch, setTypeSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [brandSort, setBrandSort] = useState<'newest' | 'name'>('newest');
  const [brandPage, setBrandPage] = useState(1);
  const [productPage, setProductPage] = useState(1);

  const [brandDialog, setBrandDialog] = useState(false);
  const [typeDialog, setTypeDialog] = useState(false);
  const [productDialog, setProductDialog] = useState(false);
  const [filterDialog, setFilterDialog] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<DeleteTarget | null>(null);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockSize, setStockSize] = useState<string>('1L');
  const [stockQty, setStockQty] = useState(0);
  const [saving, setSaving] = useState(false);

  const [globalSearch, setGlobalSearch] = useState('');
  const [brandStatusFilter, setBrandStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState('');
  const [brandImage, setBrandImage] = useState('');
  const [brandIsActive, setBrandIsActive] = useState(true);
  const [typeName, setTypeName] = useState('');
  const [typeBrandId, setTypeBrandId] = useState('');
  const [typeIconKey, setTypeIconKey] = useState<TypeIconKey>('paintbrush');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState(emptyProductForm());

  const loadAllProducts = useCallback(async () => {
    try {
      setAllProducts(await inventoryApi.list());
    } catch {
      /* stats optional */
    }
  }, []);

  const loadBrands = useCallback(async () => {
    setLoading(true);
    try {
      const brandList = await inventoryApi.listBrands();
      setBrands(brandList);
      const typeLists = await Promise.all(
        brandList.map((b) => inventoryApi.listTypes(b._id).catch(() => [] as ProductType[]))
      );
      setAllTypes(typeLists.flat());
      await loadAllProducts();
    } catch {
      toast.error('Failed to load brands');
    } finally {
      setLoading(false);
    }
  }, [loadAllProducts]);

  const loadTypes = useCallback(async (brandId: string) => {
    setLoading(true);
    try {
      setTypes(await inventoryApi.listTypes(brandId));
    } catch {
      toast.error('Failed to load product types');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async (brandId: string, type: string) => {
    setLoading(true);
    try {
      setProducts(await inventoryApi.list({ brandId, type }));
      setProductPage(1);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  useEffect(() => {
    const hash = parseInventoryHash(location.hash);

    if (isInventoryListView(hash)) {
      setSelectedBrand(null);
      setSelectedType(null);
      setProducts([]);
      setTypeSearch('');
      setProductSearch('');
      setProductPage(1);
    }
  }, [location.hash]);

  function brandStats(brandId: string) {
    const bp = allProducts.filter((p) => p.brand === brandId);
    const typeCount = allTypes.filter((t) => t.brandId === brandId).length;
    return { typeCount, productCount: bp.length };
  }

  const globalStats = useMemo(() => {
    return {
      totalBrands: brands.length,
      totalTypes: allTypes.length,
      totalProducts: allProducts.length,
    };
  }, [brands.length, allTypes.length, allProducts]);

  const filteredBrands = useMemo(() => {
    const q = (brandSearch || globalSearch).toLowerCase();
    let list = brands.filter((b) => b.name.toLowerCase().includes(q));
    if (brandStatusFilter === 'active') list = list.filter((b) => b.isActive !== false);
    if (brandStatusFilter === 'inactive') list = list.filter((b) => b.isActive === false);
    list = [...list].sort((a, b) => {
      if (brandSort === 'name') return a.name.localeCompare(b.name);
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    return list;
  }, [brands, brandSearch, globalSearch, brandStatusFilter, brandSort, allProducts, allTypes]);

  const brandTotalPages = Math.max(1, Math.ceil(filteredBrands.length / BRAND_PAGE_SIZE));
  const pagedBrands = filteredBrands.slice(
    (brandPage - 1) * BRAND_PAGE_SIZE,
    brandPage * BRAND_PAGE_SIZE
  );

  useEffect(() => {
    setBrandPage(1);
  }, [brandSearch, brandSort]);

  function typeStats(typeName: string) {
    if (!selectedBrand) return { productCount: 0, totalStock: 0 };
    const tp = allProducts.filter((p) => p.brand === selectedBrand._id && p.type === typeName);
    const totalStock = tp.reduce((sum, p) => sum + stockOf(p), 0);
    return { productCount: tp.length, totalStock };
  }

  function selectBrand(brand: Brand) {
    setSelectedBrand(brand);
    setSelectedType(null);
    setProducts([]);
    setTypeSearch('');
    window.location.hash = 'drilldown';
    loadTypes(brand._id);
  }

  function selectType(type: ProductType, brand?: Brand) {
    const b = brand ?? selectedBrand;
    if (brand) setSelectedBrand(brand);
    setSelectedType(type);
    setProductSearch('');
    window.location.hash = 'drilldown';
    if (b) loadProducts(b._id, type.name);
  }

  function goToBrands() {
    window.location.hash = 'brands';
  }

  function backToTypes() {
    setSelectedType(null);
    setProducts([]);
    window.location.hash = 'drilldown';
  }

  async function refreshInventory() {
    await loadBrands();
    if (selectedBrand) await loadTypes(selectedBrand._id);
    if (selectedBrand && selectedType) await loadProducts(selectedBrand._id, selectedType.name);
  }

  function openCreateBrand() {
    setEditingBrandId(null);
    setBrandName('');
    setBrandImage('');
    setBrandIsActive(true);
    setBrandDialog(true);
  }

  function openEditBrand(brand: Brand, e?: React.MouseEvent) {
    e?.stopPropagation();
    setEditingBrandId(brand._id);
    setBrandName(brand.name);
    setBrandImage(brand.image ?? '');
    setBrandIsActive(brand.isActive !== false);
    setBrandDialog(true);
  }

  async function saveBrand() {
    if (!brandName.trim()) return toast.error('Brand name required');
    setSaving(true);
    try {
      if (editingBrandId) {
        await inventoryApi.updateBrand(editingBrandId, {
          name: brandName.trim(),
          ...(brandImage.trim() ? { image: brandImage.trim() } : {}),
          isActive: brandIsActive,
        });
        toast.success('Brand updated');
      } else {
        await inventoryApi.createBrand({
          name: brandName.trim(),
          ...(brandImage.trim() ? { image: brandImage.trim() } : {}),
        });
        toast.success('Brand created');
      }
      setBrandDialog(false);
      setEditingBrandId(null);
      setBrandName('');
      setBrandImage('');
      await refreshInventory();
    } catch (err: unknown) {
      toast.error(apiError(err, 'Failed to save brand'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleBrandActive(brand: Brand) {
    try {
      await inventoryApi.updateBrand(brand._id, { isActive: brand.isActive === false });
      toast.success(brand.isActive === false ? 'Brand activated' : 'Brand deactivated');
      await refreshInventory();
    } catch (err: unknown) {
      toast.error(apiError(err, 'Failed to update brand status'));
    }
  }

  function openCreateType() {
    if (!brands.length) return toast.error('Create a brand first');
    setEditingTypeId(null);
    setTypeName('');
    setTypeIconKey('paintbrush');
    setTypeBrandId(selectedBrand?._id ?? brands.find((b) => b.isActive !== false)?._id ?? brands[0]._id);
    setTypeDialog(true);
  }

  function openEditType(type: ProductType, e?: React.MouseEvent) {
    e?.stopPropagation();
    setEditingTypeId(type._id);
    setTypeName(type.name);
    setTypeIconKey((type.icon as TypeIconKey) || 'paintbrush');
    setTypeBrandId(type.brandId);
    setTypeDialog(true);
  }

  async function saveType() {
    const brandId = typeBrandId || selectedBrand?._id;
    if (!typeName.trim()) return toast.error('Type name required');
    if (!brandId) return toast.error('Select a brand');
    setSaving(true);
    try {
      const payload = { name: typeName.trim(), icon: typeIconKey };
      if (editingTypeId) {
        await inventoryApi.updateType(editingTypeId, payload);
        toast.success('Product type updated');
      } else {
        await inventoryApi.createType(brandId, payload);
        toast.success('Product type created');
      }
      setTypeDialog(false);
      setEditingTypeId(null);
      setTypeName('');
      setTypeBrandId('');
      setTypeIconKey('paintbrush');
      if (selectedBrand?._id === brandId) await loadTypes(brandId);
      await refreshInventory();
    } catch (err: unknown) {
      toast.error(apiError(err, 'Failed to save type'));
    } finally {
      setSaving(false);
    }
  }

  async function executeDelete() {
    if (!confirmDelete) return;
    setSaving(true);
    try {
      if (confirmDelete.kind === 'brand') {
        await inventoryApi.deleteBrand(confirmDelete.id);
        if (selectedBrand?._id === confirmDelete.id) goToBrands();
        toast.success('Brand deleted');
      } else if (confirmDelete.kind === 'type') {
        await inventoryApi.deleteType(confirmDelete.id);
        if (selectedType?._id === confirmDelete.id) {
          setSelectedType(null);
          window.location.hash = 'drilldown';
        }
        toast.success('Product type deleted');
      } else {
        await inventoryApi.remove(confirmDelete.id);
        toast.success('Product deleted');
      }
      setConfirmDelete(null);
      await refreshInventory();
    } catch (err: unknown) {
      toast.error(apiError(err, 'Delete failed'));
    } finally {
      setSaving(false);
    }
  }

  function openStockDialog(product: Product) {
    setStockProduct(product);
    const defaultSize = PAINT_SIZES.find((s) => (product.stockBySize?.[s] ?? 0) > 0) ?? '1L';
    setStockSize(defaultSize);
    setStockQty(0);
  }

  async function saveStockAdjust() {
    if (!stockProduct) return;
    if (stockQty === 0) return toast.error('Enter a quantity change (positive to add, negative to remove)');
    setSaving(true);
    try {
      await inventoryApi.updateStock(stockProduct._id, { size: stockSize, qty: stockQty });
      toast.success('Stock updated');
      setStockProduct(null);
      await refreshInventory();
    } catch (err: unknown) {
      toast.error(apiError(err, 'Stock update failed'));
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(product: Product) {
    setConfirmDelete({ kind: 'product', id: product._id, label: product.name });
  }

  function openCreateProduct() {
    if (!selectedBrand || !selectedType) return;
    setEditingProductId(null);
    setProductForm({
      ...emptyProductForm(),
      brand: selectedBrand._id,
      type: selectedType.name,
    });
    setProductDialog(true);
  }

  function openEditProduct(product: Product) {
    setEditingProductId(product._id);
    setProductForm({
      name: product.name,
      brand: product.brand,
      type: product.type,
      productCode: product.productCode,
      productImage: product.productImage ?? '',
      description: product.description ?? '',
      base: product.base ?? '',
      unit: product.unit,
      lowStockThreshold: product.lowStockThreshold,
      stockBySize: { ...emptySizeMap(), ...product.stockBySize },
    });
    setProductDialog(true);
  }

  async function saveProduct() {
    if (!productForm.name || !productForm.productCode) {
      return toast.error('Name and product code are required');
    }
    try {
      if (editingProductId) {
        await inventoryApi.update(editingProductId, productForm);
        toast.success('Product updated');
      } else {
        await inventoryApi.create(productForm);
        toast.success('Product added');
      }
      setProductDialog(false);
      await refreshInventory();
    } catch (err: unknown) {
      toast.error(apiError(err, 'Save failed'));
    }
  }

  const filteredTypes = types.filter((t) => {
    if (t.isActive === false) return false;
    const q = (typeSearch || globalSearch).toLowerCase();
    return !q || t.name.toLowerCase().includes(q);
  });

  const filteredProducts = products.filter((p) => productSearchMatch(p, productSearch || globalSearch));
  const productSizeRows = expandProductsBySize(filteredProducts);

  const showBrandsView = !selectedBrand;

  const totalPages = Math.max(1, Math.ceil(productSizeRows.length / PAGE_SIZE));
  const pagedProductRows = productSizeRows.slice(
    (productPage - 1) * PAGE_SIZE,
    productPage * PAGE_SIZE
  );

  const breadcrumb = selectedType && selectedBrand
    ? `Inventory / ${selectedBrand.name} / ${selectedType.name}`
    : selectedBrand
      ? `Inventory / ${selectedBrand.name}`
      : 'Inventory / Brands';

  function ActionMenu({ children }: { children: React.ReactNode }) {
    return (
      <span className="inline-flex" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Actions"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#2563eb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]/30"
            >
              <MoreVertical className="w-4 h-4 pointer-events-none" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={6}
            collisionPadding={12}
            className="min-w-[172px] max-h-none overflow-visible"
          >
            {children}
          </DropdownMenuContent>
        </DropdownMenu>
      </span>
    );
  }

  function renderProductRow(row: ProductSizeRow, showBrand = false) {
    const { product, size, qty } = row;
    const status = qtyStatus(qty, product.lowStockThreshold ?? 5);
    const packLabel = size ? formatPackSizeLabel(size, product.unit) : '—';
    return (
      <TableRow key={`${product._id}-${size || 'none'}`} className="border-[#f1f5f9]">
        <TableCell>
          <div className="flex items-center gap-3">
            {product.productImage ? (
              <img
                src={product.productImage}
                alt=""
                className="w-11 h-11 rounded-xl object-cover border border-[#e2e8f0]"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-[#f1f5f9] flex items-center justify-center">
                <Package className="w-5 h-5 text-[#94a3b8]" />
              </div>
            )}
            <div>
              <span className="font-semibold text-[#0f172a] text-[14px]">{product.name}</span>
              {showBrand && (
                <p className="text-[11px] text-[#64748b]">
                  {brandNameById(brands, product.brand)} · {product.type}
                </p>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="font-mono text-[13px] text-[#475569]">{product.productCode}</TableCell>
        <TableCell className="text-[13px] font-medium text-[#0f172a]">{packLabel}</TableCell>
        <TableCell>
          <span
            className={cn(
              'font-bold text-[14px]',
              status === 'in' && 'text-[#16a34a]',
              status === 'low' && 'text-[#ea580c]',
              status === 'out' && 'text-[#dc2626]'
            )}
          >
            {qty} {qty === 1 ? 'container' : 'containers'}
          </span>
        </TableCell>
        <TableCell className="font-semibold text-[#0f172a] text-[14px]">{product.base?.trim() || '—'}</TableCell>
        <TableCell>
          <StatusBadge status={status} />
        </TableCell>
        <TableCell className="text-right">
          <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-[#64748b] hover:text-[#2563eb]"
              onClick={() => openEditProduct(product)}
              aria-label="Edit product"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-[#64748b] hover:text-[#dc2626]"
              onClick={() => deleteProduct(product)}
              aria-label="Delete product"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div className="min-h-full bg-[#f8fafc]">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#e2e8f0] px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <p className="text-[13px] text-[#64748b] font-medium shrink-0 hidden sm:block">{breadcrumb}</p>
          <div className="relative flex-1 max-w-md mx-auto hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
            <Input
              placeholder={
                selectedType
                  ? 'Search by name, code or base'
                  : selectedBrand
                    ? 'Search product types...'
                    : 'Search by brand name'
              }
              value={globalSearch}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setGlobalSearch(e.target.value)}
              className="w-full pl-9 pr-14 h-10 rounded-xl border-[#e2e8f0] bg-[#f8fafc] text-sm"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#94a3b8] bg-white px-1.5 py-0.5 rounded border border-[#e2e8f0]">
              ⌘ K
            </kbd>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-auto">
            <button
              type="button"
              className="relative w-10 h-10 rounded-xl border border-[#e2e8f0] bg-white flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc]"
            >
              <Bell className="w-4 h-4" strokeWidth={2} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#2563eb]" />
            </button>
            <div className="w-10 h-10 rounded-full bg-[#2563eb] flex items-center justify-center text-white text-sm font-bold">
              {(user?.name?.[0] ?? 'A').toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5 sm:space-y-6">
        {/* ── Brands view ── */}
        {showBrandsView && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-[28px] font-bold text-[#0f172a] tracking-tight">Brands</h1>
                <p className="text-[14px] text-[#64748b] mt-1">Manage all your brand products</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={openCreateBrand}
                  className="rounded-xl bg-[var(--brand-primary)] hover:opacity-90 h-10 px-5 text-sm font-semibold shadow-[0_4px_14px_rgba(19,88,250,0.25)]"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Add Brand
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label="Total Brands"
                value={loading ? '…' : String(globalStats.totalBrands)}
                trend="+2 this month"
                icon={ShoppingBag}
                iconBg="bg-[#dbeafe]"
                iconColor="text-[#2563eb]"
                sparkColor="#2563eb"
                seed="brands"
              />
              <StatCard
                label="Total Product Types"
                value={loading ? '…' : String(globalStats.totalTypes)}
                trend="+5 this month"
                icon={Layers}
                iconBg="bg-[#f3e8ff]"
                iconColor="text-[#9333ea]"
                sparkColor="#9333ea"
                seed="types"
              />
              <StatCard
                label="Total Products"
                value={loading ? '…' : globalStats.totalProducts.toLocaleString('en-IN')}
                trend="+120 this month"
                icon={Box}
                iconBg="bg-[#ffedd5]"
                iconColor="text-[#ea580c]"
                sparkColor="#ea580c"
                seed="products"
              />
            </div>

            <section className="bg-white rounded-[18px] sm:rounded-[20px] border border-[#e2e8f0] shadow-sm overflow-x-auto">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 sm:p-5 border-b border-[#f1f5f9]">
                <div className="relative flex-1 min-w-0 max-w-full lg:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                  <Input
                    placeholder="Search by brand name"
                    value={brandSearch}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setBrandSearch(e.target.value)}
                    className="pl-9 h-10 rounded-xl border-[#e2e8f0] bg-[#f8fafc] text-sm"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setFilterDialog(true)}
                    className="h-10 rounded-xl border-[#e2e8f0] bg-white text-[#64748b] hover:bg-[#f8fafc] gap-2"
                  >
                    <SlidersHorizontal className="w-4 h-4" /> Filter
                  </Button>
                  <Select value={brandSort} onValueChange={(v) => setBrandSort(v as typeof brandSort)}>
                    <SelectTrigger className="h-10 rounded-xl border-[#e2e8f0] bg-white min-w-[130px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Sort by · Newest</SelectItem>
                      <SelectItem value="name">Sort by · Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow className="bg-[#f8fafc] hover:bg-[#f8fafc] border-[#f1f5f9]">
                    <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wide pl-6">Brand</TableHead>
                    <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wide">Types</TableHead>
                    <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wide">Products</TableHead>
                    <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wide">Status</TableHead>
                    <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wide text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && !brands.length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16 text-center">
                        <Loader2 className="h-7 w-7 animate-spin mx-auto text-[#94a3b8]" />
                      </TableCell>
                    </TableRow>
                  ) : pagedBrands.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16 text-center text-[#64748b]">
                        No brands found
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedBrands.map((brand) => {
                      const stats = brandStats(brand._id);
                      return (
                        <TableRow
                          key={brand._id}
                          className="border-[#f1f5f9] cursor-pointer hover:bg-[#f8fafc]/80"
                          onClick={() => selectBrand(brand)}
                        >
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-10 rounded-md bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-center shrink-0 px-1">
                                {brand.image ? (
                                  <img
                                    src={brand.image}
                                    alt=""
                                    className="max-w-full max-h-full w-auto h-auto object-contain"
                                  />
                                ) : (
                                  <span className="text-xs font-bold text-[#475569]">
                                    {brandInitials(brand.name)}
                                  </span>
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-[#0f172a] text-[14px]">{brand.name}</p>
                                <p className="text-[12px] text-[#64748b] mt-0.5">{brandTagline(brand.name)}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-[14px] font-medium text-[#334155]">{stats.typeCount}</TableCell>
                          <TableCell className="text-[14px] font-medium text-[#334155]">{stats.productCount.toLocaleString('en-IN')}</TableCell>
                          <TableCell>
                            {brand.isActive !== false ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold bg-[#dcfce7] text-[#15803d]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold bg-[#f1f5f9] text-[#64748b]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#94a3b8]" /> Inactive
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 px-2.5 text-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-tertiary)]"
                                onClick={(e: MouseEvent<HTMLElement>) => openEditBrand(brand, e)}
                              >
                                <Pencil className="w-3.5 h-3.5" /> Edit
                              </Button>
                              <ActionMenu>
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onSelect={() => openEditBrand(brand)}
                                >
                                  <Pencil className="w-4 h-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onSelect={() => selectBrand(brand)}
                                >
                                  <Layers className="w-4 h-4 mr-2" /> View product types
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onSelect={() => toggleBrandActive(brand)}
                                >
                                  {brand.isActive === false ? 'Activate' : 'Deactivate'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                                  onSelect={() =>
                                    setConfirmDelete({ kind: 'brand', id: brand._id, label: brand.name })
                                  }
                                >
                                  <Trash2 className="w-4 h-4 mr-2 text-red-600" /> Delete
                                </DropdownMenuItem>
                              </ActionMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {filteredBrands.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-[#f1f5f9] bg-[#fafafa]">
                  <p className="text-[13px] text-[#64748b]">
                    Showing {(brandPage - 1) * BRAND_PAGE_SIZE + 1} to{' '}
                    {Math.min(brandPage * BRAND_PAGE_SIZE, filteredBrands.length)} of{' '}
                    {filteredBrands.length} brands
                  </p>
                  <PaginationBar
                    page={brandPage}
                    totalPages={brandTotalPages}
                    onPageChange={setBrandPage}
                  />
                </div>
              )}
            </section>
          </>
        )}

        {/* ── Product types ── */}
        {selectedBrand && !selectedType && (
          <section className="bg-white rounded-[20px] border border-[#e2e8f0] shadow-sm p-6">
            <nav className="text-[13px] text-[#64748b] mb-3">
              <span className="hover:text-[#2563eb] cursor-pointer" onClick={goToBrands}>
                Inventory
              </span>
              <span className="mx-2">/</span>
              <span className="font-medium text-[#0f172a]">{selectedBrand.name}</span>
            </nav>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToBrands}
                  className="rounded-xl border-[#e2e8f0] h-9 px-3 text-[#64748b]"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Brands
                </Button>
                <h2 className="text-xl font-bold text-[#0f172a]">{selectedBrand.name}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                  <Input
                    placeholder="Search product types..."
                    value={typeSearch}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setTypeSearch(e.target.value)}
                    className="pl-9 h-10 w-full min-w-0 sm:w-[220px] rounded-xl border-[#e2e8f0] text-sm"
                  />
                </div>
                <Button
                  onClick={openCreateType}
                  className="rounded-xl bg-[var(--brand-primary)] hover:opacity-90 h-10 px-4 text-sm font-semibold text-white"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Add product type
                </Button>
              </div>
            </div>

            {loading && !types.length ? (
              <LoaderCenter />
            ) : filteredTypes.length === 0 ? (
              <EmptyBlock label="No product types yet" onAdd={openCreateType} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredTypes.map((type) => {
                  const stats = typeStats(type.name);
                  const { Icon, bg, color } = resolveTypeIcon(type.icon, type.name);
                  return (
                    <div
                      key={type._id}
                      className="relative group rounded-[16px] border border-[#e8edf3] bg-white p-5 min-h-[148px] flex flex-col justify-between hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:border-[#dbe3ef] transition-all cursor-pointer"
                      onClick={() => selectType(type)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className={cn('w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0', bg)}>
                          <Icon className={cn('w-5 h-5', color)} strokeWidth={2} />
                        </div>
                        <div className="flex items-start gap-1">
                          <p className="text-[32px] sm:text-[34px] font-bold text-[#1e293b] tracking-tight leading-none tabular-nums">
                            {stats.productCount}
                          </p>
                          <div
                            className="opacity-0 group-hover:opacity-100 transition-opacity -mt-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ActionMenu>
                              <DropdownMenuItem className="cursor-pointer" onSelect={() => openEditType(type)}>
                                <Pencil className="w-4 h-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer" onSelect={() => selectType(type)}>
                                <Package className="w-4 h-4 mr-2" /> View products
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                                onSelect={() =>
                                  setConfirmDelete({ kind: 'type', id: type._id, label: type.name })
                                }
                              >
                                <Trash2 className="w-4 h-4 mr-2 text-red-600" /> Delete
                              </DropdownMenuItem>
                            </ActionMenu>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 min-w-0">
                        <p className="text-[16px] font-semibold text-[#1e293b] truncate leading-snug">
                          {type.name}
                        </p>
                        <p className="text-[13px] text-[#94a3b8] mt-1.5">
                          Stock: {stats.totalStock.toLocaleString('en-IN')} containers
                        </p>
                        <p className="text-[13px] font-semibold text-[#16a34a] mt-1.5">
                          +{stats.productCount} this month
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── Products table ── */}
        {selectedBrand && selectedType && (
          <section className="bg-white rounded-[18px] sm:rounded-[20px] border border-[#e2e8f0] shadow-sm overflow-x-auto">
            <div className="p-4 sm:p-6 border-b border-[#f1f5f9]">
              <nav className="text-[13px] text-[#64748b] mb-3 overflow-x-auto whitespace-nowrap">
                <span className="cursor-pointer hover:text-[#2563eb]" onClick={goToBrands}>
                  Inventory
                </span>
                <span className="mx-2">/</span>
                <span className="cursor-pointer hover:text-[#2563eb]" onClick={backToTypes}>
                  {selectedBrand.name}
                </span>
                <span className="mx-2">/</span>
                <span className="font-medium text-[#0f172a]">{selectedType.name}</span>
              </nav>

              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={backToTypes}
                    className="rounded-xl border-[#e2e8f0] h-9 px-3 text-[#64748b] shrink-0"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Types
                  </Button>
                  <h2 className="text-xl font-bold text-[#0f172a]">{selectedType.name}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                    <Input
                      placeholder="Search by name, code or base"
                      value={productSearch}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setProductSearch(e.target.value);
                        setProductPage(1);
                      }}
                      className="pl-9 h-10 w-full min-w-0 sm:w-[200px] rounded-xl border-[#e2e8f0] text-sm"
                    />
                  </div>
                  <Button
                    onClick={openCreateProduct}
                    className="rounded-xl bg-[var(--brand-primary)] hover:opacity-90 h-10 px-4 text-sm font-semibold"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Add product
                  </Button>
                </div>
              </div>
            </div>

            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow className="bg-[#f8fafc] hover:bg-[#f8fafc] border-[#f1f5f9]">
                  <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wide">Product</TableHead>
                  <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wide">SKU</TableHead>
                  <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wide">Pack Size</TableHead>
                  <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wide">Stock</TableHead>
                  <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wide">Base</TableHead>
                  <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wide">Status</TableHead>
                  <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wide text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center">
                      <Loader2 className="h-7 w-7 animate-spin mx-auto text-[#94a3b8]" />
                    </TableCell>
                  </TableRow>
                ) : pagedProductRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center text-[#64748b]">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedProductRows.map((row) => renderProductRow(row))
                )}
              </TableBody>
            </Table>

            {productSizeRows.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-[#f1f5f9] bg-[#fafafa]">
                <p className="text-[13px] text-[#64748b]">
                  Showing {(productPage - 1) * PAGE_SIZE + 1} to{' '}
                  {Math.min(productPage * PAGE_SIZE, productSizeRows.length)} of{' '}
                  {productSizeRows.length} size rows
                  {filteredProducts.length !== productSizeRows.length
                    ? ` (${filteredProducts.length} products)`
                    : ''}
                </p>
                <PaginationBar
                  page={productPage}
                  totalPages={totalPages}
                  onPageChange={setProductPage}
                />
              </div>
            )}
          </section>
        )}
      </div>


      {/* Dialogs */}
      <Dialog
        open={brandDialog}
        onOpenChange={(open: boolean) => {
          setBrandDialog(open);
          if (!open) {
            setEditingBrandId(null);
            setBrandName('');
            setBrandImage('');
            setBrandIsActive(true);
          }
        }}
      >
        <DialogContent
          showCloseButton
          className="sm:max-w-[440px] p-0 gap-0 overflow-hidden rounded-[20px] border-[#e2e8f0] bg-white shadow-[0_24px_48px_rgba(15,23,42,0.12)]"
        >
          <div className="px-6 pt-6 pb-4 border-b border-[#f1f5f9] bg-[#fafafa]">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#2563eb] flex items-center justify-center shrink-0 shadow-[0_4px_14px_rgba(37,99,235,0.35)]">
                <Package className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div className="pt-0.5">
                <DialogTitle className="text-[18px] font-bold text-[#0f172a] text-left">
                  {editingBrandId ? 'Edit brand' : 'Add new brand'}
                </DialogTitle>
                <p className="text-[13px] text-[#64748b] mt-1.5 leading-relaxed">
                  Create a paint company or supplier to organize product types and stock.
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5 bg-white">
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-[#334155]">Brand name</Label>
              <Input
                value={brandName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setBrandName(e.target.value)}
                placeholder="e.g. Asian Paints, Berger, Nerolac"
                className="h-11 rounded-xl border-[#e2e8f0] bg-[#fafafa] text-[#0f172a] placeholder:text-[#94a3b8] focus-visible:bg-white focus-visible:border-[#2563eb] focus-visible:ring-[#2563eb]/20"
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && saveBrand()}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-[#334155]">
                Logo URL <span className="font-normal text-[#94a3b8]">(optional)</span>
              </Label>
              <Input
                value={brandImage}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setBrandImage(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="h-11 rounded-xl border-[#e2e8f0] bg-[#fafafa] text-[#0f172a] placeholder:text-[#94a3b8] focus-visible:bg-white focus-visible:border-[#2563eb] focus-visible:ring-[#2563eb]/20"
              />
            </div>
            {editingBrandId && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={brandIsActive}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setBrandIsActive(e.target.checked)}
                  className="rounded border-[#e2e8f0]"
                />
                <span className="text-[13px] font-medium text-[#334155]">Active brand</span>
              </label>
            )}
            {(brandName || brandImage) && (
              <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-white border border-[#e2e8f0] flex items-center justify-center overflow-hidden text-xs font-bold text-[#475569] shrink-0">
                  {brandImage ? (
                    <img src={brandImage} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    brandInitials(brandName || 'BR')
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0f172a]">{brandName || 'Brand name'}</p>
                  <p className="text-xs text-[#64748b]">Preview on brand card</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 bg-[#fafafa] border-t border-[#f1f5f9] sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setBrandDialog(false)}
              className="rounded-xl h-10 px-5 border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc]"
            >
              Cancel
            </Button>
            <Button
              onClick={saveBrand}
              disabled={!brandName.trim() || saving}
              className="rounded-xl h-10 px-6 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold shadow-[0_4px_14px_rgba(37,99,235,0.3)] disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingBrandId ? 'Save changes' : <><Plus className="w-4 h-4 mr-1.5" /> Create brand</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={typeDialog}
        onOpenChange={(open: boolean) => {
          setTypeDialog(open);
          if (!open) {
            setEditingTypeId(null);
            setTypeName('');
            setTypeBrandId('');
            setTypeIconKey('paintbrush');
          }
        }}
      >
        <DialogContent
          showCloseButton
          className="sm:max-w-[480px] max-h-[min(90vh,680px)] p-0 gap-0 overflow-hidden rounded-[20px] border border-[#e2e8f0] bg-white shadow-[0_24px_48px_rgba(15,23,42,0.12)] !flex !flex-col"
        >
          <div className="shrink-0 px-6 pt-6 pb-4 border-b border-[#f1f5f9] bg-[#fafafa]">
            <div className="flex items-start gap-4 pr-8">
              <div className="w-12 h-12 rounded-2xl bg-[#2563eb] flex items-center justify-center shrink-0 shadow-[0_4px_14px_rgba(37,99,235,0.35)]">
                <Layers className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div className="pt-0.5 min-w-0">
                <DialogTitle className="text-[18px] font-bold text-[#0f172a] text-left">
                  {editingTypeId ? 'Edit product type' : 'Add product type'}
                </DialogTitle>
                <p className="text-[13px] text-[#64748b] mt-1.5 leading-relaxed">
                  Group products under a category like Emulsion, Primer, or Distemper.
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-white min-h-0">
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-[#334155]">Brand</Label>
              {editingTypeId ? (
                <div className="h-11 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 flex items-center text-sm font-medium text-[#0f172a]">
                  {brandNameById(brands, typeBrandId)}
                </div>
              ) : (
                <Select value={typeBrandId} onValueChange={setTypeBrandId}>
                  <SelectTrigger className="h-11 rounded-xl border-[#e2e8f0] bg-[#fafafa] w-full">
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#e2e8f0]">
                    {brands
                      .filter((b) => b.isActive !== false)
                      .map((b) => (
                        <SelectItem key={b._id} value={b._id}>
                          {b.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-[#334155]">Type name</Label>
              <Input
                type="text"
                value={typeName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTypeName(e.target.value)}
                placeholder="e.g. Emulsion, Distemper, Primer"
                className="h-11 rounded-xl border-[#e2e8f0] bg-[#fafafa] text-[#0f172a] placeholder:text-[#94a3b8] focus-visible:bg-white focus-visible:border-[#2563eb] focus-visible:ring-[#2563eb]/20"
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && saveType()}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[13px] font-semibold text-[#334155]">Icon</Label>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {TYPE_ICON_OPTIONS.map(({ key, Icon, bg, color, label }) => {
                  const selected = typeIconKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      title={label}
                      onClick={() => setTypeIconKey(key)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 shrink-0 rounded-xl border p-2.5 transition-all min-w-[68px] bg-white',
                        selected
                          ? 'border-[#2563eb] bg-[#eff6ff] ring-2 ring-[#2563eb]/20 shadow-sm'
                          : 'border-[#e2e8f0] bg-[#fafafa] hover:border-[#bfdbfe] hover:bg-white'
                      )}
                    >
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', bg)}>
                        <Icon className={cn('w-5 h-5', color)} strokeWidth={2} />
                      </div>
                      <span className={cn('text-[10px] font-medium', selected ? 'text-[#2563eb]' : 'text-[#64748b]')}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {(typeName || typeIconKey) && (() => {
              const preview = resolveTypeIcon(typeIconKey, typeName);
              const PreviewIcon = preview.Icon;
              return (
                <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 flex items-center gap-3">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', preview.bg)}>
                    <PreviewIcon className={cn('w-6 h-6', preview.color)} strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0f172a] truncate">{typeName || 'Product type'}</p>
                    <p className="text-xs text-[#64748b]">
                      Preview · {brandNameById(brands, typeBrandId)}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          <DialogFooter className="shrink-0 px-6 py-4 bg-[#fafafa] border-t border-[#f1f5f9] sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setTypeDialog(false)}
              className="rounded-xl h-10 px-5 border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc]"
            >
              Cancel
            </Button>
            <Button
              onClick={saveType}
              disabled={!typeName.trim() || !typeBrandId || saving}
              className="rounded-xl h-10 px-6 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold shadow-[0_4px_14px_rgba(37,99,235,0.3)] disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingTypeId ? 'Save changes' : <><Plus className="w-4 h-4 mr-1.5" /> Create type</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={filterDialog} onOpenChange={setFilterDialog}>
        <DialogContent className="sm:max-w-[360px] rounded-[20px] bg-white border-[#e2e8f0]">
          <DialogHeader>
            <DialogTitle>Filter brands</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Status</Label>
            <Select value={brandStatusFilter} onValueChange={(v) => setBrandStatusFilter(v as typeof brandStatusFilter)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All brands</SelectItem>
                <SelectItem value="active">Active only</SelectItem>
                <SelectItem value="inactive">Inactive only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBrandStatusFilter('all'); setFilterDialog(false); }}>Reset</Button>
            <Button onClick={() => setFilterDialog(false)} className="bg-[#2563eb] hover:bg-[#1d4ed8]">Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(open: boolean) => !open && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-[20px] bg-white border-[#e2e8f0]">
          <DialogHeader>
            <DialogTitle>Confirm delete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#64748b]">
            Delete <strong className="text-[#0f172a]">{confirmDelete?.label}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={executeDelete}
              disabled={saving}
              className="bg-[#dc2626] text-white hover:bg-[#b91c1c]"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!stockProduct} onOpenChange={(open: boolean) => !open && setStockProduct(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-[20px] bg-white border-[#e2e8f0]">
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
          </DialogHeader>
          {stockProduct && (
            <div className="space-y-4 py-2">
              <p className="text-sm font-medium text-[#0f172a]">{stockProduct.name}</p>
              <div className="space-y-2">
                <Label>Pack size</Label>
                <Select value={stockSize} onValueChange={setStockSize}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAINT_SIZES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {formatPackSizeLabel(s, stockProduct.unit)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity change (+ add / − remove)</Label>
                <Input
                  type="number"
                  value={stockQty}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setStockQty(+e.target.value)}
                  className="rounded-xl"
                  placeholder="e.g. 10 or -5"
                />
                <p className="text-xs text-[#64748b]">
                  Current:{' '}
                  {stockProduct.stockBySize?.[stockSize as keyof typeof stockProduct.stockBySize] ?? 0}{' '}
                  {stockProduct.unit || 'units'} ({formatPackSizeLabel(stockSize, stockProduct.unit)})
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockProduct(null)}>Cancel</Button>
            <Button onClick={saveStockAdjust} disabled={saving} className="bg-[#2563eb] hover:bg-[#1d4ed8]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update stock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={productDialog} onOpenChange={setProductDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[20px]">
          <DialogHeader>
            <DialogTitle>{editingProductId ? 'Edit product' : 'Add product'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={productForm.name} onChange={(e: ChangeEvent<HTMLInputElement>) => setProductForm({ ...productForm, name: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>SKU / Product code</Label>
                <Input value={productForm.productCode} onChange={(e: ChangeEvent<HTMLInputElement>) => setProductForm({ ...productForm, productCode: e.target.value })} className="rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Base (optional)</Label>
                <Input value={productForm.base} onChange={(e: ChangeEvent<HTMLInputElement>) => setProductForm({ ...productForm, base: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select
                  value={
                    PRODUCT_UNITS.includes(productForm.unit as (typeof PRODUCT_UNITS)[number])
                      ? productForm.unit
                      : productForm.unit || 'L'
                  }
                  onValueChange={(v) => setProductForm({ ...productForm, unit: v })}
                >
                  <SelectTrigger className="rounded-xl w-full">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {PRODUCT_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u === 'L' ? 'L (Litre)' : u === 'kg' ? 'kg' : u === 'Pck' ? 'Pck (Pack)' : u}
                      </SelectItem>
                    ))}
                    {productForm.unit &&
                      !PRODUCT_UNITS.includes(productForm.unit as (typeof PRODUCT_UNITS)[number]) && (
                        <SelectItem value={productForm.unit}>{productForm.unit}</SelectItem>
                      )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input value={productForm.productImage} onChange={(e: ChangeEvent<HTMLInputElement>) => setProductForm({ ...productForm, productImage: e.target.value })} className="rounded-xl" />
            </div>
            <div>
              <Label className="mb-2 block">
                Stock by size
                <span className="font-normal text-[#94a3b8]"> · containers per pack</span>
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PAINT_SIZES.map((size) => (
                  <div key={size} className="space-y-1">
                    <Label className="text-xs text-[#64748b]">
                      {formatPackSizeLabel(size, productForm.unit)}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={productForm.stockBySize[size]}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setProductForm({
                          ...productForm,
                          stockBySize: { ...productForm.stockBySize, [size]: +e.target.value },
                        })
                      }
                      className="rounded-lg h-9"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-xl bg-[#f8fafc] border border-[#eef2f7] px-3.5 py-2.5 text-[13px]">
                <span className="font-semibold text-[#0f172a]">
                  {totalContainers(productForm.stockBySize)}{' '}
                  {totalContainers(productForm.stockBySize) === 1 ? 'container' : 'containers'}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Low stock threshold</Label>
              <Input
                type="number"
                min={0}
                value={productForm.lowStockThreshold}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setProductForm({ ...productForm, lowStockThreshold: +e.target.value })}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialog(false)}>Cancel</Button>
            <Button onClick={saveProduct} className="bg-[#2563eb] hover:bg-[#1d4ed8]">
              {editingProductId ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: 'in' | 'low' | 'out' }) {
  if (status === 'in') {
    return (
      <span className="inline-flex px-3 py-1 rounded-full text-[12px] font-semibold bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]">
        In Stock
      </span>
    );
  }
  if (status === 'low') {
    return (
      <span className="inline-flex px-3 py-1 rounded-full text-[12px] font-semibold bg-[#ffedd5] text-[#c2410c] border border-[#fed7aa]">
        Low Stock
      </span>
    );
  }
  return (
    <span className="inline-flex px-3 py-1 rounded-full text-[12px] font-semibold bg-[#fee2e2] text-[#dc2626] border border-[#fecaca]">
      Out of Stock
    </span>
  );
}

function LoaderCenter() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-[#94a3b8]" />
    </div>
  );
}

function EmptyBlock({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div className="text-center py-12 rounded-[16px] border border-dashed border-[#cbd5e1] bg-[#fafafa]">
      <Package className="h-12 w-12 mx-auto mb-3 text-[#cbd5e1]" />
      <p className="text-[#64748b] mb-4">{label}</p>
      <Button onClick={onAdd} className="bg-[#2563eb] hover:bg-[#1d4ed8] rounded-xl">
        <Plus className="h-4 w-4 mr-2" /> Add
      </Button>
    </div>
  );
}
