-- MIGRATION-4: Mobile — Create device_tokens table
-- New table — does not modify any existing table.
-- Run in Supabase SQL Editor. Do not execute via application code.

CREATE TABLE public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  expo_push_token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Enable RLS
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- RLS: member can upsert and select their own token only
CREATE POLICY device_tokens_member_own
  ON public.device_tokens
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Index for fast lookup by user
CREATE INDEX idx_device_tokens_user_id
  ON public.device_tokens (user_id);

-- Index for tenant-scoped queries (backend alert trigger needs this)
CREATE INDEX idx_device_tokens_tenant_id
  ON public.device_tokens (tenant_id);

-- Verification query (run after applying):
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name = 'device_tokens';
-- Expected: device_tokens row returned.
--
-- SELECT policyname, cmd FROM pg_policies
-- WHERE tablename = 'device_tokens';
-- Expected: device_tokens_member_own row returned.
