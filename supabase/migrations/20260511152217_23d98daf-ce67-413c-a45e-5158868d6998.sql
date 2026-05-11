CREATE TABLE IF NOT EXISTS public.config_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, config_key)
);

CREATE INDEX IF NOT EXISTS idx_config_registry_tenant_key ON public.config_registry(tenant_id, config_key);

ALTER TABLE public.config_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View config_registry in tenant" ON public.config_registry
  FOR SELECT TO authenticated
  USING (user_has_tenant(auth.uid(), tenant_id));

CREATE POLICY "Insert config_registry admin sc" ON public.config_registry
  FOR INSERT TO authenticated
  WITH CHECK (user_has_tenant(auth.uid(), tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'sc_manager'::app_role)));

CREATE POLICY "Update config_registry admin sc" ON public.config_registry
  FOR UPDATE TO authenticated
  USING (user_has_tenant(auth.uid(), tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'sc_manager'::app_role)));

CREATE POLICY "Delete config_registry admin" ON public.config_registry
  FOR DELETE TO authenticated
  USING (user_has_tenant(auth.uid(), tenant_id) AND has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_config_registry_updated_at
  BEFORE UPDATE ON public.config_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();