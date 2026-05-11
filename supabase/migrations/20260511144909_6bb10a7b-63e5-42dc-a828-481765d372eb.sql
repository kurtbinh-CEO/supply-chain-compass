
-- TABLE 1: plan_runs
CREATE TABLE public.plan_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  run_name TEXT NOT NULL,
  run_type TEXT NOT NULL DEFAULT 'WEEKLY_DRP' CHECK (run_type IN ('MONTHLY_DRP','WEEKLY_DRP','SCRATCH')),
  lifecycle TEXT NOT NULL DEFAULT 'DRAFT' CHECK (lifecycle IN ('DRAFT','RUNNING','SUCCEEDED','REVIEWED','APPROVED','PUBLISHED','FAILED')),
  alias TEXT CHECK (alias IN ('baseline','champion','last_published')),
  demand_version_id UUID,
  supply_snapshot_at TIMESTAMPTZ,
  input_hash TEXT,
  input_snapshot_json JSONB DEFAULT '{}'::jsonb,
  solver_version TEXT DEFAULT 'v0.1-lovable',
  allocation_objective TEXT DEFAULT 'LEADTIME_SHORTEST' CHECK (allocation_objective IN ('LEADTIME_SHORTEST','LOWEST_COST')),
  fill_rate NUMERIC,
  lost_sales_qty NUMERIC,
  total_allocated NUMERIC,
  total_demand NUMERIC,
  exception_count INTEGER DEFAULT 0,
  created_by UUID,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, run_name)
);
CREATE INDEX idx_plan_runs_tenant_created ON public.plan_runs(tenant_id, created_at DESC);
ALTER TABLE public.plan_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View plan_runs in tenant" ON public.plan_runs FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()));
CREATE POLICY "Insert plan_runs in tenant" ON public.plan_runs FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()));
CREATE POLICY "Update plan_runs in tenant" ON public.plan_runs FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()));

CREATE TRIGGER plan_runs_updated_at BEFORE UPDATE ON public.plan_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TABLE 2: plan_run_results
CREATE TABLE public.plan_run_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_run_id UUID NOT NULL REFERENCES public.plan_runs(id) ON DELETE CASCADE,
  cn_code TEXT NOT NULL,
  sku_code TEXT NOT NULL,
  sku_base TEXT NOT NULL,
  demand_qty NUMERIC NOT NULL DEFAULT 0,
  allocated_qty NUMERIC NOT NULL DEFAULT 0,
  source_type TEXT CHECK (source_type IN ('ON_HAND','PIPELINE','HUB_PO','LCNB','INTERNAL_TO','GAP')),
  source_location TEXT,
  gap_qty NUMERIC DEFAULT 0,
  exception_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_plan_run_results_run ON public.plan_run_results(plan_run_id, created_at DESC);
ALTER TABLE public.plan_run_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View plan_run_results in tenant" ON public.plan_run_results FOR SELECT TO authenticated
  USING (plan_run_id IN (SELECT id FROM public.plan_runs WHERE tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid())));
CREATE POLICY "Insert plan_run_results in tenant" ON public.plan_run_results FOR INSERT TO authenticated
  WITH CHECK (plan_run_id IN (SELECT id FROM public.plan_runs WHERE tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid())));
CREATE POLICY "Update plan_run_results in tenant" ON public.plan_run_results FOR UPDATE TO authenticated
  USING (plan_run_id IN (SELECT id FROM public.plan_runs WHERE tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid())));

-- TABLE 3: demand_versions
CREATE TABLE public.demand_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  version_type TEXT NOT NULL DEFAULT 'SOP' CHECK (version_type IN ('AOP','SOP','WEEKLY')),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','LOCKED','ARCHIVED')),
  locked_by UUID,
  locked_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);
CREATE INDEX idx_demand_versions_tenant_created ON public.demand_versions(tenant_id, created_at DESC);
ALTER TABLE public.demand_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View demand_versions in tenant" ON public.demand_versions FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()));
CREATE POLICY "Insert demand_versions in tenant" ON public.demand_versions FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()));
CREATE POLICY "Update demand_versions in tenant" ON public.demand_versions FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()));

CREATE TRIGGER demand_versions_updated_at BEFORE UPDATE ON public.demand_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ALTER drp_exceptions
ALTER TABLE public.drp_exceptions ADD COLUMN IF NOT EXISTS suggested_action TEXT;
ALTER TABLE public.drp_exceptions ADD COLUMN IF NOT EXISTS owner_role TEXT;
ALTER TABLE public.drp_exceptions ADD COLUMN IF NOT EXISTS sla_hours INTEGER DEFAULT 8;
ALTER TABLE public.drp_exceptions ADD COLUMN IF NOT EXISTS raised_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.drp_exceptions ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE public.drp_exceptions ADD COLUMN IF NOT EXISTS resolved_by UUID;
ALTER TABLE public.drp_exceptions ADD COLUMN IF NOT EXISTS resolution_action TEXT;
ALTER TABLE public.drp_exceptions ADD COLUMN IF NOT EXISTS resolution_note TEXT;
