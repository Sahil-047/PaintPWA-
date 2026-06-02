import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import type { TenantRegistration } from '@paint-saas/shared-types';
import { adminApi, type PaginationMeta } from '@/api';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AdminEmptyState, AdminShell, AdminStatCard, type AdminView } from './AdminShell';
import { TenantDatabase, TenantDetailPanel } from './TenantDatabase';

function SkeletonRows() {
  return (
    <div className="mx-8 mb-8 rounded-lg border border-[rgba(55,53,47,0.09)] bg-white overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-[56px] border-b border-[rgba(55,53,47,0.06)] last:border-0 animate-pulse bg-gradient-to-r from-[#FAFAF8] via-[#F1F1EF] to-[#FAFAF8] bg-[length:200%_100%]"
        />
      ))}
    </div>
  );
}

export default function AdminPage() {
  const [view, setView] = useState<AdminView>('pending');
  const [tenants, setTenants] = useState<TenantRegistration[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 1,
  });
  const [counts, setCounts] = useState<Record<AdminView, number>>({
    pending: 0,
    approved: 0,
    rejected: 0,
    all: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<TenantRegistration | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<TenantRegistration | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadCounts = useCallback(async () => {
    try {
      const [pending, approved, rejected, all] = await Promise.all([
        adminApi.listTenants({ status: 'pending', page: 1, limit: 1 }),
        adminApi.listTenants({ status: 'approved', page: 1, limit: 1 }),
        adminApi.listTenants({ status: 'rejected', page: 1, limit: 1 }),
        adminApi.listTenants({ status: 'all', page: 1, limit: 1 }),
      ]);
      setCounts({
        pending: pending.pagination.total,
        approved: approved.pagination.total,
        rejected: rejected.pagination.total,
        all: all.pagination.total,
      });
    } catch {
      /* counts are optional */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items, pagination: meta } = await adminApi.listTenants({
        status: view,
        page: 1,
        limit: 50,
      });
      setTenants(items);
      setPagination(meta);
      setSelected((prev) => {
        if (!prev) return null;
        return items.find((t) => t._id === prev._id) ?? null;
      });
    } catch {
      toast.error('Failed to load registrations');
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    setSearch('');
    setSelected(null);
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.owner?.name.toLowerCase().includes(q) ||
        t.owner?.email.toLowerCase().includes(q)
    );
  }, [tenants, search]);

  async function refreshAll() {
    await Promise.all([load(), loadCounts()]);
  }

  async function handleApprove(id: string) {
    setActingId(id);
    try {
      await adminApi.approveTenant(id);
      toast.success('Shop approved — owner can sign in now');
      await refreshAll();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not approve'
      );
    } finally {
      setActingId(null);
    }
  }

  async function handleReject() {
    if (!rejectTarget) return;
    setActingId(rejectTarget._id);
    try {
      await adminApi.rejectTenant(rejectTarget._id, rejectReason.trim() || undefined);
      toast.success('Registration rejected');
      setRejectTarget(null);
      setRejectReason('');
      setSelected(null);
      await refreshAll();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not reject'
      );
    } finally {
      setActingId(null);
    }
  }

  function openReject(tenant: TenantRegistration) {
    setRejectTarget(tenant);
    setRejectReason('');
  }

  const emptyCopy: Record<AdminView, { title: string; description: string }> = {
    pending: {
      title: 'No pending registrations',
      description: 'New shop sign-ups will appear here for your review.',
    },
    approved: {
      title: 'No approved shops',
      description: 'Approved tenants will show up in this view.',
    },
    rejected: {
      title: 'No rejected registrations',
      description: 'Declined sign-ups are listed here.',
    },
    all: {
      title: 'No shops yet',
      description: 'The platform registry is empty.',
    },
  };

  return (
    <>
      <AdminShell
        view={view}
        onViewChange={setView}
        counts={counts}
        loading={loading}
        onRefresh={refreshAll}
        headerActions={
          <div className="relative w-[220px] hidden sm:block">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9A97]" />
            <input
              type="search"
              placeholder="Search shops…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-[13px] rounded-md border border-[rgba(55,53,47,0.16)] bg-white placeholder:text-[#C4C4C2] focus:outline-none focus:ring-2 focus:ring-[#2383E2]/30 focus:border-[#2383E2]/50"
            />
          </div>
        }
      >
        {/* Stats row */}
        <div className="px-8 pb-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminStatCard label="Pending review" value={counts.pending} />
          <AdminStatCard label="Active shops" value={counts.approved} />
          <AdminStatCard label="Rejected" value={counts.rejected} />
          <AdminStatCard
            label="In this view"
            value={loading ? '—' : filtered.length}
            sub={pagination.total ? `${pagination.total} total` : undefined}
          />
        </div>

        {/* Mobile search */}
        <div className="px-8 pb-4 sm:hidden">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9A97]" />
            <input
              type="search"
              placeholder="Search shops…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-8 pr-3 text-[13px] rounded-md border border-[rgba(55,53,47,0.16)] bg-white"
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="flex-1 min-w-0 pb-8">
            {loading ? (
              <SkeletonRows />
            ) : filtered.length === 0 ? (
              <div className="mx-8 rounded-lg border border-[rgba(55,53,47,0.09)] bg-white">
                <AdminEmptyState {...emptyCopy[view]} />
              </div>
            ) : (
              <TenantDatabase
                tenants={filtered}
                selectedId={selected?._id ?? null}
                onSelect={setSelected}
                actingId={actingId}
                onApprove={handleApprove}
                onReject={openReject}
              />
            )}
          </div>

          {selected && !loading && filtered.some((t) => t._id === selected._id) && (
            <div className="hidden lg:block shrink-0">
            <TenantDetailPanel
              tenant={selected}
              onClose={() => setSelected(null)}
              actingId={actingId}
              onApprove={handleApprove}
              onReject={openReject}
            />
            </div>
          )}
        </div>
      </AdminShell>

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open: boolean) => !open && setRejectTarget(null)}
      >
        <DialogContent className="sm:max-w-md border-[rgba(55,53,47,0.09)] shadow-xl">
          <DialogHeader className="p-0">
            <DialogTitle className="text-[#37352F] font-semibold tracking-[-0.02em]">
              Reject registration
            </DialogTitle>
          </DialogHeader>
          <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
            <span className="font-medium text-[#37352F]">{rejectTarget?.name}</span> will not be
            able to use the platform. You can add a short note for the owner.
          </p>
          <Input
            type="text"
            placeholder="Optional reason (shown when they try to sign in)"
            value={rejectReason}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setRejectReason(e.target.value)
            }
            className="border-[rgba(55,53,47,0.16)] focus-visible:ring-[#2383E2]/30"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setRejectTarget(null)}
              className="border-[rgba(55,53,47,0.16)]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!!actingId}
              className="bg-[#9F3A2F] hover:bg-[#8A3229]"
            >
              Reject shop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
