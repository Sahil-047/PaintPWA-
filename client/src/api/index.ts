import { axiosInstance } from './axiosInstance';
import type {
  ApiResponse,
  Product,
  Brand,
  ProductType,
  Bill,
  Account,
  AccountWithCustomer,
  Customer,
  CustomerDetail,
  CashMemo,
  CashMemoWithRefs,
  Expense,
  Painter,
  PainterWithStats,
  PainterDetail,
  PaginatedResponse,
  TenantRegistration,
  TenantStatus,
  ReturnItem,
  DashboardOverview,
} from '@paint-saas/shared-types';

export interface AuthLoginResult {
  token: string;
  user: { _id: string; name: string; email: string; role: string };
  tenant?: {
    _id: string;
    name: string;
    slug: string;
    plan: string;
    status?: TenantStatus;
    phone?: string;
    address?: string;
    gstin?: string;
  };
  isSuperAdmin?: boolean;
}

export interface AuthRegisterResult {
  pending: true;
  message: string;
  tenant: { _id: string; name: string; slug: string; plan: string; status: TenantStatus };
}

export interface DashboardStats {
  totalSales: number;
  netSales: number;
  grossSales: number;
  totalReturns: number;
  totalCollected: number;
  totalDue: number;
  totalCreditLiability: number;
  totalExpenses: number;
  topProducts: Array<{ productId: string; name: string; qty: number; revenue: number }>;
}

function unwrap<T>(res: { data: ApiResponse<T> | { success: boolean; data: T } }): T {
  return res.data.data as T;
}

/** Share one in-flight promise so StrictMode / remounts don't hit the network twice. */
const inflightRequests = new Map<string, Promise<unknown>>();

function dedupeRequest<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflightRequests.get(key);
  if (existing) return existing as Promise<T>;
  const promise = fn().finally(() => {
    if (inflightRequests.get(key) === promise) {
      inflightRequests.delete(key);
    }
  });
  inflightRequests.set(key, promise);
  return promise;
}

export const authApi = {
  register: (data: {
    shopName: string;
    slug: string;
    name: string;
    email: string;
    password: string;
  }) => axiosInstance.post<{ success: boolean; data: AuthRegisterResult }>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    axiosInstance.post<ApiResponse<AuthLoginResult>>('/auth/login', data),

  me: () => axiosInstance.get<ApiResponse<AuthLoginResult>>('/auth/me'),

  updateProfile: async (data: { name: string; email: string }) => {
    const res = await axiosInstance.patch<
      ApiResponse<{ user: AuthLoginResult['user'] }>
    >('/auth/profile', data);
    return unwrap(res).user;
  },

  updatePassword: async (data: { currentPassword: string; newPassword: string }) => {
    const res = await axiosInstance.patch<ApiResponse<{ ok: true }>>('/auth/password', data);
    return unwrap(res);
  },

  updateShop: async (data: {
    name: string;
    phone?: string;
    address?: string;
    gstin?: string;
  }) => {
    const res = await axiosInstance.patch<
      ApiResponse<{ tenant: NonNullable<AuthLoginResult['tenant']> }>
    >('/auth/shop', data);
    return unwrap(res).tenant;
  },
};

export const adminApi = {
  listTenants: async (params?: {
    status?: 'pending' | 'approved' | 'rejected' | 'all';
    page?: number;
    limit?: number;
  }) => {
    const res = await axiosInstance.get<PaginatedResponse<TenantRegistration>>('/admin/tenants', {
      params,
    });
    return {
      items: (res.data.data ?? []) as TenantRegistration[],
      pagination: res.data.pagination as PaginationMeta,
    };
  },
  approveTenant: async (id: string) => {
    const res = await axiosInstance.patch<ApiResponse<TenantRegistration>>(
      `/admin/tenants/${id}/approve`
    );
    return unwrap(res);
  },
  rejectTenant: async (id: string, reason?: string) => {
    const res = await axiosInstance.patch<ApiResponse<TenantRegistration>>(
      `/admin/tenants/${id}/reject`,
      { reason }
    );
    return unwrap(res);
  },
};

export const inventoryApi = {
  listBrands: async () => {
    const res = await axiosInstance.get<ApiResponse<Brand[]>>('/inventory/brands');
    return unwrap(res);
  },
  createBrand: (data: { name: string; image?: string }) =>
    axiosInstance.post('/inventory/brands', data),
  updateBrand: (id: string, data: Partial<Brand>) =>
    axiosInstance.patch(`/inventory/brands/${id}`, data),
  deleteBrand: (id: string) => axiosInstance.delete(`/inventory/brands/${id}`),

  listTypes: async (brandId: string) => {
    const res = await axiosInstance.get<ApiResponse<ProductType[]>>(
      `/inventory/brands/${brandId}/types`
    );
    return unwrap(res);
  },
  createType: (brandId: string, data: { name: string; icon?: string }) =>
    axiosInstance.post(`/inventory/brands/${brandId}/types`, data),
  updateType: (id: string, data: Partial<ProductType>) =>
    axiosInstance.patch(`/inventory/types/${id}`, data),
  deleteType: (id: string) => axiosInstance.delete(`/inventory/types/${id}`),

  list: async (params?: { search?: string; brandId?: string; type?: string }) => {
    const res = await axiosInstance.get<ApiResponse<Product[]>>('/inventory', { params });
    return unwrap(res);
  },
  get: async (id: string) => {
    const res = await axiosInstance.get<ApiResponse<Product>>(`/inventory/products/${id}`);
    return unwrap(res);
  },
  create: (data: Partial<Product>) => axiosInstance.post('/inventory', data),
  update: (id: string, data: Partial<Product>) => axiosInstance.patch(`/inventory/${id}`, data),
  updateStock: (id: string, data: { qty: number; size?: string }) =>
    axiosInstance.patch(`/inventory/products/${id}/stock`, data),
  remove: (id: string) => axiosInstance.delete(`/inventory/products/${id}`),
  lowStock: async () => {
    const res = await axiosInstance.get<ApiResponse<Product[]>>('/inventory/low-stock');
    return unwrap(res);
  },
};

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const billingApi = {
  listProducts: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    brandId?: string;
    type?: string;
  }) => {
    const res = await axiosInstance.get<PaginatedResponse<Product>>('/bills/products', {
      params,
    });
    return {
      items: (res.data.data ?? []) as Product[],
      pagination: res.data.pagination as PaginationMeta,
    };
  },
  list: () =>
    dedupeRequest('bills:list', async () => {
      const res = await axiosInstance.get<ApiResponse<Bill[]>>('/bills');
      return unwrap(res);
    }),
  create: async (data: {
    customer: { name: string; phone?: string; address?: string; gstin?: string };
    items: Array<{ productId: string; qty: number; rate?: number; size?: string }>;
    discount?: number;
    amountPaid?: number;
    paymentMode?: string;
  }) => {
    const res = await axiosInstance.post<
      ApiResponse<{ bill: Bill; cashMemo: CashMemo | null }>
    >('/bills', data);
    return unwrap(res);
  },
  get: (id: string) => axiosInstance.get(`/bills/${id}`),
  openPdf: async (id: string, fileName?: string) => {
    const res = await axiosInstance.get(`/bills/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const win = window.open(url, '_blank');
    if (!win) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName ?? 'invoice'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};

export const cashmemoApi = {
  list: async () => {
    const res = await axiosInstance.get<ApiResponse<CashMemoWithRefs[]>>('/cashmemos');
    return unwrap(res);
  },
  create: async (data: {
    billId: string;
    customerId: string;
    amountPaid: number;
    paymentMode?: string;
  }) => {
    const res = await axiosInstance.post<ApiResponse<CashMemo>>('/cashmemos', data);
    return unwrap(res);
  },
  openPdf: async (id: string) => {
    const res = await axiosInstance.get(`/cashmemos/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};

export const accountsApi = {
  list: () =>
    dedupeRequest('accounts:list', async () => {
      const res = await axiosInstance.get<ApiResponse<AccountWithCustomer[]>>('/accounts');
      return unwrap(res);
    }),
  customers: () =>
    dedupeRequest('accounts:customers', async () => {
      const res = await axiosInstance.get<ApiResponse<Customer[]>>('/accounts/customers');
      return unwrap(res);
    }),
  createCustomer: async (data: {
    name: string;
    phone?: string;
    address?: string;
    gstin?: string;
  }) => {
    const res = await axiosInstance.post<ApiResponse<Customer>>('/accounts/customers', data);
    return unwrap(res);
  },
  getCustomer: (customerId: string) =>
    dedupeRequest(`accounts:customer:${customerId}`, async () => {
      const res = await axiosInstance.get<ApiResponse<CustomerDetail>>(
        `/accounts/customers/${customerId}`
      );
      return unwrap(res);
    }),
  updateCustomer: async (
    customerId: string,
    data: Partial<{ name: string; phone: string; address: string; gstin: string }>
  ) => {
    const res = await axiosInstance.patch<ApiResponse<Customer>>(
      `/accounts/customers/${customerId}`,
      data
    );
    return unwrap(res);
  },
};

export const returnsApi = {
  list: async (params?: { customerId?: string; billId?: string }) => {
    const res = await axiosInstance.get<ApiResponse<ReturnItem[]>>('/returns', { params });
    return unwrap(res);
  },
  create: async (data: {
    customerId: string;
    billId: string;
    productId: string;
    qty: number;
    reason?: string;
  }) => {
    const res = await axiosInstance.post<ApiResponse<ReturnItem>>('/returns', data);
    return unwrap(res);
  },
};

export const expensesApi = {
  list: async () => {
    const res = await axiosInstance.get<ApiResponse<Expense[]>>('/expenses');
    return unwrap(res);
  },
  create: async (data: {
    category: string;
    description?: string;
    amount: number;
    date?: string;
    painterId?: string | null;
  }) => {
    const res = await axiosInstance.post<ApiResponse<Expense>>('/expenses', data);
    return unwrap(res);
  },
  remove: async (id: string) => {
    const res = await axiosInstance.delete<ApiResponse<{ deleted: boolean }>>(`/expenses/${id}`);
    return unwrap(res);
  },
};

export const paintersApi = {
  list: () =>
    dedupeRequest('painters:list', async () => {
      const res = await axiosInstance.get<ApiResponse<PainterWithStats[]>>('/painters');
      return unwrap(res);
    }),
  create: async (data: { name: string; phone?: string; notes?: string }) => {
    const res = await axiosInstance.post<ApiResponse<Painter>>('/painters', data);
    return unwrap(res);
  },
  get: (painterId: string) =>
    dedupeRequest(`painters:detail:${painterId}`, async () => {
      const res = await axiosInstance.get<ApiResponse<PainterDetail>>(`/painters/${painterId}`);
      return unwrap(res);
    }),
  update: async (
    painterId: string,
    data: Partial<{ name: string; phone: string; notes: string }>
  ) => {
    const res = await axiosInstance.patch<ApiResponse<Painter>>(`/painters/${painterId}`, data);
    return unwrap(res);
  },
  remove: async (painterId: string) => {
    const res = await axiosInstance.delete<ApiResponse<{ deleted: boolean }>>(
      `/painters/${painterId}`
    );
    return unwrap(res);
  },
  recordPayment: async (
    painterId: string,
    data: { amount: number; description?: string; date?: string }
  ) => {
    const res = await axiosInstance.post<ApiResponse<Expense>>(
      `/painters/${painterId}/payments`,
      data
    );
    return unwrap(res);
  },
};

export const reportsApi = {
  dashboard: async () => {
    const res = await axiosInstance.get<ApiResponse<DashboardStats>>('/reports/dashboard');
    return unwrap(res);
  },
  overview: (period: 'this-month' | 'last-month' | 'this-week' = 'this-month') =>
    dedupeRequest(`reports:overview:${period}`, async () => {
      const res = await axiosInstance.get<ApiResponse<DashboardOverview>>('/reports/overview', {
        params: { period },
      });
      return unwrap(res);
    }),
  snapshots: () => axiosInstance.get('/reports/snapshots'),
};
