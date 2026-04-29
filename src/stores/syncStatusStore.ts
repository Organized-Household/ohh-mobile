import { create } from 'zustand';

/**
 * In-memory sync status for UI indicators.
 *
 * SyncStatusIcon reads pendingCount + failedCount from this store.
 * SyncEngine writes to this store after each operation.
 * AsyncStorage is NOT used — these are runtime counters only.
 * True source of truth is offlineStore (expo-file-system).
 */

interface SyncStatusState {
  pendingCount: number;
  failedCount: number;
  isSyncing: boolean;
  setPendingCount: (count: number) => void;
  setFailedCount: (count: number) => void;
  setIsSyncing: (syncing: boolean) => void;
  setCounts: (pending: number, failed: number) => void;
}

export const useSyncStatusStore = create<SyncStatusState>((set) => ({
  pendingCount: 0,
  failedCount: 0,
  isSyncing: false,

  setPendingCount: (pendingCount) => set({ pendingCount }),
  setFailedCount: (failedCount) => set({ failedCount }),
  setIsSyncing: (isSyncing) => set({ isSyncing }),
  setCounts: (pendingCount, failedCount) => set({ pendingCount, failedCount }),
}));
