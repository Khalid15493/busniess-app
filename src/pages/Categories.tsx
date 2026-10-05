import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card, Button, Input, Textarea, Badge, ListItem } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState, LoadingPage } from '@/components/ui/Feedback';
import {
  fetchCategories,
  createCategory,
  updateCategory,
} from '@/services/products';
import type { ProductCategory } from '@/types';
import { Plus, Boxes, Pencil, Power } from 'lucide-react';
import { formatDate } from '@/types';

export function Categories() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<ProductCategory | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', description: '' });
    setModalOpen(true);
  };

  const openEdit = (cat: ProductCategory) => {
    setEditing(cat);
    setForm({ name: cat.name, description: cat.description ?? '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast('Category name is required', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateCategory(editing.id, { name: form.name.trim(), description: form.description.trim() || null });
        toast('Category updated', 'success');
      } else {
        await createCategory({ name: form.name.trim(), description: form.description.trim() || undefined });
        toast('Category created', 'success');
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save category', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (cat: ProductCategory) => {
    try {
      await updateCategory(cat.id, { is_active: !cat.is_active });
      toast(`Category ${!cat.is_active ? 'activated' : 'deactivated'}`, 'success');
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update category', 'error');
    }
  };

  if (loading) return <LoadingPage message="Loading categories..." />;

  const activeCount = categories.filter((c) => c.is_active).length;

  return (
    <div>
      <PageHeader
        title="Product Categories"
        subtitle={`${activeCount} active · ${categories.length} total`}
        action={
          <Button onClick={openAdd} size="md">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Category</span>
          </Button>
        }
      />

      {categories.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Boxes className="w-8 h-8" />}
            title="No Categories Yet"
            message="Create categories to organize your products — like Mushroom, Spawn, or Packaging."
            action={
              <Button onClick={openAdd}>
                <Plus className="w-4 h-4" />
                Add Your First Category
              </Button>
            }
          />
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-slate-700/30">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between gap-3 p-4 hover:bg-slate-700/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-200 truncate">{cat.name}</p>
                    <Badge variant={cat.is_active ? 'success' : 'default'}>
                      {cat.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {cat.description && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{cat.description}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-0.5">Created {formatDate(cat.created_at)}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(cat)}
                    className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmToggle(cat)}
                    className={`p-2 rounded-lg transition-colors ${
                      cat.is_active
                        ? 'text-slate-500 hover:text-amber-400 hover:bg-amber-500/10'
                        : 'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10'
                    }`}
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
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Category' : 'Add Category'}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Category Name *"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Mushroom"
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Optional description for this category"
            rows={3}
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmToggle}
        onClose={() => setConfirmToggle(null)}
        onConfirm={() => { if (confirmToggle) handleToggle(confirmToggle); }}
        title={confirmToggle?.is_active ? 'Deactivate Category' : 'Activate Category'}
        message={
          confirmToggle?.is_active
            ? `Deactivate "${confirmToggle.name}"? You can reactivate it later.`
            : `Activate "${confirmToggle?.name}"? It will be available for use again.`
        }
        confirmLabel={confirmToggle?.is_active ? 'Deactivate' : 'Activate'}
        danger={confirmToggle?.is_active}
      />
    </div>
  );
}
