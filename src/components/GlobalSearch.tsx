import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, X, Package, Users, Truck, Receipt, ShoppingCart } from 'lucide-react';
import type { Route } from '@/components/AppShell';

interface SearchResult {
  type: 'product' | 'customer' | 'supplier' | 'sale' | 'purchase';
  id: string;
  label: string;
  subtitle: string;
  route: Route;
  routeParam: { productId?: string; customerId?: string; saleId?: string; purchaseId?: string; supplierId?: string };
}

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (route: Route, params?: { productId?: string; customerId?: string; saleId?: string; purchaseId?: string; supplierId?: string }) => void;
}

export function GlobalSearch({ open, onClose, onNavigate }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const [prods, custs, sups, sales, purs] = await Promise.all([
        supabase.from('products').select('id, name, sku').ilike('name', `%${q}%`).limit(5),
        supabase.from('customers').select('id, name, phone').ilike('name', `%${q}%`).limit(5),
        supabase.from('suppliers').select('id, name, phone').ilike('name', `%${q}%`).limit(5),
        supabase.from('sales').select('id, invoice_number, sale_date').ilike('invoice_number', `%${q}%`).limit(5),
        supabase.from('purchases').select('id, purchase_number, purchase_date').ilike('purchase_number', `%${q}%`).limit(5),
      ]);

      const all: SearchResult[] = [];
      for (const p of prods.data ?? []) all.push({ type: 'product', id: p.id, label: p.name, subtitle: p.sku ?? 'Product', route: 'productDetails', routeParam: { productId: p.id } });
      for (const c of custs.data ?? []) all.push({ type: 'customer', id: c.id, label: c.name, subtitle: c.phone ?? 'Customer', route: 'customerDetails', routeParam: { customerId: c.id } });
      for (const s of sups.data ?? []) all.push({ type: 'supplier', id: s.id, label: s.name, subtitle: s.phone ?? 'Supplier', route: 'supplierDetails', routeParam: { supplierId: s.id } });
      for (const s of sales.data ?? []) all.push({ type: 'sale', id: s.id, label: s.invoice_number, subtitle: 'Sale', route: 'saleDetails', routeParam: { saleId: s.id } });
      for (const p of purs.data ?? []) all.push({ type: 'purchase', id: p.id, label: p.purchase_number, subtitle: 'Purchase', route: 'purchaseDetails', routeParam: { purchaseId: p.id } });
      setResults(all);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 250);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  if (!open) return null;

  const handleResultClick = (r: SearchResult) => {
    onNavigate(r.route, r.routeParam);
    onClose();
  };

  const icons = {
    product: <Package className="w-4 h-4 text-amber-400" />,
    customer: <Users className="w-4 h-4 text-blue-400" />,
    supplier: <Truck className="w-4 h-4 text-purple-400" />,
    sale: <ShoppingCart className="w-4 h-4 text-emerald-400" />,
    purchase: <Receipt className="w-4 h-4 text-sky-400" />,
  };

  const typeLabels: Record<SearchResult['type'], string> = {
    product: 'Products', customer: 'Customers', supplier: 'Suppliers', sale: 'Sales', purchase: 'Purchases',
  };

  const grouped = results.reduce((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 w-full max-w-lg rounded-xl shadow-xl border border-slate-700 animate-slide-up overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-slate-700">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, customers, suppliers, invoices..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
          />
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-slate-400">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">
              {query.length < 2 ? 'Type at least 2 characters' : 'No results found'}
            </div>
          ) : (
            Object.entries(grouped).map(([type, items]) => (
              <div key={type}>
                <p className="px-4 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-700/30">
                  {typeLabels[type as SearchResult['type']]}
                </p>
                {items.map((r) => (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => handleResultClick(r)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-700/40 transition-colors text-left"
                  >
                    {icons[r.type]}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{r.label}</p>
                      <p className="text-xs text-slate-400 truncate">{r.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
