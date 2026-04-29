import { supabase } from '../lib/supabase';
import { UNKNOWN_CATEGORY_NAME } from '../constants/categoryConstants';

export interface Category {
  id: string;
  name: string;
  tag: string;           // FK to expense_types.slug — never hardcode values
  category_type: 'income' | 'expense';
  is_active: boolean;
}

/**
 * Fetch all active categories for a tenant.
 * Used to populate CategoryPicker in transaction form.
 *
 * Schema reference: docs/schema-map.json → categories
 * RLS: any active tenant member can read categories.
 * categories are shared household-wide — not per-member.
 */
export async function fetchCategories(tenantId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, tag, category_type, is_active')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('name');

  if (error || !data) return [];
  return data as Category[];
}

/**
 * Resolve the Unknown category ID for a tenant at runtime.
 * UNKNOWN_CATEGORY_ID is NOT a hardcoded constant — it is per-tenant.
 * Query is the authoritative resolution method.
 *
 * See docs/schema-map.json → constants_to_generate for confirmed UUIDs.
 */
export async function resolveUnknownCategoryId(
  tenantId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('name', UNKNOWN_CATEGORY_NAME)
    .single();

  if (error || !data) return null;
  return data.id as string;
}
