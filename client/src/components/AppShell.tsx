import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Package,
  Receipt,
  Users,
  Undo2,
  Paintbrush,
  Wallet,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import BrandLogo from '@/components/BrandLogo';
import { ROUTES } from '@/config/config';
import { useAuthStore } from '@/store/auth.store';
import { signOut } from '@/lib/signOut';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ICON_STROKE = 2.25;

const navItems = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutGrid },
  { label: 'Inventory', path: ROUTES.INVENTORY, icon: Package },
  { label: 'Billing', path: ROUTES.BILLING, icon: Receipt },
  { label: 'Cash memos', path: ROUTES.CASHMEMOS, icon: FileText },
  { label: 'Accounts', path: ROUTES.ACCOUNTS, icon: Users },
  { label: 'Returns', path: ROUTES.RETURNS, icon: Undo2 },
  { label: 'Painters', path: ROUTES.PAINTERS, icon: Paintbrush },
  { label: 'Expenses', path: ROUTES.EXPENSES, icon: Wallet },
  { label: 'Analytics', path: ROUTES.REPORTS, icon: BarChart3 },
  { label: 'Settings', path: ROUTES.SETTINGS, icon: Settings },
];

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    void signOut().then(() => {
      toast.success('Logged out successfully');
      navigate(ROUTES.HOME);
    });
  }

  const sidebarNav = (
    <>
      <div className="px-1 mb-8 lg:mb-10">
        <BrandLogo height={52} className="max-w-full rounded-md" />
      </div>

      <nav className="space-y-1.5 flex-1">
        {navItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === ROUTES.DASHBOARD}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3.5 px-4 py-3 rounded-[14px] text-[15px] font-medium transition-all',
                isActive
                  ? 'bg-[var(--brand-primary)] text-white shadow-[0_4px_14px_rgba(19,88,250,0.35)]'
                  : 'text-black/55 hover:bg-[var(--brand-tertiary)] hover:text-[var(--brand-text)]'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn('w-5 h-5 shrink-0', isActive ? 'text-white' : 'text-black/40')}
                  strokeWidth={ICON_STROKE}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );

  return (
    <div className="h-screen bg-[var(--brand-space)] flex overflow-hidden">
      {/* Desktop sidebar — nav only */}
      <aside className="hidden lg:flex w-[240px] shrink-0 bg-white border-r border-[var(--brand-secondary)]/35 flex-col py-7 px-5">
        {sidebarNav}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[min(280px,86vw)] bg-white shadow-xl flex flex-col py-6 px-4">
            <div className="flex items-center justify-end mb-2">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="h-9 w-9 rounded-xl border border-[#e2e8f0] inline-flex items-center justify-center text-[#64748b]"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {sidebarNav}
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0 min-h-0 h-full overflow-hidden bg-[var(--brand-space)] flex flex-col">
        <header className="shrink-0 flex items-center gap-3 px-4 sm:px-6 lg:px-8 py-3 border-b border-[#e2e8f0] bg-white">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden h-10 w-10 rounded-xl border border-[#e2e8f0] inline-flex items-center justify-center text-[#334155] shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="lg:hidden min-w-0">
            <BrandLogo height={40} className="max-w-[180px] sm:max-w-[220px] rounded-md" />
          </div>

          <div className="ml-auto flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-white text-sm font-bold shrink-0">
                {(user?.name?.[0] ?? 'A').toUpperCase()}
              </div>
              <div className="min-w-0 hidden sm:block">
                <p className="text-sm font-semibold text-[var(--brand-text)] truncate max-w-[160px] lg:max-w-[220px]">
                  {user?.name ?? 'admin'}
                </p>
                <p className="text-xs text-black/45 truncate">Administrator</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2 shrink-0 border-[var(--brand-secondary)]/50 text-black/50 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" strokeWidth={ICON_STROKE} />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>

        <div className="flex-1 min-h-0 h-full overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
