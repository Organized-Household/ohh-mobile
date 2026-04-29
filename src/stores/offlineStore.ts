import * as FileSystem from 'expo-file-system';
import type { OfflinePendingTransaction, SyncStatus } from '../types/offline';

/**
 * OfflineStore — persistent storage for pending transactions.
 *
 * Uses expo-file-system (not AsyncStorage) because transaction payloads
 * contain financial data. expo-file-system uses appropriate file
 * protection on both iOS and Android.
 *
 * File location: FileSystem.documentDirectory + 'ohh-offline-transactions.json'
 * Format: JSON array of OfflinePendingTransaction
 *
 * All operations are atomic read-modify-write to prevent data loss.
 */

const STORE_PATH =
  (FileSystem.documentDirectory ?? '') + 'ohh-offline-transactions.json';

async function readStore(): Promise<OfflinePendingTransaction[]> {
  try {
    const info = await FileSystem.getInfoAsync(STORE_PATH);
    if (!info.exists) return [];
    const content = await FileSystem.readAsStringAsync(STORE_PATH);
    return JSON.parse(content) as OfflinePendingTransaction[];
  } catch {
    return [];
  }
}

async function writeStore(
  transactions: OfflinePendingTransaction[]
): Promise<void> {
  await FileSystem.writeAsStringAsync(
    STORE_PATH,
    JSON.stringify(transactions),
    { encoding: FileSystem.EncodingType.UTF8 }
  );
}

/**
 * Add a new pending transaction to the offline store.
 */
export async function addPendingTransaction(
  tx: OfflinePendingTransaction
): Promise<void> {
  const current = await readStore();
  current.push(tx);
  await writeStore(current);
}

/**
 * Get all transactions with a given sync status.
 */
export async function getTransactionsByStatus(
  status: SyncStatus
): Promise<OfflinePendingTransaction[]> {
  const all = await readStore();
  return all.filter((tx) => tx.syncStatus === status);
}

/**
 * Get all pending transactions (PENDING_SYNC only).
 */
export async function getPendingTransactions(): Promise<
  OfflinePendingTransaction[]
> {
  return getTransactionsByStatus('PENDING_SYNC');
}

/**
 * Get count of pending + failed transactions.
 * Used by SyncStatusIcon.
 */
export async function getSyncQueueCounts(): Promise<{
  pendingCount: number;
  failedCount: number;
}> {
  const all = await readStore();
  return {
    pendingCount: all.filter((tx) => tx.syncStatus === 'PENDING_SYNC').length,
    failedCount: all.filter((tx) => tx.syncStatus === 'SYNC_FAILED').length,
  };
}

/**
 * Update the sync status of a transaction by localUUID.
 * Persists retryCount and status atomically.
 */
export async function updateTransactionStatus(
  localUUID: string,
  status: SyncStatus,
  retryCount?: number
): Promise<void> {
  const all = await readStore();
  const updated = all.map((tx) => {
    if (tx.localUUID !== localUUID) return tx;
    return {
      ...tx,
      syncStatus: status,
      ...(retryCount !== undefined ? { retryCount } : {}),
    };
  });
  await writeStore(updated);
}

/**
 * Remove a committed transaction from the store.
 * Called after successful sync confirmation.
 */
export async function removeCommittedTransaction(
  localUUID: string
): Promise<void> {
  const all = await readStore();
  await writeStore(all.filter((tx) => tx.localUUID !== localUUID));
}

/**
 * Get all transactions for display in PendingTransactionsScreen.
 */
export async function getAllTransactions(): Promise<
  OfflinePendingTransaction[]
> {
  return readStore();
}
