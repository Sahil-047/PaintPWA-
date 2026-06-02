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
  PaginatedResponse,
  TenantRegistration,
  TenantStatus,
} from '@paint-saas/shared-types';

export interface AuthLoginResult {
  token: string;
  user: { _id: string; name: string; email: string; role: string };
  tenant?: { _id: string; name: string; slug: string; plan: string; status?: TenantStatus };
  isSuperAdmin?: boolean;
}

export interface AuthRegisterResult {
  pending: true;
  message: string;
  tenant: { _id: string; name: string; slug: string; plan: string; status: TenantStatus };
}

export interface DashboardStats {
  totalSales: number;
  totalCollected: number;
  totalDue: number;
  totalExpenses: number;
  topProducts: Array<{ productId: string; name: string; qty: number; revenue: number }>;
}

function unwrap<T>(res: { data: ApiResponse<T> | { success: boolean; data: T } }): T {
  return res.data.data as T;
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
  list: async () => {
    const res = await axiosInstance.get<ApiResponse<Bill[]>>('/bills');
    return unwrap(res);
  },
  create: (data: {
    customer: { name: string; phone?: string; address?: string; gstin?: string };
    items: Array<{ productId: string; qty: number; rate?: number; size?: string }>;
    discount?: number;
    amountPaid?: number;
    paymentMode?: string;
  }) => axiosInstance.post('/bills', data),
  get: (id: string) => axiosInstance.get(`/bills/${id}`),
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
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/html' }));
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};

export const accountsApi = {
  list: async () => {
    const res = await axiosInstance.get<ApiResponse<AccountWithCustomer[]>>('/accounts');
    return unwrap(res);
  },
  customers: async () => {
    const res = await axiosInstance.get<ApiResponse<Customer[]>>('/accounts/customers');
    return unwrap(res);
  },
  createCustomer: async (data: {
    name: string;
    phone?: string;
    address?: string;
    gstin?: string;
  }) => {
    const res = await axiosInstance.post<ApiResponse<Customer>>('/accounts/customers', data);
    return unwrap(res);
  },
  getCustomer: async (customerId: string) => {
    const res = await axiosInstance.get<ApiResponse<CustomerDetail>>(
      `/accounts/customers/${customerId}`
    );
    return unwrap(res);
  },
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

export const expensesApi = {
  list: async () => {
    const res = await axiosInstance.get<ApiResponse<Expense[]>>('/expenses');
    return unwrap(res);
  },
  create: (data: { category: string; description?: string; amount: number; date?: string }) =>
    axiosInstance.post('/expenses', data),
  remove: (id: string) => axiosInstance.delete(`/expenses/${id}`),
};

export const reportsApi = {
  dashboard: async () => {
    const res = await axiosInstance.get<ApiResponse<DashboardStats>>('/reports/dashboard');
    return unwrap(res);
  },
  snapshots: () => axiosInstance.get('/reports/snapshots'),
};
