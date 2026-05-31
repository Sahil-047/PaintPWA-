import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import PageTitle from '@/components/PageTitle';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';
import { User, Shield, Bell, Palette } from 'lucide-react';

export default function SettingsPage() {
  const { user, tenant } = useAuthStore();
  const [profile, setProfile] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
  });

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Profile updated successfully!');
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <PageTitle title="Settings" description="Manage your account and preferences" />

      <div className="space-y-4">
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Profile Settings</h3>
                <p className="text-sm text-slate-600">Shop: {tenant?.name}</p>
              </div>
            </div>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
              </div>
            <Button type="submit">Save Changes</Button>
          </form>
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
            <Button variant="outline">Change Password</Button>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Bell className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Notifications</h3>
                <p className="text-sm text-slate-600">Low stock alerts and email updates</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Low Stock Alerts</h4>
                <p className="text-sm text-slate-600">Get notified when stock is low</p>
              </div>
              <Button variant="outline" size="sm">Configure</Button>
            </div>
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Email Notifications</h4>
                <p className="text-sm text-slate-600">Receive updates via email</p>
              </div>
              <Button variant="outline" size="sm">Configure</Button>
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
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Theme</h4>
                <p className="text-sm text-slate-600">Choose your preferred theme</p>
              </div>
              <Button variant="outline" size="sm">Light Mode</Button>
            </div>
        </section>
      </div>
    </div>
  );
}
