import React, { useEffect, useState } from 'react';
import { type Route } from '../components/AppShell';
import { FinancialPulse } from '../components/FinancialPulse';
import { supabase } from '../lib/supabase';
import { 
  ShoppingBag, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package, 
  Plus, 
  ArrowUpRight, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  Calendar,
  Layers
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (route: Route) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayExpense: 0,
    todayProfit: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    cashBalance: 0,
    totalDue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
  });

  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardStats() {
      try {
        setLoading(true);
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Fetch Sales Data
        const { data: salesData } = await supabase
          .from('sales')
          .select('id, total_amount, due_amount, created_at, customer_id')
          .order('created_at', { ascending: false });

        // Calculate Revenue & Today's Sales
        const totalRev = salesData?.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0) || 0;
        const totalDueAmt = salesData?.reduce((acc, curr) => acc + (Number(curr.due_amount) || 0), 0) || 0;

        const todaySales = salesData?.filter(s => s.created_at && s.created_at.startsWith(todayStr)) || [];
        const todayRev = todaySales.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);

        // 2. Fetch Expenses Data
        const { data: expensesData } = await supabase
          .from('expenses')
          .select('amount, date, created_at');

        const totalExp = expensesData?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;

        const todayExpList = expensesData?.filter(e => 
          (e.date && e.date === todayStr) || (e.created_at && e.created_at.startsWith(todayStr))
        ) || [];
        const todayExp = todayExpList.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

        // 3. Fetch Products & Low Stock Alert (Stock <= 5)
        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .order('stock_quantity', { ascending: true });

        const lowStock = productsData?.filter(p => Number(p.stock_quantity) <= 5) || [];
        const topSelling = productsData?.slice(0, 4) || [];

        // 4. Fetch Customers Count
        const { count: customerCount } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true });

        const netProf = totalRev - totalExp;

        setStats({
          todayRevenue: todayRev,
          todayExpense: todayExp,
          todayProfit: todayRev - todayExp,
          totalRevenue: totalRev,
          totalExpenses: totalExp,
          netProfit: netProf,
          cashBalance: netProf,
          totalDue: totalDueAmt,
          totalOrders: salesData?.length || 0,
          totalProducts: productsData?.length || 0,
          totalCustomers: customerCount || 0,
        });

        setLowStockProducts(lowStock.slice(0, 4));
        setRecentSales(salesData?.slice(0, 5) || []);
        setTopProducts(topSelling);

      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-32 rounded-3xl bg-slate-900/60" />
        <div className="h-48 rounded-3xl bg-slate-900/60" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-28 rounded-2xl bg-slate-900/40" />
          <div className="h-28 rounded-2xl bg-slate-900/40" />
          <div className="h-28 rounded-2xl bg-slate-900/40" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto pb-24">
      {/* 1. Executive Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-md border border-indigo-500/20">
              Overview
            </span>
            <span className="text-xs text-slate-500">Live Business Metrics</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Business Command Center
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('createSale')}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" /> New Sale
          </button>
        </div>
      </div>

      {/* 2. Today's Financial Summary Ribbon */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-md p-4 sm:p-5 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-indigo-400" />
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Performance</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-xs text-slate-400">Today's Income</span>
            <p className="text-lg font-black text-emerald-400 mt-1">৳ {stats.todayRevenue.toLocaleString('en-IN')}</p>
          </div>
          
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-xs text-slate-400">Today's Expense</span>
            <p className="text-lg font-black text-rose-400 mt-1">৳ {stats.todayExpense.toLocaleString('en-IN')}</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-xs text-slate-400">Today's Net Profit</span>
            <p className={`text-lg font-black mt-1 ${stats.todayProfit >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
              ৳ {stats.todayProfit.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-xs text-slate-400">Total Net Balance</span>
            <p className="text-lg font-black text-white mt-1">৳ {stats.cashBalance.toLocaleString('en-IN')}</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-xs text-slate-400">Total Market Due</span>
            <p className="text-lg font-black text-amber-400 mt-1">৳ {stats.totalDue.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* 3. Signature Feature: Financial Pulse (Business Health) */}
      <FinancialPulse
        revenue={stats.totalRevenue}
        expenses={stats.totalExpenses}
        profit={stats.netProfit}
        cashBalance={stats.cashBalance}
      />

      {/* 4. Interactive Quick Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div
          onClick={() => onNavigate('sales')}
          className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm transition-all hover:border-indigo-500/50 hover:shadow-indigo-500/10 hover:shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Total Sales</span>
            <div className="rounded-xl bg-indigo-500/10 p-2.5 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-white">
            {stats.totalOrders} <span className="text-xs font-normal text-slate-400">orders recorded</span>
          </p>
          <div className="mt-2 flex items-center text-xs text-indigo-400 font-semibold">
            Manage Orders <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('products')}
          className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm transition-all hover:border-emerald-500/50 hover:shadow-emerald-500/10 hover:shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Total Products</span>
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-white">
            {stats.totalProducts} <span className="text-xs font-normal text-slate-400">items in catalog</span>
          </p>
          <div className="mt-2 flex items-center text-xs text-emerald-400 font-semibold">
            View Inventory <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('customers')}
          className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm transition-all hover:border-purple-500/50 hover:shadow-purple-500/10 hover:shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Customers</span>
            <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-white">
            {stats.totalCustomers} <span className="text-xs font-normal text-slate-400">active accounts</span>
          </p>
          <div className="mt-2 flex items-center text-xs text-purple-400 font-semibold">
            Customer Directory <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
          </div>
        </div>
      </div>

      {/* 5. Smart Alerts & Recent Activity Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Low Stock Alerts */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Low Stock Warning</h3>
            </div>
            <button 
              onClick={() => onNavigate('products')} 
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              View All
            </button>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-slate-800/30 border border-dashed border-slate-800">
              <Package className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-medium">All items are sufficiently stocked.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {lowStockProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800/80">
                  <div>
                    <p className="text-sm font-semibold text-white">{p.name}</p>
                    <p className="text-xs text-slate-400">SKU: {p.sku || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20">
                      {p.stock_quantity} remaining
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions Feed */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Recent Sales</h3>
            </div>
            <button 
              onClick={() => onNavigate('sales')} 
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              View Sales
            </button>
          </div>

          {recentSales.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-slate-800/30 border border-dashed border-slate-800">
              <ShoppingBag className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-medium">No sales recorded yet.</p>
              <button 
                onClick={() => onNavigate('createSale')}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:underline"
              >
                + Record First Sale
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentSales.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800/80">
                  <div>
                    <p className="text-sm font-semibold text-white">Order #{s.id.slice(0, 6)}</p>
                    <p className="text-xs text-slate-400">{s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB') : 'Today'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400">+ ৳ {Number(s.total_amount).toLocaleString('en-IN')}</p>
                    {Number(s.due_amount) > 0 && (
                      <p className="text-[10px] text-amber-400">Due: ৳ {Number(s.due_amount).toLocaleString('en-IN')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
