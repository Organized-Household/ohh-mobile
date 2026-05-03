import { supabase } from '../lib/supabase';
import { UNKNOWN_CATEGORY_NAME } from '../constants/categoryConstants';

/**
 * UnknownReminderService — STORY-6.3
 *
 * After SyncEngine completes, inspect synced transactions for
 * Unknown category assignments. If any found, trigger a reminder.
 *
 * Called from SyncEngine after syncComplete.
 * For online transactions, a non-blocking toast is shown after form dismissal.
 */

export interface UnknownReminderResult {
  hasUnknown: boolean;
  count: number;
  categoryId: string | null;
}

/**
 * Check if any of the provided transaction IDs are assigned to Unknown category.
 * Used after sync completes to surface the reminder.
 */
export async function checkForUnknownTransactions(
  userId: string,
  tenantId: string,
  monthStart: string
): Promise<UnknownReminderResult> {
  // First resolve the Unknown category ID for this tenant
  const { data: unknownCat } = await supabase
    .from('categories')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('name', UNKNOWN_CATEGORY_NAME)
    .single();

  if (!unknownCat?.id) {
    return { hasUnknown: false, count: 0, categoryId: null };
  }

  // Count transactions with Unknown category this month
  const nextMonth = getNextMonthStart(monthStart);

  const { count } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('created_by_user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('category_id', unknownCat.id)
    .gte('transaction_date', monthStart)
    .lt('transaction_date', nextMonth);

  return {
    hasUnknown: (count ?? 0) > 0,
    count: count ?? 0,
    categoryId: unknownCat.id,
  };
}

function getNextMonthStart(monthStart: string): string {
  const date = new Date(monthStart);
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().split('T')[0];
}
