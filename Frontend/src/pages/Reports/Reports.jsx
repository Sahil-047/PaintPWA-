import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Package, FileText } from 'lucide-react';
import authService from '../../services/authService';

const Reports = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user) return null;

  const stats = [
    {
      title: 'Total Revenue',
      value: '₹1,24,500',
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      title: 'Total Sales',
      value: '245',
      change: '+8.2%',
      trend: 'up',
      icon: FileText,
      color: 'text-blue-600',
    },
    {
      title: 'Low Stock Items',
      value: '12',
      change: '-3.1%',
      trend: 'down',
      icon: Package,
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Reports & Analytics</h1>
                <p className="text-xs text-slate-600">View business insights and analytics</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Business Overview</h2>
          <p className="text-slate-600">Last 30 days performance</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardDescription>{stat.title}</CardDescription>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">{stat.value}</div>
                  <Badge
                    variant={stat.trend === 'up' ? 'default' : 'secondary'}
                    className="gap-1"
                  >
                    <TrendIcon className="h-3 w-3" />
                    {stat.change}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Report</CardTitle>
              <CardDescription>Detailed sales breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Today's Sales</span>
                  <span className="font-bold">₹12,450</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">This Week</span>
                  <span className="font-bold">₹45,230</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">This Month</span>
                  <span className="font-bold">₹1,24,500</span>
                </div>
              </div>
              <Button className="w-full mt-4" variant="outline">
                View Detailed Report
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventory Report</CardTitle>
              <CardDescription>Stock status overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Total Products</span>
                  <span className="font-bold">156</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">In Stock</span>
                  <span className="font-bold text-green-600">144</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Low Stock</span>
                  <span className="font-bold text-orange-600">12</span>
                </div>
              </div>
              <Button className="w-full mt-4" variant="outline">
                View Inventory Report
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Selling Products</CardTitle>
              <CardDescription>Best performing items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Asian Paints Royale - White', sales: 45 },
                  { name: 'Berger Easy Clean - Blue', sales: 38 },
                  { name: 'Nerolac Excel - Green', sales: 32 },
                ].map((product, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm">{product.name}</span>
                    <Badge variant="secondary">{product.sales} units</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Brand Performance</CardTitle>
              <CardDescription>Sales by brand</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Asian Paints', revenue: '₹45,230' },
                  { name: 'Berger Paints', revenue: '₹38,450' },
                  { name: 'Nerolac', revenue: '₹28,820' },
                ].map((brand, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm">{brand.name}</span>
                    <span className="font-bold">{brand.revenue}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Reports;

