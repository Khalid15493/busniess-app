import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card, Button, Badge } from '@/components/ui';
import { EmptyState, LoadingPage } from '@/components/ui/Feedback';
import { fetchSales } from '@/services/sales';
import type { Sale, SaleStatus } from '@/types';
import { formatCurrency, formatDateTime } from '@/types';
import { Search, ShoppingCart, Plus, Eye } from 'lucide-react';
import type { Route } from '@/components/AppShell';

interface Props {
  onNavigate: (route: Route, params?: { saleId?: string }) => void;
}

type PaymentFilter = 'all' | 'paid' | 'due' | 'partial';

export function Sales({ onNavigate }: Props) {
  const { toast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SaleStatus | 'all'>('all');
  const [payFilter, setPayFilter] = useState<PaymentFilter>('all');

  const load = useCallback(async () => {
    try {
      const data = await fetchSales({ status: statusFilter });
      setSales(data);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load sales', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = sales.filter((s) => {
    if (search) {
      const q = search.toLowerCase();
      if (!s.invoice_number.toLowerCase().includes(q) && !(s.customer?.name ?? 'walk-in').toLowerCase().includes(q))
        return false;
    }
    if (payFilter === 'paid' && s.due_amount > 0) return false;
    if (payFilter === 'due' && s.due_amount <= 0) return false;
    if (payFilter === 'partial' && !(s.paid_amount > 0 && s.due_amount > 0)) return false;
    return true;
  });

  if (loading) return <LoadingPage message="Loading sales..." />;

  return (
    <div>
      <PageHeader
        title="Sales"
        subtitle={`${filtered.length} of ${sales.length} sales`}
        action={
          <Button onClick={() => onNavigate('createSale')} size="md">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Sale</span>
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search invoice or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-600 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SaleStatus | 'all')}
          className="px-3 py-2.5 text-sm border border-slate-600 rounded-lg bg-slate-800/80 outline-none focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={payFilter}
          onChange={(e) => setPayFilter(e.target.value as PaymentFilter)}
          className="px-3 py-2.5 text-sm border border-slate-600 rounded-lg bg-slate-800/80 outline-none focus:border-blue-500"
        >
          <option value="all">All Payments</option>
          <option value="paid">Fully Paid</option>
          <option value="due">Unpaid</option>
          <option value="partial">Partial</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ShoppingCart className="w-8 h-8" />}
            title={sales.length === 0 ? 'No Sales Yet' : 'No Matching Sales'}
            message={
              sales.length === 0
                ? 'Create your first sale to start tracking revenue and stock.'
                : 'Try adjusting your search or filters.'
            }
            action={
              sales.length === 0 ? (
                <Button onClick={() => onNavigate('createSale')}>
                  <Plus className="w-4 h-4" />
                  New Sale
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-slate-700/30">
            {filtered.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between gap-3 p-4 hover:bg-slate-700/40 transition-colors"
              >
                <button
                  onClick={() => onNavigate('saleDetails', { saleId: sale.id })}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-200">{sale.invoice_number}</p>
                    {sale.status === 'cancelled' ? (
                      <Badge variant="danger">Cancelled</Badge>
                    ) : sale.due_amount <= 0 ? (
                      <Badge variant="success">Paid</Badge>
                    ) : sale.paid_amount > 0 ? (
                      <Badge variant="warning">Partial</Badge>
                    ) : (
                      <Badge variant="danger">Unpaid</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                    <span>{sale.customer?.name ?? 'Walk-in Customer'}</span>
                    <span>·</span>
                    <span>{formatDateTime(sale.sale_date)}</span>
                  </div>
                </button>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-200">{formatCurrency(sale.total)}</p>
                    {sale.due_amount > 0 && (
                      <p className="text-xs text-red-400">Due: {formatCurrency(sale.due_amount)}</p>
                    )}
                  </div>
                  <button
                    onClick={() => onNavigate('saleDetails', { saleId: sale.id })}
                    className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
