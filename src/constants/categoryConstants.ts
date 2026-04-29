/**
 * categoryConstants.ts
 *
 * Authoritative constants for category business rules on mobile.
 *
 * Source of truth: docs/schema-map.json
 */

/**
 * Stable name of the reserved Unknown category row seeded per tenant by MIGRATION-3.
 * Use this as the lookup key when resolving the per-tenant UUID at runtime:
 *   SELECT id FROM categories WHERE name = UNKNOWN_CATEGORY_NAME AND tenant_id = $tenantId
 *
 * Multiple tenants exist (confirmed 2026-04-28) — UNKNOWN_CATEGORY_ID is not a
 * single hardcoded UUID. Always resolve it via query scoped to the active tenant.
 */
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
