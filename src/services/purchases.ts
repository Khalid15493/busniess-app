import { supabase } from '@/lib/supabase';
import { adjustAccountBalance } from './accounts';
import type { Purchase, PurchaseItem, Product, PaymentMethod } from '@/types';

export async function fetchPurchases({ supplierId, status } = {} as {
  supplierId?: string;
  status?: string;
}): Promise<Purchase[]> {
  let query = supabase
    .from('purchases')
    .select('*, supplier:suppliers(*), purchase_items(*, product:products(*))')
    .order('purchase_date', { ascending: false });
  if (supplierId) query = query.eq('supplier_id', supplierId);
  if (status && status !== 'all') query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Purchase[];
}

export async function fetchPurchaseById(id: string): Promise<Purchase> {
  const { data, error } = await supabase
    .from('purchases')
    .select('*, supplier:suppliers(*), purchase_items(*, product:products(*))')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Purchase not found');
  return data as Purchase;
}

export async function generatePurchaseNumber(prefix: string = 'PUR'): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const { count, error } = await supabase
    .from('purchases')
    .select('*', { count: 'exact', head: true })
    .gte('purchase_date', `${today.toISOString().slice(0, 10)}T00:00:00Z`);
  if (error) throw error;
  const seq = String((count ?? 0) + 1).padStart(3, '0');
  return `${prefix}-${dateStr}-${seq}`;
}

export async function createPurchase(input: {
  supplier_id: string | null;
  purchase_number: string;
  subtotal: number;
  discount: number;
  total: number;
  paid_amount: number;
  payable_amount: number;
  payment_method: PaymentMethod;
  notes?: string;
  account_id?: string;
  items: {
    product_id: string;
    quantity: number;
    unit: string;
    purchase_price: number;
    discount: number;
    line_total: number;
  }[];
}): Promise<{ purchase: Purchase }> {
  const { data: purchase, error: purError } = await supabase
    .from('purchases')
    .insert({
      supplier_id: input.supplier_id,
      purchase_number: input.purchase_number,
      subtotal: input.subtotal,
      discount: input.discount,
      total: input.total,
      paid_amount: input.paid_amount,
      payable_amount: input.payable_amount,
      payment_method: input.payment_method,
      notes: input.notes ?? null,
      status: 'completed',
    })
    .select()
    .single();
  if (purError) throw purError;

  for (const item of input.items) {
    const { error: itemError } = await supabase.from('purchase_items').insert({
      purchase_id: purchase.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit: item.unit,
      purchase_price: item.purchase_price,
      discount: item.discount,
      line_total: item.line_total,
    });
    if (itemError) throw itemError;

    const { error: mvError } = await supabase.from('stock_movements').insert({
      product_id: item.product_id,
      movement_type: 'PURCHASE',
      quantity: item.quantity,
      unit_cost: item.purchase_price,
      reason: `Purchase: ${input.purchase_number}`,
      reference_type: 'purchase',
      reference_id: purchase.id,
    });
    if (mvError) throw mvError;

    const { data: product, error: prodError } = await supabase
      .from('products')
      .select('cost_price')
      .eq('id', item.product_id)
      .maybeSingle();
    if (prodError) throw prodError;
    if (product) {
      await supabase
        .from('products')
        .update({ cost_price: item.purchase_price })
        .eq('id', item.product_id);
    }
  }

  if (input.supplier_id) {
    await supabase.from('supplier_transactions').insert({
      supplier_id: input.supplier_id,
      purchase_id: purchase.id,
      transaction_type: 'PURCHASE',
      amount: input.payable_amount,
      payment_method: input.payment_method,
      reference_type: 'purchase',
      reference_id: purchase.id,
      note: `Purchase: ${input.purchase_number}`,
    });

    if (input.paid_amount > 0) {
      await supabase.from('supplier_payments').insert({
        supplier_id: input.supplier_id,
        purchase_id: purchase.id,
        amount: input.paid_amount,
        payment_method: input.payment_method,
        note: `Payment for ${input.purchase_number}`,
      });
      await supabase.from('supplier_transactions').insert({
        supplier_id: input.supplier_id,
        purchase_id: purchase.id,
        transaction_type: 'PAYMENT',
        amount: -input.paid_amount,
        payment_method: input.payment_method,
        reference_type: 'purchase',
        reference_id: purchase.id,
        note: `Payment for ${input.purchase_number}`,
      });
    }
  }

  if (input.paid_amount > 0 && input.account_id) {
    await supabase.from('account_transactions').insert({
      account_id: input.account_id,
      transaction_type: 'PURCHASE_PAYMENT',
      amount: -input.paid_amount,
      reference_type: 'purchase',
      reference_id: purchase.id,
      note: `Purchase payment: ${input.purchase_number}`,
    });
    await adjustAccountBalance(input.account_id, -input.paid_amount);
  }

  return { purchase: purchase as Purchase };
}

export async function fetchActiveProductsForPurchase(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return (data ?? []) as Product[];
}
