import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { useDashboardStore } from '../../src/stores/dashboardStore';
import { useDashboard } from '../../src/hooks/useDashboard';
import { CategoryBudgetRow } from '../../src/components/CategoryBudgetRow';
import { FAB } from '../../src/components/FAB';
import { TransactionEntryModal } from '../../src/components/TransactionEntryModal';
import { SyncStatusIcon } from '../../src/components/SyncStatusIcon';
import { formatCurrency, getCurrentMonthStart } from '../../src/services/dashboardService';
import type { CategoryBudgetLine } from '../../src/services/dashboardService';

/**
 * Member Personal Budget Dashboard — STORY-2.1, STORY-2.2, STORY-2.3, STORY-4.1, STORY-4.2
 *
 * AC coverage:
 * - Current month budget vs actual by category ✓
 * - Data fetched via RLS — own data only ✓
 * - Loading skeleton while fetching ✓
 * - Pull-to-refresh ✓
 * - Dashboard refresh after online transaction (onSuccess) ✓
 * - Error state with retry ✓
 * - Empty state if no budget ✓
 * - Signed amount convention respected (ABS for display) ✓
 * - FAB opens full transaction form (STORY-4.2) ✓
 * - Offline banner shown when displaying cached data (STORY-2.3) ✓
 * - SyncStatusIcon in header (STORY-5.1) ✓
 */
export default function MemberDashboard() {
  const router = useRouter();
  const { user, tenantId } = useAuthStore();
  const { data, isLoading, error, setError } = useDashboardStore();
  const { refresh } = useDashboard();
  const [isModalVisible, setModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initial load — guard against race condition where screen mounts before
  // authStore is populated by _layout.tsx session restore
  useEffect(() => {
    if (user?.id && tenantId) void refresh();
  }, [user?.id, tenantId]);

  // Timeout fallback — if authStore isn't populated within 5 seconds of mount,
  // the session is stale or broken; sign out to force a clean login
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!user?.id || !tenantId) {
        setError('Session expired. Please sign in again.');
        void supabase.auth.signOut();
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const handlePullToRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  }, [refresh]);

  // Called only after successful ONLINE submission (STORY-4.2)
  // Offline submission does not refresh — cached data shown with offline banner
  const handleModalClose = useCallback(() => {
    setModalVisible(false);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Get current month label
  const monthStart = getCurrentMonthStart();
  const monthLabel = new Date(monthStart).toLocaleDateString('en-CA', {
    month: 'long',
    year: 'numeric',
  });

  if (isLoading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading your budget...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => void refresh()}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {data?.memberName ?? user?.email?.split('@')[0] ?? 'My Budget'}
          </Text>
          <Text style={styles.month}>{monthLabel}</Text>
        </View>
        <View style={styles.headerRight}>
          {/* Sync status badge — navigates to pending-transactions on tap */}
          <SyncStatusIcon />
          <TouchableOpacity onPress={() => void handleLogout()}>
            <Text style={styles.signOut}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary totals */}
      {data && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Budgeted</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(data.totalBudgeted)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Spent</Text>
            <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
              {formatCurrency(data.totalActual)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Remaining</Text>
            <Text style={[styles.summaryValue, { color: '#22c55e' }]}>
              {formatCurrency(
                Math.max(0, data.totalBudgeted - data.totalActual)
              )}
            </Text>
          </View>
        </View>
      )}

      {/* Offline banner — STORY-2.3 */}
      {data?.isOfflineCached && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            📶 Offline — showing last saved data
          </Text>
        </View>
      )}

      {/* Category list */}
      {!data || data.lines.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No budget set</Text>
          <Text style={styles.emptySubtitle}>
            Set up your budget for {monthLabel} on the web app.
          </Text>
        </View>
      ) : (
        <FlatList
          data={data.lines}
          keyExtractor={(item: CategoryBudgetLine) => item.categoryId}
          renderItem={({ item }) => <CategoryBudgetRow line={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handlePullToRefresh}
              tintColor="#2563eb"
            />
          }
        />
      )}

      {/* Quick access navigation — STORY-7.1, 7.2, 6.1 */}
      <View style={styles.navLinks}>
        <TouchableOpacity
          style={styles.navLink}
          onPress={() => router.push('/(app)/accounts')}
        >
          <Text style={styles.navLinkText}>My Accounts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navLink}
          onPress={() => router.push('/(app)/budget-view')}
        >
          <Text style={styles.navLinkText}>Budget Detail</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navLink}
          onPress={() => router.push('/(app)/categories')}
        >
          <Text style={styles.navLinkText}>Categories</Text>
        </TouchableOpacity>
      </View>

      {/* Persistent FAB — STORY-4.1/4.2 */}
      <FAB onPress={() => setModalVisible(true)} />

      {/* Full transaction entry form — STORY-4.2 */}
      <TransactionEntryModal
        visible={isModalVisible}
        onClose={handleModalClose}
        onSuccess={() => void refresh()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  month: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  signOut: {
    fontSize: 14,
    color: '#2563eb',
    paddingTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  offlineBanner: {
    backgroundColor: '#fef3c7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 0,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  offlineBannerText: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '500',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  navLinks: {
    flexDirection: 'row', paddingHorizontal: 16,
    paddingVertical: 12, gap: 8,
  },
  navLink: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  navLinkText: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
});
