import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  getAllTransactions,
  updateTransactionStatus,
  getSyncQueueCounts,
} from '../../src/stores/offlineStore';
import { triggerSync } from '../../src/services/syncEngine';
import { useSyncStatusStore } from '../../src/stores/syncStatusStore';
import type { OfflinePendingTransaction } from '../../src/types/offline';
import { formatCurrency } from '../../src/services/dashboardService';

/**
 * Pending Transactions Screen — STORY-5.4
 *
 * Shows all PENDING_SYNC and SYNC_FAILED transactions.
 * Member can manually retry SYNC_FAILED transactions.
 * Silent drops of failed transactions are not permitted.
 *
 * AC coverage:
 * - Lists all PENDING_SYNC and SYNC_FAILED transactions ✓
 * - Shows status per transaction ✓
 * - Manual retry on SYNC_FAILED ✓
 * - SyncStatusIcon taps navigate here ✓
 * - Silent drops not permitted — member always informed ✓
 */
export default function PendingTransactionsScreen() {
  const router = useRouter();
  const { setCounts } = useSyncStatusStore();
  const [transactions, setTransactions] = useState<OfflinePendingTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    void loadTransactions();
  }, []);

  async function loadTransactions() {
    setIsLoading(true);
    const all = await getAllTransactions();
    const active = all.filter(
      (tx) => tx.syncStatus === 'PENDING_SYNC' || tx.syncStatus === 'SYNC_FAILED'
    );
    setTransactions(active);
    setIsLoading(false);
  }

  async function handleRetryAll() {
    setIsSyncing(true);
    // Reset SYNC_FAILED transactions back to PENDING_SYNC before retrying
    for (const tx of transactions.filter((t) => t.syncStatus === 'SYNC_FAILED')) {
      await updateTransactionStatus(tx.localUUID, 'PENDING_SYNC', 0);
    }
    await triggerSync();
    await loadTransactions();
    const counts = await getSyncQueueCounts();
    setCounts(counts.pendingCount, counts.failedCount);
    setIsSyncing(false);
  }

  const statusLabel = (status: string) => {
    if (status === 'PENDING_SYNC') return '⏳ Pending';
    if (status === 'SYNC_FAILED') return '❌ Failed';
    return status;
  };

  const statusColor = (status: string) => {
    if (status === 'SYNC_FAILED') return '#ef4444';
    return '#f59e0b';
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>All synced</Text>
        <Text style={styles.emptySubtitle}>
          No pending transactions. You're up to date.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const failedCount = transactions.filter(
    (t) => t.syncStatus === 'SYNC_FAILED'
  ).length;

  return (
    <View style={styles.container}>
      {failedCount > 0 && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            {failedCount} transaction{failedCount > 1 ? 's' : ''} failed to sync.
            Your data is saved locally and has not been lost.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => void handleRetryAll()}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.retryText}>Retry All</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.localUUID}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.txRow}>
            <View style={styles.txLeft}>
              <Text style={styles.txAmount}>
                {item.transaction_type === 'expense' ? '-' : '+'}
                {formatCurrency(Math.abs(item.amount))}
              </Text>
              <Text style={styles.txDate}>{item.transaction_date}</Text>
              {item.description ? (
                <Text style={styles.txDesc}>{item.description}</Text>
              ) : null}
            </View>
            <Text style={[styles.txStatus, { color: statusColor(item.syncStatus) }]}>
              {statusLabel(item.syncStatus)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 32 },
  backButton: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 },
  backText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  warningBanner: {
    backgroundColor: '#fef2f2', padding: 16, margin: 16,
    borderRadius: 12, borderLeftWidth: 3, borderLeftColor: '#ef4444',
  },
  warningText: { fontSize: 14, color: '#7f1d1d', marginBottom: 12, lineHeight: 20 },
  retryButton: {
    backgroundColor: '#ef4444', borderRadius: 8,
    paddingVertical: 10, alignItems: 'center',
  },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  txRow: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 10, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  txLeft: { flex: 1 },
  txAmount: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  txDate: { fontSize: 13, color: '#888', marginTop: 2 },
  txDesc: { fontSize: 13, color: '#666', marginTop: 4 },
  txStatus: { fontSize: 13, fontWeight: '600', marginLeft: 12 },
});
