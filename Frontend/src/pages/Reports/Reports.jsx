import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, DollarSign, FileText, Package, Loader2 } from 'lucide-react';
import authService from '../../services/authService';
import billingService from '../../services/billingService';
import inventoryService from '../../services/inventoryService';
import { toast } from 'sonner';

const Reports = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalSales: 0,
    totalStocks: 0,
  });
  const invoicesFetched = useRef(false);
  const productsFetched = useRef(false);

  const fetchInvoices = useCallback(async () => {
    if (invoicesFetched.current) return;
    setLoading(true);
    invoicesFetched.current = true;
    try {
      // Fetch all invoices (use a large limit to get all)
      const response = await billingService.getInvoices(1, 1000);
      if (response.success) {
        setInvoices(response.data);
        
        // Calculate stats from invoices
        const totalRevenue = response.data.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
        const totalSales = response.data.length;
        
        setStats(prev => ({
          ...prev,
          totalRevenue,
          totalSales,
        }));
      }
    } catch (error) {
      toast.error('Failed to load invoices');
      console.error('Error fetching invoices:', error);
      invoicesFetched.current = false;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    if (productsFetched.current) return;
    productsFetched.current = true;
    try {
      const response = await inventoryService.getAllProducts();
      if (response.success) {
        setProducts(response.data);
        
        // Calculate total stocks
        const totalStocks = response.data.reduce((sum, product) => sum + (product.stock || 0), 0);
        
        setStats(prev => ({
          ...prev,
          totalStocks,
        }));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      productsFetched.current = false;
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchInvoices();
    fetchProducts();
  }, [user, navigate, fetchInvoices, fetchProducts]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!user) return null;

  const statCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total Sales',
      value: stats.totalSales.toString(),
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Total Stocks',
      value: stats.totalStocks.toString(),
      icon: Package,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Back Button */}
      <div className="w-full px-8 pt-6 pb-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      {/* Main Content */}
      <main className="pb-8">
        <div className="w-full px-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Reports & Analytics</h2>
            <p className="text-slate-600">View business insights and all invoices</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="bg-white border border-slate-200 rounded-lg shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600 mb-2">{stat.title}</p>
                        <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                      </div>
                      <div className={`${stat.bgColor} p-3 rounded-lg`}>
                        <Icon className={`h-8 w-8 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Invoices Table */}
          <Card className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <CardContent className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900">All Invoices</h3>
                <p className="text-sm text-slate-600">Complete list of all generated invoices</p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No invoices found</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <div className="max-h-[600px] overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-slate-50 z-10">
                          <TableRow>
                            <TableHead className="font-semibold sticky left-0 bg-slate-50 z-20">Invoice ID</TableHead>
                            <TableHead className="font-semibold">Date</TableHead>
                            <TableHead className="font-semibold">Items</TableHead>
                            <TableHead className="font-semibold">Subtotal</TableHead>
                            <TableHead className="font-semibold">Tax</TableHead>
                            <TableHead className="font-semibold">Total</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoices.map((invoice) => (
                            <TableRow key={invoice._id}>
                              <TableCell className="font-medium sticky left-0 bg-white z-10">
                                #{invoice.invoiceNumber || invoice._id.slice(-6).toUpperCase()}
                              </TableCell>
                              <TableCell className="text-slate-600">
                                {formatDate(invoice.createdAt)}
                              </TableCell>
                              <TableCell className="text-slate-600">
                                {invoice.items?.length || 0} item(s)
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(invoice.subtotal || 0)}
                              </TableCell>
                              <TableCell className="text-slate-600">
                                {formatCurrency(invoice.tax || 0)}
                              </TableCell>
                              <TableCell className="font-bold text-slate-900">
                                {formatCurrency(invoice.total || 0)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={invoice.status === 'paid' ? 'default' : 'secondary'}
                                  className={
                                    invoice.status === 'paid'
                                      ? 'bg-green-100 text-green-800 hover:bg-green-100'
                                      : 'bg-slate-100 text-slate-800 hover:bg-slate-100'
                                  }
                                >
                                  {invoice.status || 'pending'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Reports;
