import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { authApi } from '@/api';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';
import bgImage from '@/assets/bg new image.png';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Link2,
  Lock,
  Mail,
  Palette,
  Sparkles,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/config/config';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const perks = [
  'Inventory & stock tracking',
  'Invoices & partial payments',
  'Customer ledger & dues',
  'Sales analytics dashboard',
];

export default function SignupPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [formData, setFormData] = useState({
    shopName: '',
    slug: '',
    name: '',
    email: '',
    password: '',
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  function updateShopName(shopName: string) {
    setFormData((prev) => ({
      ...prev,
      shopName,
      slug: slugTouched ? prev.slug : slugify(shopName),
    }));
  }

  function updateSlug(slug: string) {
    setSlugTouched(true);
    setFormData((prev) => ({ ...prev, slug: slugify(slug) }));
  }

  const slugValid = formData.slug.length >= 2 && /^[a-z0-9-]+$/.test(formData.slug);
  const passwordValid = formData.password.length >= 6;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slugValid) {
      toast.error('Choose a valid shop URL slug (letters, numbers, hyphens)');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register(formData);
      const data = res.data.data;
      if (data.pending) {
        toast.success(data.message, { duration: 6000 });
        navigate(ROUTES.HOME);
        return;
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Registration failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0f172a]">
      {/* Hero panel */}
      <div className="relative lg:w-[48%] min-h-[240px] lg:min-h-screen overflow-hidden">
        <div
          className="absolute inset-0 bg-center bg-no-repeat bg-cover scale-105"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#2563eb]/90 via-indigo-700/50 to-violet-600/40 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/70 via-transparent to-[#0f172a]/10" />

        <div className="relative z-10 h-full flex flex-col justify-between p-8 sm:p-10 lg:p-12 text-white">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-medium backdrop-blur-md border border-white/20 w-fit">
            <Palette className="size-4 text-sky-200" strokeWidth={2.25} />
            <span>Paint ERP</span>
          </div>

          <div className="my-8 lg:my-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-100 mb-5 border border-white/10">
              <Sparkles className="w-3.5 h-3.5" />
              Free to start
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight leading-[1.15] max-w-md">
              Launch your paint shop workspace in minutes.
            </h1>
            <p className="mt-4 text-base text-white/85 max-w-sm leading-relaxed">
              One account for billing, inventory, customer dues, and reports — built for
              Indian paint retailers.
            </p>

            <ul className="mt-8 space-y-3">
              {perks.map((perk) => (
                <li key={perk} className="flex items-center gap-2.5 text-sm text-white/90">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" strokeWidth={2.25} />
                  {perk}
                </li>
              ))}
            </ul>
          </div>

          <p className="hidden lg:block text-xs text-white/50">
            Trusted by paint shops managing Asian Paints, Berger, Nerolac & more.
          </p>
        </div>
      </div>

      {/* Form panel — modal-quality card */}
      <div className="relative flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-12 bg-gradient-to-br from-[#f8fafc] via-white to-[#eff6ff] overflow-y-auto">
        <div className="pointer-events-none absolute -top-20 -right-20 size-72 rounded-full bg-[#2563eb]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 size-80 rounded-full bg-violet-200/40 blur-3xl" />

        <div className="relative z-10 w-full max-w-[480px]">
          <div className="rounded-[24px] border border-[#e2e8f0]/90 bg-white/90 backdrop-blur-xl shadow-[0_32px_64px_-16px_rgba(15,23,42,0.18)] overflow-hidden">
            {/* Card header strip */}
            <div className="bg-gradient-to-r from-[#2563eb] to-[#3b82f6] px-8 py-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/25">
                  <Building2 className="w-5 h-5" strokeWidth={2.25} />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Register your shop</h2>
                  <p className="text-sm text-blue-100 mt-0.5">Set up your tenant workspace</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="px-8 py-7 space-y-7">
              {/* Shop section */}
              <div className="space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#94a3b8]">
                  Shop details
                </p>

                <div className="space-y-2">
                  <Label htmlFor="shopName" className="text-[#334155] font-medium">
                    Shop name
                  </Label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#94a3b8]" strokeWidth={2} />
                    <Input
                      id="shopName"
                      placeholder="Sharma Paint House"
                      value={formData.shopName}
                      onChange={(e) => updateShopName(e.target.value)}
                      required
                      disabled={loading}
                      className="h-11 pl-11 border-[#e2e8f0] bg-[#f8fafc]/50 focus-visible:border-[#2563eb] focus-visible:ring-[#2563eb]/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug" className="text-[#334155] font-medium">
                    Shop URL slug
                  </Label>
                  <div className="relative">
                    <Link2 className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#94a3b8]" strokeWidth={2} />
                    <Input
                      id="slug"
                      placeholder="sharma-paint-house"
                      value={formData.slug}
                      onChange={(e) => updateSlug(e.target.value)}
                      required
                      disabled={loading}
                      className={cn(
                        'h-11 pl-11 border-[#e2e8f0] bg-[#f8fafc]/50 focus-visible:border-[#2563eb] focus-visible:ring-[#2563eb]/20',
                        formData.slug && !slugValid && 'border-amber-300 focus-visible:border-amber-400'
                      )}
                    />
                  </div>
                  {formData.slug && (
                    <p
                      className={cn(
                        'text-xs flex items-center gap-1.5',
                        slugValid ? 'text-emerald-600' : 'text-amber-600'
                      )}
                    >
                      {slugValid ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          paintappstore.in/{formData.slug}
                        </>
                      ) : (
                        'Use lowercase letters, numbers, and hyphens only'
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-[#e2e8f0] to-transparent" />

              {/* Admin section */}
              <div className="space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#94a3b8]">
                  Admin account
                </p>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[#334155] font-medium">
                    Your full name
                  </Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#94a3b8]" strokeWidth={2} />
                    <Input
                      id="name"
                      placeholder="Rahul Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      disabled={loading}
                      className="h-11 pl-11 border-[#e2e8f0] bg-[#f8fafc]/50 focus-visible:border-[#2563eb] focus-visible:ring-[#2563eb]/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#334155] font-medium">
                    Work email
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#94a3b8]" strokeWidth={2} />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@shop.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      disabled={loading}
                      className="h-11 pl-11 border-[#e2e8f0] bg-[#f8fafc]/50 focus-visible:border-[#2563eb] focus-visible:ring-[#2563eb]/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[#334155] font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#94a3b8]" strokeWidth={2} />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      minLength={6}
                      disabled={loading}
                      className="h-11 pl-11 border-[#e2e8f0] bg-[#f8fafc]/50 focus-visible:border-[#2563eb] focus-visible:ring-[#2563eb]/20"
                    />
                  </div>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-colors',
                          formData.password.length >= i * 3
                            ? passwordValid
                              ? 'bg-emerald-400'
                              : 'bg-amber-400'
                            : 'bg-[#e2e8f0]'
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !slugValid}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#3b82f6] hover:from-[#1d4ed8] hover:to-[#2563eb] text-white font-semibold shadow-[0_4px_14px_rgba(37,99,235,0.4)] border-0 text-[15px]"
              >
                {loading ? (
                  'Creating your shop…'
                ) : (
                  <span className="inline-flex items-center gap-2">
                    Create shop workspace
                    <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                  </span>
                )}
              </Button>
            </form>

            <div className="px-8 pb-8 pt-0">
              <p className="text-center text-sm text-[#64748b]">
                Already have an account?{' '}
                <Link
                  to={ROUTES.HOME}
                  className="font-semibold text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-[11px] text-[#94a3b8] mt-5">
            By registering, you agree to manage your shop data securely within Paint ERP.
          </p>
        </div>
      </div>
    </div>
  );
}
