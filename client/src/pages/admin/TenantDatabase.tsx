import {
  ArrowPathIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  CreditCardIcon,
  EnvelopeIcon,
  LinkIcon,
  NoSymbolIcon,
  TrashIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type { TenantRegistration, TenantStatus } from '@paint-saas/shared-types';
import { APP_PUBLIC_HOST } from '@/config/config';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const STATUS_STYLES: Record<TenantStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200/80',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  rejected: 'bg-red-50 text-red-700 border-red-200/80',
  deactivated: 'bg-slate-100 text-slate-600 border-slate-200',
};

const STATUS_LABEL: Record<TenantStatus, string> = {
  pending: 'Pending review',
  approved: 'Active',
  rejected: 'Rejected',
  deactivated: 'Deactivated',
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

function shopInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface TenantDatabaseProps {
  tenants: TenantRegistration[];
  selectedId: string | null;
  onSelect: (tenant: TenantRegistration) => void;
  actingId: string | null;
  onApprove: (id: string) => void;
  onReject: (tenant: TenantRegistration) => void;
  onDeactivate: (tenant: TenantRegistration) => void;
  onReactivate: (id: string) => void;
  onDelete: (tenant: TenantRegistration) => void;
}

export function TenantDatabase({
  tenants,
  selectedId,
  onSelect,
  actingId,
  onApprove,
  onReject,
  onDeactivate,
  onReactivate,
  onDelete,
}: TenantDatabaseProps) {
  return (
    <div className="mx-4 sm:mx-6 lg:mx-8 mb-8 rounded-[20px] border border-[#e8eef5] bg-white overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)] overflow-x-auto">
      <div className="grid min-w-[780px] grid-cols-[minmax(200px,1.5fr)_minmax(110px,0.7fr)_minmax(160px,1fr)_minmax(130px,0.85fr)_auto] gap-3 px-5 py-3 border-b border-[#eef2f7] bg-[var(--brand-tertiary)]/60">
        <span className="text-[11px] font-semibold text-black/40 uppercase tracking-wide">Shop</span>
        <span className="text-[11px] font-semibold text-black/40 uppercase tracking-wide">Status</span>
        <span className="text-[11px] font-semibold text-black/40 uppercase tracking-wide">Owner</span>
        <span className="text-[11px] font-semibold text-black/40 uppercase tracking-wide">
          Registered
        </span>
        <span className="text-[11px] font-semibold text-black/40 uppercase tracking-wide text-right w-[200px]">
          Actions
        </span>
      </div>

      <ul>
        {tenants.map((t) => {
          const selected = selectedId === t._id;
          const busy = actingId === t._id;
          return (
            <li key={t._id}>
              <button
                type="button"
                onClick={() => onSelect(t)}
                className={cn(
                  'w-full grid min-w-[780px] grid-cols-[minmax(200px,1.5fr)_minmax(110px,0.7fr)_minmax(160px,1fr)_minmax(130px,0.85fr)_auto] gap-3 items-center px-5 py-3.5 text-left border-b border-[#f1f5f9] last:border-0 transition-colors',
                  selected
                    ? 'bg-[var(--brand-tertiary)]'
                    : 'hover:bg-[var(--brand-space)]'
                )}
              >
                <div className="min-w-0 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-[12px] bg-[var(--brand-tertiary)] flex items-center justify-center text-[var(--brand-primary)] shrink-0">
                    <BuildingOffice2Icon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[var(--brand-text)] truncate">
                      {t.name}
                    </p>
                    <p className="text-[12px] text-black/40 truncate">
                      {APP_PUBLIC_HOST}/{t.slug}
                    </p>
                  </div>
                </div>

                <div>
                  <span
                    className={cn(
                      'inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-md border',
                      STATUS_STYLES[t.status]
                    )}
                  >
                    {STATUS_LABEL[t.status]}
                  </span>
                </div>

                <div className="min-w-0 text-[13px] text-black/55 truncate">
                  {t.owner ? (
                    <>
                      <span className="block truncate font-medium text-[var(--brand-text)]">
                        {t.owner.name}
                      </span>
                      <span className="block truncate text-[12px] text-black/40">
                        {t.owner.email}
                      </span>
                    </>
                  ) : (
                    <span className="text-black/30">—</span>
                  )}
                </div>

                <div className="text-[13px] text-black/40 tabular-nums">{formatDate(t.createdAt)}</div>

                <div
                  className="flex items-center justify-end gap-1 w-[200px] flex-wrap"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  {t.status === 'pending' && (
                    <>
                      <ActionChip
                        disabled={busy}
                        onClick={() => onApprove(t._id)}
                        className="text-emerald-700 hover:bg-emerald-50"
                      >
                        <CheckIcon className="w-3.5 h-3.5" />
                        Approve
                      </ActionChip>
                      <ActionChip
                        disabled={busy}
                        onClick={() => onReject(t)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                        Reject
                      </ActionChip>
                    </>
                  )}
                  {t.status === 'approved' && (
                    <ActionChip
                      disabled={busy}
                      onClick={() => onDeactivate(t)}
                      className="text-slate-600 hover:bg-slate-100"
                    >
                      <NoSymbolIcon className="w-3.5 h-3.5" />
                      Deactivate
                    </ActionChip>
                  )}
                  {t.status === 'deactivated' && (
                    <ActionChip
                      disabled={busy}
                      onClick={() => onReactivate(t._id)}
                      className="text-[var(--brand-primary)] hover:bg-[var(--brand-tertiary)]"
                    >
                      <ArrowPathIcon className="w-3.5 h-3.5" />
                      Reactivate
                    </ActionChip>
                  )}
                  <ActionChip
                    disabled={busy}
                    onClick={() => onDelete(t)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                    Delete
                  </ActionChip>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ActionChip({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1.5 rounded-[10px] text-[12px] font-semibold transition-colors disabled:opacity-50',
        className
      )}
    >
      {children}
    </button>
  );
}

interface TenantDetailPanelProps {
  tenant: TenantRegistration | null;
  open: boolean;
  onClose: () => void;
  actingId: string | null;
  onApprove: (id: string) => void;
  onReject: (tenant: TenantRegistration) => void;
  onDeactivate: (tenant: TenantRegistration) => void;
  onReactivate: (id: string) => void;
  onDelete: (tenant: TenantRegistration) => void;
}

export function TenantDetailPanel({
  tenant,
  open,
  onClose,
  actingId,
  onApprove,
  onReject,
  onDeactivate,
  onReactivate,
  onDelete,
}: TenantDetailPanelProps) {
  if (!tenant) return null;

  const busy = actingId === tenant._id;
  const workspaceUrl = `${APP_PUBLIC_HOST}/${tenant.slug}`;

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(`https://${workspaceUrl}`);
      toast.success('Workspace URL copied');
    } catch {
      toast.error('Could not copy URL');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton
        className="sm:max-w-lg max-h-[min(90vh,720px)] overflow-y-auto rounded-[20px] border-[#e8eef5] p-0 gap-0 shadow-2xl"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{tenant.name}</DialogTitle>
          <DialogDescription>Shop workspace details and subscription actions</DialogDescription>
        </DialogHeader>

        {/* Identity */}
        <div className="px-6 pt-6 pb-5 border-b border-[#f1f5f9]">
          <div className="flex items-start gap-3.5 pr-8">
            <div className="w-14 h-14 rounded-[16px] bg-[var(--brand-primary)] text-white flex items-center justify-center text-[16px] font-bold shrink-0 shadow-[0_8px_20px_rgba(19,88,250,0.25)]">
              {shopInitials(tenant.name)}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h2 className="text-[18px] font-bold text-[var(--brand-text)] tracking-tight leading-snug">
                {tenant.name}
              </h2>
              <span
                className={cn(
                  'inline-flex mt-2 text-[11px] font-semibold px-2 py-0.5 rounded-md border',
                  STATUS_STYLES[tenant.status]
                )}
              >
                {STATUS_LABEL[tenant.status]}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={copyUrl}
            className="mt-4 w-full flex items-center gap-2.5 rounded-[14px] border border-[#e8eef5] bg-[var(--brand-tertiary)]/70 px-3 py-2.5 text-left hover:border-[var(--brand-secondary)] transition-colors group"
            title="Copy workspace URL"
          >
            <LinkIcon className="w-4 h-4 text-[var(--brand-primary)] shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-black/35">
                Workspace URL
              </span>
              <span className="block text-[12px] font-medium text-[var(--brand-text)] truncate mt-0.5">
                {workspaceUrl}
              </span>
            </span>
            <ClipboardDocumentIcon className="w-4 h-4 text-black/30 group-hover:text-[var(--brand-primary)] shrink-0" />
          </button>
        </div>

        {/* Meta */}
        <div className="px-6 py-5 grid grid-cols-2 gap-3 border-b border-[#f1f5f9]">
          <div className="rounded-[14px] border border-[#e8eef5] bg-[var(--brand-space)] p-3">
            <div className="flex items-center gap-1.5 text-black/35">
              <CreditCardIcon className="w-3.5 h-3.5" />
              <p className="text-[10px] font-semibold uppercase tracking-wide">Plan</p>
            </div>
            <p className="mt-1.5 text-[14px] font-semibold text-[var(--brand-text)] capitalize">
              {tenant.plan}
            </p>
          </div>
          <div className="rounded-[14px] border border-[#e8eef5] bg-[var(--brand-space)] p-3">
            <div className="flex items-center gap-1.5 text-black/35">
              <CalendarDaysIcon className="w-3.5 h-3.5" />
              <p className="text-[10px] font-semibold uppercase tracking-wide">Registered</p>
            </div>
            <p className="mt-1.5 text-[13px] font-semibold text-[var(--brand-text)] leading-snug">
              {formatDate(tenant.createdAt)}
            </p>
          </div>
        </div>

        {/* Owner */}
        {tenant.owner && (
          <div className="px-6 py-5 border-b border-[#f1f5f9]">
            <p className="text-[11px] font-semibold text-black/40 uppercase tracking-wide mb-3">
              Owner account
            </p>
            <div className="rounded-[14px] border border-[#e8eef5] p-3.5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--brand-tertiary)] text-[var(--brand-primary)] flex items-center justify-center text-[12px] font-bold shrink-0">
                  {(tenant.owner.name?.[0] ?? 'O').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[var(--brand-text)] truncate">
                    {tenant.owner.name}
                  </p>
                  <p className="text-[12px] text-black/40 flex items-center gap-1 mt-0.5">
                    <UserIcon className="w-3 h-3 shrink-0" />
                    Shop admin
                  </p>
                </div>
              </div>
              <a
                href={`mailto:${tenant.owner.email}`}
                className="flex items-center gap-2 text-[13px] text-black/55 hover:text-[var(--brand-primary)] truncate rounded-[10px] bg-[var(--brand-space)] px-2.5 py-2"
              >
                <EnvelopeIcon className="w-4 h-4 shrink-0 text-black/35" />
                <span className="truncate">{tenant.owner.email}</span>
              </a>
            </div>
          </div>
        )}

        {tenant.rejectionReason && (
          <div className="px-6 py-5 border-b border-[#f1f5f9]">
            <div className="rounded-[14px] bg-red-50 border border-red-100 px-3.5 py-3">
              <p className="text-[11px] font-semibold text-red-700 uppercase tracking-wide">
                Rejection reason
              </p>
              <p className="text-[13px] text-red-800/80 mt-1.5 leading-relaxed">
                {tenant.rejectionReason}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-5 bg-[var(--brand-space)]/60 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-black/35 px-0.5 pb-1">
            Subscription
          </p>

          {tenant.status === 'pending' && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => onApprove(tenant._id)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[12px] bg-[var(--brand-primary)] text-white text-[14px] font-semibold hover:bg-[#1048d4] shadow-[0_4px_14px_rgba(19,88,250,0.28)] transition-colors disabled:opacity-50"
              >
                <CheckIcon className="w-4 h-4" />
                Approve shop
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onReject(tenant)}
                className="w-full py-2.5 rounded-[12px] border border-[#e2e8f0] bg-white text-[14px] font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Reject registration
              </button>
            </>
          )}

          {tenant.status === 'approved' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onDeactivate(tenant)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[12px] border border-[#e2e8f0] bg-white text-[14px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <NoSymbolIcon className="w-4 h-4" />
              Deactivate subscription
            </button>
          )}

          {tenant.status === 'deactivated' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onReactivate(tenant._id)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[12px] bg-[var(--brand-primary)] text-white text-[14px] font-semibold hover:bg-[#1048d4] transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Reactivate subscription
            </button>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(tenant)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[12px] border border-red-200 bg-white text-[14px] font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <TrashIcon className="w-4 h-4" />
            Delete tenant
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
