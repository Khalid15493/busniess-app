import { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  AlertTriangle,
  Receipt,
  ArrowUpRight,
  PiggyBank,
  Percent,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  type SaleRow,
  type ProductRow,
  type CustomerRow,
  type ExpenseRow,
  type WithdrawalRow,
  type DashboardData,
  toNum,
  formatCurrency,
  formatPercent,
  safeSelect,
} from '@/lib/types';

function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
  sub,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'default' | 'green' | 'red' | 'blue' | 'amber';
  sub?: string;
}) {
  const toneMap: Record<string, string> = {
    default: 'bg-slate-800/60 border-slate-700',
    green: 'bg-emerald-950/40 border-emerald-800/50',
    red: 'bg-rose-950/40 border-rose-800/50',
    blue: 'bg-sky-950/40 border-sky-800/50',
    amber: 'bg-amber-950/40 border-amber-800/50',
  };
  const iconTone: Record<string, string> = {
    default: 'text-slate-400 bg-slate-700/50',
    green: 'text-emerald-400 bg-emerald-900/40',
    red: 'text-rose-400 bg-rose-900/40',
    blue: 'text-sky-400 bg-sky-900/40',
    amber: 'text-amber-400 bg-amber-900/40',
  };

  return (
    <div
      className={`rounded-xl border ${toneMap[tone]} p-5 transition-all hover:border-slate-600 hover:shadow-lg hover:shadow-black/20`}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-400">{label}</span>
          <span className="text-2xl font-bold text-white">{value}</span>
          {sub && <span className="text-xs text-slate-500">{sub}</span>}
        </div>
        <div className={`p-2.5 rounded-lg ${iconTone[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sales, expenses, products, customers, withdrawals] =
        await Promise.all([
          safeSelect<SaleRow>('sales', 'sale_date'),
          safeSelect<ExpenseRow>('expenses', 'expense_date'),
          safeSelect<ProductRow>('products', 'created_at'),
          safeSelect<CustomerRow>('customers', 'created_at'),
          safeSelect<WithdrawalRow>('owner_withdrawals', 'withdrawal_date'),
        ]);

      setData({ sales, expenses, products, customers, withdrawals });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setData({ sales: [], expenses: [], products: [], customers: [], withdrawals: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const sales = data?.sales ?? [];
  const expenses = data?.expenses ?? [];
  const products = data?.products ?? [];
  const customers = data?.customers ?? [];
  const withdrawals = data?.withdrawals ?? [];

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartIso = todayStart.toISOString();

  const todaySales = sales.filter((s) => new Date(s.sale_date) >= new Date(todayStartIso));
  const todayExpenses = expenses.filter((e) => new Date(e.expense_date) >= new Date(todayStartIso));

  const todaysIncome = todaySales.reduce((sum, s) => sum + toNum(s.total_amount), 0);
  const todaysExpenses = todayExpenses.reduce((sum, e) => sum + toNum(e.amount), 0);
  const todaysNetProfit = todaysIncome - todaysExpenses;

  const totalRevenue = sales.reduce((sum, s) => sum + toNum(s.total_amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + toNum(e.amount), 0);
  const totalPaidByCustomers = sales.reduce((sum, s) => sum + toNum(s.paid_amount), 0);
  const netDueBalance = totalRevenue - totalPaidByCustomers;

  const totalWithdrawals = withdrawals.reduce((sum, w) => sum + toNum(w.amount), 0);
  const cashAvailable = totalPaidByCustomers - totalExpenses - totalWithdrawals;

  const netProfit = totalRevenue - totalExpenses;
  const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const lowStockProducts = products
    .filter((p) => toNum(p.stock) <= 5)
    .sort((a, b) => toNum(a.stock) - toNum(b.stock));

  const recentSales = [...sales]
    .sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())
    .slice(0, 8);

  const productMap = new Map<string, string>();
  products.forEach((p) => productMap.set(p.id, p.name));
  const customerMap = new Map<string, string>();
  customers.forEach((c) => customerMap.set(c.id, c.name));

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-500" />
          <p className="text-sm text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-500">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <button
          onClick={fetchAll}
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-800/50 bg-amber-950/40 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
          <p className="text-sm text-amber-200">
            Some data could not be loaded. Showing partial or empty values — {error}
          </p>
        </div>
      )}

      {/* Today's Overview */}
      <div className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Today's Overview
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Today's Income" value={formatCurrency(todaysIncome)} icon={TrendingUp} tone="green" sub={`${todaySales.length} sales today`} />
          <StatCard label="Today's Expenses" value={formatCurrency(todaysExpenses)} icon={TrendingDown} tone="red" sub={`${todayExpenses.length} expenses today`} />
          <StatCard label="Today's Net Profit" value={formatCurrency(todaysNetProfit)} icon={DollarSign} tone={todaysNetProfit >= 0 ? 'green' : 'red'} sub={todaysNetProfit >= 0 ? 'Profit' : 'Loss'} />
        </div>
      </div>

      {/* Financial Health */}
      <div className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Financial Health
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Net Due Balance" value={formatCurrency(netDueBalance)} icon={Receipt} tone="amber" sub="Unpaid customer balances" />
          <StatCard label="Cash Available" value={formatCurrency(cashAvailable)} icon={Wallet} tone="blue" sub="After expenses & withdrawals" />
          <StatCard label="Net Profit Margin" value={formatPercent(netProfitMargin)} icon={Percent} tone={netProfitMargin >= 0 ? 'green' : 'red'} sub={`Net profit: ${formatCurrency(netProfit)}`} />
        </div>
      </div>

      {/* All-Time Summary */}
      <div className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          All-Time Summary
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} icon={DollarSign} tone="green" />
          <StatCard label="Total Expenses" value={formatCurrency(totalExpenses)} icon={TrendingDown} tone="red" />
          <StatCard label="Sales Count" value={String(sales.length)} icon={ShoppingCart} tone="blue" />
          <StatCard label="Products" value={String(products.length)} icon={Package} tone="default" />
          <StatCard label="Customers" value={String(customers.length)} icon={Users} tone="default" />
          <StatCard label="Owner Withdrawals" value={formatCurrency(totalWithdrawals)} icon={PiggyBank} tone="amber" sub={`${withdrawals.length} withdrawals`} />
        </div>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Low Stock Warning" icon={AlertTriangle}>
          {lowStockProducts.length === 0 ? (
            <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
              <Package className="h-4 w-4 text-emerald-500" />
              All products are well-stocked.
            </div>
          ) : (
            <div className="space-y-2">
              {lowStockProducts.map((p) => {
                const stockNum = toNum(p.stock);
                const isOut = stockNum === 0;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-900/40 px-4 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                          isOut ? 'bg-rose-900/40 text-rose-400' : 'bg-amber-900/40 text-amber-400'
                        }`}
                      >
                        {stockNum}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-200">{p.name}</p>
                        {p.category && <p className="text-xs text-slate-500">{p.category}</p>}
                      </div>
                    </div>
                    <span className={`text-xs font-medium ${isOut ? 'text-rose-400' : 'text-amber-400'}`}>
                      {isOut ? 'Out of stock' : 'Low stock'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent Sales" icon={ShoppingCart}>
          {recentSales.length === 0 ? (
            <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
              <ShoppingCart className="h-4 w-4" />
              No sales recorded yet.
            </div>
          ) : (
            <div className="space-y-2">
              {recentSales.map((s) => {
                const productName = s.product_id ? productMap.get(s.product_id) ?? 'Unknown product' : 'Direct sale';
                const customerName = s.customer_id ? customerMap.get(s.customer_id) ?? 'Walk-in' : 'Walk-in';
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-900/40 px-4 py-2.5"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-900/40">
                        <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="truncate text-sm font-medium text-slate-200">{productName}</p>
                        <p className="truncate text-xs text-slate-500">
                          {customerName} ·{' '}
                          {new Date(s.sale_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-emerald-400">
                        {formatCurrency(toNum(s.total_amount))}
                      </p>
                      {toNum(s.paid_amount) < toNum(s.total_amount) && (
                        <p className="text-xs text-amber-500">
                          Due {formatCurrency(toNum(s.total_amount) - toNum(s.paid_amount))}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
