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
  price: number;
  stock: number;
  lowStockThreshold: number;
  stockBySize: SizeMap;
  priceBySize: SizeMap;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  /** @deprecated use stock — kept for billing compat */
  stockQty?: number;
  /** @deprecated use priceBySize — kept for billing compat */
  salePrice?: number;
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
  pdfUrl?: string;
  status: BillStatus;
  createdAt: string;
}

// CashMemo
export interface CashMemo {
  _id: string;
  tenantId: string;
  memoNo: string;
  billId: string;
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
  bills: string[];
  memos: string[];
  lastActivityAt: string;
}

export interface AccountWithCustomer extends Omit<Account, 'customerId'> {
  customerId: Customer;
}

export interface BillWithPayments extends Bill {
  amountPaid: number;
  balanceDue: number;
}

export interface CashMemoWithRefs extends CashMemo {
  billId: { _id: string; billNo: string; grandTotal: number } | string;
  customerId?: Customer | string;
}

export interface CustomerDetail {
  customer: Customer;
  account: Account | null;
  bills: BillWithPayments[];
  memos: CashMemoWithRefs[];
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

// Expenses
export interface Expense {
  _id: string;
  tenantId: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  addedBy: string;
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
