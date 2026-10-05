import { supabase } from '@/lib/supabase';

export interface DateRange {
  start: string;
  end: string;
}

export type DatePreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'all';

export function getDateRange(preset: DatePreset): DateRange | null {
  if (preset === 'all') return null;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  switch (preset) {
    case 'today':
      return { start: todayStart.toISOString(), end: todayEnd.toISOString() };
    case 'yesterday': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { start: start.toISOString(), end: end.toISOString() };
    }
    case 'this_week': {
      const day = now.getDay();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
      return { start: start.toISOString(), end: todayEnd.toISOString() };
    }
    case 'this_month':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
      };
    case 'last_month':
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
        end: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      };
    case 'this_year':
      return {
        start: new Date(now.getFullYear(), 0, 1).toISOString(),
        end: new Date(now.getFullYear() + 1, 0, 1).toISOString(),
      };
    default:
      return null;
  }
}

export interface SalesReport {
  totalSales: number;
  totalDiscount: number;
  totalDeliveryCharge: number;
  saleCount: number;
  totalPaid: number;
  totalDue: number;
}

export async function fetchSalesReport(range: DateRange | null): Promise<SalesReport> {
  let query = supabase.from('sales').select('total, discount, delivery_charge, paid_amount, due_amount, status').eq('status', 'completed');
  if (range) {
    query = query.gte('sale_date', range.start).lt('sale_date', range.end);
  }
  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  return {
    totalSales: rows.reduce((s, r) => s + Number(r.total), 0),
    totalDiscount: rows.reduce((s, r) => s + Number(r.discount), 0),
    totalDeliveryCharge: rows.reduce((s, r) => s + Number(r.delivery_charge), 0),
    saleCount: rows.length,
    totalPaid: rows.reduce((s, r) => s + Number(r.paid_amount), 0),
    totalDue: rows.reduce((s, r) => s + Number(r.due_amount), 0),
  };
}

export interface PurchaseReport {
  totalPurchases: number;
  totalDiscount: number;
  purchaseCount: number;
  totalPaid: number;
  totalPayable: number;
}

export async function fetchPurchaseReport(range: DateRange | null): Promise<PurchaseReport> {
  let query = supabase.from('purchases').select('total, discount, paid_amount, payable_amount, status').eq('status', 'completed');
  if (range) {
    query = query.gte('purchase_date', range.start).lt('purchase_date', range.end);
  }
  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  return {
    totalPurchases: rows.reduce((s, r) => s + Number(r.total), 0),
    totalDiscount: rows.reduce((s, r) => s + Number(r.discount), 0),
    purchaseCount: rows.length,
    totalPaid: rows.reduce((s, r) => s + Number(r.paid_amount), 0),
    totalPayable: rows.reduce((s, r) => s + Number(r.payable_amount), 0),
  };
}

export interface ExpenseReport {
  totalExpenses: number;
  byCategory: Record<string, number>;
  count: number;
}

export async function fetchExpenseReport(range: DateRange | null): Promise<ExpenseReport> {
  let query = supabase.from('expenses').select('amount, category');
  if (range) {
    query = query.gte('expense_date', range.start).lt('expense_date', range.end);
  }
  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  const byCategory: Record<string, number> = {};
  for (const r of rows) {
    byCategory[r.category] = (byCategory[r.category] ?? 0) + Number(r.amount);
  }
  return {
    totalExpenses: rows.reduce((s, r) => s + Number(r.amount), 0),
    byCategory,
    count: rows.length,
  };
}

export interface ProfitLossReport {
  netSales: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  deliveryIncome: number;
  deliveryCost: number;
  netProfit: number;
}

export async function fetchProfitLossReport(range: DateRange | null): Promise<ProfitLossReport> {
  const [salesReport, expenseReport] = await Promise.all([
    fetchSalesReport(range),
    fetchExpenseReport(range),
  ]);

  // Calculate COGS from sale_items
  let saleIds: string[] = [];
  if (range) {
    const { data: sales } = await supabase
      .from('sales')
      .select('id')
      .eq('status', 'completed')
      .gte('sale_date', range.start)
      .lt('sale_date', range.end);
    saleIds = (sales ?? []).map((s) => s.id);
  } else {
    const { data: sales } = await supabase
      .from('sales')
      .select('id')
      .eq('status', 'completed');
    saleIds = (sales ?? []).map((s) => s.id);
  }

  let cogs = 0;
  if (saleIds.length > 0) {
    const { data: items } = await supabase
      .from('sale_items')
      .select('product_id, quantity')
      .in('sale_id', saleIds);
    if (items && items.length > 0) {
      const productIds = [...new Set(items.map((i) => i.product_id))];
      const { data: products } = await supabase
        .from('products')
        .select('id, cost_price')
        .in('id', productIds);
      const costMap = new Map<string, number>();
      for (const p of products ?? []) costMap.set(p.id, Number(p.cost_price));
      for (const si of items) cogs += Number(si.quantity) * (costMap.get(si.product_id) ?? 0);
    }
  }

  // Delivery costs
  let deliveryCost = 0;
  let deliveryQuery = supabase.from('deliveries').select('actual_delivery_cost');
  if (range) {
    deliveryQuery = deliveryQuery.gte('created_at', range.start).lt('created_at', range.end);
  }
  const { data: deliveries } = await deliveryQuery;
  deliveryCost = (deliveries ?? []).reduce((s, d) => s + Number(d.actual_delivery_cost), 0);

  const netSales = salesReport.totalSales - salesReport.totalDiscount;
  const grossProfit = netSales - cogs;
  const operatingExpenses = expenseReport.totalExpenses;
  const deliveryIncome = salesReport.totalDeliveryCharge;
  const netProfit = grossProfit - operatingExpenses + deliveryIncome - deliveryCost;

  return {
    netSales,
    cogs,
    grossProfit,
    operatingExpenses,
    deliveryIncome,
    deliveryCost,
    netProfit,
  };
}

export interface ProductPerformanceRow {
  productId: string;
  name: string;
  unit: string;
  unitsSold: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  margin: number;
  currentStock: number;
  stockValue: number;
}

export async function fetchProductPerformanceReport(range: DateRange | null): Promise<ProductPerformanceRow[]> {
  // Get sale items within range
  let saleIdQuery = supabase.from('sales').select('id').eq('status', 'completed');
  if (range) {
    saleIdQuery = saleIdQuery.gte('sale_date', range.start).lt('sale_date', range.end);
  }
  const { data: sales } = await saleIdQuery;
  const saleIds = (sales ?? []).map((s) => s.id);
  if (saleIds.length === 0) return [];

  const { data: items, error } = await supabase
    .from('sale_items')
    .select('product_id, quantity, selling_price, discount, line_total')
    .in('sale_id', saleIds);
  if (error) throw error;

  const productIds = [...new Set((items ?? []).map((i) => i.product_id))];
  if (productIds.length === 0) return [];

  const { data: products } = await supabase
    .from('products')
    .select('id, name, unit, cost_price')
    .in('id', productIds);
  const prodMap = new Map<string, { name: string; unit: string; cost_price: number }>();
  for (const p of products ?? []) prodMap.set(p.id, { name: p.name, unit: p.unit, cost_price: Number(p.cost_price) });

  // Get current stock for each product
  const { data: movements } = await supabase
    .from('stock_movements')
    .select('product_id, quantity')
    .in('product_id', productIds);
  const stockMap = new Map<string, number>();
  for (const m of movements ?? []) {
    stockMap.set(m.product_id, (stockMap.get(m.product_id) ?? 0) + Number(m.quantity));
  }

  // Aggregate per product
  const aggMap = new Map<string, { unitsSold: number; revenue: number; cogs: number }>();
  for (const si of items ?? []) {
    const prod = prodMap.get(si.product_id);
    if (!prod) continue;
    const existing = aggMap.get(si.product_id) ?? { unitsSold: 0, revenue: 0, cogs: 0 };
    existing.unitsSold += Number(si.quantity);
    existing.revenue += Number(si.line_total);
    existing.cogs += Number(si.quantity) * prod.cost_price;
    aggMap.set(si.product_id, existing);
  }

  const rows: ProductPerformanceRow[] = [];
  for (const [productId, agg] of aggMap) {
    const prod = prodMap.get(productId);
    if (!prod) continue;
    const grossProfit = agg.revenue - agg.cogs;
    const margin = agg.revenue > 0 ? (grossProfit / agg.revenue) * 100 : 0;
    const currentStock = stockMap.get(productId) ?? 0;
    rows.push({
      productId,
      name: prod.name,
      unit: prod.unit,
      unitsSold: agg.unitsSold,
      revenue: agg.revenue,
      cogs: agg.cogs,
      grossProfit,
      margin,
      currentStock,
      stockValue: currentStock * prod.cost_price,
    });
  }

  return rows.sort((a, b) => b.revenue - a.revenue);
}

export interface SalesChartPoint {
  date: string;
  label: string;
  total: number;
}

export async function fetchSalesChart(period: 'today' | '7d' | '30d' | '12m'): Promise<SalesChartPoint[]> {
  const now = new Date();
  const points: SalesChartPoint[] = [];

  if (period === 'today') {
    for (let h = 0; h < 24; h++) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h + 1, 0, 0);
      const { data } = await supabase
        .from('sales')
        .select('total')
        .eq('status', 'completed')
        .gte('sale_date', start.toISOString())
        .lt('sale_date', end.toISOString());
      const total = (data ?? []).reduce((s, r) => s + Number(r.total), 0);
      points.push({ date: start.toISOString(), label: `${h}:00`, total });
    }
  } else if (period === '7d' || period === '30d') {
    const days = period === '7d' ? 7 : 30;
    for (let d = days - 1; d >= 0; d--) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d + 1);
      const { data } = await supabase
        .from('sales')
        .select('total')
        .eq('status', 'completed')
        .gte('sale_date', start.toISOString())
        .lt('sale_date', end.toISOString());
      const total = (data ?? []).reduce((s, r) => s + Number(r.total), 0);
      points.push({
        date: start.toISOString(),
        label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total,
      });
    }
  } else if (period === '12m') {
    for (let m = 11; m >= 0; m--) {
      const start = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);
      const { data } = await supabase
        .from('sales')
        .select('total')
        .eq('status', 'completed')
        .gte('sale_date', start.toISOString())
        .lt('sale_date', end.toISOString());
      const total = (data ?? []).reduce((s, r) => s + Number(r.total), 0);
      points.push({
        date: start.toISOString(),
        label: start.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        total,
      });
    }
  }

  return points;
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const csvContent = [
    headers.join(','),
    ...rows.map((r) => r.map((c) => {
      const str = String(c);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
