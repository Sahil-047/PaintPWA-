import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PageTitle from '@/components/PageTitle';
import { billingApi, inventoryApi, reportsApi } from '@/api';
import type { Bill, Product } from '@paint-saas/shared-types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { DollarSign, FileDown, FileText, Package, Loader2, TrendingUp } from 'lucide-react';

export default function ReportsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    netSales: 0,
    grossSales: 0,
    totalReturns: 0,
    totalCollected: 0,
    totalDue: 0,
    totalCreditLiability: 0,
    totalExpenses: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [dashboard, billList, productList] = await Promise.all([
        reportsApi.dashboard(),
        billingApi.list(),
        inventoryApi.list(),
      ]);
      setStats(dashboard);
      setBills(billList);
      setProducts(productList);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }

  const totalStock = products.reduce((s, p) => s + p.stockQty, 0);
  const collectedAgainstSales = Math.max(0, stats.totalCollected - stats.totalCreditLiability);

  const statCards = [
    { title: 'Net Sales', value: formatCurrency(stats.netSales ?? stats.totalSales), icon: DollarSign, bg: 'bg-green-50', color: 'text-green-600' },
    { title: 'Returns', value: formatCurrency(stats.totalReturns), icon: FileText, bg: 'bg-rose-50', color: 'text-rose-600' },
    { title: 'Cash Collected', value: formatCurrency(stats.totalCollected), icon: TrendingUp, bg: 'bg-blue-50', color: 'text-blue-600' },
    { title: 'Collected Against Sales', value: formatCurrency(collectedAgainstSales), icon: TrendingUp, bg: 'bg-cyan-50', color: 'text-cyan-700' },
    { title: 'Outstanding Due', value: formatCurrency(stats.totalDue), icon: FileText, bg: 'bg-orange-50', color: 'text-orange-600' },
    { title: 'Customer Credit', value: formatCurrency(stats.totalCreditLiability), icon: TrendingUp, bg: 'bg-violet-50', color: 'text-violet-600' },
    { title: 'Total Stock', value: totalStock.toString(), icon: Package, bg: 'bg-purple-50', color: 'text-purple-600' },
  ];

  return (
    <div className="p-6 lg:p-8">
      <PageTitle title="Analytics" description="View business insights and all bills" />

      <p className="text-xs text-slate-500 mb-3">
        `Cash Collected` includes advance payments; `Collected Against Sales` excludes current customer credit.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex items-center justify-between"
            >
              <div>
                <p className="text-sm text-slate-500 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-900">{loading ? '…' : stat.value}</p>
              </div>
              <div className={`${stat.bg} p-3 rounded-xl`}>
                <Icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-900">All Bills</h3>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : bills.length === 0 ? (
              <p className="text-center py-12 text-slate-500">No bills yet</p>
            ) : (
              <div className="border rounded-lg overflow-x-auto max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-slate-50">
                    <TableRow>
                      <TableHead>Bill No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[120px] text-right">PDF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.map((bill) => (
                      <TableRow key={bill._id}>
                        <TableCell className="font-medium">{bill.billNo}</TableCell>
                        <TableCell>{formatDate(bill.createdAt)}</TableCell>
                        <TableCell>{bill.items?.length ?? 0}</TableCell>
                        <TableCell>{formatCurrency(bill.subtotal)}</TableCell>
                        <TableCell className="font-bold">{formatCurrency(bill.grandTotal)}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              bill.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : bill.status === 'partial'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-slate-100 text-slate-800'
                            }
                          >
                            {bill.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            type="button"
                            onClick={() => billingApi.openPdf(bill._id, bill.billNo)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            PDF
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
      </div>
    </div>
  );
}
