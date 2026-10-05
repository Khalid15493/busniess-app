import { supabase } from '@/lib/supabase';
import type { BusinessProfile } from '@/types';

export async function fetchBusinessProfile(): Promise<BusinessProfile | null> {
  const { data, error } = await supabase
    .from('business_profiles')
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data as BusinessProfile | null;
}

export async function createBusinessProfile(input: {
  business_name: string;
  owner_name?: string;
  phone?: string;
  address?: string;
  email?: string;
  logo_url?: string;
  currency?: string;
  invoice_prefix?: string;
}): Promise<BusinessProfile> {
  const { data, error } = await supabase
    .from('business_profiles')
    .insert({
      business_name: input.business_name,
      owner_name: input.owner_name ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      email: input.email ?? null,
      logo_url: input.logo_url ?? null,
      currency: input.currency ?? 'BDT',
      invoice_prefix: input.invoice_prefix ?? 'INV',
    })
    .select()
    .single();
  if (error) throw error;
  return data as BusinessProfile;
}

export async function updateBusinessProfile(
  id: string,
  input: Partial<Omit<BusinessProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<BusinessProfile> {
  const { data, error } = await supabase
    .from('business_profiles')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as BusinessProfile;
}
