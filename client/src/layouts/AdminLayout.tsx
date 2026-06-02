import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { ROUTES } from '@/config/config';

export function RequireSuperAdmin() {
  const token = useAuthStore((s) => s.token);
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);

  if (!token) return <Navigate to={ROUTES.HOME} replace />;
  if (!isSuperAdmin) return <Navigate to={ROUTES.DASHBOARD} replace />;
  return <Outlet />;
}
