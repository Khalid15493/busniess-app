import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PersonalTransaction, SavingsGoal, PersonalCategory } from '../types/personal';
import { Wallet, ArrowUpCircle, ArrowDownCircle, Target, Plus, PiggyBank } from 'lucide-react';

export const PersonalFinance: React.FC = () => {
  const [transactions, setTransactions] = useState<PersonalTransaction[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState<PersonalCategory>('Food');

  useEffect(() => {
    fetchPersonalData();
  }, []);

  async function fetchPersonalData() {
    try {
      setLoading(true);
      const { data: transData } = await supabase
        .from('personal_transactions')
        .select('*')
        .order('date', { ascending: false });

      const { data: goalsData } = await supabase
        .from('savings_goals')
        .select('*');

      if (transData) setTransactions(transData);
      if (goalsData) setGoals(goalsData);
    } catch (error) {
      console.error('Error fetching personal finance data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newTrans = {
        user_id: user.id,
        title,
        amount: parseFloat(amount),
        type,
        category,
        date: new Date().toISOString().split('T')[0],
      };

      const { data, error } = await supabase.from('personal_transactions').insert([newTrans]).select();

      if (error) throw error;
      if (data) {
        setTransactions([data[0], ...transactions]);
        setTitle('');
        setAmount('');
      }
    } catch (err) {
      console.error('Error adding transaction:', err);
    }
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const personalBalance = totalIncome - totalExpense;

  if (loading) {
    return <div className="p-6 text-center text-slate-400">Loading Personal Vault...</div>;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Personal Finance Vault
        </h1>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Strictly segregated personal budget and savings goal manager.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">Personal Balance</span>
            <Wallet className="h-5 w-5 text-indigo-500" />
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            ৳ {personalBalance.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">Total Income</span>
            <ArrowUpCircle className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-500">
            ৳ {totalIncome.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">Total Expense</span>
            <ArrowDownCircle className="h-5 w-5 text-rose-500" />
          </div>
          <p className="mt-3 text-2xl font-black text-rose-500">
            ৳ {totalExpense.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Add Transaction Form & History */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Form */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add Entry</h2>
          <form onSubmit={handleAddTransaction} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Salary, Grocery"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Amount (৳)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as 'income' | 'expense')}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="expense" className="dark:bg-slate-900">Expense</option>
                  <option value="income" className="dark:bg-slate-900">Income</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PersonalCategory)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Food" className="dark:bg-slate-900">Food</option>
                  <option value="Salary" className="dark:bg-slate-900">Salary</option>
                  <option value="Rent" className="dark:bg-slate-900">Rent</option>
                  <option value="Utilities" className="dark:bg-slate-900">Utilities</option>
                  <option value="Shopping" className="dark:bg-slate-900">Shopping</option>
                  <option value="Freelance" className="dark:bg-slate-900">Freelance</option>
                  <option value="Other" className="dark:bg-slate-900">Other</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all shadow-md"
            >
              Add Personal Record
            </button>
          </form>
        </div>

        {/* Recent Personal Transactions */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Recent Activity</h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No personal transactions recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.title}</p>
                    <p className="text-xs text-slate-400">{t.category} • {t.date}</p>
                  </div>
                  <span className={`text-sm font-bold ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {t.type === 'income' ? '+' : '-'} ৳ {Number(t.amount).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
