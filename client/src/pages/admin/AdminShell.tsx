import type { ComponentType, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowPathIcon,
  ArrowRightOnRectangleIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  ClockIcon,
  Squares2X2Icon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/config/config';
import { useAuthStore } from '@/store/auth.store';
import type { TenantStatus } from '@paint-saas/shared-types';

export type AdminView = TenantStatus | 'all';

const NAV: Array<{
  key: AdminView;
  label: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
}> = [
  { key: 'pending', label: 'Pending', icon: ClockIcon, description: 'Awaiting review' },
  { key: 'approved', label: 'Approved', icon: CheckCircleIcon, description: 'Active shops' },
  { key: 'rejected', label: 'Rejected', icon: XCircleIcon, description: 'Declined' },
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
    <div className="min-h-screen flex bg-[#FBFBFA] text-[#37352F] antialiased">
      {/* Sidebar — Notion-style */}
      <aside className="w-[240px] shrink-0 flex flex-col border-r border-[rgba(55,53,47,0.09)] bg-[#F7F6F3]">
        <div className="px-3 pt-4 pb-3">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-[rgba(55,53,47,0.06)] transition-colors cursor-default">
            <div className="w-7 h-7 rounded-md bg-[#37352F] flex items-center justify-center text-white text-xs font-semibold">
              P
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold truncate leading-tight">Paint Platform</p>
              <p className="text-[11px] text-[#9B9A97] leading-tight">Super Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 space-y-0.5">
          <p className="px-3 pt-2 pb-1 text-[11px] font-medium text-[#9B9A97] uppercase tracking-wide">
            Registrations
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
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left text-[14px] transition-colors',
                  active
                    ? 'bg-[rgba(55,53,47,0.08)] text-[#37352F] font-medium'
                    : 'text-[#6B6B6B] hover:bg-[rgba(55,53,47,0.06)]'
                )}
              >
                <Icon
                  className={cn('w-4 h-4 shrink-0', active ? 'text-[#37352F]' : 'text-[#9B9A97]')}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {counts[item.key] > 0 && (
                  <span
                    className={cn(
                      'text-[11px] tabular-nums px-1.5 py-0.5 rounded min-w-[20px] text-center',
                      active ? 'bg-[rgba(55,53,47,0.12)]' : 'bg-[rgba(55,53,47,0.06)] text-[#9B9A97]'
                    )}
                  >
                    {counts[item.key]}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-2 border-t border-[rgba(55,53,47,0.09)]">
          <div className="flex items-center gap-2 px-2 py-2 rounded-md">
            <div className="w-7 h-7 rounded-full bg-[#E3E2E0] flex items-center justify-center text-[11px] font-semibold text-[#6B6B6B] shrink-0">
              {(user?.name?.[0] ?? user?.email?.[0] ?? 'A').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium truncate">{user?.name ?? 'Admin'}</p>
              <p className="text-[11px] text-[#9B9A97] truncate">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 mt-0.5 rounded-md text-[13px] text-[#6B6B6B] hover:bg-[rgba(55,53,47,0.06)] transition-colors"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="shrink-0 border-b border-[rgba(55,53,47,0.09)] bg-[#FBFBFA]/90 backdrop-blur-sm sticky top-0 z-10">
          <div className="px-8 py-5 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-8 h-8 rounded-md bg-[#F1F1EF] flex items-center justify-center">
                <BuildingOffice2Icon className="w-4 h-4 text-[#37352F]" />
              </div>
              <div>
                <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#37352F] leading-tight">
                  {activeNav.label}
                </h1>
                <p className="text-[14px] text-[#9B9A97] mt-0.5">{activeNav.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {headerActions}
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className="inline-flex items-center justify-center w-8 h-8 rounded-md text-[#6B6B6B] hover:bg-[rgba(55,53,47,0.08)] transition-colors disabled:opacity-40"
                title="Refresh"
              >
                <ArrowPathIcon className={cn('w-4 h-4', loading && 'animate-spin')} />
              </button>
            </div>
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
}: {
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-[rgba(55,53,47,0.09)] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,15,15,0.04)]">
      <p className="text-[12px] text-[#9B9A97] font-medium">{label}</p>
      <p className="text-[28px] font-semibold tracking-[-0.03em] text-[#37352F] mt-0.5 tabular-nums">
        {value}
      </p>
      {sub && <p className="text-[11px] text-[#9B9A97] mt-1">{sub}</p>}
    </div>
  );
}

export function AdminEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-12 h-12 rounded-lg bg-[#F1F1EF] flex items-center justify-center mb-4">
        <BuildingOffice2Icon className="w-6 h-6 text-[#9B9A97]" />
      </div>
      <p className="text-[15px] font-medium text-[#37352F]">{title}</p>
      <p className="text-[14px] text-[#9B9A97] mt-1 max-w-sm">{description}</p>
    </div>
  );
}
