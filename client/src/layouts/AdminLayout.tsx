import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { ROUTES } from '@/config/config';

export function RequireSuperAdmin() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);

  if (!user) return <Navigate to={ROUTES.HOME} replace />;
  if (!isSuperAdmin) return <Navigate to={ROUTES.DASHBOARD} replace />;
  return <Outlet />;
}
