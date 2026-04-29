import { supabase } from './supabase';
import type { UserRole } from '../stores/authStore';

/**
 * Resolves the authenticated user's role for their household.
 *
 * Reads from tenant_members table using the authenticated user's JWT.
 * RLS ensures only the user's own row is returned.
 *
 * Returns 'admin' or 'member'. Returns null if no membership found
 * (account deactivated or removed from household).
 *
 * Schema reference: docs/schema-map.json → tenant_members
 * Columns: tenant_id, user_id, role, is_active
 */
export async function resolveUserRole(userId: string): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from('tenant_members')
    .select('role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  const role = data.role;

  if (role !== 'admin' && role !== 'member') {
    return null;
  }

  return role as UserRole;
}
