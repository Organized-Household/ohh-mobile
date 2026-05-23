# OHh Finance — Live Schema Map

**Project:** OHh Finance Mobile (Supabase project ref: `qcbhvzyfsbykdtipyzuk`)  
**Source:** Live DB introspection (2026-04-28) + migrations MIGRATION-1 through MIGRATION-4  
**Generated:** 2026-05-22  
**Warning:** This document is ground truth. Do not use Engineering Spec, artifact descriptions, or Decision Log as schema references where they conflict with this file.

---

## Critical Conventions (do not deviate)

| Convention | Value |
|---|---|
| Transaction date column | `transaction_date` (NOT `occurred_at`) |
| Transaction user FK | `created_by_user_id` (NOT `user_id`) |
| Missing columns | `transactions` has NO `source` or `status` column |
| Amount sign | income = positive, expense = negative stored in DB; `amount <> 0` enforced |
| Unknown category | Seeded per tenant via MIGRATION-3: `name='Unknown'`, `category_type='expense'`, `tag='standard'` |
| device_tokens | Table exists; unique constraint on `(user_id, platform)` |
| Tag slugs | Valid: `debts`, `standard`, `savings`, `investment`, `charity` — `debt_payment` does NOT exist |

---

## Tables (alphabetical)

- [accounts](#accounts)
- [budget\_lines](#budget_lines)
- [budgets](#budgets)
- [categories](#categories)
- [device\_tokens](#device_tokens)
- [expense\_types](#expense_types)
- [import\_batches](#import_batches)
- [import\_staging](#import_staging)
- [invitations](#invitations)
- [profiles](#profiles)
- [tenant\_members](#tenant_members)
- [tenants](#tenants)
- [transactions](#transactions)

---

## accounts

Unified account table. Replaces former savings\_accounts, investment\_accounts, debt\_accounts. Per-member via `user_id`.

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` |
| `tenant_id` | `uuid` | NOT NULL | — |
| `user_id` | `uuid` | NOT NULL | — |
| `account_kind` | `text` | NOT NULL | — |
| `name` | `text` | NOT NULL | — |
| `account_subtype` | `text` | NULL | — |
| `account_number_last4` | `text` | NULL | — |
| `target_amount` | `numeric` | NULL | — |
| `target_date` | `date` | NULL | — |
| `opening_balance` | `numeric` | NULL | — |
| `interest_rate` | `numeric` | NULL | — |
| `is_active` | `boolean` | NOT NULL | `true` |
| `created_at` | `timestamptz` | NOT NULL | `now()` |
| `updated_at` | `timestamptz` | NOT NULL | `now()` |

### Primary Key

`id`

### Foreign Keys

| Column | References |
|---|---|
| `tenant_id` | `tenants.id` |
| `user_id` | `auth.users.id` |

### Unique Constraints

- `(tenant_id, account_kind, lower(name))`

### Check Constraints

| Name | Expression |
|---|---|
| `accounts_account_kind_check` | `account_kind IN ('savings', 'investment', 'debt')` |
| `accounts_account_number_last4_check` | `account_number_last4 ~ '^[0-9]{4}$'` |

### Indexes

| Name | Columns | Notes |
|---|---|---|
| `accounts_pkey` | `id` | unique |
| `accounts_tenant_kind_name_uidx` | `(tenant_id, account_kind, lower(name))` | unique |
| `accounts_tenant_id_idx` | `tenant_id` | |
| `accounts_tenant_kind_idx` | `(tenant_id, account_kind)` | |
| `accounts_tenant_kind_active_idx` | `(tenant_id, account_kind, is_active)` | |
| `idx_accounts_user_id` | `(tenant_id, user_id, is_active)` | |

### RLS

**Enabled:** Yes

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| `accounts_select_for_tenant_members` | SELECT | authenticated | Active tenant member: `EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = accounts.tenant_id AND tm.user_id = auth.uid() AND tm.is_active = true)` | — |
| `accounts_insert_for_tenant_members` | INSERT | authenticated | — | `user_id = auth.uid()` AND active tenant member |
| `accounts_update_for_tenant_members` | UPDATE | authenticated | `user_id = auth.uid()` AND active tenant member | Same |
| `accounts_delete_for_tenant_members` | DELETE | authenticated | `user_id = auth.uid()` AND active tenant member | — |

> **Note:** SELECT reads ALL tenant accounts (not own-only). Mobile account picker must always apply `WHERE user_id = $targetUserId` in query — RLS does not scope it.

---

## budget_lines

Budget amounts per category per budget. Single `amount` column.

> **Warning:** `planned_income` and `planned_expense` columns no longer exist (dropped in migration `20260408000100`). Any code referencing them is wrong.

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` |
| `tenant_id` | `uuid` | NOT NULL | — |
| `budget_id` | `uuid` | NOT NULL | — |
| `category_id` | `uuid` | NOT NULL | — |
| `amount` | `numeric` | NOT NULL | `0` |
| `created_at` | `timestamptz` | NOT NULL | `now()` |

### Primary Key

`id`

### Foreign Keys

| Column | References |
|---|---|
| `tenant_id` | `tenants.id` |
| `budget_id` | `budgets.id` |
| `category_id` | `categories.id` |

### Unique Constraints

- `(tenant_id, budget_id, category_id)`

### Indexes

| Name | Columns | Notes |
|---|---|---|
| `budget_lines_pkey` | `id` | unique |
| `budget_lines_tenant_id_budget_id_category_id_key` | `(tenant_id, budget_id, category_id)` | unique |
| `idx_budget_lines_budget` | `budget_id` | |

### RLS

**Enabled:** Yes

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| `select lines via parent budget` | SELECT | authenticated | Own budget OR admin of same tenant (via parent `budgets` row) | — |
| `modify own lines` | ALL (INSERT/UPDATE/DELETE) | authenticated | Own budget only (`budget.user_id = auth.uid()`) | Same |

> **Note:** Admin can SELECT any member's budget_lines. Admin cannot INSERT/UPDATE/DELETE another member's budget_lines.

---

## budgets

Monthly budget per member. One row per `(tenant_id, user_id, month_start)`.

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` |
| `tenant_id` | `uuid` | NOT NULL | — |
| `user_id` | `uuid` | NOT NULL | — |
| `month_start` | `date` | NOT NULL | — |
| `created_at` | `timestamptz` | NOT NULL | `now()` |

### Primary Key

`id`

### Foreign Keys

| Column | References |
|---|---|
| `tenant_id` | `tenants.id` |
| `user_id` | `auth.users.id` |

### Unique Constraints

- `(tenant_id, user_id, month_start)`

### Indexes

| Name | Columns | Notes |
|---|---|---|
| `budgets_pkey` | `id` | unique |
| `budgets_tenant_id_user_id_month_start_key` | `(tenant_id, user_id, month_start)` | unique |
| `idx_budgets_lookup` | `(tenant_id, user_id, month_start)` | |

### RLS

**Enabled:** Yes

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| `select own or admin budgets` | SELECT | authenticated | `user_id = auth.uid()` OR admin of same tenant | — |
| `insert own budgets` | INSERT | authenticated | — | `user_id = auth.uid()` |
| `update own or admin budgets` | UPDATE | authenticated | `user_id = auth.uid()` OR admin of same tenant | Same |

> **Note:** `month_start` is DATE type — always first day of month (e.g. `2026-04-01`).

---

## categories

Income/expense categories. Tenant-scoped (shared household-wide, not per-member).

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` |
| `tenant_id` | `uuid` | NOT NULL | — |
| `name` | `text` | NOT NULL | — |
| `tag` | `text` | NOT NULL | `'standard'` |
| `category_type` | `text` | NOT NULL | — |
| `is_active` | `boolean` | NOT NULL | `true` |
| `created_at` | `timestamptz` | NOT NULL | `now()` |

### Primary Key

`id`

### Foreign Keys

| Column | References |
|---|---|
| `tenant_id` | `tenants.id` |
| `tag` | `expense_types.slug` (ON UPDATE CASCADE) |

### Unique Constraints

- `(tenant_id, lower(name))` — case-insensitive name uniqueness per tenant

### Check Constraints

| Name | Expression |
|---|---|
| `categories_category_type_check` | `category_type IN ('income', 'expense')` |

### Indexes

| Name | Columns | Notes |
|---|---|---|
| `categories_pkey` | `id` | unique |
| `categories_tenant_lower_name_uniq` | `(tenant_id, lower(name))` | unique |

### RLS

**Enabled:** Yes

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| `categories_select_for_tenant_members` | SELECT | authenticated | Active tenant member | — |
| `categories_insert_for_tenant_members` | INSERT | authenticated | — | Active tenant member |
| `categories_update_for_tenant_members` | UPDATE | authenticated | Active tenant member | Same |
| `categories_delete_for_tenant_members` | DELETE | authenticated | Active tenant member | — |

> **Notes:**
> - `tag` is a FK to `expense_types.slug` — never hardcode. Fetch valid slugs from `expense_types` at runtime.
> - `category_type` CHECK is `('income', 'expense')` only — not 'savings' or 'investment' (those are expressed via the `tag` FK).
> - Unknown category seeded per tenant via MIGRATION-3: `name='Unknown'`, `category_type='expense'`, `tag='standard'`. No `is_system` flag exists on this table.
> - Any active tenant member can INSERT/UPDATE/DELETE categories — not admin-only.

---

## device_tokens

Push notification token storage per user per platform. Created by MIGRATION-4.

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` |
| `user_id` | `uuid` | NOT NULL | — |
| `tenant_id` | `uuid` | NOT NULL | — |
| `expo_push_token` | `text` | NOT NULL | — |
| `platform` | `text` | NOT NULL | — |
| `created_at` | `timestamptz` | NOT NULL | `now()` |
| `updated_at` | `timestamptz` | NOT NULL | `now()` |

### Primary Key

`id`

### Foreign Keys

| Column | References |
|---|---|
| `user_id` | `auth.users.id` ON DELETE CASCADE |
| `tenant_id` | `tenants.id` ON DELETE CASCADE |

### Unique Constraints

- `(user_id, platform)` — one token per user per platform

### Check Constraints

| Name | Expression |
|---|---|
| `device_tokens_platform_check` | `platform IN ('ios', 'android')` |

### Indexes

| Name | Columns | Notes |
|---|---|---|
| `device_tokens_pkey` | `id` | unique |
| `device_tokens_user_id_platform_key` | `(user_id, platform)` | unique |
| `idx_device_tokens_user_id` | `user_id` | |
| `idx_device_tokens_tenant_id` | `tenant_id` | |

### RLS

**Enabled:** Yes

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| `device_tokens_member_own` | ALL | authenticated | `user_id = auth.uid()` | `user_id = auth.uid()` |

> **Note:** Use UPSERT (`ON CONFLICT (user_id, platform) DO UPDATE`) to register or refresh a token.

---

## expense_types

Dynamic tag vocabulary for categories. System-wide — NOT tenant-scoped.

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` |
| `name` | `text` | NOT NULL | — |
| `slug` | `text` | NOT NULL | — |
| `is_active` | `boolean` | NOT NULL | `true` |
| `is_system` | `boolean` | NOT NULL | `false` |
| `sort_order` | `integer` | NOT NULL | `0` |
| `created_at` | `timestamptz` | NOT NULL | `now()` |

### Primary Key

`id`

### Unique Constraints

- `slug`

### Indexes

| Name | Columns | Notes |
|---|---|---|
| `expense_types_pkey` | `id` | unique |
| `expense_types_slug_uniq` | `slug` | unique |

### RLS

**Enabled:** Yes

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| `expense_types_select_authenticated` | SELECT | authenticated | `true` | — |

### Seeded Rows

| id | name | slug | is_system | sort_order |
|---|---|---|---|---|
| `910fbded-d6c6-40a0-a19c-5f577f8bc514` | Debts | `debts` | false | 0 |
| `26b580f9-f3ad-4537-aaa4-2a74d2506a02` | Standard | `standard` | true | 1 |
| `0b68f7c9-9b8a-40b5-8cc2-dbf199e2168f` | Savings | `savings` | true | 2 |
| `4253d515-abf1-47bc-97e8-95f4c5cf5d45` | Investment | `investment` | true | 3 |
| `516bee19-dce0-4e5a-a2d6-ef7fd4c2c8e4` | Charity | `charity` | false | 4 |

> **Warning:** `debt_payment` does NOT exist as a slug. The correct slug is `debts`. Never hardcode slugs — always fetch `is_active = true` rows at runtime.

---

## import_batches

CSV import batch tracking. Web-only — not used by mobile v1.

### RLS

**Enabled:** (web-only; not introspected for mobile schema map)

> Full column list not captured — web-only table.

---

## import_staging

CSV import pending rows before posting to transactions. Web-only — not used by mobile v1.

### RLS

**Enabled:** (web-only; not introspected for mobile schema map)

> Full column list not captured — web-only table.

---

## invitations

Member invite lifecycle. Web-only — not used by mobile v1.

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` |
| `tenant_id` | `uuid` | NOT NULL | — |
| `email` | `text` | NOT NULL | — |
| `role` | `text` | NOT NULL | `'member'` |
| `status` | `text` | NOT NULL | `'pending'` |
| `invited_by` | `uuid` | NOT NULL | — |
| `invited_at` | `timestamptz` | NOT NULL | `now()` |
| `accepted_at` | `timestamptz` | NULL | — |

### Primary Key

`id`

### Foreign Keys

| Column | References |
|---|---|
| `tenant_id` | `tenants.id` |

### Check Constraints

| Name | Expression |
|---|---|
| `invitations_role_check` | `role IN ('admin', 'member')` |
| `invitations_status_check` | `status IN ('pending', 'accepted', 'revoked')` |

---

## profiles

User display info. Soft-delete via `is_active`.

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `user_id` | `uuid` | NOT NULL | — |
| `display_name` | `text` | NULL | — |
| `first_name` | `text` | NULL | — |
| `last_name` | `text` | NULL | — |
| `is_active` | `boolean` | NOT NULL | `true` |

### Primary Key

`user_id`

### Foreign Keys

| Column | References |
|---|---|
| `user_id` | `auth.users.id` |

### Indexes

| Name | Columns | Notes |
|---|---|---|
| `profiles_pkey` | `user_id` | unique |
| `idx_profiles_active` | `(user_id, is_active)` | |

### RLS

**Enabled:** Yes

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| `profiles_select_self` | SELECT | authenticated | `auth.uid() = user_id` | — |
| `profiles_select_tenant_admin` | SELECT | authenticated | Admin can read ALL profiles of members in their household (JOIN via `tenant_members`) | — |
| `profiles_insert_self` | INSERT | authenticated | — | `user_id = auth.uid()` |
| `profiles_update_self` | UPDATE | authenticated | `user_id = auth.uid()` | Same |

> **Note:** `display_name` is the canonical display field for mobile. `first_name` / `last_name` are supplementary and nullable.

---

## tenant_members

Household membership with roles. Soft-delete via `is_active`.

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `tenant_id` | `uuid` | NOT NULL | — |
| `user_id` | `uuid` | NOT NULL | — |
| `role` | `text` | NOT NULL | — |
| `is_active` | `boolean` | NOT NULL | `true` |
| `created_at` | `timestamptz` | NOT NULL | `now()` |

### Primary Key

`(tenant_id, user_id)`

### Foreign Keys

| Column | References |
|---|---|
| `tenant_id` | `tenants.id` |
| `user_id` | `auth.users.id` |

### Check Constraints

| Name | Expression |
|---|---|
| `tenant_members_role_check` | `role IN ('admin', 'member')` |

### Indexes

| Name | Columns | Notes |
|---|---|---|
| `tenant_members_pkey` | `(tenant_id, user_id)` | unique |
| `idx_tenant_members_user_id` | `user_id` | |
| `idx_tenant_members_tenant_id` | `tenant_id` | |
| `idx_tenant_members_active` | `(tenant_id, is_active)` | |

### RLS

**Enabled:** Yes

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| `tenant_members_select_self` | SELECT | authenticated | `user_id = auth.uid()` | — |
| `tenant_members_select_admin` | SELECT | authenticated | `EXISTS (SELECT 1 FROM tenant_members admin_tm WHERE admin_tm.tenant_id = tenant_members.tenant_id AND admin_tm.user_id = auth.uid() AND admin_tm.role = 'admin' AND admin_tm.is_active = true)` | — |

> **Notes:**
> - `tenant_members_select_admin` was added by MIGRATION-2. Before this migration, admins could not list household members.
> - Always filter `is_active = true` to exclude soft-deleted members.

---

## tenants

Household registry. One row per household.

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` |
| `alias` | `text` | NOT NULL | — |
| `created_at` | `timestamptz` | NOT NULL | `now()` |

### Primary Key

`id`

### Unique Constraints

- `alias`

### Indexes

| Name | Columns | Notes |
|---|---|---|
| `tenants_pkey` | `id` | unique |
| `tenants_alias_key` | `alias` | unique |

### RLS

**Enabled:** Yes

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| `tenants_select_member` | SELECT | authenticated | Active member of tenant: `EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = tenants.id AND tm.user_id = auth.uid() AND tm.is_active = true)` | — |

> **Note:** No INSERT/UPDATE/DELETE from mobile. Read-only.

---

## transactions

Full transaction record. Per-member via `created_by_user_id`.

> **Warnings:**
> - Date column is `transaction_date` — NOT `occurred_at`.
> - User FK is `created_by_user_id` — NOT `user_id`.
> - NO `source` or `status` columns exist — do not include in INSERT payloads.

### Columns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` |
| `tenant_id` | `uuid` | NOT NULL | — |
| `created_by_user_id` | `uuid` | NOT NULL | — |
| `category_id` | `uuid` | NOT NULL | — |
| `description` | `text` | NOT NULL | — |
| `amount` | `numeric` | NOT NULL | — |
| `transaction_date` | `date` | NOT NULL | — |
| `transaction_type` | `text` | NOT NULL | — |
| `linked_account_id` | `uuid` | NULL | — |
| `payment_source_account_id` | `uuid` | NULL | — |
| `created_at` | `timestamptz` | NOT NULL | `now()` |

### Primary Key

`id`

### Foreign Keys

| Column | References |
|---|---|
| `tenant_id` | `tenants.id` |
| `category_id` | `categories.id` |
| `linked_account_id` | `accounts.id` |
| `payment_source_account_id` | `accounts.id` |

> `created_by_user_id` references `auth.users.id` logically but FK is not enforced at DB level.

### Check Constraints

| Name | Expression |
|---|---|
| `transactions_amount_check` | `amount <> 0` |
| `transactions_transaction_type_check` | `transaction_type IN ('income', 'expense')` |
| `transactions_linked_not_same_as_payment_source_chk` | `linked_account_id IS NULL OR payment_source_account_id IS NULL OR linked_account_id <> payment_source_account_id` |

### Indexes

| Name | Columns | Notes |
|---|---|---|
| `transactions_pkey` | `id` | unique |
| `transactions_tenant_id_idx` | `tenant_id` | |
| `transactions_category_id_idx` | `category_id` | |
| `transactions_transaction_date_idx` | `transaction_date` | |
| `idx_transactions_linked_account_id` | `linked_account_id` | |
| `idx_transactions_payment_source_account_id` | `payment_source_account_id` | |

### RLS

**Enabled:** Yes

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| `transactions_select_for_tenant_members` | SELECT | authenticated | Active tenant member (reads ALL tenant transactions — not own-only) | — |
| `transactions_insert_for_tenant_members` | INSERT | authenticated | — | `created_by_user_id = auth.uid()` AND active tenant member |
| `transactions_insert_admin_on_behalf_of` | INSERT | authenticated | — | Caller is active admin of same tenant AND `created_by_user_id` is active member of same tenant |
| `transactions_update_for_tenant_members` | UPDATE | authenticated | Active tenant member | Same |
| `transactions_delete_for_tenant_members` | DELETE | authenticated | Active tenant member | — |

> **Notes:**
> - `transactions_insert_admin_on_behalf_of` was added by MIGRATION-1. Before this migration, admins could not insert on behalf of other members (STORY-4.3 was blocked).
> - `amount` sign convention: income = positive, expense = negative stored in DB; zero is rejected by CHECK constraint.
> - `id` is UUID — use client-generated UUIDv4 as the PK for offline sync (maps directly, no idempotency_key needed).

### Mobile INSERT Payload

```json
{
  "id":                       "<client UUIDv4 — maps directly to PK>",
  "tenant_id":                "<from session>",
  "created_by_user_id":       "<target member user_id>",
  "category_id":              "<selected UUID, or UNKNOWN_CATEGORY_ID>",
  "description":              "<user text, or '' if blank>",
  "amount":                   "<applySignConvention(amount, transaction_type) — never 0>",
  "transaction_date":         "<YYYY-MM-DD>",
  "transaction_type":         "income | expense",
  "linked_account_id":        "<UUID or null>",
  "payment_source_account_id": null
}
```

---

## auth.users (referenced columns)

Supabase Auth table — not in `public` schema. Mobile uses these columns by reference only.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK — referenced as FK in `tenant_members.user_id`, `profiles.user_id`, `budgets.user_id`, `accounts.user_id`, `device_tokens.user_id` |
| `email` | `text` | Used for invitation matching |

---

## Migration History

| ID | File | Purpose | Status |
|---|---|---|---|
| MIGRATION-1 | `20260428000001_mobile_admin_transaction_insert_rls.sql` | Additive RLS — admin INSERT transaction on behalf of any household member | Written — run by Joseph |
| MIGRATION-2 | `20260428000002_mobile_admin_tenant_members_select_rls.sql` | Additive RLS — admin SELECT all tenant_members in their household | Written — run by Joseph |
| MIGRATION-3 | `20260428000003_mobile_unknown_category_seed.sql` | Seed Unknown category row per tenant (data only, no schema change) | Written — run by Joseph |
| MIGRATION-4 | `20260428000004_mobile_device_tokens.sql` | Create device_tokens table with RLS | Written — run by Joseph |
