import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card, Button, Input, Select, Badge, ListItem } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState, LoadingPage } from '@/components/ui/Feedback';
import {
  fetchProducts,
  fetchCategories,
  createCategory,
  createProduct,
  updateProduct,
  createStockAdjustment,
} from '@/services/products';
import type { ProductCategory, ProductWithStock, Unit } from '@/types';
import {
  UNIT_OPTIONS,
  formatCurrency,
  formatQuantity,
  getStockStatus,
} from '@/types';
import {
  Plus,
  Package,
  Search,
  Pencil,
  Power,
  Eye,
  FlaskConical,
  ArrowUpDown,
} from 'lucide-react';
import type { Route } from '@/components/AppShell';

interface Props {
  onNavigate: (route: Route, params?: { productId?: string }) => void;
}

type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

export function Products({ onNavigate }: Props) {
  const { businessProfile } = useAuth();
  const { toast } = useToast();
  const currency = businessProfile?.currency ?? 'BDT';

  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [editing, setEditing] = useState<ProductWithStock | null>(null);
  const [adjustProduct, setAdjustProduct] = useState<ProductWithStock | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<ProductWithStock | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    category_id: '',
    sku: '',
    unit: 'kg' as Unit,
    cost_price: '',
    selling_price: '',
    minimum_stock: '',
    opening_stock: '',
  });

  const [adjustForm, setAdjustForm] = useState({
    direction: 'decrease' as 'increase' | 'decrease',
    quantity: '',
    reason: 'Damage',
    note: '',
  });

  const load = useCallback(async () => {
    try {
      const [prodData, catData] = await Promise.all([
        fetchProducts({ activeOnly: true }),
        fetchCategories(),
      ]);
      setProducts(prodData);
      setCategories(catData.filter((c) => c.is_active));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = products.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== 'all' && p.category_id !== categoryFilter) return false;
    if (stockFilter !== 'all') {
      if (stockFilter === 'in_stock' && p.stock_status !== 'IN_STOCK') return false;
      if (stockFilter === 'low_stock' && p.stock_status !== 'LOW_STOCK') return false;
      if (stockFilter === 'out_of_stock' && p.stock_status !== 'OUT_OF_STOCK') return false;
    }
    return true;
  });

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: '',
      category_id: '',
      sku: '',
      unit: 'kg',
      cost_price: '',
      selling_price: '',
      minimum_stock: '',
      opening_stock: '',
    });
    setFormOpen(true);
  };

  const openEdit = (p: ProductWithStock) => {
    setEditing(p);
    setForm({
      name: p.name,
      category_id: p.category_id ?? '',
      sku: p.sku ?? '',
      unit: p.unit as Unit,
      cost_price: String(p.cost_price),
      selling_price: String(p.selling_price),
      minimum_stock: String(p.minimum_stock),
      opening_stock: '',
    });
    setFormOpen(true);
  };

  const openAdjust = (p: ProductWithStock) => {
    setAdjustProduct(p);
    setAdjustForm({ direction: 'decrease', quantity: '', reason: 'Damage', note: '' });
    setAdjustOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!form.name.trim()) {
      toast('Product name is required', 'error');
      return;
    }
    if (!form.unit) {
      toast('Unit is required', 'error');
      return;
    }
    const costPrice = parseFloat(form.cost_price) || 0;
    const sellingPrice = parseFloat(form.selling_price) || 0;
    const minimumStock = parseFloat(form.minimum_stock) || 0;
    const openingStock = parseFloat(form.opening_stock) || 0;

    if (costPrice < 0) {
      toast('Cost price cannot be negative', 'error');
      return;
    }
    if (sellingPrice < 0) {
      toast('Selling price cannot be negative', 'error');
      return;
    }
    if (minimumStock < 0) {
      toast('Minimum stock cannot be negative', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateProduct(editing.id, {
          name: form.name.trim(),
          category_id: form.category_id || null,
          sku: form.sku.trim() || null,
          unit: form.unit,
          cost_price: costPrice,
          selling_price: sellingPrice,
          minimum_stock: minimumStock,
        });
        toast('Product updated successfully', 'success');
      } else {
        if (openingStock < 0) {
          toast('Opening stock cannot be negative', 'error');
          setSaving(false);
          return;
        }
        await createProduct({
          name: form.name.trim(),
          category_id: form.category_id || null,
          sku: form.sku.trim() || undefined,
          unit: form.unit,
          cost_price: costPrice,
          selling_price: sellingPrice,
          minimum_stock: minimumStock,
          opening_stock: openingStock,
        });
        toast('Product created successfully', 'success');
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save product', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAdjustment = async () => {
    if (!adjustProduct) return;
    const qty = parseFloat(adjustForm.quantity);
    if (isNaN(qty) || qty <= 0) {
      toast('Enter a valid quantity greater than 0', 'error');
      return;
    }
    const signedQty = adjustForm.direction === 'decrease' ? -qty : qty;

    if (adjustForm.direction === 'decrease') {
      const newStock = adjustProduct.current_stock - qty;
      if (newStock < 0) {
        toast(
          `Cannot decrease by ${qty}. Current stock is only ${formatQuantity(adjustProduct.current_stock, adjustProduct.unit)}.`,
          'error'
        );
        return;
      }
    }

    setSaving(true);
    try {
      await createStockAdjustment({
        product_id: adjustProduct.id,
        quantity: signedQty,
        reason: adjustForm.reason,
        note: adjustForm.note.trim() || undefined,
      });
      toast('Stock adjustment recorded', 'success');
      setAdjustOpen(false);
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create adjustment', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirmDeactivate) return;
    try {
      await updateProduct(confirmDeactivate.id, { is_active: false });
      toast('Product deactivated', 'success');
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to deactivate product', 'error');
    }
  };

  const handleLoadDemo = async () => {
    setSaving(true);
    try {
      const cats = await fetchCategories();
      let mushroomCat = cats.find((c) => c.name === 'Mushroom');
      if (!mushroomCat) {
        mushroomCat = await createCategory({ name: 'Mushroom', description: 'Demo category' });
      }

      const existing = products.filter((p) =>
        ['Oyster Mushroom (Demo)', 'Mushroom Spawn (Demo)', 'Mushroom Bag (Demo)'].includes(p.name)
      );
      if (existing.length > 0) {
        toast('Demo products already exist', 'info');
        setSaving(false);
        return;
      }

      const demoProducts = [
        { name: 'Oyster Mushroom (Demo)', cost_price: 180, selling_price: 300, opening_stock: 25.5, minimum_stock: 5, unit: 'kg' as Unit },
        { name: 'Mushroom Spawn (Demo)', cost_price: 50, selling_price: 80, opening_stock: 100, minimum_stock: 20, unit: 'packet' as Unit },
        { name: 'Mushroom Bag (Demo)', cost_price: 30, selling_price: 50, opening_stock: 50, minimum_stock: 10, unit: 'bag' as Unit },
      ];

      for (const dp of demoProducts) {
        await createProduct({
          name: dp.name,
          category_id: mushroomCat.id,
          unit: dp.unit,
          cost_price: dp.cost_price,
          selling_price: dp.selling_price,
          minimum_stock: dp.minimum_stock,
          opening_stock: dp.opening_stock,
        });
      }
      toast('Demo products loaded successfully', 'success');
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load demo products', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingPage message="Loading products..." />;

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={`${filtered.length} of ${products.length} products`}
        action={
          <div className="flex gap-2">
            {products.length === 0 && (
              <Button variant="secondary" onClick={handleLoadDemo} disabled={saving} size="md">
                <FlaskConical className="w-4 h-4" />
                <span className="hidden sm:inline">Demo Data</span>
              </Button>
            )}
            <Button onClick={openAdd} size="md">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Product</span>
            </Button>
          </div>
        }
      />

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-600 rounded-lg bg-slate-700/50 text-slate-100 placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 text-sm border border-slate-600 rounded-lg bg-slate-800/80 outline-none focus:border-blue-500"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as StockFilter)}
          className="px-3 py-2.5 text-sm border border-slate-600 rounded-lg bg-slate-800/80 outline-none focus:border-blue-500"
        >
          <option value="all">All Stock</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
      </div>

      {/* Product List */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Package className="w-8 h-8" />}
            title={products.length === 0 ? 'No Products Yet' : 'No Matching Products'}
            message={
              products.length === 0
                ? 'Add your first product or load demo data to see how it works.'
                : 'Try adjusting your search or filters.'
            }
            action={
              products.length === 0 ? (
                <div className="flex gap-2 justify-center">
                  <Button variant="secondary" onClick={handleLoadDemo} disabled={saving}>
                    <FlaskConical className="w-4 h-4" />
                    Load Demo Products
                  </Button>
                  <Button onClick={openAdd}>
                    <Plus className="w-4 h-4" />
                    Add Product
                  </Button>
                </div>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-slate-700/30">
            {filtered.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between gap-3 p-4 hover:bg-slate-700/40 transition-colors"
              >
                <button
                  onClick={() => onNavigate('productDetails', { productId: product.id })}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-200 truncate">{product.name}</p>
                    <Badge
                      variant={
                        product.stock_status === 'IN_STOCK'
                          ? 'success'
                          : product.stock_status === 'LOW_STOCK'
                            ? 'warning'
                            : 'danger'
                      }
                    >
                      {product.stock_status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span>{formatQuantity(product.current_stock, product.unit)}</span>
                    <span>·</span>
                    <span>Sell: {formatCurrency(product.selling_price, currency)}</span>
                    <span>·</span>
                    <span>Value: {formatCurrency(product.stock_value, currency)}</span>
                  </div>
                </button>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => openAdjust(product)}
                    className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                    title="Stock Adjustment"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onNavigate('productDetails', { productId: product.id })}
                    className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEdit(product)}
                    className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDeactivate(product)}
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

      {/* Product Form Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Product' : 'Add Product'}
        size="lg"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Product Name *"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Oyster Mushroom"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category"
              value={form.category_id}
              onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Input
              label="SKU"
              value={form.sku}
              onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
              placeholder="Optional"
            />
            <Select
              label="Unit *"
              value={form.unit}
              onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value as Unit }))}
            >
              {UNIT_OPTIONS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </Select>
            <Input
              label="Cost Price"
              type="number"
              step="any"
              min="0"
              value={form.cost_price}
              onChange={(e) => setForm((p) => ({ ...p, cost_price: e.target.value }))}
              placeholder="0"
            />
            <Input
              label="Selling Price"
              type="number"
              step="any"
              min="0"
              value={form.selling_price}
              onChange={(e) => setForm((p) => ({ ...p, selling_price: e.target.value }))}
              placeholder="0"
            />
            <Input
              label="Minimum Stock"
              type="number"
              step="any"
              min="0"
              value={form.minimum_stock}
              onChange={(e) => setForm((p) => ({ ...p, minimum_stock: e.target.value }))}
              placeholder="0"
            />
            {!editing && (
              <Input
                label="Opening Stock"
                type="number"
                step="any"
                min="0"
                value={form.opening_stock}
                onChange={(e) => setForm((p) => ({ ...p, opening_stock: e.target.value }))}
                placeholder="0"
              />
            )}
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProduct} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Stock Adjustment Modal */}
      <Modal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title="Stock Adjustment"
      >
        {adjustProduct && (
          <div className="flex flex-col gap-4">
            <div className="bg-slate-700/40 rounded-lg p-3">
              <p className="text-sm font-medium text-slate-200">{adjustProduct.name}</p>
              <p className="text-xs text-slate-400 mt-1">
                Current stock: {formatQuantity(adjustProduct.current_stock, adjustProduct.unit)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setAdjustForm((p) => ({ ...p, direction: 'decrease' }))}
                className={`py-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                  adjustForm.direction === 'decrease'
                    ? 'border-red-500 bg-red-500/15 text-red-400'
                    : 'border-slate-600 text-slate-400'
                }`}
              >
                Decrease
              </button>
              <button
                onClick={() => setAdjustForm((p) => ({ ...p, direction: 'increase' }))}
                className={`py-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                  adjustForm.direction === 'increase'
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                    : 'border-slate-600 text-slate-400'
                }`}
              >
                Increase
              </button>
            </div>
            <Input
              label={`Quantity (${adjustProduct.unit}) *`}
              type="number"
              step="any"
              min="0"
              value={adjustForm.quantity}
              onChange={(e) => setAdjustForm((p) => ({ ...p, quantity: e.target.value }))}
              placeholder="0"
            />
            <Select
              label="Reason *"
              value={adjustForm.reason}
              onChange={(e) => setAdjustForm((p) => ({ ...p, reason: e.target.value }))}
            >
              {['Damage', 'Wastage', 'Loss', 'Correction', 'Found', 'Recount', 'Other'].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
            <Input
              label="Note"
              value={adjustForm.note}
              onChange={(e) => setAdjustForm((p) => ({ ...p, note: e.target.value }))}
              placeholder="Optional note about this adjustment"
            />
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setAdjustOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveAdjustment} disabled={saving}>
                {saving ? 'Saving...' : 'Record Adjustment'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDeactivate}
        onClose={() => setConfirmDeactivate(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Product"
        message={`Deactivate "${confirmDeactivate?.name}"? It will be hidden from active lists but historical records are preserved. You can reactivate it later.`}
        confirmLabel="Deactivate"
        danger
      />
    </div>
  );
}
