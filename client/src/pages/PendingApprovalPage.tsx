import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/config/config';
import { useAuthStore } from '@/store/auth.store';
import { signOut } from '@/lib/signOut';
import { toast } from 'sonner';

export default function PendingApprovalPage() {
  const navigate = useNavigate();
  const { user, tenant, isSuperAdmin } = useAuthStore();

  useEffect(() => {
    if (!user) navigate(ROUTES.HOME, { replace: true });
    else if (isSuperAdmin) navigate(ROUTES.ADMIN, { replace: true });
    else if (tenant?.status && tenant.status !== 'pending') navigate(ROUTES.DASHBOARD, { replace: true });
  }, [user, isSuperAdmin, tenant?.status, navigate]);

  function handleLogout() {
    void signOut().then(() => {
      toast.success('Logged out');
      navigate(ROUTES.HOME);
    });
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-5">
          <Clock className="w-7 h-7 text-amber-600" strokeWidth={2} />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Awaiting approval</h1>
        <p className="text-sm text-slate-600 mt-3 leading-relaxed">
          {tenant?.name ? (
            <>
              <span className="font-medium text-slate-800">{tenant.name}</span> has been registered and
              is waiting for platform administrator approval. You will be able to sign in and use the
              app once approved.
            </>
          ) : (
            <>
              Your shop registration is pending approval. You will be able to sign in once a
              platform administrator approves your account.
            </>
          )}
        </p>
        <p className="text-xs text-slate-500 mt-4">
          Try signing in again after you receive confirmation, or contact support if this takes
          longer than expected.
        </p>
        <Button
          variant="outline"
          className="mt-8 w-full"
          onClick={() => navigate(ROUTES.HOME)}
        >
          Back to sign in
        </Button>
        <Button variant="ghost" className="mt-2 w-full text-slate-500" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Log out
        </Button>
      </div>
    </div>
  );
}
