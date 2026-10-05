import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { StatCard, Card, Badge } from '@/components/ui';
import { EmptyState, LoadingPage as LP } from '@/components/ui/Feedback';
import { formatCurrency, formatQuantity, formatDateTime, type ProductWithStock, type Sale, type Purchase } from '@/types';
import { fetchProducts, fetchTotalStockValue } from '@/services/products';
import { fetchSalesSummary, fetchSales } from '@/services/sales';
import { fetchTodayExpenses } from '@/services/expenses';
import { fetchSuppliers } from '@/services/suppliers';
import { fetchTotalAccountBalance } from '@/services/accounts';
import { fetchTotalWithdrawals } from '@/services/finance';
import { fetchPurchases } from '@/services/purchases';
import { fetchSalesChart, type SalesChartPoint } from '@/services/reports';
import {
  TrendingUp,
  Wallet,
  Package,
  Users,
  Truck,
  AlertTriangle,
  DollarSign,
  Banknote,
  Receipt,
  ArrowRight,
  ShoppingCart,
} from 'lucide-react';
import type { Route } from '@/components/AppShell';

type ChartPeriod = 'today' | '7d' | '30d' | '12m';

export function Dashboard({ onNavigate }: { onNavigate: (route: Route, params?: { saleId?: string }) => void }) {
  const { businessProfile } = useAuth();
  const currency = businessProfile?.currency ?? 'BDT';

  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [todaySales, setTodaySales] = useState(0);
  const [todayProfit, setTodayProfit] = useState(0);
  const [totalReceivable, setTotalReceivable] = useState(0);
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [supplierPayable, setSupplierPayable] = useState(0);
  const [cashBalance, setCashBalance] = useState(0);
  const [ownerWithdrawals, setOwnerWithdrawals] = useState(0);
  const [stockValue, setStockValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('7d');
  const [chartData, setChartData] = useState<SalesChartPoint[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<Purchase[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; unitsSold: number; revenue: number }[]>([]);

  useEffect(() => {
    Promise.all([
      fetchProducts({ activeOnly: true }),
      fetchSalesSummary(),
      fetchTodayExpenses(),
      fetchSuppliers({ activeOnly: true }),
      fetchTotalAccountBalance(),
      fetchTotalWithdrawals(),
      fetchTotalStockValue(),
      fetchSales({ status: 'all' }),
      fetchPurchases(),
    ])
      .then(async ([prods, summary, expenses, suppliers, acctBalance, withdrawals, sValue, sales, purchases]) => {
        setProducts(prods);
        setTodaySales(summary.todaySales);
        setTodayProfit(summary.todayProfit);
        setTotalReceivable(summary.totalReceivable);
        setTodayExpenses(expenses);
        setCashBalance(acctBalance);
        setOwnerWithdrawals(withdrawals);
        setStockValue(sValue);
        setRecentSales(sales.slice(0, 5));
        setRecentPurchases(purchases.slice(0, 5));

        // Supplier payables
        try {
          const { data: supplierTxns } = await supabase
            .from('supplier_transactions')
            .select('amount');
          setSupplierPayable((supplierTxns ?? []).reduce((s, t) => s + Number(t.amount), 0));
        } catch { /* ignore */ }

        // Top products from recent sales
        try {
          const recentSaleIds = sales.slice(0, 50).map((s) => s.id);
          if (recentSaleIds.length > 0) {
            const { data: items } = await supabase
              .from('sale_items')
              .select('product_id, quantity, line_total, product:products(name)')
              .in('sale_id', recentSaleIds);
            const prodAgg = new Map<string, { name: string; unitsSold: number; revenue: number }>();
            for (const si of items ?? []) {
              const name = (si.product as any)?.name ?? 'Unknown';
              const existing = prodAgg.get(si.product_id) ?? { name, unitsSold: 0, revenue: 0 };
              existing.unitsSold += Number(si.quantity);
              existing.revenue += Number(si.line_total);
              prodAgg.set(si.product_id, existing);
            }
            setTopProducts([...prodAgg.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5));
          }
        } catch { /* ignore */ }
      })
      .catch(() => { setProducts([]); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSalesChart(chartPeriod).then(setChartData).catch(() => {});
  }, [chartPeriod]);

  const chartMax = useMemo(() => Math.max(...chartData.map((d) => d.total), 1), [chartData]);
  const lowStockProducts = products.filter((p) => p.stock_status === 'LOW_STOCK' || p.stock_status === 'OUT_OF_STOCK');

  if (loading) return <LP message="Loading dashboard..." />;

  const stats = [
    { label: "Today's Sales", value: formatCurrency(todaySales, currency), icon: <DollarSign className="w-5 h-5" />, variant: 'success' as const },
    { label: "Today's Profit", value: formatCurrency(todayProfit, currency), icon: <TrendingUp className="w-5 h-5" />, variant: 'info' as const },
    { label: "Today's Expenses", value: formatCurrency(todayExpenses, currency), icon: <Wallet className="w-5 h-5" />, variant: 'danger' as const },
    { label: 'Receivable', value: formatCurrency(totalReceivable, currency), icon: <Users className="w-5 h-5" />, variant: 'default' as const },
    { label: 'Payable', value: formatCurrency(supplierPayable, currency), icon: <Truck className="w-5 h-5" />, variant: 'default' as const },
    { label: 'Stock Value', value: formatCurrency(stockValue, currency), icon: <Package className="w-5 h-5" />, variant: 'info' as const },
    { label: 'Account Balance', value: formatCurrency(cashBalance, currency), icon: <Banknote className="w-5 h-5" />, variant: 'default' as const },
    { label: 'Owner Withdrawals', value: formatCurrency(ownerWithdrawals, currency), icon: <Wallet className="w-5 h-5" />, variant: 'danger' as const },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {stats.map((stat, i) => (
          <div key={stat.label} className={`animate-fade-in stagger-${Math.min(i + 1, 8)}`}>
            <StatCard label={stat.label} value={stat.value} icon={stat.icon} variant={stat.variant} />
          </div>
        ))}
      </div>

      {/* Sales Chart */}
      <Card className="mb-6">
        <div className="p-5 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-semibold text-slate-100">Sales Overview</h2>
          </div>
          <div className="flex gap-1">
            {(['today', '7d', '30d', '12m'] as ChartPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setChartPeriod(p)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  chartPeriod === p ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700'
                }`}
              >
                {p === 'today' ? 'Today' : p === '7d' ? '7D' : p === '30d' ? '30D' : '12M'}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5">
          {chartData.every((d) => d.total === 0) ? (
            <EmptyState icon={<TrendingUp className="w-8 h-8" />} title="No Sales Data" message="No sales in this period." />
          ) : (
            <div className="flex items-end gap-1 h-40 overflow-x-auto">
              {chartData.map((point, i) => {
                const height = chartMax > 0 ? (point.total / chartMax) * 100 : 0;
                return (
                  <div key={i} className="flex-1 min-w-[20px] flex flex-col items-center gap-1 group">
                    <div className="w-full flex-1 flex items-end relative">
                      <div
                        className="w-full bg-blue-500/70 group-hover:bg-blue-400 rounded-t transition-all duration-300"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      >
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-slate-100 text-[10px] px-2 py-1 rounded whitespace-nowrap transition-opacity z-10">
                          {formatCurrency(point.total, currency)}
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-500 whitespace-nowrap hidden sm:block">{point.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Sales */}
        <Card>
          <div className="p-5 border-b border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-semibold text-slate-100">Recent Sales</h2>
            </div>
            <button onClick={() => onNavigate('sales')} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {recentSales.length === 0 ? (
            <EmptyState icon={<ShoppingCart className="w-8 h-8" />} title="No Sales Yet" message="Create your first sale to get started." />
          ) : (
            <div className="divide-y divide-slate-700/30">
              {recentSales.map((sale) => (
                <button
                  key={sale.id}
                  onClick={() => onNavigate('saleDetails', { saleId: sale.id })}
                  className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-slate-700/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{sale.invoice_number}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(sale.sale_date)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-slate-200">{formatCurrency(sale.total, currency)}</p>
                    {sale.due_amount > 0 ? <Badge variant="danger">Due</Badge> : <Badge variant="success">Paid</Badge>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Purchases */}
        <Card>
          <div className="p-5 border-b border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-400" />
              <h2 className="text-base font-semibold text-slate-100">Recent Purchases</h2>
            </div>
            <button onClick={() => onNavigate('purchases')} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {recentPurchases.length === 0 ? (
            <EmptyState icon={<Receipt className="w-8 h-8" />} title="No Purchases Yet" message="Create your first purchase to get started." />
          ) : (
            <div className="divide-y divide-slate-700/30">
              {recentPurchases.map((pur) => (
                <button
                  key={pur.id}
                  onClick={() => onNavigate('purchases')}
                  className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-slate-700/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{pur.purchase_number}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(pur.purchase_date)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-slate-200">{formatCurrency(pur.total, currency)}</p>
                    {pur.payable_amount > 0 ? <Badge variant="danger">Payable</Badge> : <Badge variant="success">Paid</Badge>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Products */}
        <Card>
          <div className="p-5 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold text-slate-100">Top Selling Products</h2>
            </div>
          </div>
          {topProducts.length === 0 ? (
            <EmptyState icon={<Package className="w-8 h-8" />} title="No Data" message="Top products will appear here after sales." />
          ) : (
            <div className="divide-y divide-slate-700/30">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-700/60 flex items-center justify-center text-xs font-bold text-slate-400 flex-shrink-0">{i + 1}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400">{formatQuantity(p.unitsSold, '')} sold</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-emerald-400 flex-shrink-0">{formatCurrency(p.revenue, currency)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <div className="p-5 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold text-slate-100">Low Stock Alert</h2>
              {lowStockProducts.length > 0 && <Badge variant="warning">{lowStockProducts.length}</Badge>}
            </div>
          </div>
          {lowStockProducts.length === 0 ? (
            <EmptyState icon={<Package className="w-8 h-8" />} title="All Stock Good" message="No products are below minimum stock level." />
          ) : (
            <div className="divide-y divide-slate-700/30">
              {lowStockProducts.slice(0, 5).map((product) => (
                <button
                  key={product.id}
                  onClick={() => onNavigate('products')}
                  className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-slate-700/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{product.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Current: {formatQuantity(product.current_stock, product.unit)} · Min: {formatQuantity(product.minimum_stock, product.unit)}
                    </p>
                  </div>
                  <Badge variant={product.stock_status === 'OUT_OF_STOCK' ? 'danger' : 'warning'}>
                    {product.stock_status === 'OUT_OF_STOCK' ? 'OUT' : 'LOW'}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'New Sale', icon: <DollarSign className="w-6 h-6 text-emerald-400" />, route: 'createSale' as Route },
          { label: 'New Purchase', icon: <Truck className="w-6 h-6 text-blue-400" />, route: 'createPurchase' as Route },
          { label: 'Add Expense', icon: <Wallet className="w-6 h-6 text-red-400" />, route: 'expenses' as Route },
          { label: 'Reports', icon: <TrendingUp className="w-6 h-6 text-amber-400" />, route: 'reports' as Route },
        ].map((action) => (
          <button
            key={action.label}
            onClick={() => onNavigate(action.route)}
            className="bg-slate-800/80 rounded-xl shadow-sm border border-slate-700/50 p-4 flex flex-col items-center gap-2 hover:border-slate-600 hover:bg-slate-800 transition-colors"
          >
            {action.icon}
            <span className="text-xs font-medium text-slate-200">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
