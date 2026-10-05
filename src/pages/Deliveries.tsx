import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card, Button, Input, Select, Badge } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, LoadingPage } from '@/components/ui/Feedback';
import { fetchDeliveries, updateDelivery } from '@/services/deliveries';
import { fetchSales } from '@/services/sales';
import type { Delivery, DeliveryStatus, Sale } from '@/types';
import { formatCurrency, formatDateTime, DELIVERY_STATUS_LABELS } from '@/types';
import { Truck, Eye } from 'lucide-react';
import type { Route } from '@/components/AppShell';

interface Props {
  onNavigate: (route: Route, params?: { saleId?: string }) => void;
}

const STATUS_VARIANTS: Record<DeliveryStatus, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending: 'warning',
  confirmed: 'info',
  preparing: 'info',
  out_for_delivery: 'info',
  delivered: 'success',
  cancelled: 'danger',
  returned: 'danger',
};

export function Deliveries({ onNavigate }: Props) {
  const { toast } = useToast();
  const [deliveries, setDeliveries] = useState<(Delivery & { sale?: Sale | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [editDelivery, setEditDelivery] = useState<Delivery | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ delivery_status: 'pending' as DeliveryStatus, actual_delivery_cost: '', delivery_provider: '', delivery_note: '' });

  const load = useCallback(async () => {
    try {
      const data = await fetchDeliveries({ status: statusFilter });
      setDeliveries(data);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load deliveries', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = async () => {
    if (!editDelivery) return;
    setSaving(true);
    try {
      const cost = parseFloat(editForm.actual_delivery_cost) || 0;
      await updateDelivery(editDelivery.id, { delivery_status: editForm.delivery_status, actual_delivery_cost: cost, delivery_provider: editForm.delivery_provider.trim() || null, delivery_note: editForm.delivery_note.trim() || null });
      toast('Delivery updated', 'success');
      setEditDelivery(null);
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update delivery', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (d: Delivery) => {
    setEditDelivery(d);
    setEditForm({ delivery_status: d.delivery_status, actual_delivery_cost: String(d.actual_delivery_cost), delivery_provider: d.delivery_provider ?? '', delivery_note: d.delivery_note ?? '' });
  };

  if (loading) return <LoadingPage message="Loading deliveries..." />;

  return (
    <div>
      <PageHeader title="Deliveries" subtitle={`${deliveries.length} deliveries`} />

      <div className="mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-600 rounded-lg bg-slate-700/50 text-slate-100 outline-none focus:border-blue-500">
          <option value="all">All Statuses</option>
          {Object.entries(DELIVERY_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {deliveries.length === 0 ? (
        <Card><EmptyState icon={<Truck className="w-8 h-8" />} title="No Deliveries" message="Deliveries are created automatically when a sale includes a delivery charge." /></Card>
      ) : (
        <Card>
          <div className="divide-y divide-slate-700/30">
            {deliveries.map((d) => {
              const profit = d.customer_delivery_charge - d.actual_delivery_cost;
              return (
                <div key={d.id} className="flex items-center justify-between gap-3 p-4 hover:bg-slate-700/40 transition-colors">
                  <button onClick={() => onNavigate('saleDetails', { saleId: d.sale_id })} className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-200">Sale: {d.sale?.invoice_number ?? d.sale_id}</p>
                      <Badge variant={STATUS_VARIANTS[d.delivery_status]}>{DELIVERY_STATUS_LABELS[d.delivery_status]}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      <span>{d.sale?.customer?.name ?? 'Walk-in'}</span><span>·</span><span>{formatDateTime(d.created_at)}</span>
                    </div>
                    {d.delivery_address && <p className="text-xs text-slate-500 mt-0.5 truncate">{d.delivery_address}</p>}
                    <div className="flex gap-3 mt-1 text-xs">
                      <span className="text-slate-400">Charge: {formatCurrency(d.customer_delivery_charge)}</span>
                      <span className="text-slate-400">Cost: {formatCurrency(d.actual_delivery_cost)}</span>
                      <span className={profit >= 0 ? 'text-emerald-400' : 'text-red-400'}>P/L: {formatCurrency(profit)}</span>
                    </div>
                  </button>
                  <button onClick={() => openEdit(d)} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-lg transition-colors" title="Edit"><Eye className="w-4 h-4" /></button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Modal open={!!editDelivery} onClose={() => setEditDelivery(null)} title="Update Delivery">
        {editDelivery && (
          <div className="flex flex-col gap-4">
            <div className="bg-slate-700/40 rounded-lg p-3">
              <p className="text-xs text-slate-400">Delivery charge: {formatCurrency(editDelivery.customer_delivery_charge)}</p>
              <p className="text-xs text-slate-400 mt-0.5">Customer: {editDelivery.sale_id}</p>
            </div>
            <Select label="Status" value={editForm.delivery_status} onChange={(e) => setEditForm((p) => ({ ...p, delivery_status: e.target.value as DeliveryStatus }))}>{Object.entries(DELIVERY_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
            <Input label="Actual Delivery Cost" type="number" step="any" min="0" value={editForm.actual_delivery_cost} onChange={(e) => setEditForm((p) => ({ ...p, actual_delivery_cost: e.target.value }))} placeholder="0" />
            <Input label="Delivery Provider" value={editForm.delivery_provider} onChange={(e) => setEditForm((p) => ({ ...p, delivery_provider: e.target.value }))} placeholder="e.g. Pathao, Steadfast" />
            <Input label="Note" value={editForm.delivery_note} onChange={(e) => setEditForm((p) => ({ ...p, delivery_note: e.target.value }))} placeholder="Optional note" />
            <div className="flex gap-3 justify-end"><Button variant="secondary" onClick={() => setEditDelivery(null)}>Cancel</Button><Button onClick={handleUpdate} disabled={saving}>{saving ? 'Saving...' : 'Update'}</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
