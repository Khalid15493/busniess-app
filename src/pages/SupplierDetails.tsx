import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Card, Button, Input, Select, Badge } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, LoadingPage } from '@/components/ui/Feedback';
import { fetchSupplierById, fetchSupplierTransactions, fetchSupplierPayments, recordSupplierPayment } from '@/services/suppliers';
import { fetchPurchases } from '@/services/purchases';
import { fetchAccounts } from '@/services/accounts';
import type { SupplierWithPayable, SupplierTransaction, SupplierPayment, Purchase, Account, PaymentMethod } from '@/types';
import { formatCurrency, formatDateTime, PAYMENT_METHOD_LABELS, SUPPLIER_TXN_TYPE_LABELS } from '@/types';
import { ArrowLeft, Phone, Mail, MapPin, Wallet, Receipt, Plus, Truck } from 'lucide-react';
import type { Route } from '@/components/AppShell';

interface Props {
  supplierId: string;
  onNavigate: (route: Route) => void;
}

export function SupplierDetails({ supplierId, onNavigate }: Props) {
  const { businessProfile } = useAuth();
  const { toast } = useToast();
  const currency = businessProfile?.currency ?? 'BDT';
  const [supplier, setSupplier] = useState<SupplierWithPayable | null>(null);
  const [transactions, setTransactions] = useState<SupplierTransaction[]>([]);
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'cash' as PaymentMethod, account_id: '', note: '' });

  const load = async () => {
    try {
      const [sup, txns, pays, purs, accts] = await Promise.all([
        fetchSupplierById(supplierId),
        fetchSupplierTransactions(supplierId),
        fetchSupplierPayments(supplierId),
        fetchPurchases({ supplierId }),
        fetchAccounts({ activeOnly: true }),
      ]);
      setSupplier(sup);
      setTransactions(txns);
      setPayments(pays);
      setPurchases(purs);
      setAccounts(accts);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load supplier', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [supplierId]);

  const handlePayment = async () => {
    if (!supplier) return;
    const amount = parseFloat(payForm.amount);
    if (isNaN(amount) || amount <= 0) { toast('Enter a valid payment amount', 'error'); return; }
    setSaving(true);
    try {
      await recordSupplierPayment({ supplier_id: supplier.id, amount, payment_method: payForm.payment_method, account_id: payForm.account_id || undefined, note: payForm.note.trim() || undefined });
      toast('Payment recorded successfully', 'success');
      setPayOpen(false);
      setPayForm({ amount: '', payment_method: 'cash', account_id: '', note: '' });
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to record payment', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingPage message="Loading supplier details..." />;
  if (!supplier) return (
    <div>
      <Button variant="ghost" onClick={() => onNavigate('suppliers')}><ArrowLeft className="w-4 h-4" /> Back</Button>
      <Card><EmptyState icon={<Truck className="w-8 h-8" />} title="Supplier Not Found" message="This supplier may have been removed." /></Card>
    </div>
  );

  const totalPurchases = purchases.filter((p) => p.status === 'completed').reduce((sum, p) => sum + p.total, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => onNavigate('suppliers')} className="p-2 -ml-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-100 truncate">{supplier.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
            {supplier.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{supplier.phone}</span>}
            {supplier.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{supplier.email}</span>}
            {supplier.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{supplier.address}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1"><Wallet className="w-4 h-4 text-red-400" /><p className="text-xs font-medium text-slate-400">Current Payable</p></div>
          <p className={`text-lg font-bold ${supplier.current_payable > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{formatCurrency(Math.abs(supplier.current_payable), currency)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1"><Receipt className="w-4 h-4 text-blue-400" /><p className="text-xs font-medium text-slate-400">Total Purchases</p></div>
          <p className="text-lg font-bold text-slate-100">{formatCurrency(totalPurchases, currency)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1"><Wallet className="w-4 h-4 text-emerald-400" /><p className="text-xs font-medium text-slate-400">Total Paid</p></div>
          <p className="text-lg font-bold text-slate-100">{formatCurrency(totalPaid, currency)}</p>
        </Card>
      </div>

      {supplier.current_payable > 0 && <div className="mb-6"><Button onClick={() => setPayOpen(true)}><Plus className="w-4 h-4" />Record Payment</Button></div>}

      <Card className="mb-6">
        <div className="p-5 border-b border-slate-700/50"><h2 className="text-base font-semibold text-slate-200">Purchase History</h2></div>
        {purchases.length === 0 ? <EmptyState icon={<Receipt className="w-8 h-8" />} title="No Purchases" message="No purchases recorded for this supplier yet." /> : (
          <div className="divide-y divide-slate-700/30">
            {purchases.map((pur) => (
              <button key={pur.id} onClick={() => onNavigate('purchaseDetails')} className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-slate-700/40 transition-colors">
                <div className="min-w-0"><p className="text-sm font-medium text-slate-200">{pur.purchase_number}</p><p className="text-xs text-slate-400 mt-0.5">{formatDateTime(pur.purchase_date)}</p></div>
                <div className="text-right"><p className="text-sm font-semibold text-slate-200">{formatCurrency(pur.total, currency)}</p>{pur.payable_amount > 0 ? <Badge variant="danger">Payable: {formatCurrency(pur.payable_amount, currency)}</Badge> : <Badge variant="success">Paid</Badge>}</div>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card className="mb-6">
        <div className="p-5 border-b border-slate-700/50"><h2 className="text-base font-semibold text-slate-200">Transaction History</h2></div>
        {transactions.length === 0 ? <EmptyState icon={<Wallet className="w-8 h-8" />} title="No Transactions" message="No transactions recorded yet." /> : (
          <div className="divide-y divide-slate-700/30">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0"><p className="text-sm font-medium text-slate-200">{SUPPLIER_TXN_TYPE_LABELS[tx.transaction_type]}</p><p className="text-xs text-slate-400 mt-0.5">{formatDateTime(tx.created_at)}{tx.note ? ` · ${tx.note}` : ''}</p></div>
                <p className={`text-sm font-semibold flex-shrink-0 ${tx.amount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount, currency)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Record Payment">
        <div className="flex flex-col gap-4">
          <div className="bg-slate-700/40 rounded-lg p-3"><p className="text-sm font-medium text-slate-200">{supplier.name}</p><p className="text-xs text-slate-400 mt-1">Current Payable: <span className="font-semibold text-red-400">{formatCurrency(supplier.current_payable, currency)}</span></p></div>
          <Input label="Payment Amount *" type="number" step="any" min="0" value={payForm.amount} onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0" />
          <Select label="Payment Method" value={payForm.payment_method} onChange={(e) => setPayForm((p) => ({ ...p, payment_method: e.target.value as PaymentMethod }))}>{Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
          {accounts.length > 0 && <Select label="Pay From Account" value={payForm.account_id} onChange={(e) => setPayForm((p) => ({ ...p, account_id: e.target.value }))}><option value="">No account</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.current_balance, currency)})</option>)}</Select>}
          <Input label="Note" value={payForm.note} onChange={(e) => setPayForm((p) => ({ ...p, note: e.target.value }))} placeholder="Optional note" />
          <div className="flex gap-3 justify-end"><Button variant="secondary" onClick={() => setPayOpen(false)}>Cancel</Button><Button onClick={handlePayment} disabled={saving}>{saving ? 'Saving...' : 'Record Payment'}</Button></div>
        </div>
      </Modal>
    </div>
  );
}
