
-- ============================================================
-- 1. TENANT REGISTRY + MEMBERSHIP + HELPER
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.tenants (code, name)
VALUES ('UNIS', 'UNIS Group'), ('TTC', 'TTC Agris'), ('MDLZ', 'Mondelez')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.user_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view tenants" ON public.tenants
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert tenants" ON public.tenants
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admin can update tenants" ON public.tenants
  FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admin can delete tenants" ON public.tenants
  FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Users view own memberships" ON public.user_tenants
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admin manages memberships ins" ON public.user_tenants
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admin manages memberships upd" ON public.user_tenants
  FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admin manages memberships del" ON public.user_tenants
  FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

-- Tenant-access security definer (avoids recursive RLS).
CREATE OR REPLACE FUNCTION public.user_has_tenant(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_id = _user_id AND tenant_id = _tenant_id
  ) OR has_role(_user_id, 'admin'::app_role);
$$;

-- Default tenant for backfill
DO $$
DECLARE _tid uuid;
BEGIN
  SELECT id INTO _tid FROM public.tenants WHERE code='UNIS';
  PERFORM set_config('app.default_tenant', _tid::text, false);
END $$;

-- ============================================================
-- 2. ADD tenant_id TO EXISTING TABLES (backfill to UNIS)
-- ============================================================
DO $$
DECLARE
  _unis uuid;
  t text;
  tables text[] := ARRAY[
    'demand_forecasts','inventory','drp_runs','purchase_orders','sop_consensus',
    'fc_accuracy','nm_performance','master_branches','master_containers',
    'master_factories','master_items','drp_audit_log','drp_preflight_snapshots',
    'master_data_audit'
  ];
BEGIN
  SELECT id INTO _unis FROM public.tenants WHERE code='UNIS';
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id uuid', t);
    EXECUTE format('UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', t, _unis);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_tenant_created ON public.%I(tenant_id, created_at DESC)', t, t);
  END LOOP;
END $$;

-- ============================================================
-- 3. NEW DOMAIN TABLES
-- ============================================================

-- customer_master
CREATE TABLE public.customer_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  channel text,
  region text,
  contact text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

-- bom
CREATE TABLE public.bom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  parent_sku text NOT NULL,
  child_sku text NOT NULL,
  qty_per numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'pcs',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, parent_sku, child_sku)
);

-- safety_stock
CREATE TABLE public.safety_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sku_code text NOT NULL,
  cn_code text NOT NULL,
  ss_qty numeric NOT NULL DEFAULT 0,
  z_factor numeric NOT NULL DEFAULT 1.65,
  lead_time_days integer NOT NULL DEFAULT 7,
  effective_from date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, sku_code, cn_code)
);

-- trust_scores
CREATE TABLE public.trust_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cn_code text NOT NULL,
  period text NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  components jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, cn_code, period)
);

-- cutoff_calendar
CREATE TABLE public.cutoff_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cycle text NOT NULL,
  kind text NOT NULL,
  cutoff_at timestamptz NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- sop_versions
CREATE TABLE public.sop_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period text NOT NULL,
  version_no integer NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, period, version_no)
);

-- weekly_adjustments
CREATE TABLE public.weekly_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  week text NOT NULL,
  sku_code text NOT NULL,
  cn_code text NOT NULL,
  delta_qty numeric NOT NULL DEFAULT 0,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- drp_exceptions
CREATE TABLE public.drp_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  drp_run_id uuid REFERENCES public.drp_runs(id) ON DELETE CASCADE,
  sku_code text NOT NULL,
  cn_code text NOT NULL,
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'warn',
  message text,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_no text NOT NULL,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  sku_code text NOT NULL,
  from_cn text,
  to_cn text,
  qty numeric NOT NULL DEFAULT 0,
  value numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'VND',
  expected_at date,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, order_no)
);

-- order_lifecycle_events
CREATE TABLE public.order_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- gap_scenarios
CREATE TABLE public.gap_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  scenario_code text NOT NULL,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  decision text,
  decided_by uuid,
  decided_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, scenario_code)
);

-- audit_log (immutable)
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_name text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. INDEXES (tenant_id, created_at) + (sku_code, cn_code)
-- ============================================================
CREATE INDEX idx_customer_master_tenant_created ON public.customer_master(tenant_id, created_at DESC);
CREATE INDEX idx_bom_tenant_created ON public.bom(tenant_id, created_at DESC);
CREATE INDEX idx_safety_stock_tenant_created ON public.safety_stock(tenant_id, created_at DESC);
CREATE INDEX idx_safety_stock_sku_cn ON public.safety_stock(sku_code, cn_code);
CREATE INDEX idx_trust_scores_tenant_created ON public.trust_scores(tenant_id, created_at DESC);
CREATE INDEX idx_cutoff_calendar_tenant_created ON public.cutoff_calendar(tenant_id, created_at DESC);
CREATE INDEX idx_sop_versions_tenant_created ON public.sop_versions(tenant_id, created_at DESC);
CREATE INDEX idx_weekly_adjustments_tenant_created ON public.weekly_adjustments(tenant_id, created_at DESC);
CREATE INDEX idx_weekly_adjustments_sku_cn ON public.weekly_adjustments(sku_code, cn_code);
CREATE INDEX idx_drp_exceptions_tenant_created ON public.drp_exceptions(tenant_id, created_at DESC);
CREATE INDEX idx_drp_exceptions_sku_cn ON public.drp_exceptions(sku_code, cn_code);
CREATE INDEX idx_orders_tenant_created ON public.orders(tenant_id, created_at DESC);
CREATE INDEX idx_orders_sku_to_cn ON public.orders(sku_code, to_cn);
CREATE INDEX idx_order_events_tenant_created ON public.order_lifecycle_events(tenant_id, created_at DESC);
CREATE INDEX idx_order_events_order ON public.order_lifecycle_events(order_id);
CREATE INDEX idx_gap_scenarios_tenant_created ON public.gap_scenarios(tenant_id, created_at DESC);
CREATE INDEX idx_audit_log_tenant_created ON public.audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_log_entity ON public.audit_log(entity, entity_id);

-- ============================================================
-- 5. updated_at TRIGGERS
-- ============================================================
DO $$
DECLARE t text;
  tlist text[] := ARRAY[
    'tenants','customer_master','bom','safety_stock','trust_scores',
    'cutoff_calendar','sop_versions','weekly_adjustments','drp_exceptions',
    'orders','gap_scenarios'
  ];
BEGIN
  FOREACH t IN ARRAY tlist LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
  END LOOP;
END $$;

-- ============================================================
-- 6. ENABLE RLS + POLICIES (tenant isolation + role gates)
-- ============================================================
ALTER TABLE public.customer_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cutoff_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drp_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_lifecycle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gap_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Master/reference tables: view = tenant member; write = admin/sc_manager; delete = admin
DO $$
DECLARE t text;
  master_tables text[] := ARRAY['customer_master','bom','safety_stock','trust_scores','cutoff_calendar'];
BEGIN
  FOREACH t IN ARRAY master_tables LOOP
    EXECUTE format($f$CREATE POLICY "View %1$s in tenant" ON public.%1$I FOR SELECT TO authenticated USING (public.user_has_tenant(auth.uid(), tenant_id))$f$, t);
    EXECUTE format($f$CREATE POLICY "Insert %1$s admin sc" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.user_has_tenant(auth.uid(), tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'sc_manager'::app_role)))$f$, t);
    EXECUTE format($f$CREATE POLICY "Update %1$s admin sc" ON public.%1$I FOR UPDATE TO authenticated USING (public.user_has_tenant(auth.uid(), tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'sc_manager'::app_role)))$f$, t);
    EXECUTE format($f$CREATE POLICY "Delete %1$s admin" ON public.%1$I FOR DELETE TO authenticated USING (public.user_has_tenant(auth.uid(), tenant_id) AND has_role(auth.uid(),'admin'::app_role))$f$, t);
  END LOOP;
END $$;

-- Operational tables: view = tenant member; write = admin/sc_manager/cn_manager; delete = admin
DO $$
DECLARE t text;
  op_tables text[] := ARRAY['sop_versions','weekly_adjustments','drp_exceptions','orders','order_lifecycle_events','gap_scenarios'];
BEGIN
  FOREACH t IN ARRAY op_tables LOOP
    EXECUTE format($f$CREATE POLICY "View %1$s in tenant" ON public.%1$I FOR SELECT TO authenticated USING (public.user_has_tenant(auth.uid(), tenant_id))$f$, t);
    EXECUTE format($f$CREATE POLICY "Insert %1$s op roles" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.user_has_tenant(auth.uid(), tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'sc_manager'::app_role) OR has_role(auth.uid(),'cn_manager'::app_role)))$f$, t);
    EXECUTE format($f$CREATE POLICY "Update %1$s op roles" ON public.%1$I FOR UPDATE TO authenticated USING (public.user_has_tenant(auth.uid(), tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'sc_manager'::app_role) OR has_role(auth.uid(),'cn_manager'::app_role)))$f$, t);
    EXECUTE format($f$CREATE POLICY "Delete %1$s admin" ON public.%1$I FOR DELETE TO authenticated USING (public.user_has_tenant(auth.uid(), tenant_id) AND has_role(auth.uid(),'admin'::app_role))$f$, t);
  END LOOP;
END $$;

-- audit_log: view = admin/sc_manager (in tenant); insert = any authenticated tenant member; NO update/delete
CREATE POLICY "View audit_log admin sc" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.user_has_tenant(auth.uid(), tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'sc_manager'::app_role)));

CREATE POLICY "Insert audit_log tenant member" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_tenant(auth.uid(), tenant_id));

-- ============================================================
-- 7. IMMUTABILITY TRIGGER ON audit_log (block UPDATE/DELETE)
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_log_block_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is immutable: % is not allowed', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_log_no_update ON public.audit_log;
CREATE TRIGGER trg_audit_log_no_update
  BEFORE UPDATE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_block_mutation();

DROP TRIGGER IF EXISTS trg_audit_log_no_delete ON public.audit_log;
CREATE TRIGGER trg_audit_log_no_delete
  BEFORE DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_block_mutation();
