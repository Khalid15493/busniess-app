import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card, Button, Badge, Select, Input } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState, LoadingPage } from '@/components/ui/Feedback';
import { fetchSaleById } from '@/services/sales';
import { createSalesReturn } from '@/services/inventory';
import { fetchAccounts } from '@/services/accounts';
import { Receipt } from '@/components/Receipt';
import type { Sale, Account } from '@/types';
import { formatCurrency, formatDateTime, PAYMENT_METHOD_LABELS } from '@/types';
import {
  ArrowLeft,
  Printer,
  Eye,
  ShoppingCart,
  Undo2,
} from 'lucide-react';
import type { Route } from '@/components/AppShell';

interface Props {
  saleId: string;
  onNavigate: (route: Route) => void;
}

export function SaleDetails({ saleId, onNavigate }: Props) {
  const { businessProfile } = useAuth();
  const { toast } = useToast();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [printOpen, setPrintOpen] = useState(false);
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal'>('a4');
  const [returnOpen, setReturnOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [returnForm, setReturnForm] = useState({ itemId: '', quantity: '', account_id: '', note: '' });
  const [returnSaving, setReturnSaving] = useState(false);
  const [confirmReturn, setConfirmReturn] = useState(false);

  useEffect(() => {
    fetchSaleById(saleId)
      .then(setSale)
      .catch((err) => toast(err instanceof Error ? err.message : 'Failed to load sale', 'error'))
      .finally(() => setLoading(false));
    fetchAccounts({ activeOnly: true }).then(setAccounts).catch(() => {});
  }, [saleId, toast]);

  const handleReturn = async () => {
    if (!sale) return;
    const item = sale.sale_items?.find((i) => i.id === returnForm.itemId);
    if (!item) { toast('Select an item to return', 'error'); return; }
    const qty = parseFloat(returnForm.quantity);
    if (isNaN(qty) || qty <= 0) { toast('Enter a valid quantity', 'error'); return; }
    if (qty > item.quantity) { toast(`Cannot return more than ${item.quantity} ${item.unit}`, 'error'); return; }
    const refundAmount = (item.selling_price - item.discount / item.quantity) * qty;
    setReturnSaving(true);
    try {
      await createSalesReturn({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: qty,
        unit: item.unit,
        refund_amount: refundAmount,
        account_id: returnForm.account_id || undefined,
        note: returnForm.note.trim() || undefined,
      });
      toast('Sales return processed successfully', 'success');
      setReturnOpen(false);
      setReturnForm({ itemId: '', quantity: '', account_id: '', note: '' });
      setSale(await fetchSaleById(saleId));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to process return', 'error');
    } finally {
      setReturnSaving(false);
    }
  };

  const handlePrint = () => {
    const content = document.getElementById('receipt-content');
    if (!content) return;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast('Please allow popups to print the receipt', 'error');
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${sale?.invoice_number ?? ''}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', monospace; background: #fff; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 4px 8px; text-align: left; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  if (loading) return <LoadingPage message="Loading sale details..." />;
  if (!sale) {
    return (
      <div>
        <Button variant="ghost" onClick={() => onNavigate('sales')}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Card><EmptyState icon={<ShoppingCart className="w-8 h-8" />} title="Sale Not Found" message="This sale may have been removed." /></Card>
      </div>
    );
  }

  const currency = businessProfile?.currency ?? 'BDT';

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('sales')}
            className="p-2 -ml-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">{sale.invoice_number}</h1>
            <p className="text-sm text-slate-400 mt-1">{formatDateTime(sale.sale_date)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {sale.status === 'completed' && (
            <Button variant="secondary" onClick={() => setReturnOpen(true)}>
              <Undo2 className="w-4 h-4" />
              <span className="hidden sm:inline">Return</span>
            </Button>
          )}
          <Button onClick={() => setPrintOpen(true)}>
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print Receipt</span>
          </Button>
        </div>
      </div>

      {/* Status & Customer */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {sale.status === 'cancelled' ? (
          <Badge variant="danger">Cancelled</Badge>
        ) : sale.due_amount <= 0 ? (
          <Badge variant="success">Fully Paid</Badge>
        ) : sale.paid_amount > 0 ? (
          <Badge variant="warning">Partially Paid</Badge>
        ) : (
          <Badge variant="danger">Unpaid</Badge>
        )}
        <Badge variant="default">{PAYMENT_METHOD_LABELS[sale.payment_method as keyof typeof PAYMENT_METHOD_LABELS] ?? sale.payment_method}</Badge>
        <span className="text-sm text-slate-400">
          Customer: <span className="font-medium text-slate-200">{sale.customer?.name ?? 'Walk-in'}</span>
        </span>
      </div>

      {/* Items */}
      <Card className="mb-6">
        <div className="p-5 border-b border-slate-700/50">
          <h2 className="text-base font-semibold text-slate-200">Items ({sale.sale_items?.length ?? 0})</h2>
        </div>
        <div className="divide-y divide-slate-700/30">
          {sale.sale_items?.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200">{item.product?.name ?? 'Unknown Product'}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {item.quantity} {item.unit} x {formatCurrency(item.selling_price, currency)}
                  {item.discount > 0 && ` - ${formatCurrency(item.discount, currency)} discount`}
                </p>
              </div>
              <p className="text-sm font-semibold text-slate-200 flex-shrink-0">{formatCurrency(item.line_total, currency)}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-5 mb-6">
        <div className="flex flex-col gap-2 max-w-xs ml-auto">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Subtotal</span>
            <span className="font-medium text-slate-200">{formatCurrency(sale.subtotal, currency)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Discount</span>
              <span className="font-medium text-red-400">-{formatCurrency(sale.discount, currency)}</span>
            </div>
          )}
          {sale.delivery_charge > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Delivery Charge</span>
              <span className="font-medium text-slate-200">+{formatCurrency(sale.delivery_charge, currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold border-t border-slate-600 pt-2">
            <span className="text-slate-100">Total</span>
            <span className="text-slate-100">{formatCurrency(sale.total, currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Paid</span>
            <span className="font-medium text-emerald-400">{formatCurrency(sale.paid_amount, currency)}</span>
          </div>
          {sale.due_amount > 0 && (
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-red-400">Due</span>
              <span className="text-red-400">{formatCurrency(sale.due_amount, currency)}</span>
            </div>
          )}
        </div>
      </Card>

      {sale.notes && (
        <Card className="p-4 mb-6">
          <p className="text-xs text-slate-400 mb-1">Notes</p>
          <p className="text-sm text-slate-300">{sale.notes}</p>
        </Card>
      )}

      {/* Print Modal */}
      <Modal open={printOpen} onClose={() => setPrintOpen(false)} title="Print Receipt" size="lg">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setPrintFormat('a4')}
              className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                printFormat === 'a4' ? 'border-blue-500 bg-blue-500/15 text-blue-400' : 'border-slate-600 text-slate-400'
              }`}
            >
              A4 Paper
            </button>
            <button
              onClick={() => setPrintFormat('thermal')}
              className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                printFormat === 'thermal' ? 'border-blue-500 bg-blue-500/15 text-blue-400' : 'border-slate-600 text-slate-400'
              }`}
            >
              Thermal Receipt
            </button>
          </div>
          <div className="bg-white rounded-lg p-4 overflow-auto max-h-96 border border-slate-700">
            <Receipt sale={sale} business={businessProfile} format={printFormat} />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setPrintOpen(false)}>Close</Button>
            <Button onClick={handlePrint}>
              <Printer className="w-4 h-4" />
              Print
            </Button>
          </div>
        </div>
      </Modal>

      {/* Sales Return Modal */}
      <Modal open={returnOpen} onClose={() => setReturnOpen(false)} title="Process Sales Return">
        <div className="flex flex-col gap-4">
          <div className="bg-amber-500/10 rounded-lg p-3">
            <p className="text-xs text-amber-400">This will return the item to stock and refund the customer. The customer ledger will be updated.</p>
          </div>
          <Select label="Select Item *" value={returnForm.itemId} onChange={(e) => setReturnForm((p) => ({ ...p, itemId: e.target.value }))}>
            <option value="">Select an item</option>
            {sale.sale_items?.map((item) => (
              <option key={item.id} value={item.id}>{item.product?.name ?? 'Unknown'} ({item.quantity} {item.unit})</option>
            ))}
          </Select>
          <Input label="Return Quantity *" type="number" step="any" min="0" value={returnForm.quantity} onChange={(e) => setReturnForm((p) => ({ ...p, quantity: e.target.value }))} placeholder="0" />
          {accounts.length > 0 && (
            <Select label="Refund From Account" value={returnForm.account_id} onChange={(e) => setReturnForm((p) => ({ ...p, account_id: e.target.value }))}>
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
        message="This will return the item to stock and update the customer ledger. This action cannot be undone."
        confirmLabel="Confirm Return"
        danger
      />
    </div>
  );
}
