import React from 'react';
import { TrendingUp, TrendingDown, ShieldAlert, CheckCircle2, Wallet } from 'lucide-react';

interface PulseProps {
  revenue: number;
  expenses: number;
  profit: number;
  cashBalance: number;
}

export const FinancialPulse: React.FC<PulseProps> = ({ revenue, expenses, profit, cashBalance }) => {
  const profitMargin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0';
  const isHealthy = profit >= 0 && expenses <= revenue * 0.7;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 text-white shadow-2xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
              FINANCIAL PULSE
            </span>
            <span className="text-xs text-slate-400">Live Business Health</span>
          </div>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
            ৳ {cashBalance.toLocaleString('en-IN')} <span className="text-sm font-normal text-slate-400">Cash Available</span>
          </h2>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-white/5 p-3 backdrop-blur-md border border-white/10">
          {isHealthy ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          ) : (
            <ShieldAlert className="h-6 w-6 text-amber-400" />
          )}
          <div>
            <p className="text-xs font-medium text-slate-300">Net Profit Margin</p>
            <p className="text-sm font-bold text-white">{profitMargin}% ({isHealthy ? 'Healthy' : 'High Expense Ratio'})</p>
          </div>
        </div>
      </div>

      {/* Grid Indicators */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 border-t border-slate-800/80 pt-4">
        <div>
          <span className="text-xs font-medium text-slate-400">Total Revenue</span>
          <p className="mt-1 flex items-center gap-1 text-lg font-bold text-emerald-400">
            <TrendingUp className="h-4 w-4" /> ৳ {revenue.toLocaleString('en-IN')}
          </p>
        </div>
        <div>
          <span className="text-xs font-medium text-slate-400">Total Expenses</span>
          <p className="mt-1 flex items-center gap-1 text-lg font-bold text-rose-400">
            <TrendingDown className="h-4 w-4" /> ৳ {expenses.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="text-xs font-medium text-slate-400">Net Profit</span>
          <p className={`mt-1 text-lg font-bold ${profit >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
            ৳ {profit.toLocaleString('en-IN')}
          </p>
        </div>
      </div>
    </div>
  );
};
