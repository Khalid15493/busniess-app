import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card, Button, Input, Select, Badge } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, LoadingPage } from '@/components/ui/Feedback';
import { fetchWithdrawals, createWithdrawal, fetchCapitalRecords, createCapitalRecord } from '@/services/finance';
import { fetchAccounts } from '@/services/accounts';
import type { OwnerWithdrawal, CapitalRecord, CapitalType, Account } from '@/types';
import { formatCurrency, formatDateTime } from '@/types';
import { Plus, Banknote, Wallet, TrendingUp } from 'lucide-react';

export function Withdrawals() {
  const { businessProfile } = useAuth();
  const { toast } = useToast();
  const currency = businessProfile?.currency ?? 'BDT';

  const [withdrawals, setWithdrawals] = useState<OwnerWithdrawal[]>([]);
  const [capitals, setCapitals] = useState<CapitalRecord[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'withdrawals' | 'capital'>('withdrawals');
  const [wModalOpen, setWModalOpen] = useState(false);
  const [cModalOpen, setCModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [wForm, setWForm] = useState({ amount: '', account_id: '', reason: '', notes: '' });
  const [cForm, setCForm] = useState({ amount: '', capital_type: 'initial' as CapitalType, account_id: '', notes: '' });

  const load = useCallback(async () => {
    try {
      const [ws, cs, accts] = await Promise.all([fetchWithdrawals(), fetchCapitalRecords(), fetchAccounts({ activeOnly: true })]);
      setWithdrawals(ws); setCapitals(cs); setAccounts(accts);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleWithdrawal = async () => {
    const amount = parseFloat(wForm.amount);
    if (isNaN(amount) || amount <= 0) { toast('Enter a valid amount', 'error'); return; }
    setSaving(true);
    try {
      await createWithdrawal({ amount, account_id: wForm.account_id || undefined, reason: wForm.reason.trim() || undefined, notes: wForm.notes.trim() || undefined });
      toast('Withdrawal recorded', 'success');
      setWModalOpen(false);
      setWForm({ amount: '', account_id: '', reason: '', notes: '' });
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to record withdrawal', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCapital = async () => {
    const amount = parseFloat(cForm.amount);
    if (isNaN(amount) || amount <= 0) { toast('Enter a valid amount', 'error'); return; }
    setSaving(true);
    try {
      await createCapitalRecord({ amount, capital_type: cForm.capital_type, account_id: cForm.account_id || undefined, notes: cForm.notes.trim() || undefined });
      toast('Capital recorded', 'success');
      setCModalOpen(false);
      setCForm({ amount: '', capital_type: 'initial', account_id: '', notes: '' });
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to record capital', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingPage message="Loading..." />;

  const totalWithdrawals = withdrawals.reduce((s, w) => s + w.amount, 0);
  const totalCapital = capitals.reduce((s, c) => s + c.amount, 0);

  return (
    <div>
      <PageHeader title="Owner Withdrawals & Capital" subtitle={`Withdrawals: ${formatCurrency(totalWithdrawals, currency)} · Capital: ${formatCurrency(totalCapital, currency)}`} />

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('withdrawals')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'withdrawals' ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-slate-300'}`}>Withdrawals</button>
        <button onClick={() => setTab('capital')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'capital' ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-slate-300'}`}>Capital</button>
      </div>

      {tab === 'withdrawals' ? (
        <>
          <div className="mb-4"><Button onClick={() => setWModalOpen(true)}><Plus className="w-4 h-4" />New Withdrawal</Button></div>
          {withdrawals.length === 0 ? <Card><EmptyState icon={<Banknote className="w-8 h-8" />} title="No Withdrawals" message="Owner withdrawals will appear here. These are NOT operating expenses." /></Card> : (
            <Card><div className="divide-y divide-slate-700/30">
              {withdrawals.map((w) => (
                <div key={w.id} className="flex items-center justify-between gap-3 p-4 hover:bg-slate-700/40 transition-colors">
                  <div className="min-w-0"><p className="text-sm font-medium text-slate-200">{w.reason ?? 'Owner Withdrawal'}</p>{w.notes && <p className="text-xs text-slate-400 mt-0.5 truncate">{w.notes}</p>}<p className="text-xs text-slate-500 mt-0.5">{formatDateTime(w.withdrawal_date)}</p></div>
                  <p className="text-sm font-semibold text-red-400 flex-shrink-0">{formatCurrency(w.amount, currency)}</p>
                </div>
              ))}
            </div></Card>
          )}
        </>
      ) : (
        <>
          <div className="mb-4"><Button onClick={() => setCModalOpen(true)}><Plus className="w-4 h-4" />Add Capital</Button></div>
          {capitals.length === 0 ? <Card><EmptyState icon={<TrendingUp className="w-8 h-8" />} title="No Capital Records" message="Track initial and additional capital invested in the business." /></Card> : (
            <Card><div className="divide-y divide-slate-700/30">
              {capitals.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 p-4 hover:bg-slate-700/40 transition-colors">
                  <div className="min-w-0"><div className="flex items-center gap-2"><p className="text-sm font-medium text-slate-200 capitalize">{c.capital_type} Capital</p><Badge variant={c.capital_type === 'initial' ? 'info' : 'success'}>{c.capital_type}</Badge></div>{c.notes && <p className="text-xs text-slate-400 mt-0.5 truncate">{c.notes}</p>}<p className="text-xs text-slate-500 mt-0.5">{formatDateTime(c.record_date)}</p></div>
                  <p className="text-sm font-semibold text-emerald-400 flex-shrink-0">{formatCurrency(c.amount, currency)}</p>
                </div>
              ))}
            </div></Card>
          )}
        </>
      )}

      <Modal open={wModalOpen} onClose={() => setWModalOpen(false)} title="New Owner Withdrawal">
        <div className="flex flex-col gap-4">
          <div className="bg-slate-700/40 rounded-lg p-3"><p className="text-xs text-slate-400">Owner withdrawals reduce business account balance but are NOT operating expenses and do not affect profit calculation.</p></div>
          <Input label="Amount *" type="number" step="any" min="0" value={wForm.amount} onChange={(e) => setWForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0" />
          {accounts.length > 0 && <Select label="From Account" value={wForm.account_id} onChange={(e) => setWForm((p) => ({ ...p, account_id: e.target.value }))}><option value="">No account</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.current_balance, currency)})</option>)}</Select>}
          <Input label="Reason" value={wForm.reason} onChange={(e) => setWForm((p) => ({ ...p, reason: e.target.value }))} placeholder="e.g. Personal use" />
          <Input label="Notes" value={wForm.notes} onChange={(e) => setWForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
          <div className="flex gap-3 justify-end"><Button variant="secondary" onClick={() => setWModalOpen(false)}>Cancel</Button><Button onClick={handleWithdrawal} disabled={saving}>{saving ? 'Saving...' : 'Record Withdrawal'}</Button></div>
        </div>
      </Modal>

      <Modal open={cModalOpen} onClose={() => setCModalOpen(false)} title="Add Capital">
        <div className="flex flex-col gap-4">
          <div className="bg-slate-700/40 rounded-lg p-3"><p className="text-xs text-slate-400">Capital increases business account balance. It is separate from revenue and does not count as income.</p></div>
          <Select label="Capital Type" value={cForm.capital_type} onChange={(e) => setCForm((p) => ({ ...p, capital_type: e.target.value as CapitalType }))}><option value="initial">Initial Capital</option><option value="additional">Additional Capital</option></Select>
          <Input label="Amount *" type="number" step="any" min="0" value={cForm.amount} onChange={(e) => setCForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0" />
          {accounts.length > 0 && <Select label="To Account" value={cForm.account_id} onChange={(e) => setCForm((p) => ({ ...p, account_id: e.target.value }))}><option value="">No account</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.current_balance, currency)})</option>)}</Select>}
          <Input label="Notes" value={cForm.notes} onChange={(e) => setCForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
          <div className="flex gap-3 justify-end"><Button variant="secondary" onClick={() => setCModalOpen(false)}>Cancel</Button><Button onClick={handleCapital} disabled={saving}>{saving ? 'Saving...' : 'Record Capital'}</Button></div>
        </div>
      </Modal>
    </div>
  );
}
