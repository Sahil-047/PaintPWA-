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
    <div className="mx-4 sm:mx-6 lg:mx-8 mb-8 rounded-[20px] border border-[#e8eef5] bg-white overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-[60px] border-b border-[#f1f5f9] last:border-0 animate-pulse bg-gradient-to-r from-[var(--brand-space)] via-[var(--brand-tertiary)] to-[var(--brand-space)] bg-[length:200%_100%]"
        />
      ))}
    </div>
  );
}

const EMPTY_COUNTS: Record<AdminView, number> = {
  pending: 0,
  approved: 0,
  rejected: 0,
  deactivated: 0,
  all: 0,
};

export default function AdminPage() {
  const [view, setView] = useState<AdminView>('pending');
  const [tenants, setTenants] = useState<TenantRegistration[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 1,
  });
  const [counts, setCounts] = useState<Record<AdminView, number>>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<TenantRegistration | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<TenantRegistration | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState<TenantRegistration | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TenantRegistration | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const loadCounts = useCallback(async () => {
    try {
      const [pending, approved, rejected, deactivated, all] = await Promise.all([
        adminApi.listTenants({ status: 'pending', page: 1, limit: 1 }),
        adminApi.listTenants({ status: 'approved', page: 1, limit: 1 }),
        adminApi.listTenants({ status: 'rejected', page: 1, limit: 1 }),
        adminApi.listTenants({ status: 'deactivated', page: 1, limit: 1 }),
        adminApi.listTenants({ status: 'all', page: 1, limit: 1 }),
      ]);
      setCounts({
        pending: pending.pagination.total,
        approved: approved.pagination.total,
        rejected: rejected.pagination.total,
        deactivated: deactivated.pagination.total,
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

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    setActingId(deactivateTarget._id);
    try {
      await adminApi.deactivateTenant(deactivateTarget._id);
      toast.success('Subscription deactivated');
      setDeactivateTarget(null);
      setSelected(null);
      await refreshAll();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not deactivate'
      );
    } finally {
      setActingId(null);
    }
  }

  async function handleReactivate(id: string) {
    setActingId(id);
    try {
      await adminApi.reactivateTenant(id);
      toast.success('Subscription reactivated');
      await refreshAll();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not reactivate'
      );
    } finally {
      setActingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    if (deleteConfirm.trim() !== deleteTarget.slug) {
      toast.error('Type the shop slug to confirm deletion');
      return;
    }
    setActingId(deleteTarget._id);
    try {
      await adminApi.deleteTenant(deleteTarget._id);
      toast.success(`Deleted ${deleteTarget.name}`);
      setDeleteTarget(null);
      setDeleteConfirm('');
      setSelected(null);
      await refreshAll();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not delete tenant'
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
      title: 'No active shops',
      description: 'Approved tenants with live subscriptions show up here.',
    },
    deactivated: {
      title: 'No deactivated shops',
      description: 'Suspended subscriptions will be listed here.',
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

  const searchInput = (
    <div className="relative w-full sm:w-[240px]">
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/35" />
      <input
        type="search"
        placeholder="Search shops…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full h-9 pl-9 pr-3 text-[13px] rounded-[12px] border border-[#e2e8f0] bg-white placeholder:text-black/30 focus:outline-none focus:ring-[3px] focus:ring-[var(--brand-primary)]/15 focus:border-[var(--brand-primary)]"
      />
    </div>
  );

  return (
    <>
      <AdminShell
        view={view}
        onViewChange={setView}
        counts={counts}
        loading={loading}
        onRefresh={refreshAll}
        headerActions={<div className="hidden sm:block">{searchInput}</div>}
      >
        <div className="px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminStatCard label="Pending review" value={counts.pending} accent />
          <AdminStatCard label="Active shops" value={counts.approved} />
          <AdminStatCard label="Deactivated" value={counts.deactivated} />
          <AdminStatCard
            label="In this view"
            value={loading ? '—' : filtered.length}
            sub={pagination.total ? `${pagination.total} total` : undefined}
          />
        </div>

        <div className="px-4 sm:px-6 lg:px-8 pb-4 sm:hidden">{searchInput}</div>

        <div className="pb-8">
          {loading ? (
            <SkeletonRows />
          ) : filtered.length === 0 ? (
            <div className="mx-4 sm:mx-6 lg:mx-8 rounded-[20px] border border-[#e8eef5] bg-white">
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
              onDeactivate={setDeactivateTarget}
              onReactivate={handleReactivate}
              onDelete={(t) => {
                setDeleteTarget(t);
                setDeleteConfirm('');
              }}
            />
          )}
        </div>
      </AdminShell>

      <TenantDetailPanel
        open={!!selected && !loading}
        tenant={selected}
        onClose={() => setSelected(null)}
        actingId={actingId}
        onApprove={async (id) => {
          await handleApprove(id);
          setSelected(null);
        }}
        onReject={(t) => {
          setSelected(null);
          openReject(t);
        }}
        onDeactivate={(t) => {
          setSelected(null);
          setDeactivateTarget(t);
        }}
        onReactivate={async (id) => {
          await handleReactivate(id);
          setSelected(null);
        }}
        onDelete={(t) => {
          setSelected(null);
          setDeleteTarget(t);
          setDeleteConfirm('');
        }}
      />

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open: boolean) => !open && setRejectTarget(null)}
      >
        <DialogContent className="sm:max-w-md rounded-[20px] border-[#e8eef5] shadow-xl">
          <DialogHeader className="p-0">
            <DialogTitle className="text-[var(--brand-text)] font-bold tracking-tight">
              Reject registration
            </DialogTitle>
          </DialogHeader>
          <p className="text-[14px] text-black/55 leading-relaxed">
            <span className="font-semibold text-[var(--brand-text)]">{rejectTarget?.name}</span>{' '}
            will not be able to use the platform. You can add a short note for the owner.
          </p>
          <Input
            type="text"
            placeholder="Optional reason"
            value={rejectReason}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setRejectReason(e.target.value)}
            className="rounded-xl border-[#e2e8f0] focus-visible:ring-[var(--brand-primary)]/20"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRejectTarget(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!!actingId}
              className="rounded-xl bg-red-600 hover:bg-red-700"
            >
              Reject shop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deactivateTarget}
        onOpenChange={(open: boolean) => !open && setDeactivateTarget(null)}
      >
        <DialogContent className="sm:max-w-md rounded-[20px] border-[#e8eef5] shadow-xl">
          <DialogHeader className="p-0">
            <DialogTitle className="text-[var(--brand-text)] font-bold tracking-tight">
              Deactivate subscription
            </DialogTitle>
          </DialogHeader>
          <p className="text-[14px] text-black/55 leading-relaxed">
            <span className="font-semibold text-[var(--brand-text)]">
              {deactivateTarget?.name}
            </span>{' '}
            will lose access immediately. You can reactivate later without deleting data.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeactivateTarget(null)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeactivate}
              disabled={!!actingId}
              className="rounded-xl bg-slate-800 hover:bg-slate-900 text-white"
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteConfirm('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-[20px] border-[#e8eef5] shadow-xl">
          <DialogHeader className="p-0">
            <DialogTitle className="text-[var(--brand-text)] font-bold tracking-tight">
              Delete tenant
            </DialogTitle>
          </DialogHeader>
          <p className="text-[14px] text-black/55 leading-relaxed">
            Permanently remove{' '}
            <span className="font-semibold text-[var(--brand-text)]">{deleteTarget?.name}</span>{' '}
            and its login users. This cannot be undone.
          </p>
          <div className="space-y-2">
            <p className="text-[12px] text-black/45">
              Type <span className="font-mono font-semibold text-[var(--brand-text)]">{deleteTarget?.slug}</span> to
              confirm
            </p>
            <Input
              type="text"
              placeholder={deleteTarget?.slug}
              value={deleteConfirm}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setDeleteConfirm(e.target.value)}
              className="rounded-xl border-[#e2e8f0] focus-visible:ring-red-500/20 font-mono"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteConfirm('');
              }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!!actingId || deleteConfirm.trim() !== deleteTarget?.slug}
              className="rounded-xl bg-red-600 hover:bg-red-700"
            >
              Delete forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
