import { useEffect, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { authApi } from '@/api';
import { useAuthStore } from '@/store/auth.store';

export function SessionProvider({ children }: { children: ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const markSessionChecked = useAuthStore((s) => s.markSessionChecked);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    authApi
      .me()
      .then((res) => {
        if (cancelled) return;
        const data = res.data.data;
        if (!data?.user) {
          clearSession();
          return;
        }
        setSession(data.user, data.tenant ?? null, !!data.isSuperAdmin);
      })
      .catch(() => {
        if (!cancelled) clearSession();
      })
      .finally(() => {
        if (cancelled) return;
        markSessionChecked();
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [setSession, clearSession, markSessionChecked]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="h-8 w-8 animate-spin text-[#94a3b8]" aria-label="Loading" />
      </div>
    );
  }

  return children;
}
