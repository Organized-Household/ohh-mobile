-- MIGRATION-1: Mobile — Admin on-behalf-of transaction INSERT
-- Additive policy only. Does not modify or drop any existing policy.
-- Run in Supabase SQL Editor. Do not execute via application code.

CREATE POLICY transactions_insert_admin_on_behalf_of
  ON public.transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.tenant_id = transactions.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
        AND tm.is_active = true
    )
    AND
    EXISTS (
      SELECT 1
      FROM public.tenant_members target_tm
      WHERE target_tm.tenant_id = transactions.tenant_id
        AND target_tm.user_id = transactions.created_by_user_id
        AND target_tm.is_active = true
    )
  );

-- Verification query (run after applying):
-- SELECT policyname, cmd, with_check
-- FROM pg_policies
-- WHERE tablename = 'transactions'
-- ORDER BY policyname;
-- Expected: transactions_insert_admin_on_behalf_of appears in results.
