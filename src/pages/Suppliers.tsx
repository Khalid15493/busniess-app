import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card, Button, Input, Badge } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState, LoadingPage } from '@/components/ui/Feedback';
import { fetchSuppliers, createSupplier, updateSupplier } from '@/services/suppliers';
import type { SupplierWithPayable } from '@/types';
import { formatCurrency } from '@/types';
import { Plus, Truck, Search, Pencil, Power, Eye, Phone, MapPin } from 'lucide-react';
import type { Route } from '@/components/AppShell';

interface Props {
  onNavigate: (route: Route, params?: { supplierId?: string }) => void;
}

export function Suppliers({ onNavigate }: Props) {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<SupplierWithPayable[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierWithPayable | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<SupplierWithPayable | null>(null);

  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '', opening_payable: '' });

  const load = useCallback(async () => {
    try {
      const data = await fetchSuppliers({ activeOnly: true });
      setSuppliers(data);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load suppliers', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? suppliers.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || (s.phone ?? '').includes(search))
    : suppliers;

  const openAdd = () => { setEditing(null); setForm({ name: '', phone: '', email: '', address: '', notes: '', opening_payable: '' }); setFormOpen(true); };
  const openEdit = (s: SupplierWithPayable) => { setEditing(s); setForm({ name: s.name, phone: s.phone ?? '', email: s.email ?? '', address: s.address ?? '', notes: s.notes ?? '', opening_payable: '' }); setFormOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast('Supplier name is required', 'error'); return; }
    const openingPayable = parseFloat(form.opening_payable) || 0;
    if (openingPayable < 0) { toast('Opening payable cannot be negative', 'error'); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateSupplier(editing.id, { name: form.name.trim(), phone: form.phone.trim() || null, email: form.email.trim() || null, address: form.address.trim() || null, notes: form.notes.trim() || null });
        toast('Supplier updated successfully', 'success');
      } else {
        await createSupplier({ name: form.name.trim(), phone: form.phone.trim() || undefined, email: form.email.trim() || undefined, address: form.address.trim() || undefined, notes: form.notes.trim() || undefined, opening_payable: openingPayable });
        toast('Supplier added successfully', 'success');
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save supplier', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirmDeactivate) return;
    try {
      await updateSupplier(confirmDeactivate.id, { is_active: false });
      toast('Supplier deactivated', 'success');
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to deactivate supplier', 'error');
    }
  };

  if (loading) return <LoadingPage message="Loading suppliers..." />;

  return (
    <div>
      <PageHeader title="Suppliers" subtitle={`${filtered.length} of ${suppliers.length} suppliers`} action={<Button onClick={openAdd} size="md"><Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Supplier</span></Button>} />

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input type="text" placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-600 rounded-lg bg-slate-700/50 text-slate-100 placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
      </div>

      {filtered.length === 0 ? (
        <Card><EmptyState icon={<Truck className="w-8 h-8" />} title={suppliers.length === 0 ? 'No Suppliers Yet' : 'No Matching Suppliers'} message={suppliers.length === 0 ? 'Add your first supplier to start tracking purchases and payables.' : 'Try adjusting your search.'} action={suppliers.length === 0 ? <Button onClick={openAdd}><Plus className="w-4 h-4" />Add Supplier</Button> : undefined} /></Card>
      ) : (
        <Card>
          <div className="divide-y divide-slate-700/30">
            {filtered.map((supplier) => (
              <div key={supplier.id} className="flex items-center justify-between gap-3 p-4 hover:bg-slate-700/40 transition-colors">
                <button onClick={() => onNavigate('supplierDetails', { supplierId: supplier.id })} className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-200 truncate">{supplier.name}</p>
                    {supplier.current_payable > 0 ? <Badge variant="danger">Payable: {formatCurrency(supplier.current_payable)}</Badge> : <Badge variant="success">Clear</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    {supplier.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{supplier.phone}</span>}
                    {supplier.address && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" />{supplier.address}</span>}
                  </div>
                </button>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => onNavigate('supplierDetails', { supplierId: supplier.id })} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-lg transition-colors" title="View Details"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => openEdit(supplier)} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-lg transition-colors" title="Edit"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => setConfirmDeactivate(supplier)} className="p-2 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors" title="Deactivate"><Power className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Supplier' : 'Add Supplier'} size="lg">
        <div className="flex flex-col gap-4">
          <Input label="Name *" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Supplier name" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone number" />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email address" />
          </div>
          <Input label="Address" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder="Supplier address" />
          {!editing && <Input label="Opening Payable (amount you already owe)" type="number" step="any" min="0" value={form.opening_payable} onChange={(e) => setForm((p) => ({ ...p, opening_payable: e.target.value }))} placeholder="0" />}
          <Input label="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Supplier' : 'Add Supplier'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDeactivate} onClose={() => setConfirmDeactivate(null)} onConfirm={handleDeactivate} title="Deactivate Supplier" message={`Deactivate "${confirmDeactivate?.name}"? Transaction history is preserved. You can reactivate later.`} confirmLabel="Deactivate" danger />
    </div>
  );
}
