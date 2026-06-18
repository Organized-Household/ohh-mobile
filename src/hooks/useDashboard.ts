import { useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useDashboardStore } from '../stores/dashboardStore';
import {
  fetchDashboardData,
  getCurrentMonthStart,
} from '../services/dashboardService';
import {
  saveDashboardCache,
  loadDashboardCache,
} from '../services/dashboardCacheService';

/**
 * useDashboard hook — STORY-2.1, STORY-2.2, STORY-2.3
 *
 * Online: fetches from Supabase, saves to AsyncStorage cache.
 * Offline: loads from AsyncStorage cache, sets isOfflineCached flag.
 *
 * tenant_id is read from authStore (set at login via tenant_members query).
 * No extra DB round-trip on each refresh.
 *
 * AC coverage (STORY-2.3):
 * - Offline: shows last-known cached data ✓
 * - Offline banner shown when displaying cached data ✓
 * - Cache written after every successful remote fetch ✓
 * - No cache: empty state shown (not error crash) ✓
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

      // Check connectivity
      const netState = await NetInfo.fetch();
      const isOnline = netState.isConnected && netState.isInternetReachable;

      if (isOnline) {
        // Ensure Supabase client session is rehydrated before querying
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('Session expired. Please sign in again.');
          return;
        }

        // Online path — fetch from Supabase, save to cache
        const data = await fetchDashboardData(userId, tenantId, monthStart);

        if (data) {
          await saveDashboardCache(userId, monthStart, data);
        }

        setData(data);
      } else {
        // Offline path — load from cache
        const cached = await loadDashboardCache(userId, monthStart);

        if (cached) {
          // Mark as offline cached so dashboard can show offline banner (STORY-2.3)
          setData({ ...cached, isOfflineCached: true });
        } else {
          // No cache available — show empty state, not error
          setData(null);
        }
      }
    } catch {
      setError('Failed to load dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId, tenantId, setData, setLoading, setError]);

  return { refresh };
}
