import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DashboardData } from './dashboardService';

/**
 * Dashboard cache service — STORY-2.3
 *
 * Stores last-known dashboard data per member per month in AsyncStorage.
 * Used when device is offline — shows cached data with offline banner.
 *
 * Cache key format: dashboard_cache_{memberId}_{YYYY-MM-01}
 * AsyncStorage is appropriate here — this is UI cache metadata, not
 * financial payload data (which goes in expo-file-system via OfflineStore).
 */

const CACHE_KEY_PREFIX = 'dashboard_cache_';

function cacheKey(memberId: string, monthStart: string): string {
  return `${CACHE_KEY_PREFIX}${memberId}_${monthStart}`;
}

export async function saveDashboardCache(
  memberId: string,
  monthStart: string,
  data: DashboardData
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      cacheKey(memberId, monthStart),
      JSON.stringify(data)
    );
  } catch {
    // Cache write failure is non-critical — silently ignore
  }
}

export async function loadDashboardCache(
  memberId: string,
  monthStart: string
): Promise<DashboardData | null> {
  try {
    const cached = await AsyncStorage.getItem(cacheKey(memberId, monthStart));
    if (!cached) return null;
    return JSON.parse(cached) as DashboardData;
  } catch {
    return null;
  }
}
