import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { LogOut } from 'lucide-react';
import authService from '../services/authService';
import { toast } from 'sonner';

const DashboardNavbar = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  const handleLogout = () => {
    authService.logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-20 bg-white border-b border-slate-200 z-50">
      <div className="h-full w-full px-8 flex items-center justify-between">
        {/* Left Side - Logo and Company Name */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-900 rounded-lg flex items-center justify-center">
            <span className="text-white text-2xl font-bold">PE</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Paint ERP</h1>
            <p className="text-sm text-slate-600">Enterprise Resource Planning</p>
          </div>
        </div>

        {/* Right Side - User Name and Logout */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-900">{user?.name || 'User'}</p>
            <p className="text-xs text-slate-600">{user?.email || ''}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default DashboardNavbar;

