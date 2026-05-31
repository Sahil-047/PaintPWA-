import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  user: { _id: string; name: string; email: string; role: string } | null;
  tenant: { _id: string; name: string; slug: string; plan: string } | null;
  setAuth: (token: string, user: AuthState['user'], tenant: AuthState['tenant']) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      tenant: null,
      setAuth: (token, user, tenant) => {
        localStorage.setItem('token', token);
        set({ token, user, tenant });
      },
      logout: () => {
        localStorage.removeItem('token');
        set({ token: null, user: null, tenant: null });
      },
    }),
    { name: 'paint-auth' }
  )
);
