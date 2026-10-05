import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card, Button, Input, Select, Badge } from '@/components/ui';
import { EmptyState, LoadingPage } from '@/components/ui/Feedback';
import {
  fetchActiveProductsForSale,
  fetchProductCurrentStock,
  generateInvoiceNumber,
  createSale,
  fetchCustomerById,
} from '@/services/sales';
import { fetchCustomers } from '@/services/customers';
import type { Product, CustomerWithDue, PaymentMethod } from '@/types';
import { formatCurrency, formatQuantity, PAYMENT_METHOD_LABELS } from '@/types';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  ShoppingCart,
  Check,
} from 'lucide-react';
import type { Route } from '@/components/AppShell';

interface Props {
  onNavigate: (route: Route, params?: { saleId?: string }) => void;
}

interface CartItem {
  product: Product;
  quantity: number;
  sellingPrice: number;
  discount: number;
  lineTotal: number;
  currentStock: number;
}

export function CreateSale({ onNavigate }: Props) {
  const { businessProfile } = useAuth();
  const { toast } = useToast();
  const currency = businessProfile?.currency ?? 'BDT';

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<CustomerWithDue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<string>('');
  const [discount, setDiscount] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  const load = useCallback(async () => {
    try {
      const [prods, custs] = await Promise.all([
        fetchActiveProductsForSale(),
        fetchCustomers({ activeOnly: true }),
      ]);
      setProducts(prods);
      setCustomers(custs);

      const prefix = businessProfile?.invoice_prefix ?? 'INV';
      const invNum = await generateInvoiceNumber(prefix);
      setInvoiceNumber(invNum);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, businessProfile?.invoice_prefix]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredProducts = search
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku ?? '').toLowerCase().includes(search.toLowerCase()))
    : products;

  const addToCart = async (product: Product) => {
    const existing = cart.find((c) => c.product.id === product.id);
    if (existing) {
      updateCartItem(product.id, { quantity: existing.quantity + 1 });
      return;
    }
    try {
      const stock = await fetchProductCurrentStock(product.id);
      setCart((prev) => [
        ...prev,
        {
          product,
          quantity: 1,
          sellingPrice: product.selling_price,
          discount: 0,
          lineTotal: product.selling_price,
          currentStock: stock,
        },
      ]);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to check stock', 'error');
    }
  };

  const updateCartItem = (productId: string, updates: Partial<CartItem>) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) return item;
        const updated = { ...item, ...updates };
        updated.lineTotal = (updated.quantity * updated.sellingPrice) - updated.discount;
        return updated;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  };

  const subtotal = cart.reduce((sum, c) => sum + c.lineTotal, 0);
  const discountAmount = parseFloat(discount) || 0;
  const deliveryAmount = parseFloat(deliveryCharge) || 0;
  const total = subtotal - discountAmount + deliveryAmount;
  const paid = parseFloat(paidAmount) || 0;
  const due = total - paid;

  const handleConfirm = async () => {
    if (cart.length === 0) {
      toast('Add at least one product to the sale', 'error');
      return;
    }
    for (const item of cart) {
      if (item.quantity <= 0) {
        toast(`Quantity for ${item.product.name} must be greater than 0`, 'error');
        return;
      }
      if (item.sellingPrice < 0) {
        toast(`Price for ${item.product.name} cannot be negative`, 'error');
        return;
      }
      if (item.quantity > item.currentStock) {
        toast(`Insufficient stock for ${item.product.name}. Available: ${formatQuantity(item.currentStock, item.product.unit)}`, 'error');
        return;
      }
    }
    if (discountAmount > subtotal) {
      toast('Discount cannot exceed subtotal', 'error');
      return;
    }
    if (paid < 0) {
      toast('Paid amount cannot be negative', 'error');
      return;
    }
    if (paid > total) {
      toast('Paid amount cannot exceed total', 'error');
      return;
    }

    setSaving(true);
    try {
      const result = await createSale({
        customer_id: customerId || null,
        invoice_number: invoiceNumber,
        subtotal,
        discount: discountAmount,
        delivery_charge: deliveryAmount,
        total,
        paid_amount: paid,
        due_amount: due,
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
        items: cart.map((c) => ({
          product_id: c.product.id,
          quantity: c.quantity,
          unit: c.product.unit,
          selling_price: c.sellingPrice,
          discount: c.discount,
          line_total: c.lineTotal,
        })),
      });
      toast('Sale created successfully', 'success');
      onNavigate('saleDetails', { saleId: result.sale.id });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create sale', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingPage message="Preparing sale..." />;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => onNavigate('sales')}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">New Sale</h1>
          <p className="text-sm text-slate-400 mt-1">Invoice: {invoiceNumber}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Selection */}
        <div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-600 rounded-lg bg-slate-700/50 text-slate-100 placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {filteredProducts.length === 0 ? (
            <Card>
              <EmptyState
                icon={<ShoppingCart className="w-8 h-8" />}
                title="No Products"
                message="No active products found. Add products first."
              />
            </Card>
          ) : (
            <Card>
              <div className="divide-y divide-slate-700/30 max-h-96 overflow-y-auto">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-slate-700/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{product.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatCurrency(product.selling_price, currency)} / {product.unit}
                      </p>
                    </div>
                    <Plus className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Cart & Checkout */}
        <div>
          <Card className="mb-4">
            <div className="p-4 border-b border-slate-700/50">
              <h2 className="text-base font-semibold text-slate-200">Cart ({cart.length})</h2>
            </div>
            {cart.length === 0 ? (
              <EmptyState
                icon={<ShoppingCart className="w-8 h-8" />}
                title="Empty Cart"
                message="Select products from the left to add them to the sale."
              />
            ) : (
              <div className="divide-y divide-slate-700/30">
                {cart.map((item) => (
                  <div key={item.product.id} className="p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-medium text-slate-200 truncate">{item.product.name}</p>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400">Qty ({item.product.unit})</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => updateCartItem(item.product.id, { quantity: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 text-sm border border-slate-600 rounded bg-slate-700/50 text-slate-100 outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">Price</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.sellingPrice}
                          onChange={(e) => updateCartItem(item.product.id, { sellingPrice: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 text-sm border border-slate-600 rounded bg-slate-700/50 text-slate-100 outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">Disc</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.discount}
                          onChange={(e) => updateCartItem(item.product.id, { discount: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 text-sm border border-slate-600 rounded bg-slate-700/50 text-slate-100 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-slate-500">Stock: {formatQuantity(item.currentStock, item.product.unit)}</span>
                      <span className="text-sm font-semibold text-slate-200">{formatCurrency(item.lineTotal, currency)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {cart.length > 0 && (
            <Card className="p-4">
              <div className="flex flex-col gap-3">
                <Select
                  label="Customer"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  <option value="">Walk-in Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Discount (flat)"
                    type="number"
                    step="any"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="0"
                  />
                  <Input
                    label="Delivery Charge"
                    type="number"
                    step="any"
                    min="0"
                    value={deliveryCharge}
                    onChange={(e) => setDeliveryCharge(e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="bg-slate-700/40 rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Subtotal</span>
                    <span className="font-medium text-slate-200">{formatCurrency(subtotal, currency)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Discount</span>
                      <span className="font-medium text-red-400">-{formatCurrency(discountAmount, currency)}</span>
                    </div>
                  )}
                  {deliveryAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Delivery</span>
                      <span className="font-medium text-slate-200">+{formatCurrency(deliveryAmount, currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold border-t border-slate-600 pt-1.5">
                    <span className="text-slate-100">Total</span>
                    <span className="text-slate-100">{formatCurrency(total, currency)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Paid Amount"
                    type="number"
                    step="any"
                    min="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="0"
                  />
                  <Select
                    label="Payment Method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  >
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </div>

                {due > 0 && customerId && (
                  <Badge variant="danger">Customer Due: {formatCurrency(due, currency)}</Badge>
                )}
                {due > 0 && !customerId && (
                  <Badge variant="warning">Walk-in sale with due — no customer to track against</Badge>
                )}

                <Input
                  label="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional sale notes"
                />

                <Button onClick={handleConfirm} disabled={saving} size="lg">
                  {saving ? (
                    <span>Creating sale...</span>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Confirm Sale
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
