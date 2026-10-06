import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todaysIncome: 0,
    todaysExpense: 0,
    todaysNetProfit: 0,
    netDue: 0,
    cashAvailable: 0,
    netProfitMargin: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    totalSalesCount: 0,
    totalProductsCount: 0,
    totalCustomersCount: 0,
    ownersWithdrawals: 0,
  });
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [salesRes, expRes, prodRes, custRes, withRes] = await Promise.all([
        supabase.from('sales').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('products').select('*'),
        supabase.from('customers').select('*'),
        supabase.from('owner_withdrawals').select('*')
      ]);

      const sales = salesRes.error ? [] : (salesRes.data || []);
      const expenses = expRes.error ? [] : (expRes.data || []);
      const products = prodRes.error ? [] : (prodRes.data || []);
      const customers = custRes.error ? [] : (custRes.data || []);
      const withdrawals = withRes.error ? [] : (withRes.data || []);

      const todayStr = new Date().toISOString().split('T')[0];

      let todaysInc = 0;
      let totalRev = 0;
      let totalDue = 0;

      sales.forEach((sale: any) => {
        const saleAmount = Number(sale.total_amount || sale.amount || sale.grand_total || 0);
        const paidAmount = Number(sale.paid_amount || sale.paid || saleAmount);
        const dueAmount = Number(sale.due_amount || sale.due || (saleAmount - paidAmount));

        totalRev += saleAmount;
        totalDue += dueAmount;

        const saleDate = sale.created_at ? sale.created_at.split('T')[0] : (sale.date || '');
        if (saleDate === todayStr) {
          todaysInc += paidAmount;
        }
      });

      let todaysExp = 0;
      let totalExp = 0;

      expenses.forEach((exp: any) => {
        const expAmount = Number(exp.amount || exp.cost || 0);
        totalExp += expAmount;

        const expDate = exp.date || (exp.created_at ? exp.created_at.split('T')[0] : '');
        if (expDate === todayStr) {
          todaysExp += expAmount;
        }
      });

      let totalWithdrawn = 0;
      withdrawals.forEach((w: any) => {
        totalWithdrawn += Number(w.amount || w.withdrawal_amount || 0);
      });

      const todaysNetProf = todaysInc - todaysExp;
      const netProfitTotal = totalRev - totalExp;
      const cashAvail = totalRev - totalExp - totalWithdrawn;
      const profitMargin = totalRev > 0 ? (netProfitTotal / totalRev) * 100 : 0;

      const lowStock = products.filter((p: any) => Number(p.stock || p.quantity || p.current_stock || 0) <= 5);

      setStats({
        todaysIncome: todaysInc,
        todaysExpense: todaysExp,
        todaysNetProfit: todaysNetProf,
        netDue: totalDue,
        cashAvailable: cashAvail,
        netProfitMargin: Number(profitMargin.toFixed(1)),
        totalRevenue: totalRev,
        totalExpenses: totalExp,
        totalSalesCount: sales.length,
        totalProductsCount: products.length,
        totalCustomersCount: customers.length,
        ownersWithdrawals: totalWithdrawn,
      });

      setLowStockProducts(lowStock);
      setRecentSales(sales.slice(0, 5));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Business Command Center</h1>
          <p className="text-slate-400 text-sm">Real-time financial performance and analytics</p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all text-sm font-medium border border-slate-700 shadow-md"
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Today's Income</div>
          <div className="text-2xl font-bold text-white">৳ {stats.todaysIncome.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">Collected today</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Today's Expense</div>
          <div className="text-2xl font-bold text-white">৳ {stats.todaysExpense.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">Spent today</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Today's Net Profit</div>
          <div className={`text-2xl font-bold ${stats.todaysNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ৳ {stats.todaysNetProfit.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">Income minus expense</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Cash Available</div>
          <div className="text-2xl font-bold text-white">৳ {stats.cashAvailable.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">Net balance in hand</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-4">
          <div className="text-xs text-slate-400">Net Due Balance</div>
          <div className="text-lg font-semibold text-amber-400 mt-1">৳ {stats.netDue.toLocaleString()}</div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-4">
          <div className="text-xs text-slate-400">Net Profit Margin</div>
          <div className="text-lg font-semibold text-emerald-400 mt-1">{stats.netProfitMargin}%</div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-4">
          <div className="text-xs text-slate-400">Total Revenue</div>
          <div className="text-lg font-semibold text-white mt-1">৳ {stats.totalRevenue.toLocaleString()}</div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-4">
          <div className="text-xs text-slate-400">Owner's Withdrawals</div>
          <div className="text-lg font-semibold text-purple-400 mt-1">৳ {stats.ownersWithdrawals.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-lg">
          <h2 className="text-lg font-semibold text-white">Business Overview</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-800/80">
              <span className="text-sm text-slate-400">Total Sales Transactions</span>
              <span className="text-sm font-bold text-white">{stats.totalSalesCount}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800/80">
              <span className="text-sm text-slate-400">Total Products</span>
              <span className="text-sm font-bold text-white">{stats.totalProductsCount}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800/80">
              <span className="text-sm text-slate-400">Total Customers</span>
              <span className="text-sm font-bold text-white">{stats.totalCustomersCount}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-400">Total Expenses</span>
              <span className="text-sm font-bold text-rose-400">৳ {stats.totalExpenses.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-lg">
          <h2 className="text-lg font-semibold text-white">Low Stock Warning</h2>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">All products have sufficient stock.</p>
            ) : (
              lowStockProducts.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
                  <span className="text-sm font-medium text-slate-200">{p.name || p.title || 'Unnamed Product'}</span>
                  <span className="text-xs px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded-full font-bold">
                    Stock: {p.stock ?? p.quantity ?? p.current_stock ?? 0}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-lg">
          <h2 className="text-lg font-semibold text-white">Recent Sales</h2>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {recentSales.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">No recent sales recorded yet.</p>
            ) : (
              recentSales.map((sale, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
                  <div>
                    <div className="text-sm font-medium text-white">{sale.customer_name || sale.customer || 'Walk-in Customer'}</div>
                    <div className="text-xs text-slate-500">{sale.created_at ? new Date(sale.created_at).toLocaleDateString() : ''}</div>
                  </div>
                  <div className="text-sm font-bold text-emerald-400">
                    ৳ {Number(sale.total_amount || sale.amount || sale.grand_total || 0).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
