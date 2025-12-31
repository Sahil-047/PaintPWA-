import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, User, Shield, Bell, Palette } from 'lucide-react';
import authService from '../../services/authService';
import { toast } from 'sonner';

const Settings = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleProfileUpdate = (e) => {
    e.preventDefault();
    toast.success('Profile updated successfully!');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Back Button */}
      <div className="w-full px-8 pt-6 pb-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      {/* Main Content */}
      <main className="pb-8">
        <div className="w-full px-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Settings</h2>
            <p className="text-slate-600">Manage your account and preferences</p>
          </div>

          <div className="space-y-6">
            {/* Profile Settings */}
            <Card className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Profile Settings</h3>
                    <p className="text-sm text-slate-600">Update your personal information</p>
                  </div>
                </div>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-semibold text-slate-900">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-slate-900">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="h-10"
                    />
                  </div>
                  <Button type="submit" className="mt-4">
                    Save Changes
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Shield className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Security</h3>
                    <p className="text-sm text-slate-600">Manage your password and security preferences</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Change Password</h4>
                    <p className="text-sm text-slate-600 mb-4">
                      Update your password to keep your account secure
                    </p>
                    <Button variant="outline">Change Password</Button>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Two-Factor Authentication</h4>
                    <p className="text-sm text-slate-600 mb-4">
                      Add an extra layer of security to your account
                    </p>
                    <Button variant="outline">Enable 2FA</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Bell className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Notifications</h3>
                    <p className="text-sm text-slate-600">Manage how you receive notifications</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-slate-900">Email Notifications</h4>
                      <p className="text-sm text-slate-600">Receive updates via email</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-slate-900">Low Stock Alerts</h4>
                      <p className="text-sm text-slate-600">Get notified when stock is low</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Appearance Settings */}
            <Card className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Palette className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Appearance</h3>
                    <p className="text-sm text-slate-600">Customize how the app looks</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900">Theme</h4>
                    <p className="text-sm text-slate-600">Choose your preferred theme</p>
                  </div>
                  <Button variant="outline" size="sm">Light Mode</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
