import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card, Button, Input, Badge } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState, LoadingPage } from '@/components/ui/Feedback';
import {
  fetchCustomers,
  createCustomer,
  updateCustomer,
} from '@/services/customers';
import type { CustomerWithDue } from '@/types';
import { formatCurrency } from '@/types';
import {
  Plus,
  Users,
  Search,
  Pencil,
  Power,
  Eye,
  Phone,
  MapPin,
} from 'lucide-react';
import type { Route } from '@/components/AppShell';

interface Props {
  onNavigate: (route: Route, params?: { customerId?: string }) => void;
}

export function Customers({ onNavigate }: Props) {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<CustomerWithDue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerWithDue | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<CustomerWithDue | null>(null);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    opening_due: '',
  });

  const load = useCallback(async () => {
    try {
      const data = await fetchCustomers({ activeOnly: true });
      setCustomers(data);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = search
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.phone ?? '').includes(search) ||
          (c.email ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : customers;

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', phone: '', email: '', address: '', notes: '', opening_due: '' });
    setFormOpen(true);
  };

  const openEdit = (c: CustomerWithDue) => {
    setEditing(c);
    setForm({
      name: c.name,
      phone: c.phone ?? '',
      email: c.email ?? '',
      address: c.address ?? '',
      notes: c.notes ?? '',
      opening_due: '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast('Customer name is required', 'error');
      return;
    }
    const openingDue = parseFloat(form.opening_due) || 0;
    if (openingDue < 0) {
      toast('Opening due cannot be negative', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateCustomer(editing.id, {
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
        });
        toast('Customer updated successfully', 'success');
      } else {
        await createCustomer({
          name: form.name.trim(),
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          address: form.address.trim() || undefined,
          notes: form.notes.trim() || undefined,
          opening_due: openingDue,
        });
        toast('Customer added successfully', 'success');
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save customer', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirmDeactivate) return;
    try {
      await updateCustomer(confirmDeactivate.id, { is_active: false });
      toast('Customer deactivated', 'success');
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to deactivate customer', 'error');
    }
  };

  if (loading) return <LoadingPage message="Loading customers..." />;

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${filtered.length} of ${customers.length} customers`}
        action={
          <Button onClick={openAdd} size="md">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Customer</span>
          </Button>
        }
      />

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-600 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title={customers.length === 0 ? 'No Customers Yet' : 'No Matching Customers'}
            message={
              customers.length === 0
                ? 'Add your first customer to start recording sales and tracking dues.'
                : 'Try adjusting your search.'
            }
            action={
              customers.length === 0 ? (
                <Button onClick={openAdd}>
                  <Plus className="w-4 h-4" />
                  Add Customer
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-slate-700/30">
            {filtered.map((customer) => (
              <div
                key={customer.id}
                className="flex items-center justify-between gap-3 p-4 hover:bg-slate-700/40 transition-colors"
              >
                <button
                  onClick={() => onNavigate('customerDetails', { customerId: customer.id })}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-200 truncate">{customer.name}</p>
                    {customer.current_due > 0 ? (
                      <Badge variant="danger">Due: {formatCurrency(customer.current_due)}</Badge>
                    ) : customer.current_due < 0 ? (
                      <Badge variant="info">Advance: {formatCurrency(Math.abs(customer.current_due))}</Badge>
                    ) : (
                      <Badge variant="success">Clear</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    {customer.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {customer.phone}
                      </span>
                    )}
                    {customer.address && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3" />
                        {customer.address}
                      </span>
                    )}
                  </div>
                </button>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => onNavigate('customerDetails', { customerId: customer.id })}
                    className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEdit(customer)}
                    className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDeactivate(customer)}
                    className="p-2 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                    title="Deactivate"
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Customer' : 'Add Customer'}
        size="lg"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Name *"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Customer name"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="Phone number"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="Email address"
            />
          </div>
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            placeholder="Customer address"
          />
          {!editing && (
            <Input
              label="Opening Due (amount customer already owes)"
              type="number"
              step="any"
              min="0"
              value={form.opening_due}
              onChange={(e) => setForm((p) => ({ ...p, opening_due: e.target.value }))}
              placeholder="0"
            />
          )}
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Optional notes about this customer"
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update Customer' : 'Add Customer'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDeactivate}
        onClose={() => setConfirmDeactivate(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Customer"
        message={`Deactivate "${confirmDeactivate?.name}"? Their transaction history is preserved. You can reactivate later.`}
        confirmLabel="Deactivate"
        danger
      />
    </div>
  );
}
