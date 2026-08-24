import type { ComponentType, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowPathIcon,
  ArrowRightOnRectangleIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  ClockIcon,
  NoSymbolIcon,
  Squares2X2Icon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/config/config';
import { useAuthStore } from '@/store/auth.store';
import BrandLogo from '@/components/BrandLogo';
import type { TenantStatus } from '@paint-saas/shared-types';

export type AdminView = TenantStatus | 'all';

const NAV: Array<{
  key: AdminView;
  label: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
}> = [
  { key: 'pending', label: 'Pending', icon: ClockIcon, description: 'Awaiting review' },
  { key: 'approved', label: 'Active', icon: CheckCircleIcon, description: 'Live subscriptions' },
  { key: 'deactivated', label: 'Deactivated', icon: NoSymbolIcon, description: 'Suspended shops' },
  { key: 'rejected', label: 'Rejected', icon: XCircleIcon, description: 'Declined sign-ups' },
  { key: 'all', label: 'All shops', icon: Squares2X2Icon, description: 'Full registry' },
];

interface AdminShellProps {
  view: AdminView;
  onViewChange: (view: AdminView) => void;
  counts: Record<AdminView, number>;
  loading: boolean;
  onRefresh: () => void;
  children: ReactNode;
  headerActions?: ReactNode;
}

export function AdminShell({
  view,
  onViewChange,
  counts,
  loading,
  onRefresh,
  children,
  headerActions,
}: AdminShellProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  function handleLogout() {
    logout();
    navigate(ROUTES.HOME);
  }

  const activeNav = NAV.find((n) => n.key === view)!;

  return (
    <div className="min-h-screen flex bg-[var(--brand-space)] text-[var(--brand-text)] antialiased">
      <aside className="hidden md:flex w-[248px] shrink-0 flex-col border-r border-[var(--brand-secondary)]/40 bg-white">
        <div className="px-5 pt-6 pb-4">
          <BrandLogo height={48} className="max-w-full rounded-md" />
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-primary)]">
            Super Admin
          </p>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <p className="px-3 pt-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-black/40">
            Tenants
          </p>
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = view === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onViewChange(item.key)}
                className={cn(
                  'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[14px] text-left text-[14px] font-medium transition-all',
                  active
                    ? 'bg-[var(--brand-primary)] text-white shadow-[0_4px_14px_rgba(19,88,250,0.28)]'
                    : 'text-black/55 hover:bg-[var(--brand-tertiary)] hover:text-[var(--brand-text)]'
                )}
              >
                <Icon
                  className={cn('w-[18px] h-[18px] shrink-0', active ? 'text-white' : 'text-black/35')}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {counts[item.key] > 0 && (
                  <span
                    className={cn(
                      'text-[11px] tabular-nums px-1.5 py-0.5 rounded-md min-w-[22px] text-center font-semibold',
                      active ? 'bg-white/20 text-white' : 'bg-[var(--brand-tertiary)] text-[var(--brand-primary)]'
                    )}
                  >
                    {counts[item.key]}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[var(--brand-secondary)]/35">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-[13px] font-bold text-white shrink-0">
              {(user?.name?.[0] ?? user?.email?.[0] ?? 'A').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate">{user?.name ?? 'Admin'}</p>
              <p className="text-[11px] text-black/40 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 mt-1 rounded-[12px] text-[13px] font-medium text-black/50 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="shrink-0 border-b border-[var(--brand-secondary)]/40 bg-white/90 backdrop-blur-sm sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-[14px] bg-[var(--brand-tertiary)] flex items-center justify-center shrink-0">
                <BuildingOffice2Icon className="w-5 h-5 text-[var(--brand-primary)]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-[20px] sm:text-[22px] font-bold tracking-tight text-[var(--brand-text)] leading-tight">
                  {activeNav.label}
                </h1>
                <p className="text-[13px] text-black/45 mt-0.5">{activeNav.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {headerActions}
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className="inline-flex items-center justify-center w-9 h-9 rounded-[12px] border border-[var(--brand-secondary)]/50 text-black/50 hover:bg-[var(--brand-tertiary)] hover:text-[var(--brand-primary)] transition-colors disabled:opacity-40"
                title="Refresh"
              >
                <ArrowPathIcon className={cn('w-4 h-4', loading && 'animate-spin')} />
              </button>
            </div>
          </div>

          {/* Mobile nav tabs */}
          <div className="md:hidden px-4 pb-3 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {NAV.map((item) => {
              const active = view === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onViewChange(item.key)}
                  className={cn(
                    'shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors',
                    active
                      ? 'bg-[var(--brand-primary)] text-white'
                      : 'bg-[var(--brand-tertiary)] text-black/55'
                  )}
                >
                  {item.label}
                  {counts[item.key] > 0 ? ` · ${counts[item.key]}` : ''}
                </button>
              );
            })}
          </div>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

export function AdminStatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-[18px] px-4 py-4 border shadow-[0_4px_16px_rgba(15,23,42,0.04)]',
        accent
          ? 'bg-[var(--brand-primary)] border-transparent text-white'
          : 'bg-white border-[#e8eef5]'
      )}
    >
      <p className={cn('text-[12px] font-medium', accent ? 'text-white/80' : 'text-black/45')}>
        {label}
      </p>
      <p
        className={cn(
          'text-[28px] font-bold tracking-tight mt-1 tabular-nums',
          accent ? 'text-white' : 'text-[var(--brand-text)]'
        )}
      >
        {value}
      </p>
      {sub && (
        <p className={cn('text-[11px] mt-1', accent ? 'text-white/70' : 'text-black/40')}>{sub}</p>
      )}
    </div>
  );
}

export function AdminEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-14 h-14 rounded-[16px] bg-[var(--brand-tertiary)] flex items-center justify-center mb-4">
        <BuildingOffice2Icon className="w-7 h-7 text-[var(--brand-primary)]" />
      </div>
      <p className="text-[16px] font-semibold text-[var(--brand-text)]">{title}</p>
      <p className="text-[14px] text-black/45 mt-1.5 max-w-sm leading-relaxed">{description}</p>
    </div>
  );
}
