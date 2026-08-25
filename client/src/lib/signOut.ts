import { authApi } from '@/api';
import { useAuthStore } from '@/store/auth.store';

/** Revoke session on server and clear local auth state. */
export async function signOut(): Promise<void> {
  try {
    await authApi.logout();
  } catch {
    // Cookie may already be cleared or session expired.
  }
  useAuthStore.getState().clearSession();
}
