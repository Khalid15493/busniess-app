import React, { useEffect, useState } from 'react';
import { type Route } from '../components/AppShell';
import { FinancialPulse } from '../components/FinancialPulse';
import { supabase } from '../lib/supabase';
import { ShoppingBag, TrendingUp, Users, Package, Plus, ArrowUpRight } from 'lucide-react';

interface DashboardProps {
  onNavigate: (route: Route) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    revenue: 0,
    expenses: 0,
    profit: 0,
    cashBalance: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardStats() {
      try {
        setLoading(true);

        // Fetch Sales
        const { data: salesData } = await supabase.from('sales').select('total_amount');
        const totalRevenue = salesData?.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0) || 0;

        // Fetch Expenses
        const { data: expensesData } = await supabase.from('expenses').select('amount');
        const totalExpenses = expensesData?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;

        // Fetch Products Count
        const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true });

        // Fetch Customers Count
        const { count: customerCount } = await supabase.from('customers').select('*', { count: 'exact', head: true });

        const netProfit = totalRevenue - totalExpenses;

        setStats({
          revenue: totalRevenue,
          expenses: totalExpenses,
          profit: netProfit,
          cashBalance: netProfit, // Simplified Cash Balance logic
          totalOrders: salesData?.length || 0,
          totalProducts: productCount || 0,
          totalCustomers: customerCount || 0,
        });
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
        <div className="h-48 rounded-3xl bg-slate-800/50" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-28 rounded-2xl bg-slate-800/30" />
          <div className="h-28 rounded-2xl bg-slate-800/30" />
          <div className="h-28 rounded-2xl bg-slate-800/30" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Greeting & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Business Command Center
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Real-time insights and live performance overview.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('createSale')}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 active:scale-95"
          >
            <Plus className="h-4 w-4" /> New Sale
          </button>
        </div>
      </div>

      {/* Signature Feature: Financial Pulse */}
      <FinancialPulse
        revenue={stats.revenue}
        expenses={stats.expenses}
        profit={stats.profit}
        cashBalance={stats.cashBalance}
      />

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div
          onClick={() => onNavigate('sales')}
          className="group cursor-pointer rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-all hover:border-indigo-500/50 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Total Sales</span>
            <div className="rounded-xl bg-indigo-500/10 p-2.5 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            {stats.totalOrders} <span className="text-xs font-normal text-slate-400">orders</span>
          </p>
          <div className="mt-2 flex items-center text-xs text-indigo-500 font-semibold">
            View Sales <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('products')}
          className="group cursor-pointer rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-all hover:border-emerald-500/50 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Products</span>
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            {stats.totalProducts} <span className="text-xs font-normal text-slate-400">items</span>
          </p>
          <div className="mt-2 flex items-center text-xs text-emerald-500 font-semibold">
            Manage Inventory <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('customers')}
          className="group cursor-pointer rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-all hover:border-purple-500/50 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Customers</span>
            <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            {stats.totalCustomers} <span className="text-xs font-normal text-slate-400">registered</span>
          </p>
          <div className="mt-2 flex items-center text-xs text-purple-500 font-semibold">
            Customer Directory <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
