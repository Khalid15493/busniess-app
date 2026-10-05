import { supabase } from '@/lib/supabase';
import { adjustAccountBalance } from './accounts';
import type { Expense, ExpenseCategory, PaymentMethod } from '@/types';

export async function fetchExpenses({ category } = {} as { category?: string }): Promise<Expense[]> {
  let query = supabase.from('expenses').select('*').order('expense_date', { ascending: false });
  if (category && category !== 'all') query = query.eq('category', category);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Expense[];
}

export async function createExpense(input: {
  category: ExpenseCategory;
  amount: number;
  expense_date?: string;
  payment_method: PaymentMethod;
  account_id?: string;
  description?: string;
  notes?: string;
}): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      category: input.category,
      amount: input.amount,
      expense_date: input.expense_date ?? new Date().toISOString(),
      payment_method: input.payment_method,
      account_id: input.account_id ?? null,
      description: input.description ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  if (input.account_id) {
    await supabase.from('account_transactions').insert({
      account_id: input.account_id,
      transaction_type: 'EXPENSE',
      amount: -input.amount,
      reference_type: 'expense',
      reference_id: data.id,
      note: `Expense: ${input.category}`,
    });
    await adjustAccountBalance(input.account_id, -input.amount);
  }

  return data as Expense;
}

export async function deleteExpense(id: string): Promise<void> {
  const { data: expense, error: fetchError } = await supabase
    .from('expenses')
    .select('account_id, amount')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) throw fetchError;

  if (expense?.account_id) {
    await adjustAccountBalance(expense.account_id, Number(expense.amount));
    await supabase
      .from('account_transactions')
      .delete()
      .eq('reference_type', 'expense')
      .eq('reference_id', id);
  }

  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchTodayExpenses(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('expenses')
    .select('amount')
    .gte('expense_date', `${today}T00:00:00Z`)
    .lte('expense_date', `${today}T23:59:59Z`);
  if (error) throw error;
  return (data ?? []).reduce((sum, e) => sum + Number(e.amount), 0);
}
