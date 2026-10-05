import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card, Button, Input, Select, Badge } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, LoadingPage } from '@/components/ui/Feedback';
import { fetchAccounts, createAccount, fetchAccountTransactions, transferBetweenAccounts } from '@/services/accounts';
import type { Account, AccountTransaction, AccountType } from '@/types';
import { formatCurrency, formatDateTime, ACCOUNT_TYPE_LABELS, ACCOUNT_TXN_TYPE_LABELS } from '@/types';
import { Plus, Wallet, ArrowRightLeft, Eye, ArrowLeft } from 'lucide-react';

export function Accounts() {
  const { businessProfile } = useAuth();
  const { toast } = useToast();
  const currency = businessProfile?.currency ?? 'BDT';

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewAccount, setViewAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);

  const [form, setForm] = useState({ name: '', account_type: 'cash' as AccountType, opening_balance: '' });
  const [transferForm, setTransferForm] = useState({ from_account_id: '', to_account_id: '', amount: '', note: '' });

  const load = useCallback(async () => {
    try {
      const data = await fetchAccounts({ activeOnly: true });
      setAccounts(data);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load accounts', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name.trim()) { toast('Account name is required', 'error'); return; }
    const opening = parseFloat(form.opening_balance) || 0;
    if (opening < 0) { toast('Opening balance cannot be negative', 'error'); return; }
    setSaving(true);
    try {
      await createAccount({ name: form.name.trim(), account_type: form.account_type, opening_balance: opening });
      toast('Account created', 'success');
      setFormOpen(false);
      setForm({ name: '', account_type: 'cash', opening_balance: '' });
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create account', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTransfer = async () => {
    const amount = parseFloat(transferForm.amount);
    if (isNaN(amount) || amount <= 0) { toast('Enter a valid amount', 'error'); return; }
    if (transferForm.from_account_id === transferForm.to_account_id) { toast('Cannot transfer to the same account', 'error'); return; }
    if (!transferForm.from_account_id || !transferForm.to_account_id) { toast('Select both accounts', 'error'); return; }
    setSaving(true);
    try {
      await transferBetweenAccounts({ from_account_id: transferForm.from_account_id, to_account_id: transferForm.to_account_id, amount, note: transferForm.note.trim() || undefined });
      toast('Transfer completed', 'success');
      setTransferOpen(false);
      setTransferForm({ from_account_id: '', to_account_id: '', amount: '', note: '' });
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to transfer', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleViewAccount = async (account: Account) => {
    setViewAccount(account);
    try {
      const txns = await fetchAccountTransactions(account.id);
      setTransactions(txns);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load transactions', 'error');
    }
  };

  if (loading) return <LoadingPage message="Loading accounts..." />;

  if (viewAccount) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setViewAccount(null)} className="p-2 -ml-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
          <div><h1 className="text-2xl font-bold text-slate-100">{viewAccount.name}</h1><Badge variant="default">{ACCOUNT_TYPE_LABELS[viewAccount.account_type]}</Badge></div>
        </div>
        <Card className="p-5 mb-6"><p className="text-xs text-slate-400">Current Balance</p><p className="text-2xl font-bold text-slate-100 mt-1">{formatCurrency(viewAccount.current_balance, currency)}</p></Card>
        <Card>
          <div className="p-5 border-b border-slate-700/50"><h2 className="text-base font-semibold text-slate-200">Transaction History</h2></div>
          {transactions.length === 0 ? <EmptyState icon={<Wallet className="w-8 h-8" />} title="No Transactions" message="No transactions for this account yet." /> : (
            <div className="divide-y divide-slate-700/30">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0"><p className="text-sm font-medium text-slate-200">{ACCOUNT_TXN_TYPE_LABELS[tx.transaction_type]}</p><p className="text-xs text-slate-400 mt-0.5">{formatDateTime(tx.created_at)}{tx.note ? ` · ${tx.note}` : ''}</p></div>
                  <p className={`text-sm font-semibold flex-shrink-0 ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount, currency)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  const totalBalance = accounts.reduce((s, a) => s + a.current_balance, 0);

  return (
    <div>
      <PageHeader title="Accounts" subtitle={`${accounts.length} accounts · Total: ${formatCurrency(totalBalance, currency)}`} action={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setTransferOpen(true)} size="md"><ArrowRightLeft className="w-4 h-4" /><span className="hidden sm:inline">Transfer</span></Button>
          <Button onClick={() => setFormOpen(true)} size="md"><Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Account</span></Button>
        </div>
      } />

      {accounts.length === 0 ? (
        <Card><EmptyState icon={<Wallet className="w-8 h-8" />} title="No Accounts" message="Create accounts to track cash, bank, and mobile wallet balances." action={<Button onClick={() => setFormOpen(true)}><Plus className="w-4 h-4" />Add Account</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts.map((account) => (
            <Card key={account.id} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><Wallet className="w-5 h-5 text-slate-400" /><p className="text-sm font-semibold text-slate-200">{account.name}</p></div>
                <Badge variant="default">{ACCOUNT_TYPE_LABELS[account.account_type]}</Badge>
              </div>
              <p className="text-xs text-slate-400">Current Balance</p>
              <p className="text-xl font-bold text-slate-100 mt-1">{formatCurrency(account.current_balance, currency)}</p>
              <button onClick={() => handleViewAccount(account)} className="mt-3 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"><Eye className="w-3 h-3" />View Transactions</button>
            </Card>
          ))}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Add Account">
        <div className="flex flex-col gap-4">
          <Input label="Account Name *" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Main Cash" />
          <Select label="Account Type" value={form.account_type} onChange={(e) => setForm((p) => ({ ...p, account_type: e.target.value as AccountType }))}>{Object.entries(ACCOUNT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
          <Input label="Opening Balance" type="number" step="any" min="0" value={form.opening_balance} onChange={(e) => setForm((p) => ({ ...p, opening_balance: e.target.value }))} placeholder="0" />
          <div className="flex gap-3 justify-end"><Button variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving}>{saving ? 'Saving...' : 'Create Account'}</Button></div>
        </div>
      </Modal>

      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Internal Transfer">
        <div className="flex flex-col gap-4">
          <div className="bg-slate-700/40 rounded-lg p-3"><p className="text-xs text-slate-400">Internal transfers move money between accounts. They are NOT income or expenses.</p></div>
          <Select label="From Account" value={transferForm.from_account_id} onChange={(e) => setTransferForm((p) => ({ ...p, from_account_id: e.target.value }))}><option value="">Select account</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.current_balance, currency)})</option>)}</Select>
          <Select label="To Account" value={transferForm.to_account_id} onChange={(e) => setTransferForm((p) => ({ ...p, to_account_id: e.target.value }))}><option value="">Select account</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.current_balance, currency)})</option>)}</Select>
          <Input label="Amount *" type="number" step="any" min="0" value={transferForm.amount} onChange={(e) => setTransferForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0" />
          <Input label="Note" value={transferForm.note} onChange={(e) => setTransferForm((p) => ({ ...p, note: e.target.value }))} placeholder="Optional note" />
          <div className="flex gap-3 justify-end"><Button variant="secondary" onClick={() => setTransferOpen(false)}>Cancel</Button><Button onClick={handleTransfer} disabled={saving}>{saving ? 'Transferring...' : 'Transfer'}</Button></div>
        </div>
      </Modal>
    </div>
  );
}
