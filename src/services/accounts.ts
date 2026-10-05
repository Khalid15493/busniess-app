import { supabase } from '@/lib/supabase';
import type { Account, AccountTransaction, AccountType } from '@/types';

export async function fetchAccounts({ activeOnly = false } = {}): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('name');
  if (error) throw error;
  const accounts = (data ?? []) as Account[];
  return activeOnly ? accounts.filter((a) => a.is_active) : accounts;
}

export async function createAccount(input: {
  name: string;
  account_type: AccountType;
  opening_balance?: number;
}): Promise<Account> {
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      name: input.name,
      account_type: input.account_type,
      current_balance: input.opening_balance ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Account;
}

export async function updateAccount(id: string, updates: Partial<Account>): Promise<void> {
  const { error } = await supabase.from('accounts').update(updates).eq('id', id);
  if (error) throw error;
}

export async function fetchAccountTransactions(accountId: string): Promise<AccountTransaction[]> {
  const { data, error } = await supabase
    .from('account_transactions')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AccountTransaction[];
}

export async function transferBetweenAccounts(input: {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  note?: string;
}): Promise<void> {
  if (input.amount <= 0) throw new Error('Amount must be greater than 0');
  if (input.from_account_id === input.to_account_id) throw new Error('Cannot transfer to the same account');

  const note = input.note ?? 'Internal transfer';

  const fromTxn = await supabase.from('account_transactions').insert({
    account_id: input.from_account_id,
    transaction_type: 'TRANSFER_OUT',
    amount: -input.amount,
    note,
  }).select().single();
  if (fromTxn.error) throw fromTxn.error;

  const toTxn = await supabase.from('account_transactions').insert({
    account_id: input.to_account_id,
    transaction_type: 'TRANSFER_IN',
    amount: input.amount,
    note,
  }).select().single();
  if (toTxn.error) throw toTxn.error;

  await adjustAccountBalance(input.from_account_id, -input.amount);
  await adjustAccountBalance(input.to_account_id, input.amount);
}

export async function adjustAccountBalance(accountId: string, delta: number): Promise<void> {
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

export async function fetchTotalAccountBalance(): Promise<number> {
  const accounts = await fetchAccounts({ activeOnly: true });
  return accounts.reduce((sum, a) => sum + a.current_balance, 0);
}
