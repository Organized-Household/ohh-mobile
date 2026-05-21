import { supabase } from '../lib/supabase';

export interface Account {
  id: string;
  name: string;
  account_kind: 'savings' | 'investment' | 'debt';
  opening_balance: number | null; // schema-map.json → accounts: no balance column; opening_balance is the balance figure for mobile v1
}

/**
 * Fetch active accounts for a specific member.
 *
 * Schema reference: docs/schema-map.json → accounts
 * accounts.user_id: per-member ownership confirmed.
 * RLS: SELECT allows any tenant member to read all accounts —
 * BUT mobile must always filter by user_id in query (schema-map FINDING-9).
 */
export async function fetchAccountsForMember(
  userId: string,
  tenantId: string
): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, account_kind, opening_balance')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('account_kind')
    .order('name');

  if (error || !data) return [];
  return data as Account[];
}
