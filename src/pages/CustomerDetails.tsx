import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card, Button, Input, Select, Badge } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, LoadingPage } from '@/components/ui/Feedback';
import {
  fetchCustomerById,
  fetchCustomerTransactions,
  fetchCustomerPayments,
  recordPayment,
} from '@/services/customers';
import { fetchSales } from '@/services/sales';
import type { CustomerWithDue, CustomerTransaction, Payment, Sale, PaymentMethod } from '@/types';
import { formatCurrency, formatDateTime, PAYMENT_METHOD_LABELS, TRANSACTION_TYPE_LABELS } from '@/types';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Wallet,
  Receipt,
  Plus,
  TrendingUp,
} from 'lucide-react';
import type { Route } from '@/components/AppShell';

interface Props {
  customerId: string;
  onNavigate: (route: Route, params?: { saleId?: string }) => void;
}

export function CustomerDetails({ customerId, onNavigate }: Props) {
  const { toast } = useToast();
  const { businessProfile } = useAuth();
  const currency = businessProfile?.currency ?? 'BDT';
  const [customer, setCustomer] = useState<CustomerWithDue | null>(null);
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payForm, setPayForm] = useState({
    amount: '',
    payment_method: 'cash' as PaymentMethod,
    note: '',
  });

  const load = async () => {
    try {
      const [cust, txns, pays, custSales] = await Promise.all([
        fetchCustomerById(customerId),
        fetchCustomerTransactions(customerId),
        fetchCustomerPayments(customerId),
        fetchSales({ customerId }),
      ]);
      setCustomer(cust);
      setTransactions(txns);
      setPayments(pays);
      setSales(custSales);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load customer', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [customerId]);

  const handlePayment = async () => {
    if (!customer) return;
    const amount = parseFloat(payForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast('Enter a valid payment amount', 'error');
      return;
    }

    setSaving(true);
    try {
      await recordPayment({
        customer_id: customer.id,
        amount,
        payment_method: payForm.payment_method,
        note: payForm.note.trim() || undefined,
      });
      toast('Payment recorded successfully', 'success');
      setPayOpen(false);
      setPayForm({ amount: '', payment_method: 'cash', note: '' });
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to record payment', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingPage message="Loading customer details..." />;
  if (!customer) {
    return (
      <div>
        <Button variant="ghost" onClick={() => onNavigate('customers')}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Card><EmptyState icon={<Receipt className="w-8 h-8" />} title="Customer Not Found" message="This customer may have been removed." /></Card>
      </div>
    );
  }

  const totalSales = sales.filter((s) => s.status === 'completed').reduce((sum, s) => sum + s.total, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => onNavigate('customers')}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-100 truncate">{customer.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
            {customer.phone && (
              <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{customer.phone}</span>
            )}
            {customer.email && (
              <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{customer.email}</span>
            )}
            {customer.address && (
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{customer.address}</span>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-red-400" />
            <p className="text-xs font-medium text-slate-400">Current Due</p>
          </div>
          <p className={`text-lg font-bold ${customer.current_due > 0 ? 'text-red-400' : customer.current_due < 0 ? 'text-blue-400' : 'text-emerald-400'}`}>
            {formatCurrency(Math.abs(customer.current_due), currency)}
          </p>
          {customer.current_due < 0 && <p className="text-[10px] text-slate-500">Advance</p>}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <p className="text-xs font-medium text-slate-400">Total Sales</p>
          </div>
          <p className="text-lg font-bold text-slate-100">{formatCurrency(totalSales, currency)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="w-4 h-4 text-blue-400" />
            <p className="text-xs font-medium text-slate-400">Total Paid</p>
          </div>
          <p className="text-lg font-bold text-slate-100">{formatCurrency(totalPaid, currency)}</p>
        </Card>
      </div>

      {customer.current_due > 0 && (
        <div className="mb-6">
          <Button onClick={() => setPayOpen(true)}>
            <Plus className="w-4 h-4" />
            Record Payment
          </Button>
        </div>
      )}

      {/* Sales History */}
      <Card className="mb-6">
        <div className="p-5 border-b border-slate-700/50">
          <h2 className="text-base font-semibold text-slate-200">Sales History</h2>
        </div>
        {sales.length === 0 ? (
          <EmptyState icon={<Receipt className="w-8 h-8" />} title="No Sales" message="No sales recorded for this customer yet." />
        ) : (
          <div className="divide-y divide-slate-700/30">
            {sales.map((sale) => (
              <button
                key={sale.id}
                onClick={() => onNavigate('saleDetails', { saleId: sale.id })}
                className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-slate-700/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200">{sale.invoice_number}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(sale.sale_date)}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-200">{formatCurrency(sale.total, currency)}</p>
                    {sale.due_amount > 0 ? (
                      <Badge variant="danger">Due: {formatCurrency(sale.due_amount, currency)}</Badge>
                    ) : (
                      <Badge variant="success">Paid</Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Transaction Ledger */}
      <Card className="mb-6">
        <div className="p-5 border-b border-slate-700/50">
          <h2 className="text-base font-semibold text-slate-200">Transaction History</h2>
        </div>
        {transactions.length === 0 ? (
          <EmptyState icon={<Wallet className="w-8 h-8" />} title="No Transactions" message="No transactions recorded yet." />
        ) : (
          <div className="divide-y divide-slate-700/30">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200">
                    {TRANSACTION_TYPE_LABELS[tx.transaction_type]}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDateTime(tx.created_at)}
                    {tx.note ? ` · ${tx.note}` : ''}
                  </p>
                </div>
                <p className={`text-sm font-semibold flex-shrink-0 ${tx.amount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount, currency)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Payment Modal */}
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Record Payment">
        <div className="flex flex-col gap-4">
          <div className="bg-slate-700/40 rounded-lg p-3">
            <p className="text-sm font-medium text-slate-200">{customer.name}</p>
            <p className="text-xs text-slate-400 mt-1">
              Current Due: <span className="font-semibold text-red-400">{formatCurrency(customer.current_due, currency)}</span>
            </p>
          </div>
          <Input
            label="Payment Amount *"
            type="number"
            step="any"
            min="0"
            value={payForm.amount}
            onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
            placeholder="0"
          />
          <Select
            label="Payment Method"
            value={payForm.payment_method}
            onChange={(e) => setPayForm((p) => ({ ...p, payment_method: e.target.value as PaymentMethod }))}
          >
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
          <Input
            label="Note"
            value={payForm.note}
            onChange={(e) => setPayForm((p) => ({ ...p, note: e.target.value }))}
            placeholder="Optional note"
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button onClick={handlePayment} disabled={saving}>
              {saving ? 'Saving...' : 'Record Payment'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
