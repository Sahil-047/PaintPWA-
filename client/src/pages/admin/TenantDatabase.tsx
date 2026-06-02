import {
  BuildingOffice2Icon,
  CheckIcon,
  ChevronRightIcon,
  EnvelopeIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type { TenantRegistration, TenantStatus } from '@paint-saas/shared-types';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<TenantStatus, string> = {
  pending: 'bg-[#FDECC8] text-[#9A6700]',
  approved: 'bg-[#D3F8DF] text-[#0F7B3C]',
  rejected: 'bg-[#FFE2DD] text-[#9F3A2F]',
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

interface TenantDatabaseProps {
  tenants: TenantRegistration[];
  selectedId: string | null;
  onSelect: (tenant: TenantRegistration) => void;
  actingId: string | null;
  onApprove: (id: string) => void;
  onReject: (tenant: TenantRegistration) => void;
}

export function TenantDatabase({
  tenants,
  selectedId,
  onSelect,
  actingId,
  onApprove,
  onReject,
}: TenantDatabaseProps) {
  return (
    <div className="mx-4 sm:mx-8 mb-8 rounded-lg border border-[rgba(55,53,47,0.09)] bg-white overflow-hidden shadow-[0_1px_3px_rgba(15,15,15,0.04)] overflow-x-auto">
      {/* Table header — Notion database columns */}
      <div className="grid min-w-[720px] grid-cols-[minmax(200px,1.4fr)_minmax(120px,0.8fr)_minmax(160px,1fr)_minmax(140px,0.9fr)_auto] gap-3 px-4 py-2 border-b border-[rgba(55,53,47,0.09)] bg-[#FAFAF8]">
        <span className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wide">Shop</span>
        <span className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wide">Status</span>
        <span className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wide">Owner</span>
        <span className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wide">Registered</span>
        <span className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wide text-right w-[140px]">
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
                  'w-full grid min-w-[720px] grid-cols-[minmax(200px,1.4fr)_minmax(120px,0.8fr)_minmax(160px,1fr)_minmax(140px,0.9fr)_auto] gap-3 items-center px-4 py-3 text-left border-b border-[rgba(55,53,47,0.06)] last:border-0 transition-colors group',
                  selected ? 'bg-[rgba(35,131,226,0.08)]' : 'hover:bg-[rgba(55,53,47,0.04)]'
                )}
              >
                <div className="min-w-0 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-md bg-[#F1F1EF] flex items-center justify-center text-[#2383E2] opacity-90 shrink-0">
                    <BuildingOffice2Icon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-[#37352F] truncate">{t.name}</p>
                    <p className="text-[12px] text-[#9B9A97] truncate">/{t.slug}</p>
                  </div>
                  <ChevronRightIcon
                    className={cn(
                      'w-4 h-4 text-[#C4C4C2] shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity',
                      selected && 'opacity-100 text-[#2383E2]'
                    )}
                  />
                </div>

                <div>
                  <span
                    className={cn(
                      'inline-flex text-[12px] font-medium px-2 py-0.5 rounded capitalize',
                      STATUS_STYLES[t.status]
                    )}
                  >
                    {t.status}
                  </span>
                </div>

                <div className="min-w-0 text-[13px] text-[#6B6B6B] truncate">
                  {t.owner ? (
                    <>
                      <span className="block truncate">{t.owner.name}</span>
                      <span className="block truncate text-[12px] text-[#9B9A97]">
                        {t.owner.email}
                      </span>
                    </>
                  ) : (
                    <span className="text-[#C4C4C2]">—</span>
                  )}
                </div>

                <div className="text-[13px] text-[#9B9A97] tabular-nums">{formatDate(t.createdAt)}</div>

                <div
                  className="flex items-center justify-end gap-1 w-[140px]"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  {t.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onApprove(t._id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[#0F7B3C] hover:bg-[#D3F8DF] transition-colors disabled:opacity-50"
                      >
                        <CheckIcon className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onReject(t)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[#9F3A2F] hover:bg-[#FFE2DD] transition-colors disabled:opacity-50"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </>
                  ) : (
                    <span className="text-[12px] text-[#C4C4C2] pr-2">—</span>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface TenantDetailPanelProps {
  tenant: TenantRegistration | null;
  onClose: () => void;
  actingId: string | null;
  onApprove: (id: string) => void;
  onReject: (tenant: TenantRegistration) => void;
}

export function TenantDetailPanel({
  tenant,
  onClose,
  actingId,
  onApprove,
  onReject,
}: TenantDetailPanelProps) {
  if (!tenant) return null;

  const busy = actingId === tenant._id;

  return (
    <aside className="w-[320px] shrink-0 border-l border-[rgba(55,53,47,0.09)] bg-white flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(55,53,47,0.09)]">
        <p className="text-[12px] font-medium text-[#9B9A97]">Details</p>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-md flex items-center justify-center text-[#9B9A97] hover:bg-[rgba(55,53,47,0.08)]"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-5">
        <div>
          <div className="w-11 h-11 rounded-lg bg-[#F1F1EF] flex items-center justify-center">
            <BuildingOffice2Icon className="w-5 h-5 text-[#2383E2]" />
          </div>
          <h2 className="text-[18px] font-semibold text-[#37352F] mt-2 tracking-[-0.02em]">
            {tenant.name}
          </h2>
          <p className="text-[13px] text-[#9B9A97] mt-0.5">paintappstore.in/{tenant.slug}</p>
        </div>

        <Property label="Status" value={tenant.status} capitalize />
        <Property label="Plan" value={tenant.plan} capitalize />
        <Property label="Registered" value={formatDate(tenant.createdAt)} />

        {tenant.owner && (
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wide">Owner</p>
            <div className="flex items-center gap-2 text-[14px] text-[#37352F]">
              <UserIcon className="w-4 h-4 text-[#9B9A97]" />
              {tenant.owner.name}
            </div>
            <div className="flex items-center gap-2 text-[14px] text-[#6B6B6B]">
              <EnvelopeIcon className="w-4 h-4 text-[#9B9A97]" />
              <a href={`mailto:${tenant.owner.email}`} className="hover:underline truncate">
                {tenant.owner.email}
              </a>
            </div>
          </div>
        )}

        {tenant.rejectionReason && (
          <div className="rounded-md bg-[#FFE2DD]/60 border border-[rgba(159,58,47,0.15)] px-3 py-2.5">
            <p className="text-[11px] font-medium text-[#9F3A2F] uppercase tracking-wide">
              Rejection reason
            </p>
            <p className="text-[13px] text-[#6B2B26] mt-1 leading-relaxed">
              {tenant.rejectionReason}
            </p>
          </div>
        )}
      </div>

      {tenant.status === 'pending' && (
        <div className="p-4 border-t border-[rgba(55,53,47,0.09)] flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onApprove(tenant._id)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-[#37352F] text-white text-[14px] font-medium hover:bg-[#2F2E2A] transition-colors disabled:opacity-50"
          >
            <CheckIcon className="w-4 h-4" />
            Approve shop
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onReject(tenant)}
            className="w-full py-2.5 rounded-md border border-[rgba(55,53,47,0.16)] text-[14px] font-medium text-[#9F3A2F] hover:bg-[#FFE2DD]/40 transition-colors disabled:opacity-50"
          >
            Reject registration
          </button>
        </div>
      )}
    </aside>
  );
}

function Property({
  label,
  value,
  capitalize: cap,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wide">{label}</p>
      <p className={cn('text-[14px] text-[#37352F] mt-1', cap && 'capitalize')}>{value}</p>
    </div>
  );
}
