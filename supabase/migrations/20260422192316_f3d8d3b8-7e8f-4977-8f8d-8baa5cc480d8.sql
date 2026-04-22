-- ============================================================
-- DRP Batch lifecycle + audit log
-- ============================================================

-- 1) drp_runs: 1 row per DRP batch
CREATE TABLE public.drp_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_code TEXT NOT NULL UNIQUE,
  tenant TEXT NOT NULL DEFAULT 'UNIS',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed','approved','released','cancelled')),
  total_rpo INTEGER NOT NULL DEFAULT 0,
  total_to INTEGER NOT NULL DEFAULT 0,
  total_value NUMERIC NOT NULL DEFAULT 0,
  total_qty NUMERIC NOT NULL DEFAULT 0,
  unresolved_count INTEGER NOT NULL DEFAULT 0,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  released_by UUID,
  released_at TIMESTAMPTZ,
  released_po_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.drp_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view drp_runs"
ON public.drp_runs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin SC Manager can insert drp_runs"
ON public.drp_runs FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sc_manager'::app_role));

CREATE POLICY "Admin SC Manager can update drp_runs"
ON public.drp_runs FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sc_manager'::app_role));

CREATE POLICY "Admin can delete drp_runs"
ON public.drp_runs FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_drp_runs_updated_at
BEFORE UPDATE ON public.drp_runs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_drp_runs_status ON public.drp_runs(status);
CREATE INDEX idx_drp_runs_tenant_created ON public.drp_runs(tenant, created_at DESC);

-- 2) drp_audit_log: every state transition / decision
CREATE TABLE public.drp_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.drp_runs(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created','reviewed','approved','released','cancelled','rejected_items','approved_subset')),
  from_status TEXT,
  to_status TEXT,
  actor_id UUID,
  actor_role TEXT,
  note TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.drp_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view drp_audit_log"
ON public.drp_audit_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin SC Manager can insert drp_audit_log"
ON public.drp_audit_log FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sc_manager'::app_role) OR has_role(auth.uid(), 'cn_manager'::app_role));

CREATE INDEX idx_drp_audit_batch ON public.drp_audit_log(batch_id, created_at DESC);

-- 3) Add batch link to purchase_orders so released POs can be traced
ALTER TABLE public.purchase_orders
  ADD COLUMN drp_batch_id UUID REFERENCES public.drp_runs(id) ON DELETE SET NULL,
  ADD COLUMN po_kind TEXT NOT NULL DEFAULT 'RPO' CHECK (po_kind IN ('RPO','TO')),
  ADD COLUMN from_cn TEXT,
  ADD COLUMN to_cn TEXT;

CREATE INDEX idx_purchase_orders_drp_batch ON public.purchase_orders(drp_batch_id);
