import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { ROUTES } from '@/config/config';

export function RequireAuth() {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to={ROUTES.HOME} replace />;
  return <Outlet />;
}
