import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card, Button, Badge } from '@/components/ui';
import { EmptyState, LoadingPage } from '@/components/ui/Feedback';
import { fetchPurchases } from '@/services/purchases';
import type { Purchase } from '@/types';
import { formatCurrency, formatDateTime } from '@/types';
import { Search, Receipt, Plus, Eye } from 'lucide-react';
import type { Route } from '@/components/AppShell';

interface Props {
  onNavigate: (route: Route, params?: { purchaseId?: string }) => void;
}

export function Purchases({ onNavigate }: Props) {
  const { toast } = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await fetchPurchases();
      setPurchases(data);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load purchases', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? purchases.filter((p) => p.purchase_number.toLowerCase().includes(search.toLowerCase()) || (p.supplier?.name ?? '').toLowerCase().includes(search.toLowerCase()))
    : purchases;

  if (loading) return <LoadingPage message="Loading purchases..." />;

  return (
    <div>
      <PageHeader title="Purchases" subtitle={`${filtered.length} of ${purchases.length} purchases`} action={<Button onClick={() => onNavigate('createPurchase')} size="md"><Plus className="w-4 h-4" /><span className="hidden sm:inline">New Purchase</span></Button>} />

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input type="text" placeholder="Search purchase number or supplier..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-600 rounded-lg bg-slate-700/50 text-slate-100 placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
      </div>

      {filtered.length === 0 ? (
        <Card><EmptyState icon={<Receipt className="w-8 h-8" />} title={purchases.length === 0 ? 'No Purchases Yet' : 'No Matching Purchases'} message={purchases.length === 0 ? 'Create your first purchase to start tracking inventory and supplier payables.' : 'Try adjusting your search.'} action={purchases.length === 0 ? <Button onClick={() => onNavigate('createPurchase')}><Plus className="w-4 h-4" />New Purchase</Button> : undefined} /></Card>
      ) : (
        <Card>
          <div className="divide-y divide-slate-700/30">
            {filtered.map((pur) => (
              <div key={pur.id} className="flex items-center justify-between gap-3 p-4 hover:bg-slate-700/40 transition-colors">
                <button onClick={() => onNavigate('purchaseDetails', { purchaseId: pur.id })} className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-200">{pur.purchase_number}</p>
                    {pur.status === 'cancelled' ? <Badge variant="danger">Cancelled</Badge> : pur.payable_amount > 0 ? <Badge variant="warning">Partial</Badge> : <Badge variant="success">Paid</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400"><span>{pur.supplier?.name ?? 'No supplier'}</span><span>·</span><span>{formatDateTime(pur.purchase_date)}</span></div>
                </button>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right"><p className="text-sm font-semibold text-slate-200">{formatCurrency(pur.total)}</p>{pur.payable_amount > 0 && <p className="text-xs text-red-400">Payable: {formatCurrency(pur.payable_amount)}</p>}</div>
                  <button onClick={() => onNavigate('purchaseDetails', { purchaseId: pur.id })} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-lg transition-colors" title="View Details"><Eye className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
