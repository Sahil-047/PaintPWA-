import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Package,
  Receipt,
  Users,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/config/config';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ICON_STROKE = 2.25;

const navItems = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutGrid },
  { label: 'Inventory', path: ROUTES.INVENTORY, icon: Package },
  { label: 'Invoices', path: ROUTES.BILLING, icon: Receipt },
  { label: 'Accounts', path: ROUTES.ACCOUNTS, icon: Users },
  { label: 'Analytics', path: ROUTES.REPORTS, icon: BarChart3 },
  { label: 'Settings', path: ROUTES.SETTINGS, icon: Settings },
];

function LogoCube() {
  return (
    <svg viewBox="0 0 40 40" className="w-10 h-10 shrink-0" aria-hidden>
      <path d="M20 4 L36 14 V30 L20 40 L4 30 V14 Z" fill="#b3caf2" opacity="0.95" />
      <path d="M20 4 L20 22 L36 14 V14 Z" fill="#1358fa" />
      <path d="M20 22 L20 40 L4 30 V14 Z" fill="#7aa0e8" />
      <path d="M20 4 L4 14 L20 22 L36 14 Z" fill="#f2f9ff" />
    </svg>
  );
}

export default function AppShell() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  function handleLogout() {
    logout();
    toast.success('Logged out successfully');
    navigate(ROUTES.HOME);
  }

  return (
    <div className="h-screen bg-[var(--brand-space)] flex overflow-hidden">
      <aside className="w-[240px] shrink-0 bg-white border-r border-[var(--brand-secondary)]/35 flex flex-col py-7 px-5">
        <div className="flex items-center gap-3 px-1 mb-10">
          <LogoCube />
          <div>
            <p className="font-bold text-[var(--brand-text)] text-[15px] leading-tight">Paint ERP</p>
            <p className="text-[11px] text-black/45 leading-snug mt-0.5">
              Enterprise Resource Planning
            </p>
          </div>
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

        <div className="pt-5 mt-5 border-t border-[var(--brand-secondary)]/30">
          <div className="flex items-center gap-3 px-1 mb-3">
            <div className="w-9 h-9 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-white text-sm font-bold shrink-0">
              {(user?.name?.[0] ?? 'A').toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--brand-text)] truncate">{user?.name ?? 'admin'}</p>
              <p className="text-xs text-black/45 truncate">Administrator</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full gap-2 border-[var(--brand-secondary)]/50 text-black/50 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" strokeWidth={ICON_STROKE} />
            Logout
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 min-h-0 h-full overflow-hidden bg-[var(--brand-space)] flex flex-col">
        <div className="flex-1 min-h-0 h-full overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
