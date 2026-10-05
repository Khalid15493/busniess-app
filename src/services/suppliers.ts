import { supabase } from '@/lib/supabase';
import type { Supplier, SupplierWithPayable, SupplierTransaction, SupplierPayment, PaymentMethod } from '@/types';

export async function fetchSuppliers({ activeOnly = false } = {}): Promise<SupplierWithPayable[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name');
  if (error) throw error;
  const suppliers = (data ?? []) as Supplier[];

  const enriched = await Promise.all(
    suppliers.map(async (s) => {
      const payable = await fetchSupplierPayable(s.id);
      return { ...s, current_payable: payable } as SupplierWithPayable;
    })
  );
  return activeOnly ? enriched.filter((s) => s.is_active) : enriched;
}

export async function fetchSupplierById(id: string): Promise<SupplierWithPayable> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Supplier not found');
  const payable = await fetchSupplierPayable(id);
  return { ...data, current_payable: payable } as SupplierWithPayable;
}

export async function fetchSupplierPayable(supplierId: string): Promise<number> {
  const { data, error } = await supabase
    .from('supplier_transactions')
    .select('amount')
    .eq('supplier_id', supplierId);
  if (error) throw error;
  return (data ?? []).reduce((sum, t) => sum + Number(t.amount), 0);
}

export async function createSupplier(input: {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  opening_payable?: number;
}): Promise<Supplier> {
  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      name: input.name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      notes: input.notes ?? null,
      opening_payable: input.opening_payable ?? 0,
    })
    .select()
    .single();
  if (error) throw error;

  if (input.opening_payable && input.opening_payable > 0) {
    await supabase.from('supplier_transactions').insert({
      supplier_id: data.id,
      transaction_type: 'OPENING_PAYABLE',
      amount: input.opening_payable,
      note: 'Opening payable',
    });
  }

  return data as Supplier;
}

export async function updateSupplier(id: string, updates: Partial<Supplier>): Promise<void> {
  const { error } = await supabase.from('suppliers').update(updates).eq('id', id);
  if (error) throw error;
}

export async function fetchSupplierTransactions(supplierId: string): Promise<SupplierTransaction[]> {
  const { data, error } = await supabase
    .from('supplier_transactions')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SupplierTransaction[];
}

export async function fetchSupplierPayments(supplierId: string): Promise<SupplierPayment[]> {
  const { data, error } = await supabase
    .from('supplier_payments')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SupplierPayment[];
}

export async function recordSupplierPayment(input: {
  supplier_id: string;
  amount: number;
  payment_method: PaymentMethod;
  account_id?: string;
  note?: string;
}): Promise<void> {
  const { data: payment, error: payError } = await supabase
    .from('supplier_payments')
    .insert({
      supplier_id: input.supplier_id,
      amount: input.amount,
      payment_method: input.payment_method,
      note: input.note ?? null,
    })
    .select()
    .single();
  if (payError) throw payError;

  await supabase.from('supplier_transactions').insert({
    supplier_id: input.supplier_id,
    transaction_type: 'PAYMENT',
    amount: -input.amount,
    payment_method: input.payment_method,
    reference_type: 'supplier_payment',
    reference_id: payment.id,
    note: input.note ?? null,
  });

  if (input.account_id) {
    await supabase.from('account_transactions').insert({
      account_id: input.account_id,
      transaction_type: 'SUPPLIER_PAYMENT',
      amount: -input.amount,
      reference_type: 'supplier_payment',
      reference_id: payment.id,
      note: `Supplier payment: ${input.note ?? ''}`,
    });
    await adjustAccountBalance(input.account_id, -input.amount);
  }
}

async function adjustAccountBalance(accountId: string, delta: number): Promise<void> {
  const { data: account, error } = await supabase
    .from('accounts')
    .select('current_balance')
    .eq('id', accountId)
    .maybeSingle();
  if (error) throw error;
  if (!account) throw new Error('Account not found');
  const newBalance = Number(account.current_balance) + delta;
  await supabase.from('accounts').update({ current_balance: newBalance }).eq('id', accountId);
}
