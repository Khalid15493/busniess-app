import { supabase } from '@/lib/supabase';
import { adjustAccountBalance } from './accounts';
import type { Wastage, Product } from '@/types';

export async function fetchWastages(): Promise<(Wastage & { product?: Product | null })[]> {
  const { data, error } = await supabase
    .from('wastages')
    .select('*, product:products(*)')
    .order('waste_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as (Wastage & { product?: Product | null })[];
}

export async function createWastage(input: {
  product_id: string;
  quantity: number;
  unit: string;
  reason: string;
  notes?: string;
}): Promise<Wastage> {
  const { data: movements } = await supabase
    .from('stock_movements')
    .select('quantity')
    .eq('product_id', input.product_id);
  if (!movements) throw new Error('Failed to check stock');
  const currentStock = movements.reduce((sum, m) => sum + Number(m.quantity), 0);
  if (input.quantity > currentStock) {
    throw new Error(`Insufficient stock. Available: ${currentStock} ${input.unit}`);
  }

  const { data, error } = await supabase
    .from('wastages')
    .insert({
      product_id: input.product_id,
      quantity: input.quantity,
      unit: input.unit,
      reason: input.reason,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  const { error: mvError } = await supabase.from('stock_movements').insert({
    product_id: input.product_id,
    movement_type: 'WASTAGE',
    quantity: -input.quantity,
    unit_cost: 0,
    reason: input.reason,
    reference_type: 'wastage',
    reference_id: data.id,
  });
  if (mvError) throw mvError;

  return data as Wastage;
}

export async function createSalesReturn(input: {
  sale_id: string;
  product_id: string;
  quantity: number;
  unit: string;
  refund_amount: number;
  account_id?: string;
  note?: string;
}): Promise<void> {
  const { error: mvError } = await supabase.from('stock_movements').insert({
    product_id: input.product_id,
    movement_type: 'SALES_RETURN',
    quantity: input.quantity,
    unit_cost: 0,
    reason: 'Sales Return',
    reference_type: 'sale',
    reference_id: input.sale_id,
    note: input.note ?? null,
  });
  if (mvError) throw mvError;

  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .select('customer_id, paid_amount')
    .eq('id', input.sale_id)
    .maybeSingle();
  if (saleError) throw saleError;

  if (sale?.customer_id) {
    await supabase.from('customer_transactions').insert({
      customer_id: sale.customer_id,
      sale_id: input.sale_id,
      transaction_type: 'SALE_RETURN',
      amount: -input.refund_amount,
      note: input.note ?? 'Sales return',
    });
  }

  if (input.account_id && input.refund_amount > 0) {
    await supabase.from('account_transactions').insert({
      account_id: input.account_id,
      transaction_type: 'SALE_PAYMENT',
      amount: -input.refund_amount,
      reference_type: 'sale',
      reference_id: input.sale_id,
      note: `Sales return refund: ${input.note ?? ''}`,
    });
    await adjustAccountBalance(input.account_id, -input.refund_amount);
  }
}

export async function createPurchaseReturn(input: {
  purchase_id: string;
  product_id: string;
  quantity: number;
  unit: string;
  refund_amount: number;
  account_id?: string;
  note?: string;
}): Promise<void> {
  const { error: mvError } = await supabase.from('stock_movements').insert({
    product_id: input.product_id,
    movement_type: 'PURCHASE_RETURN',
    quantity: -input.quantity,
    unit_cost: 0,
    reason: 'Purchase Return',
    reference_type: 'purchase',
    reference_id: input.purchase_id,
    note: input.note ?? null,
  });
  if (mvError) throw mvError;

  const { data: purchase, error: purError } = await supabase
    .from('purchases')
    .select('supplier_id')
    .eq('id', input.purchase_id)
    .maybeSingle();
  if (purError) throw purError;

  if (purchase?.supplier_id) {
    await supabase.from('supplier_transactions').insert({
      supplier_id: purchase.supplier_id,
      purchase_id: input.purchase_id,
      transaction_type: 'PURCHASE_RETURN',
      amount: -input.refund_amount,
      note: input.note ?? 'Purchase return',
    });
  }

  if (input.account_id && input.refund_amount > 0) {
    await supabase.from('account_transactions').insert({
      account_id: input.account_id,
      transaction_type: 'PURCHASE_PAYMENT',
      amount: input.refund_amount,
      reference_type: 'purchase',
      reference_id: input.purchase_id,
      note: `Purchase return refund: ${input.note ?? ''}`,
    });
    await adjustAccountBalance(input.account_id, input.refund_amount);
  }
}
