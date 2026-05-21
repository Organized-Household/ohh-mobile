-- MIGRATION-3: Mobile — Seed Unknown category per tenant
-- Safe to re-run — ON CONFLICT DO NOTHING prevents duplicates.
-- Run in Supabase SQL Editor. Do not execute via application code.

INSERT INTO public.categories (
  id,
  tenant_id,
  name,
  tag,
  is_active,
  category_type
)
SELECT
  gen_random_uuid(),
  t.id,
  'Unknown',
  'standard',
  true,
  'expense'
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1
  FROM public.categories c
  WHERE c.tenant_id = t.id
    AND c.name = 'Unknown'
);

-- ⚠️ REQUIRED: Run this SELECT immediately after INSERT above.
-- Record the UUID(s) returned — needed for categoryConstants.ts.
SELECT
  c.id AS unknown_category_id,
  t.alias AS tenant_alias
FROM public.categories c
JOIN public.tenants t ON t.id = c.tenant_id
WHERE c.name = 'Unknown'
ORDER BY t.alias;
