-- MIGRATION-2: Mobile — Admin can SELECT all tenant_members in their household
-- Additive policy only. Does not modify or drop any existing policy.
-- Run in Supabase SQL Editor. Do not execute via application code.

CREATE POLICY tenant_members_select_admin
  ON public.tenant_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenant_members admin_tm
      WHERE admin_tm.tenant_id = tenant_members.tenant_id
        AND admin_tm.user_id = auth.uid()
        AND admin_tm.role = 'admin'
        AND admin_tm.is_active = true
    )
  );

-- Verification query (run after applying):
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'tenant_members'
-- ORDER BY policyname;
-- Expected: tenant_members_select_admin appears in results alongside
-- the existing tenant_members_select_self policy.
