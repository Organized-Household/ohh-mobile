import NetInfo from '@react-native-community/netinfo';
import { AppState, type AppStateStatus } from 'react-native';
import { supabase } from '../lib/supabase';
import {
  getPendingTransactions,
  updateTransactionStatus,
  removeCommittedTransaction,
  getSyncQueueCounts,
} from '../stores/offlineStore';
import { useSyncStatusStore } from '../stores/syncStatusStore';
import type { OfflinePendingTransaction } from '../types/offline';

/**
 * SyncEngine — singleton background sync engine for offline transactions.
 *
 * Responsibilities:
 * 1. Listen for connectivity restore events via NetInfo
 * 2. Listen for app foreground events via AppState
 * 3. On trigger: process all PENDING_SYNC transactions in OfflineStore
 * 4. Submit each via Supabase INSERT using localUUID as the row PK
 * 5. Mark COMMITTED on success; increment retryCount on failure
 * 6. After 3 failures, mark SYNC_FAILED (surfaced in WP-4 STORY-5.3/5.4)
 * 7. Update SyncStatusStore counts after each operation
 *
 * Idempotency: localUUID is used as the Supabase row PK.
 * Postgres unique constraint violation (23505) on retry = already committed.
 * Treat 23505 as success — mark COMMITTED, do not increment retryCount.
 *
 * Per-transaction checkpointing: status is written to expo-file-system
 * after EACH transaction, not at the end of the queue. App restart
 * during sync resumes from where it left off.
 *
 * MAX_RETRIES: 3 attempts before marking SYNC_FAILED.
 * Exponential backoff: 1s, 2s, 4s between retries.
 *
 * Schema reference: docs/schema-map.json → transactions mobile_insert_payload
 */

const MAX_RETRIES = 3;
const BACKOFF_MS: [number, number, number] = [1000, 2000, 4000];
export const BACKGROUND_SYNC_TASK = 'BACKGROUND_SYNC_TASK';

let isRunning = false;
let netInfoUnsubscribe: (() => void) | null = null;
let appStateUnsubscribe: (() => void) | null = null;

/**
 * Delay helper for exponential backoff.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Refresh SyncStatusStore counts from OfflineStore.
 */
async function refreshCounts(): Promise<void> {
  const counts = await getSyncQueueCounts();
  useSyncStatusStore
    .getState()
    .setCounts(counts.pendingCount, counts.failedCount);
}

/**
 * Submit a single transaction to Supabase.
 * Returns true on success (including idempotent 23505).
 * Returns false on transient failure.
 */
async function submitTransaction(
  tx: OfflinePendingTransaction
): Promise<boolean> {
  const payload = {
    id: tx.localUUID,               // localUUID maps directly to PK
    tenant_id: tx.tenant_id,
    created_by_user_id: tx.created_by_user_id,
    category_id: tx.category_id,
    description: tx.description,
    amount: tx.amount,
    transaction_date: tx.transaction_date,
    transaction_type: tx.transaction_type,
    linked_account_id: tx.linked_account_id,
    payment_source_account_id: tx.payment_source_account_id,
    // NO source column — does not exist in live DB (schema-map FINDING-3)
    // NO status column — does not exist in live DB (schema-map FINDING-3)
  };

  const { error } = await supabase.from('transactions').insert(payload);

  if (!error) return true;

  // Postgres unique constraint violation = already committed (idempotent retry)
  if (error.code === '23505') {
    return true;
  }

  return false;
}

/**
 * Process all pending transactions in the queue.
 * Called on connectivity restore and app foreground.
 */
async function processQueue(): Promise<void> {
  if (isRunning) return;
  isRunning = true;

  useSyncStatusStore.getState().setIsSyncing(true);

  try {
    const pending = await getPendingTransactions();
    if (pending.length === 0) {
      useSyncStatusStore.getState().setIsSyncing(false);
      isRunning = false;
      return;
    }

    for (const tx of pending) {
      let succeeded = false;

      // Attempt with exponential backoff
      // Retry count is persisted after each failure so progress survives restart (STORY-5.3)
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          await delay(BACKOFF_MS[attempt - 1] ?? 4000);
        }

        succeeded = await submitTransaction(tx);

        if (!succeeded) {
          // Persist retry count after each individual failure (survives app restart)
          await updateTransactionStatus(
            tx.localUUID,
            'PENDING_SYNC',
            tx.retryCount + attempt + 1
          );
        }

        if (succeeded) break;
      }

      if (succeeded) {
        // Per-transaction checkpoint: mark committed immediately
        await removeCommittedTransaction(tx.localUUID);
      } else {
        // Exhausted retries — mark SYNC_FAILED
        // STORY-5.3/5.4 will handle surfacing this to the user
        await updateTransactionStatus(
          tx.localUUID,
          'SYNC_FAILED',
          tx.retryCount + MAX_RETRIES
        );
      }

      // Refresh UI counts after each transaction (per-transaction checkpoint)
      await refreshCounts();
    }
  } finally {
    useSyncStatusStore.getState().setIsSyncing(false);
    isRunning = false;
  }
}

/**
 * Initialize the SyncEngine. Call once from app root (_layout.tsx).
 * Sets up NetInfo listener and AppState listener.
 */
export function initSyncEngine(): () => void {
  // Refresh counts on init
  void refreshCounts();

  // NetInfo: trigger sync on connectivity restore
  netInfoUnsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable) {
      void processQueue();
    }
  });

  // AppState: trigger sync when app comes to foreground
  const handleAppStateChange = (nextState: AppStateStatus) => {
    if (nextState === 'active') {
      void processQueue();
    }
  };

  const subscription = AppState.addEventListener('change', handleAppStateChange);
  appStateUnsubscribe = () => subscription.remove();

  // Return cleanup function
  return () => {
    netInfoUnsubscribe?.();
    appStateUnsubscribe?.();
  };
}

/**
 * Manually trigger a sync attempt.
 * Used by PendingTransactionsScreen retry button (STORY-5.4).
 */
export async function triggerSync(): Promise<void> {
  await processQueue();
}
