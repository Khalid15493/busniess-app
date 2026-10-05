import { supabase } from '@/lib/supabase';
import type { Customer, CustomerWithDue, CustomerTransaction, Payment, PaymentMethod } from '@/types';

export async function fetchCustomers(filters?: {
  search?: string;
  activeOnly?: boolean;
}): Promise<CustomerWithDue[]> {
  let query = supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.activeOnly !== false) {
    query = query.eq('is_active', true);
  }

  const { data: customers, error } = await query;
  if (error) throw error;
  if (!customers || customers.length === 0) return [];

  const customerIds = customers.map((c) => c.id);

  const { data: transactions, error: txError } = await supabase
    .from('customer_transactions')
    .select('customer_id, amount')
    .in('customer_id', customerIds);

  if (txError) throw txError;

  const dueMap = new Map<string, number>();
  for (const tx of transactions ?? []) {
    dueMap.set(
      tx.customer_id,
      (dueMap.get(tx.customer_id) ?? 0) + Number(tx.amount)
    );
  }

  let result = (customers as unknown as Customer[]).map((c) => ({
    ...c,
    current_due: dueMap.get(c.id) ?? 0,
  })) as CustomerWithDue[];

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q) ||
        (c.email ?? '').toLowerCase().includes(q)
    );
  }

  return result;
}

export async function fetchCustomerById(id: string): Promise<CustomerWithDue | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: transactions } = await supabase
    .from('customer_transactions')
    .select('amount')
    .eq('customer_id', id);

  const currentDue = (transactions ?? []).reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );

  return {
    ...(data as unknown as Customer),
    current_due: currentDue,
  };
}

export async function createCustomer(input: {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  opening_due?: number;
}): Promise<Customer> {
  const openingDue = input.opening_due ?? 0;

  const { data: customer, error } = await supabase
    .from('customers')
    .insert({
      name: input.name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      notes: input.notes ?? null,
      opening_due: openingDue,
    })
    .select()
    .single();
  if (error) throw error;

  if (openingDue !== 0) {
    const { error: txError } = await supabase
      .from('customer_transactions')
      .insert({
        customer_id: (customer as Customer).id,
        transaction_type: 'OPENING_DUE',
        amount: openingDue,
        note: `Opening due for ${input.name}`,
      });
    if (txError) throw txError;
  }

  return customer as Customer;
}

export async function updateCustomer(
  id: string,
  input: Partial<Pick<Customer, 'name' | 'phone' | 'email' | 'address' | 'notes' | 'is_active'>>
): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Customer;
}

export async function fetchCustomerTransactions(customerId: string): Promise<CustomerTransaction[]> {
  const { data, error } = await supabase
    .from('customer_transactions')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as CustomerTransaction[];
}

export async function fetchCustomerPayments(customerId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Payment[];
}

export async function recordPayment(input: {
  customer_id: string;
  sale_id?: string;
  amount: number;
  payment_method: PaymentMethod;
  note?: string;
}): Promise<{ payment: Payment; transaction: CustomerTransaction }> {
  const { data: payment, error: payError } = await supabase
    .from('payments')
    .insert({
      customer_id: input.customer_id,
      sale_id: input.sale_id ?? null,
      amount: input.amount,
      payment_method: input.payment_method,
      note: input.note ?? null,
    })
    .select()
    .single();
  if (payError) throw payError;

  const { data: transaction, error: txError } = await supabase
    .from('customer_transactions')
    .insert({
      customer_id: input.customer_id,
      sale_id: input.sale_id ?? null,
      transaction_type: 'PAYMENT',
      amount: -input.amount,
      payment_method: input.payment_method,
      reference_type: 'payment',
      reference_id: (payment as Payment).id,
      note: input.note ?? 'Payment received',
    })
    .select()
    .single();
  if (txError) throw txError;

  return {
    payment: payment as Payment,
    transaction: transaction as CustomerTransaction,
  };
}

export async function fetchTotalReceivable(): Promise<number> {
  const { data, error } = await supabase
    .from('customer_transactions')
    .select('amount');
  if (error) throw error;
  return (data ?? []).reduce((sum, t) => sum + Number(t.amount), 0);
}
