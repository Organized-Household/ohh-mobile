/**
 * categoryConstants.ts
 *
 * Authoritative constants for category business rules on mobile.
 *
 * ⚠️ UNKNOWN_CATEGORY_ID must be set by product owner after running
 * MIGRATION-3 (supabase/migrations/20260428000003_mobile_unknown_category_seed.sql).
 *
 * To get the UUID: run the verification SELECT in MIGRATION-3 and copy
 * the value from the unknown_category_id column.
 *
 * Source of truth: docs/schema-map.json
 */

/**
 * The UUID of the reserved 'Unknown' category row in the categories table.
 * Used when a member submits a transaction without a known category.
 * Never hardcode category names in application logic — always use this constant.
 *
 * Set this value after running MIGRATION-3 in Supabase SQL Editor.
 */
export const UNKNOWN_CATEGORY_ID = 'REPLACE_WITH_UUID_FROM_MIGRATION_3' as const;

/** Reserved display name for the catch-all Unknown category seeded by MIGRATION-3. */
export const UNKNOWN_CATEGORY_NAME = 'Unknown' as const;

/**
 * Valid expense_types slugs as of 2026-04-28 (from live DB).
 * These are fetched at runtime from the expense_types table — do not
 * hardcode them in UI components. This list is for reference only.
 *
 * is_system = true  : standard, savings, investment (cannot be deleted)
 * is_system = false : debts, charity (can be deleted)
 *
 * ⚠️ 'debt_payment' is NOT a valid slug. Use 'debts'.
 */
export const KNOWN_EXPENSE_TYPE_SLUGS = [
  'debts',
  'standard',
  'savings',
  'investment',
  'charity',
] as const;

export type ExpenseTypeSlug = typeof KNOWN_EXPENSE_TYPE_SLUGS[number];
