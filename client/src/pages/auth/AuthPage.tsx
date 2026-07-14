import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { authApi } from '@/api';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/config/config';
import BrandLogo from '@/components/BrandLogo';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const field =
  'h-12 rounded-xl border-[#d7e3f4] bg-[#fbfdff] text-[#0f172a] placeholder:text-[#94a3b8] shadow-none transition-all duration-200 focus-visible:bg-white focus-visible:border-[var(--brand-primary)] focus-visible:ring-[3px] focus-visible:ring-[var(--brand-primary)]/18';

function PaintAccent({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 420 420"
      fill="none"
      aria-hidden
    >
      <path
        d="M78 62c48-38 118-42 168-12 52 32 86 94 78 152-8 62-54 112-112 132-66 22-138-2-174-58-38-58-20-152 40-214Z"
        fill="url(#paintBlob)"
        opacity="0.55"
      />
      <path
        d="M248 88c34 8 62 36 72 70 12 40-4 84-36 110-34 28-82 34-120 18-40-16-68-52-70-94-2-46 28-90 72-106 26-10 54-8 82 2Z"
        fill="url(#paintCyan)"
        opacity="0.5"
      />
      <path
        d="M160 210c8 42 38 78 78 92 44 16 92 4 122-28"
        stroke="url(#paintStroke)"
        strokeWidth="28"
        strokeLinecap="round"
        opacity="0.7"
      />
      <defs>
        <linearGradient id="paintBlob" x1="40" y1="40" x2="320" y2="360" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1358fa" />
          <stop offset="1" stopColor="#b3caf2" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="paintCyan" x1="180" y1="60" x2="340" y2="280" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00D4FF" />
          <stop offset="1" stopColor="#1358fa" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="paintStroke" x1="160" y1="210" x2="360" y2="280" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1358fa" />
          <stop offset="1" stopColor="#00D4FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isSignup = location.pathname === ROUTES.SIGNUP;

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({
    shopName: '',
    slug: '',
    name: '',
    email: '',
    password: '',
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  function updateShopName(shopName: string) {
    setSignupData((prev) => ({
      ...prev,
      shopName,
      slug: slugTouched ? prev.slug : slugify(shopName),
    }));
  }

  const slugValid = signupData.slug.length >= 2 && /^[a-z0-9-]+$/.test(signupData.slug);
  const pwOk = signupData.password.length >= 8;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login(loginData);
      const data = res.data.data!;
      if (data.isSuperAdmin) {
        setAuth(data.token, data.user, null, true);
        toast.success('Welcome, Super Admin');
        navigate(ROUTES.ADMIN);
        return;
      }
      setAuth(data.token, data.user, data.tenant ?? null, false);
      if (data.tenant?.status === 'pending') {
        toast.message('Your shop is awaiting approval');
        navigate(ROUTES.PENDING_APPROVAL);
        return;
      }
      toast.success('Login successful!');
      navigate(ROUTES.DASHBOARD);
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Login failed'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!slugValid) {
      toast.error('Invalid shop slug');
      return;
    }
    if (!pwOk) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register(signupData);
      const data = res.data.data;
      if (data.pending) {
        toast.success(data.message, { duration: 6000 });
        navigate(ROUTES.HOME);
      }
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Registration failed'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page h-dvh max-h-dvh w-full relative overflow-hidden">
      <style>{`
        html:has(.auth-page),
        body:has(.auth-page) {
          overflow: hidden !important;
          height: 100%;
          overscroll-behavior: none;
        }
        .auth-page {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .auth-page::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
        .auth-page .auth-rise {
          animation: authRise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .auth-page .auth-rise-delay {
          animation: authRise 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
        }
        .auth-page .auth-float {
          animation: authFloat 9s ease-in-out infinite;
        }
        .auth-page .auth-float-slow {
          animation: authFloat 12s ease-in-out infinite reverse;
        }
        .auth-page .auth-btn:hover .auth-arrow {
          transform: translateX(3px);
        }
        .auth-page .auth-arrow {
          transition: transform 0.2s ease;
        }
        @keyframes authRise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes authFloat {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(12px, -18px, 0) rotate(2deg); }
        }
      `}</style>

      {/* Light brand atmosphere */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(152deg, #e8f1ff 0%, #f5f9ff 28%, #ffffff 58%, #eef6ff 100%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(19,88,250,0.14) 1px, transparent 0)',
          backgroundSize: '26px 26px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)',
        }}
        aria-hidden
      />

      {/* Paint wash accents — eye-catching without photos */}
      <PaintAccent className="auth-float pointer-events-none absolute -right-24 -top-16 w-[480px] h-[480px] sm:w-[560px] sm:h-[560px] opacity-90" />
      <PaintAccent className="auth-float-slow pointer-events-none absolute -left-40 bottom-[-120px] w-[420px] h-[420px] rotate-180 opacity-50 scale-x-[-1]" />

      <div className="relative z-10 h-full min-h-0 flex flex-col px-5 py-6 sm:px-10 sm:py-8 overflow-hidden">
        <div className="auth-rise shrink-0">
          <BrandLogo height={52} className="rounded-xl" />
        </div>

        <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-4 sm:py-6 overflow-y-auto scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="auth-rise-delay w-full max-w-[420px]">
            <div className="mb-7 text-center sm:text-left">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)] mb-3">
                paintsaas
              </p>
              <h1 className="text-[30px] sm:text-[34px] font-bold tracking-tight text-[#0f172a] leading-[1.12]">
                {isSignup ? (
                  <>
                    Purchase{' '}
                    <span className="text-[var(--brand-primary)]">paint shop</span>
                  </>
                ) : (
                  <>
                    Welcome{' '}
                    <span className="text-[var(--brand-primary)]">back</span>
                  </>
                )}
              </h1>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-1 mb-6 p-1 rounded-xl bg-white/70 ring-1 ring-[#d7e3f4] backdrop-blur-sm w-fit mx-auto sm:mx-0">
              <Link
                to={ROUTES.HOME}
                className={cn(
                  'px-4 py-2 rounded-lg text-[14px] transition-all duration-200',
                  !isSignup
                    ? 'bg-[var(--brand-primary)] text-white font-semibold shadow-[0_6px_16px_rgba(19,88,250,0.28)]'
                    : 'text-[#64748b] hover:text-[#0f172a]'
                )}
              >
                Sign in
              </Link>
              <Link
                to={ROUTES.SIGNUP}
                className={cn(
                  'px-4 py-2 rounded-lg text-[14px] transition-all duration-200',
                  isSignup
                    ? 'bg-[var(--brand-primary)] text-white font-semibold shadow-[0_6px_16px_rgba(19,88,250,0.28)]'
                    : 'text-[#64748b] hover:text-[#0f172a]'
                )}
              >
                Sign up
              </Link>
            </div>

            <div className="rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-[#d7e3f4] p-6 sm:p-7 shadow-[0_20px_50px_-24px_rgba(19,88,250,0.35)]">
              {!isSignup ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[13px] font-medium text-[#334155]">Email</Label>
                    <Input
                      type="email"
                      className={field}
                      placeholder="you@shop.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[13px] font-medium text-[#334155]">Password</Label>
                    <div className="relative">
                      <Input
                        type={showPw ? 'text' : 'password'}
                        className={cn(field, 'pr-11')}
                        placeholder="••••••••"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                        disabled={loading}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#475569]"
                        onClick={() => setShowPw((v) => !v)}
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="auth-btn w-full h-12 mt-1 rounded-xl bg-[var(--brand-primary)] hover:bg-[#0f4ae0] text-white text-[15px] font-semibold shadow-[0_10px_24px_rgba(19,88,250,0.32)] hover:shadow-[0_14px_28px_rgba(19,88,250,0.38)] transition-shadow"
                  >
                    {loading ? (
                      'Signing in…'
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        Sign in
                        <ArrowRight className="auth-arrow w-4 h-4" strokeWidth={2.25} />
                      </span>
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[13px] font-medium text-[#334155]">Shop name</Label>
                    <Input
                      type="text"
                      className={field}
                      placeholder="My Paints"
                      value={signupData.shopName}
                      onChange={(e) => updateShopName(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[13px] font-medium text-[#334155]">Workspace URL</Label>
                    <div className="relative">
                      <Input
                        type="text"
                        className={cn(field, 'pr-[88px]')}
                        placeholder="my-paints"
                        value={signupData.slug}
                        onChange={(e) => {
                          setSlugTouched(true);
                          setSignupData({ ...signupData, slug: slugify(e.target.value) });
                        }}
                        required
                        disabled={loading}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#64748b] pointer-events-none">
                        .paint.app
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[13px] font-medium text-[#334155]">Your name</Label>
                      <Input
                        type="text"
                        className={field}
                        placeholder="Rahul"
                        value={signupData.name}
                        onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[13px] font-medium text-[#334155]">Email</Label>
                      <Input
                        type="email"
                        className={field}
                        placeholder="you@shop.com"
                        value={signupData.email}
                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[13px] font-medium text-[#334155]">Password</Label>
                    <div className="relative">
                      <Input
                        type={showPw ? 'text' : 'password'}
                        className={cn(field, 'pr-11')}
                        placeholder="At least 8 characters"
                        value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        required
                        disabled={loading}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#475569]"
                        onClick={() => setShowPw((v) => !v)}
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || !slugValid || !pwOk}
                    className="auth-btn w-full h-12 mt-1 rounded-xl bg-[var(--brand-primary)] hover:bg-[#0f4ae0] text-white text-[15px] font-semibold shadow-[0_10px_24px_rgba(19,88,250,0.32)] disabled:opacity-40"
                  >
                    {loading ? (
                      'Creating…'
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        Create workspace
                        <ArrowRight className="auth-arrow w-4 h-4" strokeWidth={2.25} />
                      </span>
                    )}
                  </Button>
                </form>
              )}
            </div>

            <p className="mt-6 text-center sm:text-left text-[13px] text-[#64748b]">
              {isSignup ? (
                <>
                  Already have an account?{' '}
                  <Link to={ROUTES.HOME} className="font-semibold text-[var(--brand-primary)] hover:underline">
                    Sign in
                  </Link>
                </>
              ) : (
                <>
                  New shop?{' '}
                  <Link to={ROUTES.SIGNUP} className="font-semibold text-[var(--brand-primary)] hover:underline">
                    Create a workspace
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
