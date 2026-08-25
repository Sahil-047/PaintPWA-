import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { KeyRound, Store, User } from 'lucide-react';

type SettingsTab = 'profile' | 'shop' | 'security';

const TABS: { id: SettingsTab; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'shop', label: 'Shop', icon: Store },
  { id: 'security', label: 'Security', icon: KeyRound },
];

function apiError(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

function initials(name?: string) {
  if (!name?.trim()) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function Field({
  id,
  label,
  children,
  className,
}: {
  id: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="text-[13px] font-medium text-[#475569]">
        {label}
      </Label>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { user, tenant, setSession, isSuperAdmin } = useAuthStore();
  const isShopAdmin = user?.role === 'admin';

  const [tab, setTab] = useState<SettingsTab>('profile');
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
  });

  const [shop, setShop] = useState({
    name: tenant?.name ?? '',
    phone: tenant?.phone ?? '',
    address: tenant?.address ?? '',
  });

  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: '',
  });

  useEffect(() => {
    setProfile({ name: user?.name ?? '', email: user?.email ?? '' });
  }, [user?.name, user?.email]);

  useEffect(() => {
    setShop({
      name: tenant?.name ?? '',
      phone: tenant?.phone ?? '',
      address: tenant?.address ?? '',
    });
  }, [tenant?.name, tenant?.phone, tenant?.address]);

  async function handleProfileSave(e: FormEvent) {
    e.preventDefault();
    if (!profile.name.trim() || !profile.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSaving(true);
    try {
      const updated = await authApi.updateProfile({
        name: profile.name.trim(),
        email: profile.email.trim(),
      });
      if (user) setSession(updated, tenant, isSuperAdmin);
      toast.success('Profile saved');
    } catch (err) {
      toast.error(apiError(err, 'Failed to save profile'));
    } finally {
      setSaving(false);
    }
  }

  async function handleShopSave(e: FormEvent) {
    e.preventDefault();
    if (!isShopAdmin) {
      toast.error('Only shop admins can edit shop details');
      return;
    }
    if (!shop.name.trim()) {
      toast.error('Shop name is required');
      return;
    }
    setSaving(true);
    try {
      const updated = await authApi.updateShop({
        name: shop.name.trim(),
        phone: shop.phone.trim(),
        address: shop.address.trim(),
      });
      if (user) setSession(user, updated, isSuperAdmin);
      toast.success('Shop details saved');
    } catch (err) {
      toast.error(apiError(err, 'Failed to save shop details'));
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSave(e: FormEvent) {
    e.preventDefault();
    if (!passwordForm.current || !passwordForm.next) {
      toast.error('Fill in all password fields');
      return;
    }
    if (passwordForm.next.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await authApi.updatePassword({
        currentPassword: passwordForm.current,
        newPassword: passwordForm.next,
      });
      toast.success('Password updated');
      setPasswordForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      toast.error(apiError(err, 'Failed to update password'));
    } finally {
      setSaving(false);
    }
  }

  const inputClass = cn(
    'h-11 w-full rounded-xl border-[#e2e8f0] bg-white text-[14px] text-[#0f172a]',
    'placeholder:text-[#94a3b8]',
    'focus-visible:border-[var(--brand-primary)] focus-visible:ring-[var(--brand-primary)]/20',
    'disabled:bg-[#f8fafc] disabled:text-[#64748b]'
  );

  const primaryBtn =
    'h-11 rounded-xl bg-[var(--brand-primary)] text-white hover:bg-[#0f4ae0] hover:text-white px-5 text-[14px] font-semibold shadow-none';

  const tabMeta = TABS.find((t) => t.id === tab)!;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-5">
        <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight text-[#0f172a] leading-none">
          Settings
        </h1>
        <p className="mt-2 text-[14px] text-[#64748b]">
          Manage your account
          {tenant?.name ? (
            <>
              {' '}
              for <span className="font-medium text-[#334155]">{tenant.name}</span>
            </>
          ) : null}
        </p>
      </header>

      {/* Single shell so columns share one edge and height */}
      <div className="bg-white rounded-[20px] border border-[#e2e8f0] shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Sub-nav */}
          <aside className="md:w-[200px] lg:w-[220px] shrink-0 border-b md:border-b-0 md:border-r border-[#eef2f7] bg-[#fafbfc] p-3">
            <div className="flex items-center gap-2.5 px-2.5 py-2.5 mb-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-tertiary)] text-[12px] font-bold text-[var(--brand-primary)] border border-[var(--brand-secondary)]/40">
                {initials(user?.name)}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[#0f172a] truncate leading-tight">
                  {user?.name || 'User'}
                </p>
                <p className="text-[11px] text-[#64748b] truncate capitalize">{user?.role ?? 'staff'}</p>
              </div>
            </div>

            <nav className="space-y-0.5">
              {TABS.map(({ id, label, icon: Icon }) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-colors',
                      active
                        ? 'bg-[var(--brand-primary)] text-white'
                        : 'text-[#475569] hover:bg-white'
                    )}
                  >
                    <Icon
                      className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-[#94a3b8]')}
                      strokeWidth={2.25}
                    />
                    {label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Content — height follows content, no dead space */}
          <div className="flex-1 min-w-0 p-5 sm:p-6 lg:p-7">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h2 className="text-[17px] font-semibold text-[#0f172a] tracking-tight">
                  {tab === 'profile'
                    ? 'Your profile'
                    : tab === 'shop'
                      ? 'Shop details'
                      : tabMeta.label}
                </h2>
                <p className="mt-1 text-[13px] text-[#64748b] leading-snug max-w-xl">
                  {tab === 'profile' && 'Name and email used across invoices and accounts.'}
                  {tab === 'shop' &&
                    (isShopAdmin
                      ? 'Update how your shop appears on bills and records.'
                      : 'Only shop admins can edit these details.')}
                  {tab === 'security' && 'Change your password.'}
                </p>
              </div>
              {tab === 'shop' && !isShopAdmin && (
                <span className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[#f1f5f9] text-[#64748b]">
                  View only
                </span>
              )}
            </div>

            {tab === 'profile' && (
              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field id="name" label="Full name">
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                  <Field id="email" label="Email">
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex rounded-full bg-[#f1f5f9] px-2.5 py-1 text-[12px] font-medium capitalize text-[#475569]">
                    {user?.role ?? '—'}
                  </span>
                  <span className="text-[13px] text-[#94a3b8]">Account role</span>
                </div>
                <Button type="submit" disabled={saving} className={primaryBtn}>
                  {saving ? 'Saving…' : 'Save profile'}
                </Button>
              </form>
            )}

            {tab === 'shop' && (
              <form onSubmit={handleShopSave} className="space-y-4">
                <Field id="shop-name" label="Shop name">
                  <Input
                    id="shop-name"
                    value={shop.name}
                    disabled={!isShopAdmin}
                    onChange={(e) => setShop((s) => ({ ...s, name: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
                <Field id="shop-phone" label="Phone">
                  <Input
                    id="shop-phone"
                    value={shop.phone}
                    disabled={!isShopAdmin}
                    placeholder="Optional"
                    onChange={(e) => setShop((s) => ({ ...s, phone: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
                <Field id="shop-address" label="Address">
                  <Input
                    id="shop-address"
                    value={shop.address}
                    disabled={!isShopAdmin}
                    placeholder="Optional"
                    onChange={(e) => setShop((s) => ({ ...s, address: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#f8fafc] border border-[#eef2f7] px-3.5 py-3">
                    <p className="text-[11px] text-[#94a3b8]">Slug</p>
                    <p className="mt-0.5 text-[13px] font-semibold text-[#0f172a] truncate">
                      {tenant?.slug ?? '—'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#f8fafc] border border-[#eef2f7] px-3.5 py-3">
                    <p className="text-[11px] text-[#94a3b8]">Plan</p>
                    <p className="mt-0.5 text-[13px] font-semibold text-[#0f172a] capitalize">
                      {tenant?.plan ?? '—'}
                    </p>
                  </div>
                </div>
                {isShopAdmin && (
                  <Button type="submit" disabled={saving} className={primaryBtn}>
                    {saving ? 'Saving…' : 'Save shop details'}
                  </Button>
                )}
              </form>
            )}

            {tab === 'security' && (
              <form onSubmit={handlePasswordSave} className="space-y-4">
                <Field id="current-password" label="Current password">
                  <Input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    value={passwordForm.current}
                    onChange={(e) =>
                      setPasswordForm((p) => ({ ...p, current: e.target.value }))
                    }
                    className={inputClass}
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field id="new-password" label="New password">
                    <Input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.next}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, next: e.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                  <Field id="confirm-password" label="Confirm">
                    <Input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.confirm}
                      onChange={(e) =>
                        setPasswordForm((p) => ({ ...p, confirm: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>
                <Button type="submit" disabled={saving} className={primaryBtn}>
                  {saving ? 'Updating…' : 'Update password'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
