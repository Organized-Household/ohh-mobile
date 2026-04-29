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
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { useDashboardStore } from '../../src/stores/dashboardStore';
import { useDashboard } from '../../src/hooks/useDashboard';
import { CategoryBudgetRow } from '../../src/components/CategoryBudgetRow';
import { FAB } from '../../src/components/FAB';
import { TransactionEntryModal } from '../../src/components/TransactionEntryModal';
import { formatCurrency, getCurrentMonthStart } from '../../src/services/dashboardService';
import type { CategoryBudgetLine } from '../../src/services/dashboardService';

/**
 * Member Personal Budget Dashboard — STORY-2.1, STORY-2.2, STORY-4.1
 *
 * AC coverage:
 * - Current month budget vs actual by category ✓
 * - Data fetched via RLS — own data only ✓
 * - Loading skeleton while fetching ✓
 * - Pull-to-refresh ✓
 * - Post-transaction refresh (via refresh() on FAB modal close) ✓
 * - Error state with retry ✓
 * - Empty state if no budget ✓
 * - Signed amount convention respected (ABS for display) ✓
 * - FAB visible and accessible from this screen ✓
 */
export default function MemberDashboard() {
  const { user } = useAuthStore();
  const { data, isLoading, error } = useDashboardStore();
  const { refresh } = useDashboard();
  const [isModalVisible, setModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initial load
  useEffect(() => {
    void refresh();
  }, []);

  const handlePullToRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  }, [refresh]);

  const handleModalClose = useCallback(() => {
    setModalVisible(false);
    // Refresh dashboard after transaction entry (STORY-2.2)
    void refresh();
  }, [refresh]);

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
        <TouchableOpacity onPress={() => void handleLogout()}>
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
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

      {/* Persistent FAB — STORY-4.1 */}
      <FAB onPress={() => setModalVisible(true)} />

      {/* Transaction entry modal stub — full form in WP-3 */}
      <TransactionEntryModal
        visible={isModalVisible}
        onClose={handleModalClose}
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
  list: {
    paddingHorizontal: 16,
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
});
