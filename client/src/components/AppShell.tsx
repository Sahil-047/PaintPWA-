import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  Package,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/config/config';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ICON_STROKE = 2.25;

const navItems = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutGrid },
  { label: 'Invoices', path: ROUTES.BILLING, icon: Receipt },
  { label: 'Analytics', path: ROUTES.REPORTS, icon: BarChart3 },
  { label: 'Settings', path: ROUTES.SETTINGS, icon: Settings },
];

const inventorySubItems = [
  { label: 'Overview', path: ROUTES.INVENTORY, hash: '' },
  { label: 'Brands', path: ROUTES.INVENTORY, hash: 'brands' },
  { label: 'Product Types', path: ROUTES.INVENTORY, hash: 'types' },
  { label: 'Products', path: ROUTES.INVENTORY, hash: 'products' },
  { label: 'Stock', path: ROUTES.INVENTORY, hash: 'stock' },
  { label: 'Stock Transfers', path: ROUTES.INVENTORY, hash: 'transfers' },
];

function LogoCube() {
  return (
    <svg viewBox="0 0 40 40" className="w-10 h-10 shrink-0" aria-hidden>
      <path d="M20 4 L36 14 V30 L20 40 L4 30 V14 Z" fill="#818CF8" opacity="0.9" />
      <path d="M20 4 L20 22 L36 14 V14 Z" fill="#6366F1" />
      <path d="M20 22 L20 40 L4 30 V14 Z" fill="#A5B4FC" />
      <path d="M20 4 L4 14 L20 22 L36 14 Z" fill="#C7D2FE" />
    </svg>
  );
}

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, tenant, logout } = useAuthStore();
  const inventoryOpen = location.pathname.startsWith(ROUTES.INVENTORY);
  const inventoryHash = location.hash.replace('#', '') || 'brands';

  function handleLogout() {
    logout();
    toast.success('Logged out successfully');
    navigate(ROUTES.HOME);
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      <aside className="w-[240px] shrink-0 bg-white border-r border-[#e2e8f0] flex flex-col py-7 px-5">
        <div className="flex items-center gap-3 px-1 mb-10">
          <LogoCube />
          <div>
            <p className="font-bold text-[#0f172a] text-[15px] leading-tight">Paint ERP</p>
            <p className="text-[11px] text-[#64748b] leading-snug mt-0.5">
              Enterprise Resource Planning
            </p>
          </div>
        </div>

        <nav className="space-y-1.5 flex-1">
          <NavLink
            to={ROUTES.DASHBOARD}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3.5 px-4 py-3 rounded-[14px] text-[15px] font-medium transition-all',
                isActive
                  ? 'bg-[#2563eb] text-white shadow-[0_4px_14px_rgba(37,99,235,0.35)]'
                  : 'text-[#475569] hover:bg-[#f8fafc] hover:text-[#0f172a]'
              )
            }
          >
            {({ isActive }) => (
              <>
                <LayoutGrid
                  className={cn('w-5 h-5 shrink-0', isActive ? 'text-white' : 'text-[#64748b]')}
                  strokeWidth={ICON_STROKE}
                />
                Dashboard
              </>
            )}
          </NavLink>

          <div>
            <NavLink
              to={`${ROUTES.INVENTORY}#brands`}
              className={cn(
                'flex items-center gap-3.5 px-4 py-3 rounded-[14px] text-[15px] font-medium transition-all w-full',
                inventoryOpen
                  ? 'bg-[#eff6ff] text-[#2563eb]'
                  : 'text-[#475569] hover:bg-[#f8fafc] hover:text-[#0f172a]'
              )}
            >
              <Package className={cn('w-5 h-5 shrink-0', inventoryOpen ? 'text-[#2563eb]' : 'text-[#64748b]')} strokeWidth={ICON_STROKE} />
              <span className="flex-1 text-left">Inventory</span>
              {inventoryOpen ? (
                <ChevronDown className="w-4 h-4 shrink-0 opacity-70" />
              ) : (
                <ChevronRight className="w-4 h-4 shrink-0 opacity-50" />
              )}
            </NavLink>

            {inventoryOpen && (
              <div className="mt-1 ml-4 pl-4 border-l border-[#e2e8f0] space-y-0.5">
                {inventorySubItems.map(({ label, path, hash }) => {
                  const active =
                    inventoryHash === hash ||
                    (hash === 'brands' && !location.hash) ||
                    (hash === 'brands' && inventoryHash === 'drilldown');
                  return (
                    <NavLink
                      key={label}
                      to={`${path}${hash ? `#${hash}` : ''}`}
                      className={cn(
                        'block px-3 py-2 rounded-lg text-[13px] font-medium transition-colors',
                        active
                          ? 'bg-[#eff6ff] text-[#2563eb]'
                          : 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8fafc]'
                      )}
                    >
                      {label}
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>

          {navItems.slice(1).map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3.5 px-4 py-3 rounded-[14px] text-[15px] font-medium transition-all',
                  isActive
                    ? 'bg-[#2563eb] text-white shadow-[0_4px_14px_rgba(37,99,235,0.35)]'
                    : 'text-[#475569] hover:bg-[#f8fafc] hover:text-[#0f172a]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn('w-5 h-5 shrink-0', isActive ? 'text-white' : 'text-[#64748b]')}
                    strokeWidth={ICON_STROKE}
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="pt-5 mt-5 border-t border-[#f1f5f9]">
          <div className="flex items-center gap-3 px-1 mb-3">
            <div className="w-9 h-9 rounded-full bg-[#2563eb] flex items-center justify-center text-white text-sm font-bold shrink-0">
              {(user?.name?.[0] ?? 'A').toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#0f172a] truncate">{user?.name ?? 'admin'}</p>
              <p className="text-xs text-[#64748b] truncate">Administrator</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full gap-2 border-[#e2e8f0] text-[#64748b] hover:text-red-600 hover:border-red-200 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" strokeWidth={ICON_STROKE} />
            Logout
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-auto bg-[#f8fafc]">
        <Outlet />
      </main>
    </div>
  );
}
