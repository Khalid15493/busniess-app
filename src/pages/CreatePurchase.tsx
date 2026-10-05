import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Card, Button, Input, Select, Badge } from '@/components/ui';
import { EmptyState, LoadingPage } from '@/components/ui/Feedback';
import { fetchActiveProductsForPurchase, generatePurchaseNumber, createPurchase } from '@/services/purchases';
import { fetchSuppliers } from '@/services/suppliers';
import { fetchAccounts } from '@/services/accounts';
import type { Product, SupplierWithPayable, Account, PaymentMethod } from '@/types';
import { formatCurrency, formatQuantity, PAYMENT_METHOD_LABELS } from '@/types';
import { ArrowLeft, Plus, Trash2, Search, ShoppingCart, Check } from 'lucide-react';
import type { Route } from '@/components/AppShell';

interface Props {
  onNavigate: (route: Route, params?: { purchaseId?: string }) => void;
}

interface CartItem {
  product: Product;
  quantity: number;
  purchasePrice: number;
  discount: number;
  lineTotal: number;
}

export function CreatePurchase({ onNavigate }: Props) {
  const { businessProfile } = useAuth();
  const { toast } = useToast();
  const currency = businessProfile?.currency ?? 'BDT';

  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierWithPayable[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [discount, setDiscount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [purchaseNumber, setPurchaseNumber] = useState('');

  const load = useCallback(async () => {
    try {
      const [prods, sups, accts] = await Promise.all([fetchActiveProductsForPurchase(), fetchSuppliers({ activeOnly: true }), fetchAccounts({ activeOnly: true })]);
      setProducts(prods); setSuppliers(sups); setAccounts(accts);
      setPurchaseNumber(await generatePurchaseNumber(businessProfile?.invoice_prefix ?? 'PUR'));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, businessProfile?.invoice_prefix]);

  useEffect(() => { load(); }, [load]);

  const filteredProducts = search ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())) : products;

  const addToCart = (product: Product) => {
    const existing = cart.find((c) => c.product.id === product.id);
    if (existing) { updateCartItem(product.id, { quantity: existing.quantity + 1 }); return; }
    setCart((prev) => [...prev, { product, quantity: 1, purchasePrice: product.cost_price, discount: 0, lineTotal: product.cost_price }]);
  };

  const updateCartItem = (productId: string, updates: Partial<CartItem>) => {
    setCart((prev) => prev.map((item) => { if (item.product.id !== productId) return item; const u = { ...item, ...updates }; u.lineTotal = u.quantity * u.purchasePrice - u.discount; return u; }));
  };

  const removeFromCart = (productId: string) => setCart((prev) => prev.filter((c) => c.product.id !== productId));

  const subtotal = cart.reduce((sum, c) => sum + c.lineTotal, 0);
  const discountAmount = parseFloat(discount) || 0;
  const total = subtotal - discountAmount;
  const paid = parseFloat(paidAmount) || 0;
  const payable = total - paid;

  const handleConfirm = async () => {
    if (cart.length === 0) { toast('Add at least one product', 'error'); return; }
    for (const item of cart) {
      if (item.quantity <= 0) { toast(`Quantity must be > 0 for ${item.product.name}`, 'error'); return; }
      if (item.purchasePrice < 0) { toast(`Price cannot be negative for ${item.product.name}`, 'error'); return; }
    }
    if (discountAmount > subtotal) { toast('Discount cannot exceed subtotal', 'error'); return; }
    if (paid > total) { toast('Paid amount cannot exceed total', 'error'); return; }
    setSaving(true);
    try {
      const result = await createPurchase({ supplier_id: supplierId || null, purchase_number: purchaseNumber, subtotal, discount: discountAmount, total, paid_amount: paid, payable_amount: payable, payment_method: paymentMethod, notes: notes.trim() || undefined, account_id: accountId || undefined, items: cart.map((c) => ({ product_id: c.product.id, quantity: c.quantity, unit: c.product.unit, purchase_price: c.purchasePrice, discount: c.discount, line_total: c.lineTotal })) });
      toast('Purchase created successfully', 'success');
      onNavigate('purchaseDetails', { purchaseId: result.purchase.id });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create purchase', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingPage message="Preparing purchase..." />;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => onNavigate('purchases')} className="p-2 -ml-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <div><h1 className="text-2xl font-bold text-slate-100">New Purchase</h1><p className="text-sm text-slate-400 mt-1">Purchase #: {purchaseNumber}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-600 rounded-lg bg-slate-700/50 text-slate-100 placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          </div>
          {filteredProducts.length === 0 ? <Card><EmptyState icon={<ShoppingCart className="w-8 h-8" />} title="No Products" message="No active products found." /></Card> : (
            <Card><div className="divide-y divide-slate-700/30 max-h-96 overflow-y-auto">
              {filteredProducts.map((product) => (
                <button key={product.id} onClick={() => addToCart(product)} className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-slate-700/40 transition-colors">
                  <div className="min-w-0"><p className="text-sm font-medium text-slate-200 truncate">{product.name}</p><p className="text-xs text-slate-400 mt-0.5">{formatCurrency(product.cost_price, currency)} / {product.unit}</p></div>
                  <Plus className="w-4 h-4 text-slate-500 flex-shrink-0" />
                </button>
              ))}
            </div></Card>
          )}
        </div>

        <div>
          <Card className="mb-4">
            <div className="p-4 border-b border-slate-700/50"><h2 className="text-base font-semibold text-slate-200">Items ({cart.length})</h2></div>
            {cart.length === 0 ? <EmptyState icon={<ShoppingCart className="w-8 h-8" />} title="Empty Cart" message="Select products from the left." /> : (
              <div className="divide-y divide-slate-700/30">
                {cart.map((item) => (
                  <div key={item.product.id} className="p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-medium text-slate-200 truncate">{item.product.name}</p>
                      <button onClick={() => removeFromCart(item.product.id)} className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div><label className="text-[10px] text-slate-400">Qty ({item.product.unit})</label><input type="number" step="any" min="0" value={item.quantity} onChange={(e) => updateCartItem(item.product.id, { quantity: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1.5 text-sm border border-slate-600 rounded bg-slate-700/50 text-slate-100 outline-none focus:border-blue-500" /></div>
                      <div><label className="text-[10px] text-slate-400">Price</label><input type="number" step="any" min="0" value={item.purchasePrice} onChange={(e) => updateCartItem(item.product.id, { purchasePrice: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1.5 text-sm border border-slate-600 rounded bg-slate-700/50 text-slate-100 outline-none focus:border-blue-500" /></div>
                      <div><label className="text-[10px] text-slate-400">Disc</label><input type="number" step="any" min="0" value={item.discount} onChange={(e) => updateCartItem(item.product.id, { discount: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1.5 text-sm border border-slate-600 rounded bg-slate-700/50 text-slate-100 outline-none focus:border-blue-500" /></div>
                    </div>
                    <div className="flex items-center justify-between mt-2"><span className="text-[10px] text-slate-500">Cost: {formatCurrency(item.product.cost_price, currency)}</span><span className="text-sm font-semibold text-slate-200">{formatCurrency(item.lineTotal, currency)}</span></div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {cart.length > 0 && (
            <Card className="p-4">
              <div className="flex flex-col gap-3">
                <Select label="Supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}><option value="">No supplier</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
                <Input label="Discount (flat)" type="number" step="any" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
                <div className="bg-slate-700/40 rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Subtotal</span><span className="font-medium text-slate-200">{formatCurrency(subtotal, currency)}</span></div>
                  {discountAmount > 0 && <div className="flex justify-between text-sm"><span className="text-slate-400">Discount</span><span className="font-medium text-red-400">-{formatCurrency(discountAmount, currency)}</span></div>}
                  <div className="flex justify-between text-base font-bold border-t border-slate-600 pt-1.5"><span className="text-slate-100">Total</span><span className="text-slate-100">{formatCurrency(total, currency)}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Paid Amount" type="number" step="any" min="0" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} placeholder="0" />
                  <Select label="Payment Method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>{Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
                </div>
                {accounts.length > 0 && <Select label="Pay From Account" value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">No account</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.current_balance, currency)})</option>)}</Select>}
                {payable > 0 && supplierId && <Badge variant="danger">Supplier Payable: {formatCurrency(payable, currency)}</Badge>}
                <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
                <Button onClick={handleConfirm} disabled={saving} size="lg">{saving ? <span>Creating purchase...</span> : <><Check className="w-5 h-5" />Confirm Purchase</>}</Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
