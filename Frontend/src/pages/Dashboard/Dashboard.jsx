import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardNavbar from '../../components/DashboardNavbar';
import DashboardGrid from '../../components/DashboardGrid';
import authService from '../../services/authService';

const Dashboard = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation Bar */}
      <DashboardNavbar />

      {/* Main Dashboard Content */}
      <main className="pt-20 pb-8">
        <DashboardGrid />
      </main>
    </div>
  );
};

export default Dashboard;
