import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TenantStatus } from '@paint-saas/shared-types';

interface AuthState {
  token: string | null;
  user: { _id: string; name: string; email: string; role: string } | null;
  tenant: {
    _id: string;
    name: string;
    slug: string;
    plan: string;
    status?: TenantStatus;
    phone?: string;
    address?: string;
    gstin?: string;
  } | null;
  isSuperAdmin: boolean;
  setAuth: (
    token: string,
    user: AuthState['user'],
    tenant: AuthState['tenant'],
    isSuperAdmin?: boolean
  ) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      tenant: null,
      isSuperAdmin: false,
      setAuth: (token, user, tenant, isSuperAdmin = false) => {
        localStorage.setItem('token', token);
        set({ token, user, tenant, isSuperAdmin });
      },
      logout: () => {
        localStorage.removeItem('token');
        set({ token: null, user: null, tenant: null, isSuperAdmin: false });
      },
    }),
    { name: 'paint-auth' }
  )
);
