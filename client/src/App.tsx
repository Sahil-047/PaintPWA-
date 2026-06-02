import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { ROUTES } from '@/config/config';
import { RequireAuth } from '@/layouts/AppLayout';
import { RequireSuperAdmin } from '@/layouts/AdminLayout';
import AppShell from '@/components/AppShell';
import AuthPage from '@/pages/auth/AuthPage';
import PendingApprovalPage from '@/pages/PendingApprovalPage';
import AdminPage from '@/pages/admin/AdminPage';
import DashboardPage from '@/pages/DashboardPage';
import BillingPage from '@/pages/BillingPage';
import InventoryPage from '@/pages/InventoryPage';
import ReportsPage from '@/pages/ReportsPage';
import AccountsPage from '@/pages/AccountsPage';
import SettingsPage from '@/pages/SettingsPage';

export default function App() {
  return (
    <>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path={ROUTES.HOME} element={<AuthPage />} />
        <Route path={ROUTES.SIGNUP} element={<AuthPage />} />

        <Route path={ROUTES.PENDING_APPROVAL} element={<PendingApprovalPage />} />

        <Route element={<RequireSuperAdmin />}>
          <Route path={ROUTES.ADMIN} element={<AdminPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
            <Route path={ROUTES.BILLING} element={<BillingPage />} />
            <Route path={ROUTES.INVENTORY} element={<InventoryPage />} />
            <Route path={ROUTES.REPORTS} element={<ReportsPage />} />
            <Route path={ROUTES.ACCOUNTS} element={<AccountsPage />} />
            <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
    </>
  );
}
