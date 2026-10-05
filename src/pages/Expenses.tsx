import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card, Button, Input, Select } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, LoadingPage } from '@/components/ui/Feedback';
import { fetchExpenses, createExpense, deleteExpense } from '@/services/expenses';
import { fetchAccounts } from '@/services/accounts';
import type { Expense, ExpenseCategory, Account, PaymentMethod } from '@/types';
import { formatCurrency, formatDateTime, EXPENSE_CATEGORIES, PAYMENT_METHOD_LABELS } from '@/types';
import { Plus, Wallet, Trash2 } from 'lucide-react';

export function Expenses() {
  const { businessProfile } = useAuth();
  const { toast } = useToast();
  const currency = businessProfile?.currency ?? 'BDT';

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [form, setForm] = useState({ category: 'rent' as ExpenseCategory, amount: '', payment_method: 'cash' as PaymentMethod, account_id: '', description: '', notes: '' });

  const load = useCallback(async () => {
    try {
      const [exps, accts] = await Promise.all([fetchExpenses({ category: categoryFilter }), fetchAccounts({ activeOnly: true })]);
      setExpenses(exps); setAccounts(accts);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load expenses', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, categoryFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) { toast('Enter a valid amount', 'error'); return; }
    setSaving(true);
    try {
      await createExpense({ category: form.category, amount, payment_method: form.payment_method, account_id: form.account_id || undefined, description: form.description.trim() || undefined, notes: form.notes.trim() || undefined });
      toast('Expense recorded', 'success');
      setFormOpen(false);
      setForm({ category: 'rent', amount: '', payment_method: 'cash', account_id: '', description: '', notes: '' });
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to record expense', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExpense(id);
      toast('Expense deleted', 'success');
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete expense', 'error');
    }
  };

  if (loading) return <LoadingPage message="Loading expenses..." />;

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div>
      <PageHeader title="Expenses" subtitle={`${expenses.length} records · Total: ${formatCurrency(totalAmount, currency)}`} action={<Button onClick={() => setFormOpen(true)} size="md"><Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Expense</span></Button>} />

      <div className="mb-4">
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-600 rounded-lg bg-slate-700/50 text-slate-100 outline-none focus:border-blue-500">
          <option value="all">All Categories</option>
          {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {expenses.length === 0 ? (
        <Card><EmptyState icon={<Wallet className="w-8 h-8" />} title="No Expenses" message="Record your first expense to track business costs." action={<Button onClick={() => setFormOpen(true)}><Plus className="w-4 h-4" />Add Expense</Button>} /></Card>
      ) : (
        <Card>
          <div className="divide-y divide-slate-700/30">
            {expenses.map((exp) => (
              <div key={exp.id} className="flex items-center justify-between gap-3 p-4 hover:bg-slate-700/40 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-200 capitalize">{exp.category}</p>
                  {exp.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{exp.description}</p>}
                  <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(exp.expense_date)}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <p className="text-sm font-semibold text-red-400">{formatCurrency(exp.amount, currency)}</p>
                  <button onClick={() => handleDelete(exp.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Add Expense">
        <div className="flex flex-col gap-4">
          <Select label="Category *" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as ExpenseCategory }))}>{EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</Select>
          <Input label="Amount *" type="number" step="any" min="0" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0" />
          <Select label="Payment Method" value={form.payment_method} onChange={(e) => setForm((p) => ({ ...p, payment_method: e.target.value as PaymentMethod }))}>{Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
          {accounts.length > 0 && <Select label="Pay From Account" value={form.account_id} onChange={(e) => setForm((p) => ({ ...p, account_id: e.target.value }))}><option value="">No account</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.current_balance, currency)})</option>)}</Select>}
          <Input label="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
          <Input label="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
          <div className="flex gap-3 justify-end"><Button variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Record Expense'}</Button></div>
        </div>
      </Modal>
    </div>
  );
}
