import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card, Button, Input, Select } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, LoadingPage } from '@/components/ui/Feedback';
import { fetchWastages, createWastage } from '@/services/inventory';
import { fetchProducts } from '@/services/products';
import type { Wastage, ProductWithStock } from '@/types';
import { formatQuantity, formatDateTime } from '@/types';
import { Plus, AlertTriangle, Trash2 } from 'lucide-react';

export function Wastage() {
  const { toast } = useToast();
  const [wastages, setWastages] = useState<(Wastage & { product?: any })[]>([]);
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ product_id: '', quantity: '', reason: 'Spoiled', notes: '' });

  const load = useCallback(async () => {
    try {
      const [wasts, prods] = await Promise.all([fetchWastages(), fetchProducts({ activeOnly: true })]);
      setWastages(wasts); setProducts(prods);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const product = products.find((p) => p.id === form.product_id);
    if (!product) { toast('Select a product', 'error'); return; }
    const qty = parseFloat(form.quantity);
    if (isNaN(qty) || qty <= 0) { toast('Enter a valid quantity', 'error'); return; }
    if (qty > product.current_stock) { toast(`Insufficient stock. Available: ${formatQuantity(product.current_stock, product.unit)}`, 'error'); return; }
    setSaving(true);
    try {
      await createWastage({ product_id: form.product_id, quantity: qty, unit: product.unit, reason: form.reason, notes: form.notes.trim() || undefined });
      toast('Wastage recorded — stock decreased', 'success');
      setFormOpen(false);
      setForm({ product_id: '', quantity: '', reason: 'Spoiled', notes: '' });
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to record wastage', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingPage message="Loading wastage records..." />;

  return (
    <div>
      <PageHeader title="Wastage / Damage" subtitle={`${wastages.length} records`} action={<Button onClick={() => setFormOpen(true)} size="md"><Plus className="w-4 h-4" /><span className="hidden sm:inline">Record Wastage</span></Button>} />

      <div className="mb-4">
        <div className="bg-slate-700/40 rounded-lg p-3">
          <p className="text-xs text-slate-400">Wastage reduces stock through a stock movement (type: WASTAGE). It does NOT count as a sale. Cost impact is preserved for future profit calculation.</p>
        </div>
      </div>

      {wastages.length === 0 ? (
        <Card><EmptyState icon={<AlertTriangle className="w-8 h-8" />} title="No Wastage Records" message="Record damaged or spoiled products to track stock losses." action={<Button onClick={() => setFormOpen(true)}><Plus className="w-4 h-4" />Record Wastage</Button>} /></Card>
      ) : (
        <Card>
          <div className="divide-y divide-slate-700/30">
            {wastages.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-3 p-4 hover:bg-slate-700/40 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200">{w.product?.name ?? 'Unknown'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatQuantity(w.quantity, w.unit)} · {w.reason}</p>
                  {w.notes && <p className="text-xs text-slate-500 mt-0.5 truncate">{w.notes}</p>}
                  <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(w.waste_date)}</p>
                </div>
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Record Wastage">
        <div className="flex flex-col gap-4">
          <Select label="Product *" value={form.product_id} onChange={(e) => setForm((p) => ({ ...p, product_id: e.target.value }))}>
            <option value="">Select product</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name} (Stock: {formatQuantity(p.current_stock, p.unit)})</option>)}
          </Select>
          <Input label="Quantity *" type="number" step="any" min="0" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} placeholder="0" />
          <Input label="Reason" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} placeholder="e.g. Spoiled, Damaged" />
          <Input label="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
          <div className="flex gap-3 justify-end"><Button variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Record Wastage'}</Button></div>
        </div>
      </Modal>
    </div>
  );
}
