import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import SeoHead from '@/components/SeoHead';

const SEO_CONFIG: Record<string, { title: string; description: string; robots?: string }> = {
  [ROUTES.HOME]: {
    title: 'Sign In',
    description:
      'Sign in to Paint ERP to manage Asian Paints, Berger, Nerolac and other paint brand inventory, billing, and customer dues in one place.',
  },
  [ROUTES.SIGNUP]: {
    title: 'Create Your Shop Workspace',
    description:
      'Create your Paint ERP workspace and start managing Asian Paints, Berger, Nerolac and other brand inventory, invoices, and reports.',
  },
  [ROUTES.PENDING_APPROVAL]: {
    title: 'Approval Pending',
    description: 'Your Paint ERP workspace is awaiting approval.',
    robots: 'noindex, nofollow',
  },
  [ROUTES.ADMIN]: {
    title: 'Admin',
    description: 'Paint ERP admin dashboard.',
    robots: 'noindex, nofollow',
  },
  [ROUTES.DASHBOARD]: {
    title: 'Dashboard',
    description: 'Paint ERP dashboard for operations and daily business tracking.',
    robots: 'noindex, nofollow',
  },
  [ROUTES.BILLING]: {
    title: 'Billing',
    description: 'Create and manage invoices in Paint ERP.',
    robots: 'noindex, nofollow',
  },
  [ROUTES.INVENTORY]: {
    title: 'Inventory',
    description: 'Track stock and products in Paint ERP.',
    robots: 'noindex, nofollow',
  },
  [ROUTES.REPORTS]: {
    title: 'Reports',
    description: 'View business reports and analytics in Paint ERP.',
    robots: 'noindex, nofollow',
  },
  [ROUTES.ACCOUNTS]: {
    title: 'Accounts',
    description: 'Manage customer dues and ledgers in Paint ERP.',
    robots: 'noindex, nofollow',
  },
  [ROUTES.SETTINGS]: {
    title: 'Settings',
    description: 'Configure your Paint ERP workspace settings.',
    robots: 'noindex, nofollow',
  },
};

function AppSeo() {
  const location = useLocation();
  const seo = SEO_CONFIG[location.pathname] ?? {
    title: 'Paint ERP',
    description: 'Paint ERP for inventory, billing, and customer account management.',
    robots: 'noindex, nofollow',
  };

  return (
    <SeoHead
      title={seo.title}
      description={seo.description}
      path={location.pathname}
      robots={seo.robots}
    />
  );
}

export default function App() {
  return (
    <>
      <AppSeo />
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
