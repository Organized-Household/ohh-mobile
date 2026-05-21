# Backend 80% Budget Alert Trigger Specification

## Context

STORY-8.2 (OHHFIN-135) requires a backend trigger that sends an Expo push notification when a transaction causes a member's spending in a category to reach or exceed 80% of that category's monthly budget.

## Implementation Scope

This trigger is **outside the mobile codebase** and must be implemented in the **existing Next.js + Supabase OHh-Finance web backend**.

## Requirements

### Trigger Location

Implement as a server action or API route handler in the Next.js backend, invoked **after each transaction write** to the `transactions` table.

### Calculation Logic

1. After a transaction is committed to `transactions` table:
   - Identify the `category_id`, `user_id` (member who owns the transaction), and `amount`
   - Fetch the current month's budget allocation for that `category_id` and `user_id` from the `budgets` table
   - Calculate total actual spending for that `category_id` and `user_id` for the current month (sum of all transaction amounts)
   - Compute `consumptionPercent = (totalActual / budgetedAmount) * 100`

2. If `consumptionPercent >= 80` AND this is the **first transaction** that crosses the 80% threshold:
   - Send a push notification to the member's registered device(s)

3. If `consumptionPercent < 80`, do nothing

4. If `consumptionPercent >= 80` but alert was already sent for this category+member+month, do not send duplicate

### Alert Deduplication Strategy

Option 1 (Recommended): Add a `budget_alerts_sent` table:

```sql
CREATE TABLE budget_alerts_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  category_id UUID NOT NULL REFERENCES categories(id),
  alert_month DATE NOT NULL, -- first day of the month
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category_id, alert_month)
);
```

Before sending, check if a row exists for `(user_id, category_id, current_month_first_day)`. If exists, skip. If not, send and insert.

Option 2: Track in-memory cache of sent alerts per server instance (not recommended for multi-instance deployments).

### Notification Payload Contract

The push notification sent to Expo Push Notification Service must conform to:

```json
{
  "to": "<expo_push_token from device_tokens table>",
  "sound": "default",
  "title": "Budget Alert",
  "body": "[Category name] is at 80% of your [Month] budget",
  "data": {
    "type": "80_PERCENT_ALERT",
    "categoryId": "<uuid>",
    "categoryName": "<string>",
    "consumptionPercent": <number>
  }
}
```

### Example Message Body

If category is "Groceries" and current month is May 2026:

```
"Groceries is at 80% of your May budget"
```

### Target Device Selection

Query `device_tokens` table for all rows where:
- `user_id = <member who owns the transaction>`
- `expo_push_token IS NOT NULL`

Send notification to all matching tokens (a member may have iOS and Android devices registered).

### Error Handling

- If Expo Push API returns an error for a specific token (e.g., DeviceNotRegistered), log the error but do not block transaction commit
- If no tokens found for user, silently skip (member may have denied push permission)
- Transaction write must never fail due to push notification delivery failure

### Implementation Notes

- Use existing Supabase client with service role key (not anon key) for server-side query
- Trigger must run **after** transaction row is committed and visible to queries
- If using Supabase database trigger (postgres function), consider latency and retry logic
- If using Next.js API route, call it from the existing transaction creation endpoint after successful INSERT

### Security

- Never expose Expo push tokens in client-facing API responses
- RLS on `device_tokens` table already restricts member access to own tokens only
- Service role queries for alert trigger bypass RLS (safe — server-side only)

### Testing

1. Insert a transaction that brings a category to exactly 80% of budget
2. Verify notification received on registered device within 5 seconds
3. Insert another transaction for same category+member+month — verify no duplicate alert sent
4. Verify notification payload matches contract exactly
5. Verify notification message includes correct category name and month

---

## Mobile Engineering Handoff

Mobile codebase (ohh-mobile) is **ready to receive** these notifications. The `NotificationService` in `src/services/notificationService.ts` handles:

- Foreground in-app banner display
- Background/tap response listener (navigation to dashboard in STORY-8.3)
- Payload validation

Mobile does **not** implement the trigger logic. That is entirely backend responsibility.

---

## Acceptance Criteria Met by Backend Implementation

- [x] Push notification triggered after each transaction write
- [x] Notification payload conforms to `BudgetAlertPayload` interface
- [x] Message format: "[Category name] is at 80% of your [Month] budget"
- [x] Notification delivered to correct member's registered device(s)
- [x] Alert fires per category, not for overall budget
- [x] No duplicate alerts for same category+member+month

---

## Next Story

STORY-8.3 (OHHFIN-136) will implement deep-link navigation from notification tap to the member's personal budget dashboard, optionally highlighting the specific category.
