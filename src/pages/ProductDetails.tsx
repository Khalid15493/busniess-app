import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Card, Button, Badge } from '@/components/ui';
import { EmptyState, LoadingPage, Spinner } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  fetchProductById,
  fetchStockMovements,
  fetchProductSalesProgress,
  updateProduct,
  createStockAdjustment,
} from '@/services/products';
import type { ProductWithStock, StockMovement } from '@/types';
import type { ProductSalesProgress } from '@/services/products';
import {
  formatCurrency,
  formatQuantity,
  formatDate,
  formatDateTime,
  MOVEMENT_TYPE_LABELS,
} from '@/types';
import {
  ArrowLeft,
  Package,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Power,
} from 'lucide-react';
import type { Route } from '@/components/AppShell';

export function ProductDetails({
  productId,
  onNavigate,
}: {
  productId: string;
  onNavigate: (route: Route, params?: { productId?: string }) => void;
}) {
  const { businessProfile } = useAuth();
  const { toast } = useToast();
  const currency = businessProfile?.currency ?? 'BDT';

  const [product, setProduct] = useState<ProductWithStock | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [salesProgress, setSalesProgress] = useState<ProductSalesProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const [adjustForm, setAdjustForm] = useState({
    direction: 'decrease' as 'increase' | 'decrease',
    quantity: '',
    reason: 'Damage',
    note: '',
  });

  const load = async () => {
    try {
      const [prod, movs, progress] = await Promise.all([
        fetchProductById(productId),
        fetchStockMovements(productId),
        fetchProductSalesProgress(productId),
      ]);
      setProduct(prod);
      setMovements(movs);
      setSalesProgress(progress);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load product', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const handleSaveAdjustment = async () => {
    if (!product) return;
    const qty = parseFloat(adjustForm.quantity);
    if (isNaN(qty) || qty <= 0) {
      toast('Enter a valid quantity greater than 0', 'error');
      return;
    }
    const signedQty = adjustForm.direction === 'decrease' ? -qty : qty;

    if (adjustForm.direction === 'decrease' && product.current_stock - qty < 0) {
      toast(
        `Cannot decrease by ${qty}. Current stock is only ${formatQuantity(product.current_stock, product.unit)}.`,
        'error'
      );
      return;
    }

    setSaving(true);
    try {
      await createStockAdjustment({
        product_id: product.id,
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
    if (!product) return;
    try {
      await updateProduct(product.id, { is_active: false });
      toast('Product deactivated', 'success');
      onNavigate('products');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to deactivate', 'error');
    }
  };

  if (loading) return <LoadingPage message="Loading product..." />;

  if (!product) {
    return (
      <Card>
        <EmptyState
          icon={<Package className="w-8 h-8" />}
          title="Product Not Found"
          message="This product may have been removed."
          action={
            <Button onClick={() => onNavigate('products')}>
              <ArrowLeft className="w-4 h-4" />
              Back to Products
            </Button>
          }
        />
      </Card>
    );
  }

  const statusVariant =
    product.stock_status === 'IN_STOCK'
      ? 'success'
      : product.stock_status === 'LOW_STOCK'
        ? 'warning'
        : 'danger';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => onNavigate('products')}
          className="p-2 -ml-2 text-slate-400 hover:bg-slate-700/50 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-100 truncate">{product.name}</h1>
            <Badge variant={statusVariant}>
              {product.stock_status.replace(/_/g, ' ')}
            </Badge>
          </div>
          {product.category && (
            <p className="text-xs text-slate-400 mt-0.5">{product.category.name}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-4">
        <Button variant="secondary" size="sm" onClick={() => setAdjustOpen(true)}>
          <ArrowUpDown className="w-4 h-4" />
          Stock Adjustment
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirmDeactivate(true)}>
          <Power className="w-4 h-4" />
          Deactivate
        </Button>
      </div>

      {/* Stock Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Card className="p-4">
          <p className="text-xs text-slate-400">Current Stock</p>
          <p className="text-lg font-bold text-slate-100 mt-1">
            {formatQuantity(product.current_stock, product.unit)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-400">Stock Value</p>
          <p className="text-lg font-bold text-slate-100 mt-1">
            {formatCurrency(product.stock_value, currency)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-400">Cost Price</p>
          <p className="text-lg font-bold text-slate-100 mt-1">
            {formatCurrency(product.cost_price, currency)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-400">Selling Price</p>
          <p className="text-lg font-bold text-slate-100 mt-1">
            {formatCurrency(product.selling_price, currency)}
          </p>
        </Card>
      </div>

      {/* Sales Progress */}
      {salesProgress && salesProgress.openingStock > 0 && (
        <Card className="mb-4 p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">Sales Progress</h2>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <p className="text-xs text-slate-400">Opening Stock</p>
              <p className="text-base font-bold text-slate-100 mt-0.5">
                {formatQuantity(salesProgress.openingStock, product.unit)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Sold</p>
              <p className="text-base font-bold text-emerald-400 mt-0.5">
                {formatQuantity(salesProgress.totalSold, product.unit)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Current Stock</p>
              <p className="text-base font-bold text-slate-100 mt-0.5">
                {formatQuantity(salesProgress.currentStock, product.unit)}
              </p>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Sales Progress</span>
              <span className="font-semibold text-slate-200">{salesProgress.salesPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.min(salesProgress.salesPercentage, 100)}%` }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Product Info */}
      <Card className="mb-4">
        <div className="p-4 border-b border-slate-700/50">
          <h2 className="text-sm font-semibold text-slate-200">Product Information</h2>
        </div>
        <div className="divide-y divide-slate-700/30">
          <InfoRow label="SKU" value={product.sku || '—'} />
          <InfoRow label="Unit" value={product.unit} />
          <InfoRow label="Minimum Stock" value={formatQuantity(product.minimum_stock, product.unit)} />
          <InfoRow label="Category" value={product.category?.name ?? 'Uncategorized'} />
          <InfoRow label="Created" value={formatDate(product.created_at)} />
          <InfoRow label="Last Updated" value={formatDate(product.updated_at)} />
        </div>
      </Card>

      {/* Stock Movement History */}
      <Card>
        <div className="p-4 border-b border-slate-700/50">
          <h2 className="text-sm font-semibold text-slate-200">Stock Movement History</h2>
        </div>
        {movements.length === 0 ? (
          <EmptyState
            icon={<ArrowUpDown className="w-8 h-8" />}
            title="No Movements Yet"
            message="Stock movements will appear here once you add opening stock or make adjustments."
          />
        ) : (
          <div className="divide-y divide-slate-700/30">
            {movements.map((mv) => {
              const isPositive = mv.quantity >= 0;
              return (
                <div key={mv.id} className="p-4 flex items-start gap-3">
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                      isPositive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-200">
                        {MOVEMENT_TYPE_LABELS[mv.movement_type]}
                      </p>
                      <span
                        className={`text-sm font-semibold ${
                          isPositive ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {formatQuantity(mv.quantity, product.unit)}
                      </span>
                    </div>
                    {mv.reason && (
                      <p className="text-xs text-slate-400 mt-0.5">Reason: {mv.reason}</p>
                    )}
                    {mv.note && (
                      <p className="text-xs text-slate-500 mt-0.5">{mv.note}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">{formatDateTime(mv.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Stock Adjustment Modal */}
      <Modal open={adjustOpen} onClose={() => setAdjustOpen(false)} title="Stock Adjustment">
        <div className="flex flex-col gap-4">
          <div className="bg-slate-700/40 rounded-lg p-3">
            <p className="text-sm font-medium text-slate-200">{product.name}</p>
            <p className="text-xs text-slate-400 mt-1">
              Current stock: {formatQuantity(product.current_stock, product.unit)}
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
          <div>
            <label className="text-sm font-medium text-slate-300">
              Quantity ({product.unit}) *
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={adjustForm.quantity}
              onChange={(e) => setAdjustForm((p) => ({ ...p, quantity: e.target.value }))}
              placeholder="0"
              className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-600 rounded-lg bg-slate-700/50 text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300">Reason *</label>
            <select
              value={adjustForm.reason}
              onChange={(e) => setAdjustForm((p) => ({ ...p, reason: e.target.value }))}
              className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-600 rounded-lg bg-slate-700/50 text-slate-100 outline-none focus:border-blue-500"
            >
              {['Damage', 'Wastage', 'Loss', 'Correction', 'Found', 'Recount', 'Other'].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300">Note</label>
            <input
              type="text"
              value={adjustForm.note}
              onChange={(e) => setAdjustForm((p) => ({ ...p, note: e.target.value }))}
              placeholder="Optional note"
              className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-600 rounded-lg bg-slate-700/50 text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setAdjustOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAdjustment} disabled={saving}>
              {saving ? <Spinner className="w-5 h-5 border-white" /> : 'Record Adjustment'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDeactivate}
        onClose={() => setConfirmDeactivate(false)}
        onConfirm={handleDeactivate}
        title="Deactivate Product"
        message={`Deactivate "${product.name}"? Historical records will be preserved. You can reactivate it later from Settings.`}
        confirmLabel="Deactivate"
        danger
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-200">{value}</span>
    </div>
  );
}
