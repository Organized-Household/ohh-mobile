/**
 * Offline transaction types for OHh Finance Mobile.
 *
 * OfflinePendingTransaction mirrors the Supabase transactions table
 * INSERT payload exactly. See docs/schema-map.json mobile_insert_payload.
 *
 * CRITICAL column names (from schema-map.json):
 * - transaction_date (NOT occurred_at)
 * - created_by_user_id (NOT user_id)
 * - NO source column
 * - NO status column
 * - amount must never be 0 (DB check constraint)
 */

export type SyncStatus =
  | 'PENDING_SYNC'
  | 'COMMITTED'
  | 'SYNC_FAILED';

export interface OfflinePendingTransaction {
  // Local tracking fields
  localUUID: string;          // UUIDv4 — maps directly to Supabase transactions.id
  syncStatus: SyncStatus;
  retryCount: number;         // Incremented on each failed attempt
  createdAt: string;          // ISO 8601 — when entered offline

  // Supabase transactions table columns (exact names from schema-map.json)
  id: string;                 // Same as localUUID — used as PK on insert
  tenant_id: string;
  created_by_user_id: string; // Target member's user_id
  category_id: string;
  description: string;        // Required — use '' if blank
  amount: number;             // Signed: income=positive, expense=negative, never 0
  transaction_date: string;   // ISO date YYYY-MM-DD
  transaction_type: 'income' | 'expense';
  linked_account_id: string | null;
  payment_source_account_id: string | null; // Always null for mobile v1
}

export interface OfflineStore {
  transactions: OfflinePendingTransaction[];
}
