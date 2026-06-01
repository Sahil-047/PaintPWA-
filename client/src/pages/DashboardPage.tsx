import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, TrendingUp, FileText, Package, Loader2 } from 'lucide-react';
import PageTitle from '@/components/PageTitle';
import { reportsApi, inventoryApi } from '@/api';
import { formatCurrency } from '@/lib/utils';
import { ROUTES } from '@/config/config';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalCollected: 0,
    totalDue: 0,
    totalExpenses: 0,
  });
  const [totalStock, setTotalStock] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const [dashboard, products] = await Promise.all([
          reportsApi.dashboard(),
          inventoryApi.list(),
        ]);
        setStats(dashboard);
        setTotalStock(products.reduce((s, p) => s + p.stockQty, 0));
        setLowStockCount(products.filter((p) => p.stockQty <= p.lowStockAlert).length);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statCards = [
    {
      title: 'Total Sales',
      value: formatCurrency(stats.totalSales),
      icon: DollarSign,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Collected',
      value: formatCurrency(stats.totalCollected),
      icon: TrendingUp,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Outstanding Due',
      value: formatCurrency(stats.totalDue),
      icon: FileText,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      title: 'Total Stock',
      value: loading ? '…' : totalStock.toLocaleString(),
      icon: Package,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
    },
  ];

  const quickLinks = [
    { label: 'Create Invoice', path: ROUTES.BILLING, desc: 'Bill customers & deduct stock' },
    { label: 'Manage Inventory', path: ROUTES.INVENTORY, desc: 'Products, brands & stock levels' },
    { label: 'Customer Accounts', path: ROUTES.ACCOUNTS, desc: 'Dues, payments & cash memos' },
    { label: 'View Analytics', path: ROUTES.REPORTS, desc: 'Sales, bills & business insights' },
  ];

  return (
    <div className="p-6 lg:p-8">
      <PageTitle
        title="Dashboard"
        description="Overview of your shop — sales, collections, stock, and outstanding dues."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex items-center justify-between"
            >
              <div>
                <p className="text-sm text-slate-500 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-900">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-300" /> : stat.value}
                </p>
              </div>
              <div className={cn('p-3 rounded-xl', stat.iconBg)}>
                <Icon className={cn('w-6 h-6', stat.iconColor)} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {quickLinks.map((link) => (
          <button
            key={link.path}
            type="button"
            onClick={() => navigate(link.path)}
            className="text-left bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
              {link.label}
            </p>
            <p className="text-sm text-slate-500 mt-1">{link.desc}</p>
          </button>
        ))}
      </div>

      {lowStockCount > 0 && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-800">
          <strong>{lowStockCount}</strong> product{lowStockCount !== 1 ? 's' : ''} at or below low-stock
          threshold.{' '}
          <button
            type="button"
            onClick={() => navigate(ROUTES.INVENTORY)}
            className="underline font-medium hover:text-amber-900"
          >
            Review inventory →
          </button>
        </div>
      )}
    </div>
  );
}
