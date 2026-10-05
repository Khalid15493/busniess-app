import { supabase } from '@/lib/supabase';
import type { Delivery, DeliveryStatus, Sale } from '@/types';

export async function fetchDeliveries({ status } = {} as { status?: string }): Promise<(Delivery & { sale?: Sale | null })[]> {
  let query = supabase
    .from('deliveries')
    .select('*, sale:sales(*, customer:customers(*))')
    .order('created_at', { ascending: false });
  if (status && status !== 'all') query = query.eq('delivery_status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as (Delivery & { sale?: Sale | null })[];
}

export async function fetchDeliveryBySaleId(saleId: string): Promise<Delivery | null> {
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .eq('sale_id', saleId)
    .maybeSingle();
  if (error) throw error;
  return data as Delivery | null;
}

export async function createDelivery(input: {
  sale_id: string;
  delivery_address?: string;
  customer_delivery_charge: number;
  actual_delivery_cost?: number;
  delivery_provider?: string;
  delivery_status?: DeliveryStatus;
  delivery_note?: string;
}): Promise<Delivery> {
  const { data, error } = await supabase
    .from('deliveries')
    .insert({
      sale_id: input.sale_id,
      delivery_address: input.delivery_address ?? null,
      customer_delivery_charge: input.customer_delivery_charge,
      actual_delivery_cost: input.actual_delivery_cost ?? 0,
      delivery_provider: input.delivery_provider ?? null,
      delivery_status: input.delivery_status ?? 'pending',
      delivery_note: input.delivery_note ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Delivery;
}

export async function updateDelivery(id: string, updates: Partial<Delivery>): Promise<void> {
  const { error } = await supabase.from('deliveries').update(updates).eq('id', id);
  if (error) throw error;
}
