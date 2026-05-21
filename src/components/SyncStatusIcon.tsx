import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSyncStatusStore } from '../stores/syncStatusStore';

/**
 * SyncStatusIcon — header indicator for pending/failed sync state.
 *
 * Shows red dot when pendingCount > 0 or failedCount > 0.
 * Shows amber dot while sync is in progress.
 * Shows count badge for pending + failed total.
 * Tapping navigates to PendingTransactionsScreen (STORY-5.4, Sprint 2).
 *
 * AC coverage (STORY-5.1):
 * - Red indicator when pendingCount > 0 ✓
 * - Red indicator when failedCount > 0 ✓
 */
export function SyncStatusIcon() {
  const { pendingCount, failedCount, isSyncing } = useSyncStatusStore();
  const router = useRouter();

  const totalCount = pendingCount + failedCount;

  if (totalCount === 0 && !isSyncing) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push('/(app)/pending-transactions')}
      accessibilityLabel={`${totalCount} transactions pending sync`}
    >
      <View style={[styles.dot, isSyncing && styles.dotSyncing]} />
      {totalCount > 0 && (
        <Text style={styles.count}>{totalCount > 99 ? '99+' : totalCount}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  dotSyncing: {
    backgroundColor: '#f59e0b',
  },
  count: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
});
