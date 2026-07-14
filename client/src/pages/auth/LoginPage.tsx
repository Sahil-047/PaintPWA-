import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { authApi } from '@/api';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';
import bgImage from '@/assets/bg new image.png';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/config/config';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login(formData);
      const data = res.data.data!;
      if (data.isSuperAdmin) {
        setAuth(data.token, data.user, null, true);
        navigate(ROUTES.ADMIN);
        return;
      }
      setAuth(data.token, data.user, data.tenant ?? null, false);
      if (data.tenant?.status === 'pending') {
        navigate(ROUTES.PENDING_APPROVAL);
        return;
      }
      toast.success('Login successful!');
      navigate(ROUTES.DASHBOARD);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Login failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-950">
      <div className={cn('relative lg:w-[52%] min-h-[200px] sm:min-h-[280px] lg:min-h-screen overflow-hidden')}>
        <div
          className="absolute inset-0 bg-center bg-no-repeat bg-cover scale-105"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-sky-600/85 via-sky-700/40 to-orange-500/50 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/20" />
        <div className="relative z-10 h-full min-h-[200px] sm:min-h-[280px] lg:min-h-screen flex flex-col justify-end lg:justify-center p-8 sm:p-10 lg:p-14 text-white">
          <div className="mb-4 w-fit">
            <BrandLogo height={52} className="rounded-lg" />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight max-w-lg leading-tight">
            Run inventory, orders, and formulas in one place.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/90 max-w-md leading-relaxed">
            Sign in to your workspace and keep every batch, shade, and shipment on track.
          </p>
        </div>
      </div>

      <div className="relative flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-14 bg-gradient-to-br from-slate-50 via-white to-sky-50/80 overflow-hidden">
        <div className="relative z-10 w-full max-w-[420px]">
          <div className="rounded-2xl border border-slate-200/90 bg-white/80 backdrop-blur-xl shadow-[0_24px_80px_-12px_rgba(15,23,42,0.18)] p-8 sm:p-9">
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex justify-center">
                <BrandLogo height={56} className="rounded-xl" />
              </div>
              <h2 className="text-2xl sm:text-[1.65rem] font-bold tracking-tight text-slate-900">Welcome back</h2>
              <p className="mt-2 text-sm text-slate-600">Enter your credentials to access your dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={loading}
                    className="h-11 pl-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    disabled={loading}
                    className="h-11 pl-11"
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 bg-sky-600 hover:bg-orange-500">
                {loading ? 'Signing in…' : (
                  <span className="inline-flex items-center gap-2">
                    Sign in <ArrowRight className="size-4" />
                  </span>
                )}
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-600">
              Don&apos;t have an account?{' '}
              <Link to={ROUTES.SIGNUP} className="font-semibold text-sky-600 hover:text-orange-600">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
