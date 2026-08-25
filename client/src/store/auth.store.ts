import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TenantStatus } from '@paint-saas/shared-types';

interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthTenant {
  _id: string;
  name: string;
  slug: string;
  plan: string;
  status?: TenantStatus;
  phone?: string;
  address?: string;
  gstin?: string;
}

interface AuthState {
  user: AuthUser | null;
  tenant: AuthTenant | null;
  isSuperAdmin: boolean;
  sessionChecked: boolean;
  setSession: (user: AuthUser, tenant: AuthTenant | null, isSuperAdmin?: boolean) => void;
  markSessionChecked: () => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      isSuperAdmin: false,
      sessionChecked: false,
      setSession: (user, tenant, isSuperAdmin = false) => {
        set({ user, tenant, isSuperAdmin, sessionChecked: true });
      },
      markSessionChecked: () => set({ sessionChecked: true }),
      clearSession: () => {
        set({ user: null, tenant: null, isSuperAdmin: false, sessionChecked: true });
      },
    }),
    {
      name: 'paint-auth',
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        isSuperAdmin: state.isSuperAdmin,
      }),
    }
  )
);
