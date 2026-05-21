import { supabase } from './supabase';
import type { UserRole } from '../stores/authStore';

export interface ResolvedMembership {
  role: UserRole;
  tenantId: string;
}

/**
 * Resolves the authenticated user's role and tenantId for their household.
 *
 * Reads from tenant_members table using the authenticated user's JWT.
 * RLS (tenant_members_select_self) ensures only the user's own row is returned.
 *
 * Returns { role, tenantId } or null if no active membership found
 * (account deactivated or removed from household).
 *
 * tenant_id is NOT stored in JWT app_metadata — it is read from
 * tenant_members at login and stored in authStore for the session.
 *
 * Schema reference: docs/schema-map.json → tenant_members
 * Columns: tenant_id, user_id, role, is_active
 */
export async function resolveUserRole(userId: string): Promise<ResolvedMembership | null> {
  const { data, error } = await supabase
    .from('tenant_members')
    .select('role, tenant_id')
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

  return { role: role as UserRole, tenantId: data.tenant_id as string };
}
