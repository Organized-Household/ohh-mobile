import { supabase } from '../lib/supabase';

/**
 * Member data for admin member selector.
 *
 * Schema reference: docs/schema-map.json → tenant_members + profiles
 *
 * RLS after MIGRATION-2:
 * - tenant_members_select_admin policy allows admin to read all
 *   household members via tenant_members table
 * - profiles_select_tenant_admin allows admin to read all profiles
 *
 * Filter: is_active = true on both tenant_members and profiles
 * to exclude soft-deleted members.
 *
 * Max 5 members per household (including admins) — enforced server-side.
 */

export interface HouseholdMember {
  userId: string;
  displayName: string;
  role: 'admin' | 'member';
  isActive: boolean;
}

/**
 * Fetch all active household members for the admin member selector.
 * Requires MIGRATION-2 to be applied — admin tenant_members SELECT policy.
 */
export async function fetchHouseholdMembers(
  tenantId: string
): Promise<HouseholdMember[]> {
  const { data, error } = await supabase
    .from('tenant_members')
    .select(`
      user_id,
      role,
      is_active,
      profiles (
        display_name,
        first_name,
        is_active
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('role'); // admins first

  if (error || !data) {
    console.error('fetchHouseholdMembers error:', JSON.stringify(error));
    return [];
  }

  return data
    .filter((m) => {
      const profile = Array.isArray(m.profiles)
        ? m.profiles[0]
        : m.profiles;
      return profile?.is_active !== false;
    })
    .map((m) => {
      const profile = Array.isArray(m.profiles)
        ? m.profiles[0]
        : m.profiles;
      return {
        userId: m.user_id,
        displayName:
          profile?.display_name ??
          profile?.first_name ??
          'Member',
        role: m.role as 'admin' | 'member',
        isActive: m.is_active,
      };
    });
}
