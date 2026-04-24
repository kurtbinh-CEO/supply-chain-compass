-- Promote 2 test users to sc_manager so they can run DRP batch (which requires admin/sc_manager role).
-- Other users remain as viewer (read-only).
INSERT INTO public.user_roles (user_id, role)
VALUES
  ('533a4c5f-77bd-4d3d-9d52-b1b19c89182e', 'sc_manager'),  -- test-admin@smartlog.dev
  ('7b65e2d7-e961-4b87-acbb-386f6bf48002', 'sc_manager')   -- kurtbinh@gosmartlog.com
ON CONFLICT (user_id, role) DO NOTHING;

-- Optional: also remove their viewer role to keep things clean (sc_manager already implies read access via RLS policies).
DELETE FROM public.user_roles
WHERE user_id IN (
  '533a4c5f-77bd-4d3d-9d52-b1b19c89182e',
  '7b65e2d7-e961-4b87-acbb-386f6bf48002'
)
AND role = 'viewer';