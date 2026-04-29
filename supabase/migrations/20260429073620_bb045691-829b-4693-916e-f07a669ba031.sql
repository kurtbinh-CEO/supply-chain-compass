-- FIX 1: Add config columns + rename code/name on tenants
ALTER TABLE public.tenants
  ADD COLUMN currency text NOT NULL DEFAULT 'VND',
  ADD COLUMN timezone text NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  ADD COLUMN cutoff_time time NOT NULL DEFAULT '16:00:00',
  ADD COLUMN locale text NOT NULL DEFAULT 'vi';

ALTER TABLE public.tenants RENAME COLUMN code TO tenant_code;
ALTER TABLE public.tenants RENAME COLUMN name TO tenant_name;

UPDATE public.tenants
SET currency='VND', timezone='Asia/Ho_Chi_Minh', cutoff_time='16:00:00', locale='vi'
WHERE tenant_code IN ('UNIS','TTC','MDLZ');

-- FIX 2: Delete 5 test users (cascade clears profiles + user_roles + user_tenants)
DELETE FROM auth.users WHERE email IN (
  'test-scp@lovable.test',
  'thuy@smartlog.test',
  'test-admin@smartlog.dev',
  'test-cn_manager@smartlog.dev',
  'test-sc_manager@smartlog.dev'
);

-- FIX 3: Map Kurt + Dũng to UNIS, promote Dũng to admin
INSERT INTO public.user_tenants (user_id, tenant_id, is_default)
SELECT u.id, t.id, true
FROM auth.users u
CROSS JOIN public.tenants t
WHERE u.email IN ('kurtbinh@gosmartlog.com','dung.truong@gosmartlog.com')
  AND t.tenant_code = 'UNIS'
ON CONFLICT DO NOTHING;

UPDATE public.user_roles
SET role = 'admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email='dung.truong@gosmartlog.com');