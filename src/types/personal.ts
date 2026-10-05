export type PersonalCategory = 'Salary' | 'Investment' | 'Freelance' | 'Food' | 'Rent' | 'Utilities' | 'Entertainment' | 'Shopping' | 'Savings' | 'Other';

export interface PersonalTransaction {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: PersonalCategory;
  date: string;
  notes?: string;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  created_at: string;
}
