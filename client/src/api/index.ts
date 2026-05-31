import { axiosInstance } from './axiosInstance';
import type { ApiResponse, Product, Brand, ProductType, Bill, Account, Expense } from '@paint-saas/shared-types';

interface AuthResult {
  token: string;
  user: { _id: string; name: string; email: string; role: string };
  tenant: { _id: string; name: string; slug: string; plan: string };
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
  }) => axiosInstance.post<{ success: boolean; data: AuthResult }>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    axiosInstance.post<ApiResponse<AuthResult>>('/auth/login', data),

  me: () => axiosInstance.get<ApiResponse<AuthResult>>('/auth/me'),
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

export const billingApi = {
  list: async () => {
    const res = await axiosInstance.get<ApiResponse<Bill[]>>('/bills');
    return unwrap(res);
  },
  create: (data: {
    customer: { name: string; phone?: string; address?: string; gstin?: string };
    items: Array<{ productId: string; qty: number; rate?: number }>;
    discount?: number;
    amountPaid?: number;
    paymentMode?: string;
  }) => axiosInstance.post('/bills', data),
  get: (id: string) => axiosInstance.get(`/bills/${id}`),
};

export const cashmemoApi = {
  list: () => axiosInstance.get('/cashmemos'),
  create: (data: { billId: string; customerId: string; amountPaid: number; paymentMode?: string }) =>
    axiosInstance.post('/cashmemos', data),
};

export const accountsApi = {
  list: async () => {
    const res = await axiosInstance.get<ApiResponse<Account[]>>('/accounts');
    return unwrap(res);
  },
  customers: () => axiosInstance.get('/accounts/customers'),
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
