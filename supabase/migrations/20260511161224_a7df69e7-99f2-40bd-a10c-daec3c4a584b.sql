
-- to_plans: Transfer Order plans
CREATE SEQUENCE IF NOT EXISTS public.to_code_seq;

CREATE TABLE public.to_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  plan_run_id UUID,
  to_code TEXT NOT NULL UNIQUE,
  source_nm TEXT,
  dest_cn TEXT NOT NULL,
  sku_code TEXT NOT NULL,
  planned_qty NUMERIC NOT NULL DEFAULT 0,
  dispatch_date DATE,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','IN_EXECUTION','FULFILLED','PARTIALLY_FULFILLED','CANCELLED')),
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_to_plans_tenant ON public.to_plans(tenant_id, status);
CREATE INDEX idx_to_plans_run ON public.to_plans(plan_run_id);

ALTER TABLE public.to_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View to_plans in tenant" ON public.to_plans FOR SELECT TO authenticated
  USING (user_has_tenant(auth.uid(), tenant_id));
CREATE POLICY "Insert to_plans op roles" ON public.to_plans FOR INSERT TO authenticated
  WITH CHECK (user_has_tenant(auth.uid(), tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'sc_manager'::app_role) OR has_role(auth.uid(),'cn_manager'::app_role)));
CREATE POLICY "Update to_plans op roles" ON public.to_plans FOR UPDATE TO authenticated
  USING (user_has_tenant(auth.uid(), tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'sc_manager'::app_role) OR has_role(auth.uid(),'cn_manager'::app_role)));
CREATE POLICY "Delete to_plans admin" ON public.to_plans FOR DELETE TO authenticated
  USING (user_has_tenant(auth.uid(), tenant_id) AND has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_to_plans_updated BEFORE UPDATE ON public.to_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-generate to_code as TO-YYYYMMDD-NNN
CREATE OR REPLACE FUNCTION public.gen_to_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  d_part TEXT;
  n INT;
BEGIN
  IF NEW.to_code IS NULL OR NEW.to_code = '' THEN
    d_part := to_char(now(), 'YYYYMMDD');
    SELECT COUNT(*) + 1 INTO n FROM public.to_plans
      WHERE to_code LIKE 'TO-' || d_part || '-%';
    NEW.to_code := 'TO-' || d_part || '-' || lpad(n::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_to_plans_code BEFORE INSERT ON public.to_plans
  FOR EACH ROW EXECUTE FUNCTION public.gen_to_code();

-- to_cons: Transfer Order containers/dispatches
CREATE TABLE public.to_cons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  to_plan_id UUID NOT NULL REFERENCES public.to_plans(id) ON DELETE CASCADE,
  to_con_code TEXT NOT NULL,
  dispatch_qty NUMERIC NOT NULL DEFAULT 0,
  dispatch_date DATE,
  vehicle_type TEXT,
  status TEXT NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED','ERP_POSTED','TRIP_ASSIGNED','DISPATCHED','COMPLETED','CANCELLED')),
  trip_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_to_cons_tenant ON public.to_cons(tenant_id, status);
CREATE INDEX idx_to_cons_plan ON public.to_cons(to_plan_id);

ALTER TABLE public.to_cons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View to_cons in tenant" ON public.to_cons FOR SELECT TO authenticated
  USING (user_has_tenant(auth.uid(), tenant_id));
CREATE POLICY "Insert to_cons op roles" ON public.to_cons FOR INSERT TO authenticated
  WITH CHECK (user_has_tenant(auth.uid(), tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'sc_manager'::app_role) OR has_role(auth.uid(),'cn_manager'::app_role)));
CREATE POLICY "Update to_cons op roles" ON public.to_cons FOR UPDATE TO authenticated
  USING (user_has_tenant(auth.uid(), tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'sc_manager'::app_role) OR has_role(auth.uid(),'cn_manager'::app_role)));
CREATE POLICY "Delete to_cons admin" ON public.to_cons FOR DELETE TO authenticated
  USING (user_has_tenant(auth.uid(), tenant_id) AND has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_to_cons_updated BEFORE UPDATE ON public.to_cons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
