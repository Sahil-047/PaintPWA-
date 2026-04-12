import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import authService from '../../services/authService';
import { toast } from 'sonner';
import bgImage from '../../assets/bg new image.png';
import { Mail, Lock, Palette, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authService.login(formData.email, formData.password);

      if (response.success) {
        toast.success('Login successful!');
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-950">
      {/* Hero / illustration */}
      <div
        className={cn(
          'relative lg:w-[52%] min-h-[200px] sm:min-h-[280px] lg:min-h-screen',
          'overflow-hidden'
        )}
      >
        <div
          className="absolute inset-0 bg-center bg-no-repeat bg-cover scale-105"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-sky-600/85 via-sky-700/40 to-orange-500/50 mix-blend-multiply"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/20" />

        <div className="relative z-10 h-full min-h-[200px] sm:min-h-[280px] lg:min-h-screen flex flex-col justify-end lg:justify-center p-8 sm:p-10 lg:p-14 text-white">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium backdrop-blur-md border border-white/20 w-fit mb-4">
            <Palette className="size-4 text-orange-200" aria-hidden />
            <span>Paint ERP</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight max-w-lg leading-tight drop-shadow-sm">
            Run inventory, orders, and formulas in one place.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/90 max-w-md leading-relaxed">
            Sign in to your workspace and keep every batch, shade, and shipment on track.
          </p>
        </div>
      </div>

      {/* Form column */}
      <div className="relative flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-14 bg-gradient-to-br from-slate-50 via-white to-sky-50/80 overflow-hidden">
        <div
          className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-sky-200/40 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-orange-200/35 blur-3xl"
          aria-hidden
        />

        <div className="relative z-10 w-full max-w-[420px]">
          <div className="rounded-2xl border border-slate-200/90 bg-white/80 backdrop-blur-xl shadow-[0_24px_80px_-12px_rgba(15,23,42,0.18)] p-8 sm:p-9">
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow-lg shadow-sky-500/25">
                <Palette className="size-7" aria-hidden />
              </div>
              <h2 className="text-2xl sm:text-[1.65rem] font-bold tracking-tight text-slate-900">
                Welcome back
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Enter your credentials to access your dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">
                  Email
                </Label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={loading}
                    className="h-11 pl-11 border-slate-200 bg-white/90 focus-visible:border-sky-500 focus-visible:ring-sky-500/25"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    disabled={loading}
                    className="h-11 pl-11 border-slate-200 bg-white/90 focus-visible:border-sky-500 focus-visible:ring-sky-500/25"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className={cn(
                  'w-full h-11 text-base font-semibold rounded-xl',
                  'bg-sky-600 text-white shadow-md',
                  'hover:bg-orange-500 hover:text-white',
                  'transition-colors duration-200'
                )}
              >
                {loading ? (
                  'Signing in…'
                ) : (
                  <span className="inline-flex items-center justify-center gap-2">
                    Sign in
                    <ArrowRight className="size-4" aria-hidden />
                  </span>
                )}
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-600">
              Don&apos;t have an account?{' '}
              <Link
                to="/signup"
                className="font-semibold text-sky-600 hover:text-orange-600 underline-offset-4 hover:underline transition-colors"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
