import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { authApi } from '@/api';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';
import authBgFull from '@/assets/auth-bg-full.png';
import {
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  Link2,
  Lock,
  Mail,
  ShieldCheck,
  User,
  type LucideIcon,
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

const SIGN_IN_FORM_WIDTH = 480;
const SIGN_IN_FORM_HEIGHT = 560;
const SIGN_UP_FORM_WIDTH = 640;
const SIGN_UP_FORM_HEIGHT = 760;

const inputBase =
  'rounded-xl border-[#e5e5e5] bg-[#fafafa] text-[#1a1a1a] placeholder:text-[#b0b0b0] shadow-none transition-all duration-200 focus-visible:bg-white focus-visible:border-[#1a1a1a] focus-visible:ring-[3px] focus-visible:ring-[#1a1a1a]/8';

function AuthField({
  label,
  icon: Icon,
  slugSuffix,
  rightSlot,
  className,
  inputClassName,
  type = 'text',
  prominent = false,
  ...props
}: {
  label: string;
  icon: LucideIcon;
  slugSuffix?: boolean;
  rightSlot?: React.ReactNode;
  className?: string;
  inputClassName?: string;
  type?: string;
  prominent?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <div className={cn(prominent ? 'space-y-2.5' : 'space-y-2', className)}>
      <Label
        className={cn(
          'text-[#1a1a1a] tracking-tight',
          prominent ? 'text-[14px] font-semibold' : 'text-[13px] font-medium'
        )}
      >
        {label}
      </Label>
      <div className="relative group">
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-lg bg-[#f0f0f0] group-focus-within:bg-[#1a1a1a]/5 transition-colors pointer-events-none z-10',
            prominent ? 'left-3.5 w-9 h-9' : 'left-3 w-7 h-7 bg-transparent'
          )}
        >
          <Icon
            className={cn(
              'text-[#9ca3af] group-focus-within:text-[#1a1a1a] transition-colors',
              prominent ? 'w-[18px] h-[18px]' : 'w-[15px] h-[15px]'
            )}
            strokeWidth={1.75}
          />
        </div>
        <Input
          type={type}
          {...props}
          className={cn(
            inputBase,
            prominent ? 'h-[52px] pl-[52px] pr-4 text-[15px]' : 'h-11 pl-10 pr-3 text-sm',
            slugSuffix ? (prominent ? 'pr-[100px]' : 'pr-[92px]') : rightSlot ? (prominent ? 'pr-12' : 'pr-10') : '',
            inputClassName
          )}
        />
        {slugSuffix && (
          <span
            className={cn(
              'absolute right-2.5 top-1/2 -translate-y-1/2 text-[#737373] bg-white border border-[#e8e8e8] rounded-lg pointer-events-none select-none leading-none font-medium',
              prominent ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'
            )}
          >
            .paint.app
          </span>
        )}
        {rightSlot}
      </div>
    </div>
  );
}

function PaintERPLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0">
        <div className="w-2 h-2 rounded-full bg-white" />
      </div>
      <span className="text-base font-bold text-[#1a1a1a] tracking-tight">Paint ERP</span>
    </div>
  );
}

function BrandingPanel() {
  return (
    <div className="relative h-full w-full flex flex-col px-12 xl:px-20 py-12 pt-24">
      <div className="shrink-0 max-w-[380px]">
        <h1 className="text-[36px] xl:text-[48px] font-bold text-[#1a1a1a] leading-[1.10] tracking-tight">
          One workspace.
          <br />
          All your business.
        </h1>
        <p className="mt-5 text-[15px] text-[#6B7280] leading-relaxed">
          Manage inventory, billing, stock &amp; dues seamlessly with Paint ERP.
        </p>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2 shrink-0 text-[13px] text-[#6B7280] pb-2">
        <ShieldCheck className="w-4 h-4 shrink-0" strokeWidth={1.75} />
        <span>Secure. Reliable. Made for modern retailers.</span>
      </div>
    </div>
  );
}

function AuthTabs({ isSignup }: { isSignup: boolean }) {
  const tabClass = (active: boolean) =>
    cn(
      'relative pb-2.5 text-sm transition-colors duration-300',
      active ? 'font-semibold text-[#1a1a1a]' : 'font-medium text-[#9CA3AF] hover:text-[#6B7280]'
    );

  return (
    <div className="flex items-center justify-center gap-8">
      <Link to={ROUTES.HOME} className={tabClass(!isSignup)}>
        Sign in
        {!isSignup && (
          <span className="absolute left-0 right-0 bottom-0 h-[2.5px] bg-[#1a1a1a] rounded-full" />
        )}
      </Link>
      <Link to={ROUTES.SIGNUP} className={tabClass(isSignup)}>
        Sign up
        {isSignup && (
          <span className="absolute left-0 right-0 bottom-0 h-[2.5px] bg-[#1a1a1a] rounded-full" />
        )}
      </Link>
    </div>
  );
}

function PasswordHint({ met, label, prominent }: { met: boolean; label: string; prominent?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border transition-colors',
        prominent ? 'px-3 py-1.5 text-xs' : 'text-[11px]',
        met
          ? 'text-[#16a34a] border-[#bbf7d0] bg-[#f0fdf4]'
          : 'text-[#9CA3AF] border-[#f0f0f0] bg-[#fafafa]'
      )}
    >
      <Check className={cn('shrink-0', prominent ? 'w-3.5 h-3.5' : 'w-3 h-3')} strokeWidth={2.5} />
      {label}
    </span>
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
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showSignupPw, setShowSignupPw] = useState(false);

  function updateShopName(shopName: string) {
    setSignupData((prev) => ({
      ...prev,
      shopName,
      slug: slugTouched ? prev.slug : slugify(shopName),
    }));
  }

  const slugValid =
    signupData.slug.length >= 2 && /^[a-z0-9-]+$/.test(signupData.slug);

  const pwMin8 = signupData.password.length >= 8;
  const pwUpperNum = /[A-Z]/.test(signupData.password) && /[0-9]/.test(signupData.password);
  const pwSecure = pwMin8 && pwUpperNum;

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
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Login failed'
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
    if (!pwMin8) {
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
        return;
      }
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Registration failed'
      );
    } finally {
      setLoading(false);
    }
  }

  const eyeBtn = (show: boolean, toggle: () => void, prominent = false) => (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'absolute top-1/2 -translate-y-1/2 text-[#b0b0b0] hover:text-[#525252] transition-colors z-10',
        prominent ? 'right-4' : 'right-3.5'
      )}
      tabIndex={-1}
    >
      {show ? (
        <EyeOff className={prominent ? 'w-[18px] h-[18px]' : 'w-[15px] h-[15px]'} strokeWidth={1.75} />
      ) : (
        <Eye className={prominent ? 'w-[18px] h-[18px]' : 'w-[15px] h-[15px]'} strokeWidth={1.75} />
      )}
    </button>
  );

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f7f7f8] relative font-sans">
      {/* Full-page background image */}
      <img
        src={authBgFull}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover object-left pointer-events-none select-none"
        aria-hidden
      />

      {/* Paint ERP — fixed top-left, never moves on tab switch */}
      <PaintERPLogo className="fixed top-8 left-8 xl:top-10 xl:left-12 z-30" />

      {/* Branding overlay — 45% width */}
      <div
        className={cn(
          'hidden lg:block absolute top-0 bottom-0 w-[45%] z-10 transition-[left] duration-700 ease-[cubic-bezier(0.76,0,0.24,1)]',
          isSignup ? 'left-0' : 'left-[55%]'
        )}
      >
        <BrandingPanel />
      </div>

      {/* Form overlay — 55% width */}
      <div
        className={cn(
          'absolute top-0 bottom-0 w-full lg:w-[55%] z-10 flex items-center justify-center px-10 xl:px-16 transition-[left] duration-700 ease-[cubic-bezier(0.76,0,0.24,1)]',
          isSignup ? 'left-0 lg:left-[45%]' : 'left-0'
        )}
      >
        <div
          className={cn(
            'shrink-0 overflow-hidden bg-white border border-[#f0f0f0] shadow-[0_16px_48px_rgba(0,0,0,0.08)] flex flex-col transition-[width,height] duration-500 ease-out',
            isSignup ? 'rounded-[24px] px-12 pt-10 pb-12' : 'rounded-[20px] px-10 pt-8 pb-10'
          )}
          style={{
            width: isSignup ? SIGN_UP_FORM_WIDTH : SIGN_IN_FORM_WIDTH,
            height: isSignup ? SIGN_UP_FORM_HEIGHT : SIGN_IN_FORM_HEIGHT,
          }}
        >
          <AuthTabs isSignup={isSignup} />

          <div className="relative flex-1 mt-6 min-h-0 overflow-hidden">
              {/* Sign in */}
              <div
                className={cn(
                  'absolute inset-0 flex flex-col transition-all duration-500 ease-out',
                  isSignup
                    ? 'opacity-0 translate-x-10 pointer-events-none'
                    : 'opacity-100 translate-x-0'
                )}
              >
                <h2 className="text-[26px] font-bold text-[#1a1a1a] tracking-tight leading-tight shrink-0">
                  Welcome back
                </h2>
                <p className="text-[14px] text-[#6B7280] mt-1.5 mb-6 shrink-0">
                  Sign in to your workspace.
                </p>

                <form onSubmit={handleLogin} className="flex flex-col flex-1 min-h-0 gap-4">
                  <AuthField
                    label="Email"
                    icon={Mail}
                    type="email"
                    placeholder="rahul@my-paints.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                    disabled={loading}
                  />
                  <AuthField
                    label="Password"
                    icon={Lock}
                    type={showLoginPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                    disabled={loading}
                    rightSlot={eyeBtn(showLoginPw, () => setShowLoginPw((v) => !v))}
                  />

                  <div className="flex-1 min-h-0" />

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-[52px] rounded-full bg-[#1a1a1a] hover:bg-[#333] text-white text-[15px] font-semibold shadow-none shrink-0"
                  >
                    {loading ? (
                      'Signing in…'
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        Sign in <ArrowRight className="w-4 h-4" strokeWidth={2} />
                      </span>
                    )}
                  </Button>

                  <p className="text-center text-[14px] text-[#6B7280] shrink-0 pt-1">
                    Don&apos;t have an account?{' '}
                    <Link
                      to={ROUTES.SIGNUP}
                      className="text-[#1a1a1a] font-medium underline underline-offset-[3px]"
                    >
                      Sign up
                    </Link>
                  </p>
                </form>
              </div>

              {/* Sign up */}
              <div
                className={cn(
                  'absolute inset-0 flex flex-col transition-all duration-500 ease-out',
                  isSignup
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 -translate-x-10 pointer-events-none'
                )}
              >
                <h2 className="text-[30px] font-bold text-[#1a1a1a] tracking-tight leading-tight shrink-0">
                  Create your workspace
                </h2>
                <p className="text-[15px] text-[#6B7280] mt-2 mb-7 shrink-0">
                  Get started in less than a minute.
                </p>

                <form onSubmit={handleSignup} className="flex flex-col flex-1 min-h-0 gap-5">
                  <div className="grid grid-cols-2 gap-5 shrink-0">
                    <AuthField
                      prominent
                      label="Shop name"
                      icon={Building2}
                      type="text"
                      placeholder="My Paints"
                      value={signupData.shopName}
                      onChange={(e) => updateShopName(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <AuthField
                      prominent
                      label="URL slug"
                      icon={Link2}
                      type="text"
                      placeholder="my-paints"
                      slugSuffix
                      value={signupData.slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setSignupData({ ...signupData, slug: slugify(e.target.value) });
                      }}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-5 shrink-0">
                    <AuthField
                      prominent
                      label="Your name"
                      icon={User}
                      type="text"
                      placeholder="Rahul"
                      value={signupData.name}
                      onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                      required
                      disabled={loading}
                    />
                    <AuthField
                      prominent
                      label="Email"
                      icon={Mail}
                      type="email"
                      placeholder="rahul@my-paints.com"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="shrink-0">
                    <AuthField
                      prominent
                      label="Password"
                      icon={Lock}
                      type={showSignupPw ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      required
                      disabled={loading}
                      rightSlot={eyeBtn(showSignupPw, () => setShowSignupPw((v) => !v), true)}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <PasswordHint prominent met={pwMin8} label="At least 8 characters" />
                    <PasswordHint prominent met={pwUpperNum} label="One uppercase & number" />
                    <PasswordHint prominent met={pwSecure} label="Secure & protected" />
                  </div>

                  <div className="flex-1 min-h-0" />

                  <Button
                    type="submit"
                    disabled={loading || !slugValid || !pwMin8}
                    className="w-full h-[56px] rounded-full bg-[#1a1a1a] hover:bg-[#333] text-white text-base font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.18)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.22)] transition-shadow disabled:opacity-40 shrink-0"
                  >
                    {loading ? (
                      'Creating…'
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        Create workspace <ArrowRight className="w-4 h-4" strokeWidth={2} />
                      </span>
                    )}
                  </Button>

                  <p className="text-center text-[14px] text-[#6B7280] shrink-0 pt-1">
                    Already have an account?{' '}
                    <Link
                      to={ROUTES.HOME}
                      className="text-[#1a1a1a] font-medium underline underline-offset-[3px]"
                    >
                      Sign in
                    </Link>
                  </p>
                </form>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
