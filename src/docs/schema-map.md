# OHh Finance — Live Schema Map

**Project:** OHh Finance Mobile — Organized-Household Org / **ohh-dev** (Supabase ref: `qcbhvzyfsbykdtipyzuk`)
**Introspected:** 2026-05-22 via Supabase Management API (live SQL queries against `information_schema`, `pg_indexes`, `pg_policies`, `pg_class`)
**Ground truth:** This document overrides Engineering Spec, Decision Log, web spec, and mobile seed artifacts wherever they conflict.

---

## Critical Conventions

| Fact | Value |
|---|---|
| Transaction date column | `transaction_date` (NOT `occurred_at`) |
| Transaction user FK | `created_by_user_id` (NOT `user_id`) |
| Phantom columns | `transactions` has **no** `source` or `status` column |
| Amount sign | income = positive, expense = negative; `amount <> 0` enforced by DB |
| Unknown category | Seeded per tenant: `name='Unknown'`, `category_type='expense'`, `tag='standard'` |
| Tag slugs | Valid: `debts`, `standard`, `savings`, `investment`, `charity` — `debt_payment` does **not** exist |
| `device_tokens` | Exists; unique on `(user_id, platform)` |
| Dropped columns | `transactions` ordinal positions 10–15 are gaps (columns were dropped in a prior migration); current columns end at pos 9 then resume at 16, 17 |

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

| # | Column | Type | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `uuid` | NOT NULL | `gen_random_uuid()` |
| 2 | `tenant_id` | `uuid` | NOT NULL | — |
| 3 | `account_kind` | `text` | NOT NULL | — |
| 4 | `name` | `text` | NOT NULL | — |
| 5 | `account_subtype` | `text` | NULL | — |
| 6 | `account_number_last4` | `text` | NULL | — |
| 7 | `target_amount` | `numeric(12,2)` | NULL | — |
| 8 | `target_date` | `date` | NULL | — |
| 9 | `is_active` | `boolean` | NOT NULL | `true` |
| 10 | `created_at` | `timestamptz` | NOT NULL | `now()` |
| 11 | `updated_at` | `timestamptz` | NOT NULL | `now()` |
| 12 | `opening_balance` | `numeric(12,2)` | NULL | — |
| 13 | `interest_rate` | `numeric(5,4)` | NULL | — |
| 14 | `user_id` | `uuid` | NOT NULL | — |

### Primary Key

`id`

### Foreign Keys

| Column | References | On Delete |
|---|---|---|
| `tenant_id` | `tenants.id` | CASCADE |
| `user_id` | `auth.users.id` | SET NULL |

### Unique Constraints

| Name | Columns |
|---|---|
| `accounts_tenant_kind_name_uidx` | `(tenant_id, account_kind, lower(name))` |

### Check Constraints

| Name | Expression |
|---|---|
| `accounts_account_kind_check` | `account_kind = ANY (ARRAY['savings', 'investment', 'debt'])` |
| `accounts_account_number_last4_check` | `account_number_last4 ~ '^[0-9]{4}$'` |

### Indexes

| Name | Definition |
|---|---|
| `accounts_pkey` | `UNIQUE BTREE (id)` |
| `accounts_tenant_kind_name_uidx` | `UNIQUE BTREE (tenant_id, account_kind, lower(name))` |
| `accounts_tenant_id_idx` | `BTREE (tenant_id)` |
| `accounts_tenant_kind_idx` | `BTREE (tenant_id, account_kind)` |
| `accounts_tenant_kind_active_idx` | `BTREE (tenant_id, account_kind, is_active)` |
| `idx_accounts_user_id` | `BTREE (tenant_id, user_id, is_active)` |

### RLS

**Enabled:** Yes (not forced)

| Policy | Cmd | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| `accounts_select_for_tenant_members` | SELECT | authenticated | `EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = accounts.tenant_id AND tm.user_id = auth.uid())` | — |
| `accounts_insert_for_tenant_members` | INSERT | authenticated | — | `(user_id = auth.uid()) AND EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = accounts.tenant_id AND tm.user_id = auth.uid() AND tm.is_active = true)` |
| `accounts_update_for_tenant_members` | UPDATE | authenticated | `(user_id = auth.uid()) AND EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = accounts.tenant_id AND tm.user_id = auth.uid() AND tm.is_active = true)` | — |
| `accounts_delete_for_tenant_members` | DELETE | authenticated | `(user_id = auth.uid()) AND EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = accounts.tenant_id AND tm.user_id = auth.uid() AND tm.is_active = true)` | — |

> **Note:** SELECT policy does **not** check `is_active` on `tenant_members` — any tenant member (active or not) can read accounts. INSERT/UPDATE/DELETE require `is_active = true`.
> No balance column — `opening_balance` is user-entered; running balance must be computed from transactions.

---

## budget_lines

Budget amounts per category per budget. Single `amount` column (`planned_income`/`planned_expense` were dropped).

### Columns

| # | Column | Type | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `uuid` | NOT NULL | `gen_random_uuid()` |
| 2 | `tenant_id` | `uuid` | NOT NULL | — |
| 3 | `budget_id` | `uuid` | NOT NULL | — |
| 4 | `category_id` | `uuid` | NOT NULL | — |
| 7 | `created_at` | `timestamptz` | NOT NULL | `now()` |
| 8 | `amount` | `numeric(12,2)` | NOT NULL | `0` |

> Ordinal positions 5–6 are gaps from dropped columns.

### Primary Key

`id`

### Foreign Keys

| Column | References | On Delete |
|---|---|---|
| `tenant_id` | `tenants.id` | CASCADE |
| `budget_id` | `budgets.id` | CASCADE |
| `category_id` | `categories.id` | RESTRICT |

### Unique Constraints

| Name | Columns |
|---|---|
| `budget_lines_tenant_id_budget_id_category_id_key` | `(tenant_id, budget_id, category_id)` |

### Indexes

| Name | Definition |
|---|---|
| `budget_lines_pkey` | `UNIQUE BTREE (id)` |
| `budget_lines_tenant_id_budget_id_category_id_key` | `UNIQUE BTREE (tenant_id, budget_id, category_id)` |
| `idx_budget_lines_budget` | `BTREE (budget_id)` |

### RLS

**Enabled:** Yes (not forced)

| Policy | Cmd | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| `select lines via parent budget` | SELECT | public | `EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_lines.budget_id AND (b.user_id = auth.uid() OR EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = b.tenant_id AND tm.user_id = auth.uid() AND tm.role = 'admin')))` | — |
| `modify own lines` | ALL | public | `EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_lines.budget_id AND b.user_id = auth.uid())` | — |

> Policies use role `public` (not `authenticated`). Admin can SELECT any member's budget\_lines; admin cannot INSERT/UPDATE/DELETE another member's lines.

---

## budgets

Monthly budget per member. One row per `(tenant_id, user_id, month_start)`.

### Columns

| # | Column | Type | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `uuid` | NOT NULL | `gen_random_uuid()` |
| 2 | `tenant_id` | `uuid` | NOT NULL | — |
| 3 | `user_id` | `uuid` | NOT NULL | — |
| 4 | `month_start` | `date` | NOT NULL | — |
| 5 | `created_at` | `timestamptz` | NOT NULL | `now()` |

### Primary Key

`id`

### Foreign Keys

| Column | References | On Delete |
|---|---|---|
| `tenant_id` | `tenants.id` | CASCADE |
| `user_id` | `auth.users.id` | CASCADE |

### Unique Constraints

| Name | Columns |
|---|---|
| `budgets_tenant_id_user_id_month_start_key` | `(tenant_id, user_id, month_start)` |

### Indexes

| Name | Definition |
|---|---|
| `budgets_pkey` | `UNIQUE BTREE (id)` |
| `budgets_tenant_id_user_id_month_start_key` | `UNIQUE BTREE (tenant_id, user_id, month_start)` |
| `idx_budgets_lookup` | `BTREE (tenant_id, user_id, month_start)` |

### RLS

**Enabled:** Yes (not forced)

| Policy | Cmd | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| `select own or admin budgets` | SELECT | public | `(user_id = auth.uid()) OR EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = budgets.tenant_id AND tm.user_id = auth.uid() AND tm.role = 'admin')` | — |
| `insert own budgets` | INSERT | public | — | `user_id = auth.uid()` |
| `update own or admin budgets` | UPDATE | public | `(user_id = auth.uid()) OR EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = budgets.tenant_id AND tm.user_id = auth.uid() AND tm.role = 'admin')` | — |

> `month_start` is `date` — always first day of month (e.g. `2026-04-01`).

---

## categories

Income/expense categories. Tenant-scoped, shared household-wide.

### Columns

| # | Column | Type | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `uuid` | NOT NULL | `gen_random_uuid()` |
| 2 | `tenant_id` | `uuid` | NOT NULL | — |
| 3 | `name` | `text` | NOT NULL | — |
| 4 | `tag` | `text` | NOT NULL | `'standard'::text` |
| 5 | `is_active` | `boolean` | NOT NULL | `true` |
| 6 | `created_at` | `timestamptz` | NOT NULL | `now()` |
| 7 | `category_type` | `text` | NOT NULL | — |

### Primary Key

`id`

### Foreign Keys

| Column | References | On Update | On Delete |
|---|---|---|---|
| `tenant_id` | `tenants.id` | NO ACTION | CASCADE |
| `tag` | `expense_types.slug` | CASCADE | RESTRICT |

### Unique Constraints

| Name | Columns |
|---|---|
| `categories_tenant_lower_name_uniq` | `(tenant_id, lower(name))` |

### Check Constraints

| Name | Expression |
|---|---|
| `categories_category_type_check` | `category_type = ANY (ARRAY['income', 'expense'])` |

### Indexes

| Name | Definition |
|---|---|
| `categories_pkey` | `UNIQUE BTREE (id)` |
| `categories_tenant_lower_name_uniq` | `UNIQUE BTREE (tenant_id, lower(name))` |

### RLS

**Enabled:** Yes (not forced)

| Policy | Cmd | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| `categories_select_for_tenant_members` | SELECT | authenticated | `EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = categories.tenant_id AND tm.user_id = auth.uid())` | — |
| `categories_insert_for_tenant_members` | INSERT | authenticated | — | `EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = categories.tenant_id AND tm.user_id = auth.uid() AND tm.is_active = true)` |
| `categories_update_for_tenant_members` | UPDATE | authenticated | `EXISTS (...is_active = true)` | `EXISTS (...is_active = true)` |
| `categories_delete_for_tenant_members` | DELETE | authenticated | `EXISTS (...is_active = true)` | — |

> `tag` FK has ON UPDATE CASCADE — if a slug changes in `expense_types`, `categories.tag` updates automatically.
> Any active tenant member can INSERT/UPDATE/DELETE — not admin-only.
> SELECT does not check `is_active` on `tenant_members`.
> Unknown category seeded per tenant: `name='Unknown'`, `category_type='expense'`, `tag='standard'`. No `is_system` flag on this table.

---

## device_tokens

Push notification token storage per user per platform.

### Columns

| # | Column | Type | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `uuid` | NOT NULL | `gen_random_uuid()` |
| 2 | `user_id` | `uuid` | NOT NULL | — |
| 3 | `tenant_id` | `uuid` | NOT NULL | — |
| 4 | `expo_push_token` | `text` | NOT NULL | — |
| 5 | `platform` | `text` | NOT NULL | — |
| 6 | `created_at` | `timestamptz` | NOT NULL | `now()` |
| 7 | `updated_at` | `timestamptz` | NOT NULL | `now()` |

### Primary Key

`id`

### Foreign Keys

| Column | References | On Delete |
|---|---|---|
| `user_id` | `auth.users.id` | CASCADE |
| `tenant_id` | `tenants.id` | CASCADE |

### Unique Constraints

| Name | Columns |
|---|---|
| `device_tokens_user_id_platform_key` | `(user_id, platform)` |

### Check Constraints

| Name | Expression |
|---|---|
| `device_tokens_platform_check` | `platform = ANY (ARRAY['ios', 'android'])` |

### Indexes

| Name | Definition |
|---|---|
| `device_tokens_pkey` | `UNIQUE BTREE (id)` |
| `device_tokens_user_id_platform_key` | `UNIQUE BTREE (user_id, platform)` |
| `idx_device_tokens_user_id` | `BTREE (user_id)` |
| `idx_device_tokens_tenant_id` | `BTREE (tenant_id)` |

### RLS

**Enabled:** Yes (not forced)

| Policy | Cmd | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| `device_tokens_member_own` | ALL | authenticated | `user_id = auth.uid()` | `user_id = auth.uid()` |

> Use UPSERT (`ON CONFLICT (user_id, platform) DO UPDATE SET expo_push_token = EXCLUDED.expo_push_token, updated_at = now()`) to register or refresh.

---

## expense_types

Dynamic tag vocabulary for categories. System-wide — not tenant-scoped.

### Columns

| # | Column | Type | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `uuid` | NOT NULL | `gen_random_uuid()` |
| 2 | `name` | `text` | NOT NULL | — |
| 3 | `slug` | `text` | NOT NULL | — |
| 4 | `is_active` | `boolean` | NOT NULL | `true` |
| 5 | `is_system` | `boolean` | NOT NULL | `false` |
| 6 | `sort_order` | `integer` | NOT NULL | `0` |
| 7 | `created_at` | `timestamptz` | NOT NULL | `now()` |

### Primary Key

`id`

### Unique Constraints

| Name | Columns |
|---|---|
| `expense_types_slug_uniq` | `slug` |

### Indexes

| Name | Definition |
|---|---|
| `expense_types_pkey` | `UNIQUE BTREE (id)` |
| `expense_types_slug_uniq` | `UNIQUE BTREE (slug)` |

### RLS

**Enabled:** Yes (not forced)

| Policy | Cmd | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| `expense_types_select_authenticated` | SELECT | authenticated | `true` | — |

### Live Seeded Rows

| id | name | slug | is_system | sort_order |
|---|---|---|---|---|
| `910fbded-d6c6-40a0-a19c-5f577f8bc514` | Debts | `debts` | false | 0 |
| `26b580f9-f3ad-4537-aaa4-2a74d2506a02` | Standard | `standard` | true | 1 |
| `0b68f7c9-9b8a-40b5-8cc2-dbf199e2168f` | Savings | `savings` | true | 2 |
| `4253d515-abf1-47bc-97e8-95f4c5cf5d45` | Investment | `investment` | true | 3 |
| `516bee19-dce0-4e5a-a2d6-ef7fd4c2c8e4` | Charity | `charity` | false | 4 |

> `debt_payment` does **not** exist. The correct slug is `debts`. Never hardcode slugs — always fetch `is_active = true` rows at runtime.

---

## import_batches

CSV import batch tracking. Web-only — not used by mobile v1.

### Columns

| # | Column | Type | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `uuid` | NOT NULL | `gen_random_uuid()` |
| 2 | `tenant_id` | `uuid` | NOT NULL | — |
| 3 | `original_filename` | `text` | NULL | — |
| 4 | `imported_by` | `uuid` | NOT NULL | — |
| 5 | `status` | `text` | NOT NULL | `'created'::text` |
| 6 | `created_at` | `timestamptz` | NOT NULL | `now()` |

### Primary Key

`id`

### Foreign Keys

| Column | References | On Delete |
|---|---|---|
| `tenant_id` | `tenants.id` | CASCADE |
| `imported_by` | `auth.users.id` | NO ACTION |

### Check Constraints

| Name | Expression |
|---|---|
| `import_batches_status_check` | `status = ANY (ARRAY['created', 'stored_pending', 'completed', 'failed'])` |

### Indexes

| Name | Definition |
|---|---|
| `import_batches_pkey` | `UNIQUE BTREE (id)` |
| `idx_import_batches_tenant_id` | `BTREE (tenant_id)` |
| `idx_import_batches_tenant_status` | `BTREE (tenant_id, status)` |

### RLS

**Enabled:** Yes (not forced)

| Policy | Cmd | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| `tenant_isolation_import_batches` | ALL | public | `tenant_id IN (SELECT tenant_members.tenant_id FROM tenant_members WHERE tenant_members.user_id = auth.uid())` | Same |

---

## import_staging

CSV import rows pending review before posting to transactions. Web-only — not used by mobile v1.

### Columns

| # | Column | Type | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `uuid` | NOT NULL | `gen_random_uuid()` |
| 2 | `tenant_id` | `uuid` | NOT NULL | — |
| 3 | `import_batch_id` | `uuid` | NOT NULL | — |
| 4 | `occurred_at` | `date` | NOT NULL | — |
| 5 | `description` | `text` | NOT NULL | — |
| 6 | `amount` | `numeric(12,2)` | NOT NULL | — |
| 7 | `transaction_type` | `text` | NULL | — |
| 8 | `category_id` | `uuid` | NULL | — |
| 9 | `linked_account_id` | `uuid` | NULL | — |
| 10 | `payment_source_account_id` | `uuid` | NULL | — |
| 11 | `status` | `text` | NOT NULL | `'pending'::text` |
| 12 | `created_at` | `timestamptz` | NOT NULL | `now()` |

> Note: staging table uses `occurred_at` (not `transaction_date`) — this is the pre-posting date field.

### Primary Key

`id`

### Foreign Keys

| Column | References | On Delete |
|---|---|---|
| `tenant_id` | `tenants.id` | CASCADE |
| `import_batch_id` | `import_batches.id` | CASCADE |
| `category_id` | `categories.id` | SET NULL |
| `linked_account_id` | `accounts.id` | SET NULL |
| `payment_source_account_id` | `accounts.id` | SET NULL |

### Check Constraints

| Name | Expression |
|---|---|
| `import_staging_transaction_type_check` | `transaction_type = ANY (ARRAY['income', 'expense'])` |
| `import_staging_status_check` | `status = ANY (ARRAY['pending', 'posted'])` |
| `chk_different_accounts` | `linked_account_id IS NULL OR payment_source_account_id IS NULL OR linked_account_id <> payment_source_account_id` |

### Indexes

| Name | Definition |
|---|---|
| `import_staging_pkey` | `UNIQUE BTREE (id)` |
| `idx_import_staging_tenant_id` | `BTREE (tenant_id)` |
| `idx_import_staging_tenant_batch` | `BTREE (tenant_id, import_batch_id)` |
| `idx_import_staging_tenant_occurred` | `BTREE (tenant_id, occurred_at)` |
| `idx_import_staging_tenant_status` | `BTREE (tenant_id, status)` |

### RLS

**Enabled:** Yes (not forced)

| Policy | Cmd | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| `tenant_isolation_import_staging` | ALL | public | `tenant_id IN (SELECT tenant_members.tenant_id FROM tenant_members WHERE tenant_members.user_id = auth.uid())` | Same |

---

## invitations

Member invite lifecycle. Web-only — not used by mobile v1.

### Columns

| # | Column | Type | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `uuid` | NOT NULL | `gen_random_uuid()` |
| 2 | `tenant_id` | `uuid` | NOT NULL | — |
| 3 | `email` | `text` | NOT NULL | — |
| 4 | `role` | `text` | NOT NULL | `'member'::text` |
| 5 | `status` | `text` | NOT NULL | `'pending'::text` |
| 6 | `invited_by` | `uuid` | NOT NULL | — |
| 7 | `invited_at` | `timestamptz` | NOT NULL | `now()` |
| 8 | `accepted_at` | `timestamptz` | NULL | — |

### Primary Key

`id`

### Foreign Keys

| Column | References | On Delete |
|---|---|---|
| `tenant_id` | `tenants.id` | CASCADE |
| `invited_by` | `auth.users.id` | NO ACTION |

### Unique Constraints

| Name | Columns |
|---|---|
| `invitations_tenant_email_pending_uniq` | `(tenant_id, email, status)` |

### Check Constraints

| Name | Expression |
|---|---|
| `invitations_role_check` | `role = ANY (ARRAY['admin', 'member'])` |
| `invitations_status_check` | `status = ANY (ARRAY['pending', 'accepted', 'revoked'])` |

### Indexes

| Name | Definition |
|---|---|
| `invitations_pkey` | `UNIQUE BTREE (id)` |
| `invitations_tenant_email_pending_uniq` | `UNIQUE BTREE (tenant_id, email, status)` |

### RLS

**Enabled:** Yes (not forced)

| Policy | Cmd | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| `invitations_select_admin` | SELECT | authenticated | `EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = invitations.tenant_id AND tm.user_id = auth.uid() AND tm.role = 'admin')` | — |
| `invitations_insert_admin` | INSERT | authenticated | — | `EXISTS (...tm.role = 'admin')` |
| `invitations_update_admin` | UPDATE | authenticated | `EXISTS (...tm.role = 'admin')` | — |

---

## profiles

User display info. Soft-delete via `is_active`.

### Columns

| # | Column | Type | Nullable | Default |
|---|---|---|---|---|
| 1 | `user_id` | `uuid` | NOT NULL | — |
| 2 | `display_name` | `text` | NULL | — |
| 3 | `first_name` | `text` | NULL | — |
| 4 | `last_name` | `text` | NULL | — |
| 5 | `is_active` | `boolean` | NOT NULL | `true` |

### Primary Key

`user_id`

### Foreign Keys

| Column | References | On Delete |
|---|---|---|
| `user_id` | `auth.users.id` | CASCADE |

### Indexes

| Name | Definition |
|---|---|
| `profiles_pkey` | `UNIQUE BTREE (user_id)` |
| `idx_profiles_active` | `BTREE (user_id, is_active)` |

### RLS

**Enabled:** Yes (not forced)

| Policy | Cmd | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| `profiles_select_self` | SELECT | authenticated | `auth.uid() = user_id` | — |
| `profiles_select_tenant_admin` | SELECT | authenticated | `EXISTS (SELECT 1 FROM tenant_members admin_tm JOIN tenant_members member_tm ON member_tm.tenant_id = admin_tm.tenant_id WHERE admin_tm.user_id = auth.uid() AND admin_tm.role = 'admin' AND member_tm.user_id = profiles.user_id)` | — |
| `profiles_insert_self` | INSERT | authenticated | — | `auth.uid() = user_id` |
| `profiles_update_self` | UPDATE | authenticated | `auth.uid() = user_id` | `auth.uid() = user_id` |

> `display_name` is the canonical display field for mobile. `first_name`/`last_name` are supplementary and nullable.

---

## tenant_members

Household membership with roles. Soft-delete via `is_active`.

### Columns

| # | Column | Type | Nullable | Default |
|---|---|---|---|---|
| 1 | `tenant_id` | `uuid` | NOT NULL | — |
| 2 | `user_id` | `uuid` | NOT NULL | — |
| 3 | `role` | `text` | NOT NULL | — |
| 4 | `created_at` | `timestamptz` | NOT NULL | `now()` |
| 5 | `is_active` | `boolean` | NOT NULL | `true` |

### Primary Key

`(tenant_id, user_id)`

### Foreign Keys

| Column | References | On Delete |
|---|---|---|
| `tenant_id` | `tenants.id` | CASCADE |
| `user_id` | `auth.users.id` | CASCADE |

### Check Constraints

| Name | Expression |
|---|---|
| `tenant_members_role_check` | `role = ANY (ARRAY['admin', 'member'])` |

### Indexes

| Name | Definition |
|---|---|
| `tenant_members_pkey` | `UNIQUE BTREE (tenant_id, user_id)` |
| `idx_tenant_members_user_id` | `BTREE (user_id)` |
| `idx_tenant_members_tenant_id` | `BTREE (tenant_id)` |
| `idx_tenant_members_active` | `BTREE (tenant_id, is_active)` |

### RLS

**Enabled:** Yes (not forced)

| Policy | Cmd | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| `tenant_members_select_self` | SELECT | authenticated | `user_id = auth.uid()` | — |
| `tenant_members_select_admin` | SELECT | authenticated | `is_admin_of_tenant(tenant_id)` | — |

> `tenant_members_select_admin` delegates to the `is_admin_of_tenant(uuid)` RPC function (see [Functions](#functions)).
> Always filter `is_active = true` in queries to exclude soft-deleted members.

---

## tenants

Household registry. One row per household.

### Columns

| # | Column | Type | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `uuid` | NOT NULL | `gen_random_uuid()` |
| 2 | `alias` | `text` | NOT NULL | — |
| 3 | `created_at` | `timestamptz` | NOT NULL | `now()` |

### Primary Key

`id`

### Unique Constraints

| Name | Columns |
|---|---|
| `tenants_alias_key` | `alias` |

### Indexes

| Name | Definition |
|---|---|
| `tenants_pkey` | `UNIQUE BTREE (id)` |
| `tenants_alias_key` | `UNIQUE BTREE (alias)` |

### RLS

**Enabled:** Yes (not forced)

| Policy | Cmd | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| `tenants_select_member` | SELECT | authenticated | `EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = tenants.id AND tm.user_id = auth.uid())` | — |

> No INSERT/UPDATE/DELETE from mobile. Read-only.

---

## transactions

Full transaction record. Per-member via `created_by_user_id`.

### Columns

| # | Column | Type | Nullable | Default |
|---|---|---|---|---|
| 1 | `id` | `uuid` | NOT NULL | `gen_random_uuid()` |
| 2 | `tenant_id` | `uuid` | NOT NULL | — |
| 3 | `created_by_user_id` | `uuid` | NOT NULL | — |
| 4 | `category_id` | `uuid` | NOT NULL | — |
| 5 | `description` | `text` | NOT NULL | — |
| 6 | `amount` | `numeric(12,2)` | NOT NULL | — |
| 7 | `transaction_date` | `date` | NOT NULL | — |
| 8 | `transaction_type` | `text` | NOT NULL | — |
| 9 | `created_at` | `timestamptz` | NOT NULL | `now()` |
| 16 | `linked_account_id` | `uuid` | NULL | — |
| 17 | `payment_source_account_id` | `uuid` | NULL | — |

> Ordinal positions 10–15 are gaps — columns were dropped in a prior migration. No `source` or `status` column exists or ever will.

### Primary Key

`id`

### Foreign Keys

| Column | References | On Delete |
|---|---|---|
| `tenant_id` | `tenants.id` | CASCADE |
| `created_by_user_id` | `auth.users.id` | CASCADE |
| `category_id` | `categories.id` | RESTRICT |
| `linked_account_id` | `accounts.id` | SET NULL |
| `payment_source_account_id` | `accounts.id` | SET NULL |

### Check Constraints

| Name | Expression |
|---|---|
| `transactions_amount_check` | `amount <> 0` |
| `transactions_transaction_type_check` | `transaction_type = ANY (ARRAY['income', 'expense'])` |
| `transactions_linked_not_same_as_payment_source_chk` | `linked_account_id IS NULL OR payment_source_account_id IS NULL OR linked_account_id <> payment_source_account_id` |

### Indexes

| Name | Definition |
|---|---|
| `transactions_pkey` | `UNIQUE BTREE (id)` |
| `transactions_tenant_id_idx` | `BTREE (tenant_id)` |
| `transactions_category_id_idx` | `BTREE (category_id)` |
| `transactions_transaction_date_idx` | `BTREE (transaction_date)` |
| `idx_transactions_linked_account_id` | `BTREE (linked_account_id)` |
| `idx_transactions_payment_source_account_id` | `BTREE (payment_source_account_id)` |

### RLS

**Enabled:** Yes (not forced)

| Policy | Cmd | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| `transactions_select_for_tenant_members` | SELECT | authenticated | `EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = transactions.tenant_id AND tm.user_id = auth.uid())` | — |
| `transactions_insert_for_tenant_members` | INSERT | authenticated | — | `(created_by_user_id = auth.uid()) AND EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = transactions.tenant_id AND tm.user_id = auth.uid())` |
| `transactions_insert_admin_on_behalf_of` | INSERT | authenticated | — | `EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = transactions.tenant_id AND tm.user_id = auth.uid() AND tm.role = 'admin' AND tm.is_active = true) AND EXISTS (SELECT 1 FROM tenant_members target_tm WHERE target_tm.tenant_id = transactions.tenant_id AND target_tm.user_id = transactions.created_by_user_id AND target_tm.is_active = true)` |
| `transactions_update_for_tenant_members` | UPDATE | authenticated | `EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = transactions.tenant_id AND tm.user_id = auth.uid())` | Same |
| `transactions_delete_for_tenant_members` | DELETE | authenticated | `EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.tenant_id = transactions.tenant_id AND tm.user_id = auth.uid())` | — |

> `amount` sign: income = positive, expense = negative stored in DB.
> `id` is UUID — use client-generated UUIDv4 as PK for offline sync (no separate idempotency_key needed).

### Mobile INSERT Payload

```json
{
  "id":                        "<client UUIDv4>",
  "tenant_id":                 "<from session>",
  "created_by_user_id":        "<target member user_id>",
  "category_id":               "<selected UUID or UNKNOWN_CATEGORY_ID>",
  "description":               "<user text, or '' if blank>",
  "amount":                    "<signed numeric, never 0>",
  "transaction_date":          "<YYYY-MM-DD>",
  "transaction_type":          "income | expense",
  "linked_account_id":         "<UUID or null>",
  "payment_source_account_id": null
}
```

---

## auth.users (referenced columns)

Supabase Auth — `auth` schema, not `public`. Referenced as FK target throughout.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK — FK target for `profiles.user_id`, `tenant_members.user_id`, `budgets.user_id`, `accounts.user_id`, `transactions.created_by_user_id`, `device_tokens.user_id`, `import_batches.imported_by`, `invitations.invited_by` |
| `email` | `text` | Used for invitation matching |

---

## Functions

All functions are in the `public` schema.

| Function | Signature | Returns | Notes |
|---|---|---|---|
| `is_admin_of_tenant` | `(tenant_uuid uuid)` | `boolean` | Used by `tenant_members_select_admin` RLS policy |
| `create_tenant_and_membership` | `(p_alias text, p_user_id uuid)` | `uuid` | Creates tenant + admin membership atomically; returns new tenant id |
| `rpc_dashboard_summary` | `(p_month_start date, p_user_id uuid)` | `json` | Aggregated dashboard data for a member's month |
| `get_latest_transactions_by_description` | `(p_tenant_id uuid, p_descriptions text[])` | `TABLE(description_key text, category_id uuid, transaction_type text, linked_account_id uuid, payment_source_account_id uuid)` | Smart-fill lookup: finds most recent transaction per description for auto-fill |
