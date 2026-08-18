// Auth & Tenant
export type TenantPlan = 'free' | 'pro';
export type TenantStatus = 'pending' | 'approved' | 'rejected';
export type UserRole = 'admin' | 'staff' | 'superadmin';

export interface Tenant {
  _id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  status?: TenantStatus;
  phone?: string;
  address?: string;
  gstin?: string;
  createdAt?: string;
}

export interface TenantRegistration {
  _id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  status: TenantStatus;
  rejectionReason?: string;
  createdAt: string;
  owner?: {
    _id: string;
    name: string;
    email: string;
  };
}

export interface User {
  _id: string;
  tenantId: string;
  name: string;
  email: string;
  role: UserRole;
}

// Inventory — paint sizes & hierarchy
export const PAINT_SIZES = ['50ml', '100ml', '200ml', '500ml', '1L', '4L', '10L', '20L'] as const;
export type PaintSize = (typeof PAINT_SIZES)[number];
export type SizeMap = Record<PaintSize, number>;

/** Common product units — pack size labels follow the selected unit (L → kg, Pck, etc.) */
export const PRODUCT_UNITS = ['L', 'kg', 'Pck', 'pcs', 'bag', 'box'] as const;
export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export function emptySizeMap(): SizeMap {
  return {
    '50ml': 0,
    '100ml': 0,
    '200ml': 0,
    '500ml': 0,
    '1L': 0,
    '4L': 0,
    '10L': 0,
    '20L': 0,
  };
}

function isLitreUnit(unit?: string) {
  return /^(l|ltr|litre|liter|litres|liters)$/i.test((unit ?? 'L').trim() || 'L');
}

/**
 * Display pack size using the product unit.
 * Storage keys stay as PAINT_SIZES (e.g. 1L); labels become "1 kg", "1 Pck", etc.
 */
export function formatPackSizeLabel(size: string, unit?: string): string {
  const u = (unit ?? 'L').trim() || 'L';
  if (isLitreUnit(u)) {
    if (/ml$/i.test(size)) return size.replace(/ml$/i, ' ml');
    if (/L$/i.test(size)) return size.replace(/L$/i, ' L');
    return size;
  }
  const m = size.match(/^(\d+(?:\.\d+)?)/);
  if (!m) return size;
  return `${m[1]} ${u}`;
}

export interface Brand {
  _id: string;
  tenantId: string;
  name: string;
  image?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductType {
  _id: string;
  tenantId: string;
  brandId: string;
  name: string;
  icon?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  _id: string;
  tenantId: string;
  name: string;
  brand: string; // Brand _id
  brandName?: string;
  type: string; // Product type name
  productCode: string;
  productImage?: string;
  description?: string;
  base?: string;
  unit: string;
  stock: number;
  lowStockThreshold: number;
  stockBySize: SizeMap;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  /** @deprecated use stock — kept for billing compat */
  stockQty?: number;
  lowStockAlert?: number;
}

// Billing
export type BillStatus = 'paid' | 'partial' | 'due';

export interface BillItem {
  productId: string;
  productName: string;
  qty: number;
  rate: number;
  total: number;
}

export interface Bill {
  _id: string;
  tenantId: string;
  billNo: string;
  customerId: string;
  items: BillItem[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  amountPaid?: number;
  creditApplied?: number;
  paymentMode?: string;
  pdfUrl?: string;
  status: BillStatus;
  createdAt: string;
}

// CashMemo — customer advance token (not an invoice payment)
export interface CashMemo {
  _id: string;
  tenantId: string;
  memoNo: string;
  billId?: string;
  customerId: string;
  amountPaid: number;
  paymentMode: string;
  paidAt: string;
  pdfUrl?: string;
}

// Accounts
export interface Account {
  _id: string;
  tenantId: string;
  customerId: string;
  totalBilled: number;
  totalPaid: number;
  dueBalance: number;
  creditBalance: number;
  lastActivityAt: string;
}

export interface AccountWithCustomer extends Omit<Account, 'customerId'> {
  customerId: Customer;
}

export interface BillWithPayments extends Bill {
  amountPaid: number;
  balanceDue: number;
  billCredit?: number;
  /** Sum of return amounts recorded against this bill */
  returnedAmount?: number;
}

export interface CashMemoWithRefs extends Omit<CashMemo, 'billId' | 'customerId'> {
  billId?: { _id: string; billNo: string; grandTotal: number } | string;
  customerId?: Customer | string;
}

export interface CustomerDetail {
  customer: Customer;
  account: Account | null;
  bills: BillWithPayments[];
  memos: CashMemoWithRefs[];
  returns: ReturnItem[];
}

export interface ReturnItem {
  _id: string;
  tenantId: string;
  customerId: string | { _id: string; name: string };
  billId: string | { _id: string; billNo: string };
  productId: string;
  productName: string;
  qty: number;
  rate: number;
  amount: number;
  creditIssued?: number;
  reason?: string;
  createdAt: string;
}

// Customer
export interface Customer {
  _id: string;
  tenantId: string;
  name: string;
  phone: string;
  address: string;
  gstin?: string;
  createdAt: string;
}

// Painters
export interface Painter {
  _id: string;
  tenantId: string;
  name: string;
  phone: string;
  notes?: string;
  createdAt: string;
}

export interface PainterWithStats extends Painter {
  totalPaid: number;
}

export interface PainterDetail {
  painter: Painter;
  payments: Expense[];
  totalPaid: number;
}

// Expenses
export interface Expense {
  _id: string;
  tenantId: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  addedBy: string;
  painterId?: string | { _id: string; name: string } | null;
}

// Reports
export interface ReportSnapshot {
  _id: string;
  tenantId: string;
  period: string;
  totalSales: number;
  totalCollected: number;
  totalDue: number;
  totalExpenses: number;
  topProducts: Array<{ productId: string; name: string; qty: number; revenue: number }>;
}

/** Home dashboard — single overview payload */
export type DashboardPeriod = 'this-month' | 'last-month' | 'this-week';

export interface DashboardTrend {
  pct: string;
  up: boolean;
}

export interface DashboardOverview {
  period: DashboardPeriod;
  compareLabel: string;
  metrics: {
    revenue: number;
    revenueTrend: DashboardTrend;
    totalDue: number;
    totalDueTrend: DashboardTrend;
    totalExpenses: number;
    totalExpensesTrend: DashboardTrend;
    netRevenue: number;
    netRevenueTrend: DashboardTrend;
  };
  awaitingBills: number;
  waitingCustomers: number;
  revenueBars: Array<{ key: string; label: string; value: number }>;
  categoryData: Array<{ name: string; value: number; color: string }>;
}

// API responses
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
