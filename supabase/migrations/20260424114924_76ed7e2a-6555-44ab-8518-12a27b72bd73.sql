-- Master Data audit log
CREATE TABLE public.master_data_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant text NOT NULL DEFAULT 'UNIS',
  entity text NOT NULL,            -- 'item' | 'factory' | 'branch' | 'container'
  entity_code text NOT NULL,       -- business code of the row
  action text NOT NULL,            -- 'create' | 'update' | 'delete' | 'bulk_import'
  actor_id uuid,
  actor_name text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mda_entity_code ON public.master_data_audit(entity, entity_code, created_at DESC);
CREATE INDEX idx_mda_created_at ON public.master_data_audit(created_at DESC);

ALTER TABLE public.master_data_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view master_data_audit"
ON public.master_data_audit FOR SELECT
USING (true);

CREATE POLICY "Authenticated can insert master_data_audit"
ON public.master_data_audit FOR INSERT
TO authenticated
WITH CHECK (true);
-- No UPDATE/DELETE policies → immutable