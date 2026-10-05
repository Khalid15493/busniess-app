import { supabase } from '@/lib/supabase';
import type {
  Sale,
  SaleItem,
  Product,
  PaymentMethod,
  Customer,
  SaleStatus,
} from '@/types';

export interface SaleItemInput {
  product_id: string;
  quantity: number;
  unit: string;
  selling_price: number;
  discount: number;
  line_total: number;
}

export interface CreateSaleInput {
  customer_id: string | null;
  invoice_number: string;
  sale_date?: string;
  subtotal: number;
  discount: number;
  delivery_charge: number;
  total: number;
  paid_amount: number;
  due_amount: number;
  payment_method: PaymentMethod;
  notes?: string;
  items: SaleItemInput[];
}

export interface CreateSaleResult {
  sale: Sale;
  saleItems: SaleItem[];
}

export async function generateInvoiceNumber(prefix: string): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  const { data, error } = await supabase
    .from('sales')
    .select('invoice_number')
    .like('invoice_number', `${prefix}${dateStr}%`)
    .order('invoice_number', { ascending: false })
    .limit(1);

  if (error) throw error;

  let seq = 1;
  if (data && data.length > 0) {
    const lastNum = data[0].invoice_number;
    const seqStr = lastNum.slice(prefix.length + dateStr.length);
    seq = parseInt(seqStr, 10) + 1;
  }

  return `${prefix}${dateStr}${String(seq).padStart(3, '0')}`;
}

export async function fetchSales(filters?: {
  search?: string;
  customerId?: string | null;
  status?: SaleStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
}): Promise<Sale[]> {
  let query = supabase
    .from('sales')
    .select('*, customer:customers(*)')
    .order('sale_date', { ascending: false });

  if (filters?.customerId) {
    query = query.eq('customer_id', filters.customerId);
  }
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.dateFrom) {
    query = query.gte('sale_date', filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte('sale_date', filters.dateTo + 'T23:59:59');
  }

  const { data: sales, error } = await query;
  if (error) throw error;
  if (!sales || sales.length === 0) return [];

  let result = sales as unknown as Sale[];

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (s) =>
        s.invoice_number.toLowerCase().includes(q) ||
        (s.customer?.name ?? 'walk-in').toLowerCase().includes(q)
    );
  }

  return result;
}

export async function fetchSaleById(id: string): Promise<Sale | null> {
  const { data: sale, error } = await supabase
    .from('sales')
    .select('*, customer:customers(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!sale) return null;

  const { data: items, error: itemsError } = await supabase
    .from('sale_items')
    .select('*, product:products(*)')
    .eq('sale_id', id)
    .order('created_at', { ascending: true });

  if (itemsError) throw itemsError;

  return {
    ...(sale as unknown as Sale),
    sale_items: (items ?? []) as unknown as SaleItem[],
  };
}

export async function fetchActiveProductsForSale(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });
  if (error) throw error;
  return data as Product[];
}

export async function fetchProductCurrentStock(productId: string): Promise<number> {
  const { data, error } = await supabase
    .from('stock_movements')
    .select('quantity')
    .eq('product_id', productId);
  if (error) throw error;
  return (data ?? []).reduce((sum, m) => sum + Number(m.quantity), 0);
}

export async function createSale(input: CreateSaleInput): Promise<CreateSaleResult> {
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      customer_id: input.customer_id,
      invoice_number: input.invoice_number,
      sale_date: input.sale_date ?? new Date().toISOString(),
      subtotal: input.subtotal,
      discount: input.discount,
      delivery_charge: input.delivery_charge,
      total: input.total,
      paid_amount: input.paid_amount,
      due_amount: input.due_amount,
      payment_method: input.payment_method,
      notes: input.notes ?? null,
      status: 'completed',
    })
    .select()
    .single();
  if (saleError) throw saleError;

  const saleId = (sale as Sale).id;

  const itemRows = input.items.map((item) => ({
    sale_id: saleId,
    product_id: item.product_id,
    quantity: item.quantity,
    unit: item.unit,
    selling_price: item.selling_price,
    discount: item.discount,
    line_total: item.line_total,
  }));

  const { data: saleItems, error: itemsError } = await supabase
    .from('sale_items')
    .insert(itemRows)
    .select('*, product:products(*)');

  if (itemsError) throw itemsError;

  const movementRows = input.items.map((item) => ({
    product_id: item.product_id,
    movement_type: 'SALE' as const,
    quantity: -item.quantity,
    unit_cost: item.selling_price,
    reason: `Sale ${input.invoice_number}`,
    note: `Sold in invoice ${input.invoice_number}`,
    reference_type: 'sale',
    reference_id: saleId,
  }));

  const { error: mvError } = await supabase
    .from('stock_movements')
    .insert(movementRows);
  if (mvError) throw mvError;

  if (input.customer_id) {
    const saleAmount = input.total;
    const { error: txError } = await supabase
      .from('customer_transactions')
      .insert({
        customer_id: input.customer_id,
        sale_id: saleId,
        transaction_type: 'SALE',
        amount: saleAmount,
        payment_method: input.payment_method,
        reference_type: 'sale',
        reference_id: saleId,
        note: `Sale ${input.invoice_number}`,
      });
    if (txError) throw txError;

    if (input.paid_amount > 0) {
      const { error: payTxError } = await supabase
        .from('customer_transactions')
        .insert({
          customer_id: input.customer_id,
          sale_id: saleId,
          transaction_type: 'PAYMENT',
          amount: -input.paid_amount,
          payment_method: input.payment_method,
          reference_type: 'sale_payment',
          reference_id: saleId,
          note: `Payment for ${input.invoice_number}`,
        });
      if (payTxError) throw payTxError;

      const { error: payError } = await supabase
        .from('payments')
        .insert({
          customer_id: input.customer_id,
          sale_id: saleId,
          amount: input.paid_amount,
          payment_method: input.payment_method,
          note: `Payment for ${input.invoice_number}`,
        });
      if (payError) throw payError;
    }
  }

  return {
    sale: sale as Sale,
    saleItems: (saleItems ?? []) as unknown as SaleItem[],
  };
}

export async function fetchSalesSummary(): Promise<{
  todaySales: number;
  todayProfit: number;
  totalReceivable: number;
}> {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const { data: todaySalesData, error } = await supabase
    .from('sales')
    .select('total, paid_amount, sale_date, id')
    .eq('status', 'completed')
    .gte('sale_date', todayStart)
    .lt('sale_date', todayEnd);

  if (error) throw error;

  const todaySalesTotal = (todaySalesData ?? []).reduce((sum, s) => sum + Number(s.total), 0);

  // Calculate COGS for today's sales
  const todaySaleIds = (todaySalesData ?? []).map((s) => s.id);
  let todayCOGS = 0;
  if (todaySaleIds.length > 0) {
    const { data: saleItems } = await supabase
      .from('sale_items')
      .select('product_id, quantity')
      .in('sale_id', todaySaleIds);
    if (saleItems && saleItems.length > 0) {
      const productIds = [...new Set(saleItems.map((si) => si.product_id))];
      const { data: products } = await supabase
        .from('products')
        .select('id, cost_price')
        .in('id', productIds);
      const costMap = new Map<string, number>();
      for (const p of products ?? []) {
        costMap.set(p.id, Number(p.cost_price));
      }
      for (const si of saleItems) {
        todayCOGS += Number(si.quantity) * (costMap.get(si.product_id) ?? 0);
      }
    }
  }

  // Get today's expenses
  const { data: todayExpenses } = await supabase
    .from('expenses')
    .select('amount')
    .gte('expense_date', todayStart)
    .lt('expense_date', todayEnd);
  const todayExpensesTotal = (todayExpenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0);

  const { data: txData, error: txError } = await supabase
    .from('customer_transactions')
    .select('amount');
  if (txError) throw txError;

  const totalReceivable = (txData ?? []).reduce((sum, t) => sum + Number(t.amount), 0);

  return {
    todaySales: todaySalesTotal,
    todayProfit: todaySalesTotal - todayCOGS - todayExpensesTotal,
    totalReceivable,
  };
}

export async function fetchCustomerById(id: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Customer | null;
}
