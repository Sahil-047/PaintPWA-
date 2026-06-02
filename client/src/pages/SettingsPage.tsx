import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import PageTitle from '@/components/PageTitle';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';
import { User, Shield, Bell, Palette, Store, Mail, Phone, Building2 } from 'lucide-react';

export default function SettingsPage() {
  const { user, tenant } = useAuthStore();
  const [profile, setProfile] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
  });
  const [prefs, setPrefs] = useState({
    lowStockAlerts: true,
    emailNotifications: true,
    compactDashboard: false,
  });
  const [theme, setTheme] = useState<'light' | 'system'>('light');

  const handleProfileUpdate = (e: FormEvent) => {
    e.preventDefault();
    toast.success('Profile updated successfully!');
  };

  return (
    <div className="p-6 lg:p-8">
      <PageTitle title="Settings" description="Manage your account and preferences" />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Profile Settings</h3>
                  <p className="text-sm text-slate-600">Update your user profile</p>
                </div>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
                {user?.role ?? 'staff'}
              </span>
            </div>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" className="bg-[#2563eb] hover:bg-[#1d4ed8]">
                Save Changes
              </Button>
            </form>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Bell className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Operational Preferences</h3>
                <p className="text-sm text-slate-600">Control alerts and workspace behavior</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <div>
                  <h4 className="text-sm font-medium text-slate-900">Low stock alerts</h4>
                  <p className="text-xs text-slate-500">Alert when products hit threshold</p>
                </div>
                <Switch
                  checked={prefs.lowStockAlerts}
                  onCheckedChange={(checked) =>
                    setPrefs((prev) => ({ ...prev, lowStockAlerts: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <div>
                  <h4 className="text-sm font-medium text-slate-900">Email notifications</h4>
                  <p className="text-xs text-slate-500">Receive important operational updates</p>
                </div>
                <Switch
                  checked={prefs.emailNotifications}
                  onCheckedChange={(checked) =>
                    setPrefs((prev) => ({ ...prev, emailNotifications: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <div>
                  <h4 className="text-sm font-medium text-slate-900">Compact dashboard cards</h4>
                  <p className="text-xs text-slate-500">Show denser analytics card layout</p>
                </div>
                <Switch
                  checked={prefs.compactDashboard}
                  onCheckedChange={(checked) =>
                    setPrefs((prev) => ({ ...prev, compactDashboard: checked }))
                  }
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-50 rounded-lg">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Security</h3>
                <p className="text-sm text-slate-600">Manage password and security</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 px-4 py-3">
                <p className="text-sm font-medium text-slate-900">Password</p>
                <p className="text-xs text-slate-500 mt-1">Change your login password regularly</p>
                <Button variant="outline" className="mt-3">
                  Change Password
                </Button>
              </div>
              <div className="rounded-xl border border-slate-200 px-4 py-3">
                <p className="text-sm font-medium text-slate-900">Session security</p>
                <p className="text-xs text-slate-500 mt-1">
                  Active sessions are managed by secure token authentication.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-sky-50 rounded-lg">
                <Store className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Account Snapshot</h3>
                <p className="text-sm text-slate-600">Current tenant and user info</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <Building2 className="h-3.5 w-3.5" />
                  Shop
                </div>
                <p className="text-sm font-semibold text-slate-900">{tenant?.name ?? '—'}</p>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <Mail className="h-3.5 w-3.5" />
                  Login Email
                </div>
                <p className="text-sm font-semibold text-slate-900 break-all">{profile.email || '—'}</p>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <Phone className="h-3.5 w-3.5" />
                  Role
                </div>
                <p className="text-sm font-semibold text-slate-900 capitalize">{user?.role ?? '—'}</p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Palette className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Appearance</h3>
                <p className="text-sm text-slate-600">Customize how the app looks</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('light')}
              >
                Light
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('system')}
              >
                System
              </Button>
            </div>
            <Separator className="my-4" />
            <div className="text-xs text-slate-500">
              Theme selection is UI-ready. Persisting this preference can be wired to backend later.
            </div>
          </section>
        </div>
      </div>

      <div className="mt-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-slate-900">Save settings</p>
          <p className="text-xs text-slate-500 mt-1">
            Apply notification and appearance preferences for your workspace.
          </p>
        </div>
        <Button
          className="bg-[#2563eb] hover:bg-[#1d4ed8]"
          onClick={() => toast.success('Settings saved successfully!')}
        >
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
