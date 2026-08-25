import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { ROUTES } from '@/config/config';

export function RequireAuth() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);
  const tenantStatus = useAuthStore((s) => s.tenant?.status);

  if (!user) return <Navigate to={ROUTES.HOME} replace />;
  if (isSuperAdmin) return <Navigate to={ROUTES.ADMIN} replace />;
  if (tenantStatus === 'pending') return <Navigate to={ROUTES.PENDING_APPROVAL} replace />;
  return <Outlet />;
}
