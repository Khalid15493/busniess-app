import { supabase } from '@/lib/supabase';
import { adjustAccountBalance } from './accounts';
import type { OwnerWithdrawal, CapitalRecord, CapitalType, PaymentMethod } from '@/types';

export async function fetchWithdrawals(): Promise<OwnerWithdrawal[]> {
  const { data, error } = await supabase
    .from('owner_withdrawals')
    .select('*')
    .order('withdrawal_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as OwnerWithdrawal[];
}

export async function createWithdrawal(input: {
  amount: number;
  account_id?: string;
  reason?: string;
  notes?: string;
}): Promise<OwnerWithdrawal> {
  const { data, error } = await supabase
    .from('owner_withdrawals')
    .insert({
      amount: input.amount,
      account_id: input.account_id ?? null,
      reason: input.reason ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  if (input.account_id) {
    await supabase.from('account_transactions').insert({
      account_id: input.account_id,
      transaction_type: 'OWNER_WITHDRAWAL',
      amount: -input.amount,
      reference_type: 'owner_withdrawal',
      reference_id: data.id,
      note: `Owner withdrawal: ${input.reason ?? ''}`,
    });
    await adjustAccountBalance(input.account_id, -input.amount);
  }

  return data as OwnerWithdrawal;
}

export async function fetchCapitalRecords(): Promise<CapitalRecord[]> {
  const { data, error } = await supabase
    .from('capital_records')
    .select('*')
    .order('record_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CapitalRecord[];
}

export async function createCapitalRecord(input: {
  amount: number;
  capital_type: CapitalType;
  account_id?: string;
  notes?: string;
}): Promise<CapitalRecord> {
  const { data, error } = await supabase
    .from('capital_records')
    .insert({
      amount: input.amount,
      capital_type: input.capital_type,
      account_id: input.account_id ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  if (input.account_id) {
    await supabase.from('account_transactions').insert({
      account_id: input.account_id,
      transaction_type: 'CAPITAL',
      amount: input.amount,
      reference_type: 'capital_record',
      reference_id: data.id,
      note: `Capital: ${input.capital_type}`,
    });
    await adjustAccountBalance(input.account_id, input.amount);
  }

  return data as CapitalRecord;
}

export async function fetchTotalWithdrawals(): Promise<number> {
  const { data, error } = await supabase
    .from('owner_withdrawals')
    .select('amount');
  if (error) throw error;
  return (data ?? []).reduce((sum, w) => sum + Number(w.amount), 0);
}

export async function fetchTotalCapital(): Promise<number> {
  const { data, error } = await supabase
    .from('capital_records')
    .select('amount');
  if (error) throw error;
  return (data ?? []).reduce((sum, c) => sum + Number(c.amount), 0);
}
