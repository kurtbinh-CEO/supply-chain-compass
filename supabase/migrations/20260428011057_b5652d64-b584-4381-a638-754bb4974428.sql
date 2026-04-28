CREATE TABLE public.drp_preflight_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant TEXT NOT NULL DEFAULT 'UNIS',
  cycle_id TEXT,
  cycle_label TEXT,
  cycle_status TEXT,
  cycle_version INTEGER,
  can_run BOOLEAN NOT NULL DEFAULT false,
  ok_count INTEGER NOT NULL DEFAULT 0,
  warn_count INTEGER NOT NULL DEFAULT 0,
  block_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  block_reasons TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'audit_page',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.drp_preflight_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view drp_preflight_snapshots"
ON public.drp_preflight_snapshots
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin SC Manager can insert drp_preflight_snapshots"
ON public.drp_preflight_snapshots
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'sc_manager'::app_role)
);

CREATE POLICY "Admin can delete drp_preflight_snapshots"
ON public.drp_preflight_snapshots
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_drp_preflight_snapshots_tenant_created
  ON public.drp_preflight_snapshots (tenant, created_at DESC);