ALTER TABLE public.config_registry
  ADD COLUMN IF NOT EXISTS value_type TEXT,
  ADD COLUMN IF NOT EXISTS updated_by UUID;