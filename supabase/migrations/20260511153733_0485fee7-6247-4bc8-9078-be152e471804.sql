
-- 1. user_cn_scope table
CREATE TABLE IF NOT EXISTS public.user_cn_scope (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cn_code TEXT NOT NULL,
  tenant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, cn_code)
);
ALTER TABLE public.user_cn_scope ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View own cn scope" ON public.user_cn_scope;
CREATE POLICY "View own cn scope" ON public.user_cn_scope FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(),'sc_manager'::app_role));

DROP POLICY IF EXISTS "Manage cn scope admin" ON public.user_cn_scope;
CREATE POLICY "Manage cn scope admin" ON public.user_cn_scope FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Helper functions
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'admin' THEN 1
    WHEN 'ceo' THEN 2
    WHEN 'director' THEN 3
    WHEN 'sc_manager' THEN 4
    WHEN 'cn_manager' THEN 5
    WHEN 'buyer' THEN 6
    WHEN 'sales' THEN 7
    WHEN 'viewer' THEN 8
  END
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_has_cn(_user_id UUID, _cn_code TEXT)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_cn_scope
    WHERE user_id = _user_id AND cn_code = _cn_code
  );
$$;

-- 3. plan_runs: SC_MANAGER/DIRECTOR/CEO/admin full
DROP POLICY IF EXISTS "Insert plan_runs in tenant" ON public.plan_runs;
DROP POLICY IF EXISTS "Update plan_runs in tenant" ON public.plan_runs;
DROP POLICY IF EXISTS "Delete plan_runs admin" ON public.plan_runs;

CREATE POLICY "Insert plan_runs leaders"
ON public.plan_runs FOR INSERT TO authenticated
WITH CHECK (
  public.user_has_tenant(auth.uid(), tenant_id)
  AND (public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'sc_manager'::app_role)
    OR public.has_role(auth.uid(),'director'::app_role)
    OR public.has_role(auth.uid(),'ceo'::app_role))
);
CREATE POLICY "Update plan_runs leaders"
ON public.plan_runs FOR UPDATE TO authenticated
USING (
  public.user_has_tenant(auth.uid(), tenant_id)
  AND (public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'sc_manager'::app_role)
    OR public.has_role(auth.uid(),'director'::app_role)
    OR public.has_role(auth.uid(),'ceo'::app_role))
);
CREATE POLICY "Delete plan_runs admin"
ON public.plan_runs FOR DELETE TO authenticated
USING (public.user_has_tenant(auth.uid(), tenant_id) AND public.has_role(auth.uid(),'admin'::app_role));

-- 4. inventory: CN_MANAGER restricted to their CN
DROP POLICY IF EXISTS "Authenticated users can view inventory" ON public.inventory;
CREATE POLICY "View inventory by role/scope"
ON public.inventory FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role(auth.uid(),'sc_manager'::app_role)
  OR public.has_role(auth.uid(),'director'::app_role)
  OR public.has_role(auth.uid(),'ceo'::app_role)
  OR (public.has_role(auth.uid(),'cn_manager'::app_role) AND public.user_has_cn(auth.uid(), cn_code))
  OR public.has_role(auth.uid(),'viewer'::app_role)
  OR public.has_role(auth.uid(),'sales'::app_role)
  OR public.has_role(auth.uid(),'buyer'::app_role)
);

-- 5. safety_stock: only SC_MANAGER/admin update
DROP POLICY IF EXISTS "Update safety_stock admin sc" ON public.safety_stock;
CREATE POLICY "Update safety_stock sc_manager"
ON public.safety_stock FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'sc_manager'::app_role));

-- 6. demand_versions: SC_MANAGER/admin full
DROP POLICY IF EXISTS "Insert demand_versions in tenant" ON public.demand_versions;
DROP POLICY IF EXISTS "Update demand_versions in tenant" ON public.demand_versions;
CREATE POLICY "Insert demand_versions sc_manager"
ON public.demand_versions FOR INSERT TO authenticated
WITH CHECK (
  public.user_has_tenant(auth.uid(), tenant_id)
  AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'sc_manager'::app_role))
);
CREATE POLICY "Update demand_versions sc_manager"
ON public.demand_versions FOR UPDATE TO authenticated
USING (
  public.user_has_tenant(auth.uid(), tenant_id)
  AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'sc_manager'::app_role))
);

-- 7. config_registry: SC_MANAGER/CEO/admin update
DROP POLICY IF EXISTS "Update config_registry admin sc" ON public.config_registry;
CREATE POLICY "Update config_registry leaders"
ON public.config_registry FOR UPDATE TO authenticated
USING (
  public.user_has_tenant(auth.uid(), tenant_id)
  AND (public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'sc_manager'::app_role)
    OR public.has_role(auth.uid(),'ceo'::app_role))
);

-- 8. drp_exceptions: SC_MANAGER/admin update (resolve)
DROP POLICY IF EXISTS "Update drp_exceptions op roles" ON public.drp_exceptions;
CREATE POLICY "Update drp_exceptions sc_manager"
ON public.drp_exceptions FOR UPDATE TO authenticated
USING (
  public.user_has_tenant(auth.uid(), tenant_id)
  AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'sc_manager'::app_role))
);
