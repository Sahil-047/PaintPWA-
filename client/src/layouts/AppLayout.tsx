import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { ROUTES } from '@/config/config';

export function RequireAuth() {
  const token = useAuthStore((s) => s.token);
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);
  const tenantStatus = useAuthStore((s) => s.tenant?.status);

  if (!token) return <Navigate to={ROUTES.HOME} replace />;
  if (isSuperAdmin) return <Navigate to={ROUTES.ADMIN} replace />;
  if (tenantStatus === 'pending') return <Navigate to={ROUTES.PENDING_APPROVAL} replace />;
  return <Outlet />;
}
