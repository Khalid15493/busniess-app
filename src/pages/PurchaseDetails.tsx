import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Card, Button, Badge, Select, Input } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState, LoadingPage } from '@/components/ui/Feedback';
import { fetchPurchaseById } from '@/services/purchases';
import { createPurchaseReturn } from '@/services/inventory';
import { fetchAccounts } from '@/services/accounts';
import type { Purchase, Account } from '@/types';
import { formatCurrency, formatDateTime, PAYMENT_METHOD_LABELS } from '@/types';
import { ArrowLeft, Receipt, Undo2 } from 'lucide-react';
import type { Route } from '@/components/AppShell';

interface Props {
  purchaseId: string;
  onNavigate: (route: Route) => void;
}

export function PurchaseDetails({ purchaseId, onNavigate }: Props) {
  const { businessProfile } = useAuth();
  const { toast } = useToast();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [returnOpen, setReturnOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [returnForm, setReturnForm] = useState({ itemId: '', quantity: '', account_id: '', note: '' });
  const [returnSaving, setReturnSaving] = useState(false);
  const [confirmReturn, setConfirmReturn] = useState(false);

  useEffect(() => {
    fetchPurchaseById(purchaseId).then(setPurchase).catch((err) => toast(err instanceof Error ? err.message : 'Failed to load purchase', 'error')).finally(() => setLoading(false));
    fetchAccounts({ activeOnly: true }).then(setAccounts).catch(() => {});
  }, [purchaseId, toast]);

  const handleReturn = async () => {
    if (!purchase) return;
    const item = purchase.purchase_items?.find((i) => i.id === returnForm.itemId);
    if (!item) { toast('Select an item to return', 'error'); return; }
    const qty = parseFloat(returnForm.quantity);
    if (isNaN(qty) || qty <= 0) { toast('Enter a valid quantity', 'error'); return; }
    if (qty > item.quantity) { toast(`Cannot return more than ${item.quantity} ${item.unit}`, 'error'); return; }
    const refundAmount = (item.purchase_price - item.discount / item.quantity) * qty;
    setReturnSaving(true);
    try {
      await createPurchaseReturn({
        purchase_id: purchase.id,
        product_id: item.product_id,
        quantity: qty,
        unit: item.unit,
        refund_amount: refundAmount,
        account_id: returnForm.account_id || undefined,
        note: returnForm.note.trim() || undefined,
      });
      toast('Purchase return processed successfully', 'success');
      setReturnOpen(false);
      setReturnForm({ itemId: '', quantity: '', account_id: '', note: '' });
      setPurchase(await fetchPurchaseById(purchaseId));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to process return', 'error');
    } finally {
      setReturnSaving(false);
    }
  };

  if (loading) return <LoadingPage message="Loading purchase details..." />;
  if (!purchase) return (
    <div>
      <Button variant="ghost" onClick={() => onNavigate('purchases')}><ArrowLeft className="w-4 h-4" /> Back</Button>
      <Card><EmptyState icon={<Receipt className="w-8 h-8" />} title="Purchase Not Found" message="This purchase may have been removed." /></Card>
    </div>
  );

  const currency = businessProfile?.currency ?? 'BDT';

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate('purchases')} className="p-2 -ml-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
          <div><h1 className="text-2xl font-bold text-slate-100">{purchase.purchase_number}</h1><p className="text-sm text-slate-400 mt-1">{formatDateTime(purchase.purchase_date)}</p></div>
        </div>
        {purchase.status === 'completed' && (
          <Button variant="secondary" onClick={() => setReturnOpen(true)}>
            <Undo2 className="w-4 h-4" />
            <span className="hidden sm:inline">Return</span>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {purchase.status === 'cancelled' ? <Badge variant="danger">Cancelled</Badge> : purchase.payable_amount > 0 ? <Badge variant="warning">Partially Paid</Badge> : <Badge variant="success">Fully Paid</Badge>}
        <Badge variant="default">{PAYMENT_METHOD_LABELS[purchase.payment_method as keyof typeof PAYMENT_METHOD_LABELS] ?? purchase.payment_method}</Badge>
        <span className="text-sm text-slate-400">Supplier: <span className="font-medium text-slate-200">{purchase.supplier?.name ?? 'No supplier'}</span></span>
      </div>

      <Card className="mb-6">
        <div className="p-5 border-b border-slate-700/50"><h2 className="text-base font-semibold text-slate-200">Items ({purchase.purchase_items?.length ?? 0})</h2></div>
        <div className="divide-y divide-slate-700/30">
          {purchase.purchase_items?.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0"><p className="text-sm font-medium text-slate-200">{item.product?.name ?? 'Unknown'}</p><p className="text-xs text-slate-400 mt-0.5">{item.quantity} {item.unit} x {formatCurrency(item.purchase_price, currency)}{item.discount > 0 && ` - ${formatCurrency(item.discount, currency)} disc`}</p></div>
              <p className="text-sm font-semibold text-slate-200 flex-shrink-0">{formatCurrency(item.line_total, currency)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 mb-6">
        <div className="flex flex-col gap-2 max-w-xs ml-auto">
          <div className="flex justify-between text-sm"><span className="text-slate-400">Subtotal</span><span className="font-medium text-slate-200">{formatCurrency(purchase.subtotal, currency)}</span></div>
          {purchase.discount > 0 && <div className="flex justify-between text-sm"><span className="text-slate-400">Discount</span><span className="font-medium text-red-400">-{formatCurrency(purchase.discount, currency)}</span></div>}
          <div className="flex justify-between text-base font-bold border-t border-slate-600 pt-2"><span className="text-slate-100">Total</span><span className="text-slate-100">{formatCurrency(purchase.total, currency)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-slate-400">Paid</span><span className="font-medium text-emerald-400">{formatCurrency(purchase.paid_amount, currency)}</span></div>
          {purchase.payable_amount > 0 && <div className="flex justify-between text-sm font-semibold"><span className="text-red-400">Payable</span><span className="text-red-400">{formatCurrency(purchase.payable_amount, currency)}</span></div>}
        </div>
      </Card>

      {purchase.notes && <Card className="p-4 mb-6"><p className="text-xs text-slate-400 mb-1">Notes</p><p className="text-sm text-slate-300">{purchase.notes}</p></Card>}

      {/* Purchase Return Modal */}
      <Modal open={returnOpen} onClose={() => setReturnOpen(false)} title="Process Purchase Return">
        <div className="flex flex-col gap-4">
          <div className="bg-amber-500/10 rounded-lg p-3">
            <p className="text-xs text-amber-400">This will remove the item from stock and refund from the supplier payable. The supplier ledger will be updated.</p>
          </div>
          <Select label="Select Item *" value={returnForm.itemId} onChange={(e) => setReturnForm((p) => ({ ...p, itemId: e.target.value }))}>
            <option value="">Select an item</option>
            {purchase.purchase_items?.map((item) => (
              <option key={item.id} value={item.id}>{item.product?.name ?? 'Unknown'} ({item.quantity} {item.unit})</option>
            ))}
          </Select>
          <Input label="Return Quantity *" type="number" step="any" min="0" value={returnForm.quantity} onChange={(e) => setReturnForm((p) => ({ ...p, quantity: e.target.value }))} placeholder="0" />
          {accounts.length > 0 && (
            <Select label="Refund To Account" value={returnForm.account_id} onChange={(e) => setReturnForm((p) => ({ ...p, account_id: e.target.value }))}>
              <option value="">No account</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.current_balance, currency)})</option>)}
            </Select>
          )}
          <Input label="Note" value={returnForm.note} onChange={(e) => setReturnForm((p) => ({ ...p, note: e.target.value }))} placeholder="Optional note" />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setReturnOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => setConfirmReturn(true)} disabled={returnSaving}>{returnSaving ? 'Processing...' : 'Process Return'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmReturn}
        onClose={() => setConfirmReturn(false)}
        onConfirm={handleReturn}
        title="Confirm Return"
        message="This will remove the item from stock and update the supplier ledger. This action cannot be undone."
        confirmLabel="Confirm Return"
        danger
      />
    </div>
  );
}
