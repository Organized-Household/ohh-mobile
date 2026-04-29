import { useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useDashboardStore } from '../stores/dashboardStore';
import {
  fetchDashboardData,
  getCurrentMonthStart,
} from '../services/dashboardService';

/**
 * Hook for fetching and refreshing dashboard data.
 *
 * Used by MemberDashboard and AdminDashboard (with targetUserId override).
 * Automatically uses current month. Exposes refresh() for pull-to-refresh
 * and post-transaction refresh (STORY-2.2).
 *
 * tenant_id is sourced from authStore (set at login via tenant_members query).
 * It is NOT read from JWT app_metadata — that field is not set by the web app.
 * See resolveRole.ts for the source of truth.
 */
export function useDashboard(targetUserId?: string) {
  const { user, tenantId } = useAuthStore();
  const { setData, setLoading, setError } = useDashboardStore();

  const userId = targetUserId ?? user?.id ?? '';

  const refresh = useCallback(async () => {
    if (!userId || !tenantId) {
      setError('Household configuration error. Please sign in again.');
      return;
    }

    setLoading(true);

    try {
      const monthStart = getCurrentMonthStart();
      const data = await fetchDashboardData(userId, tenantId, monthStart);
      setData(data);
    } catch {
      setError('Failed to load dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId, tenantId, setData, setLoading, setError]);

  return { refresh };
}
