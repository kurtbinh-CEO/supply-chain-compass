-- ════════════════════════════════════════════════════════════════════════
-- Master Data — 4 entity tables (items, factories, branches, containers)
-- ════════════════════════════════════════════════════════════════════════

-- Reusable updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ────────────────────────────────────────────────────────────────────────
-- 1. master_items (SKU base)
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE public.master_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  nm_id       TEXT NOT NULL,
  category    TEXT,
  unit        TEXT NOT NULL DEFAULT 'm²',
  unit_price  NUMERIC NOT NULL DEFAULT 0,
  tenant      TEXT NOT NULL DEFAULT 'UNIS',
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant, code)
);

ALTER TABLE public.master_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view master_items"
  ON public.master_items FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can insert master_items"
  ON public.master_items FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update master_items"
  ON public.master_items FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Admin can delete master_items"
  ON public.master_items FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_master_items_updated_at
  BEFORE UPDATE ON public.master_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_master_items_tenant_code ON public.master_items (tenant, code);

-- ────────────────────────────────────────────────────────────────────────
-- 2. master_factories (NM)
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE public.master_factories (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code               TEXT NOT NULL,
  name               TEXT NOT NULL,
  region             TEXT NOT NULL,
  lt_days            INTEGER NOT NULL DEFAULT 0,
  sigma_lt           NUMERIC NOT NULL DEFAULT 0,
  moq_m2             NUMERIC NOT NULL DEFAULT 0,
  capacity_m2_month  NUMERIC NOT NULL DEFAULT 0,
  reliability        NUMERIC NOT NULL DEFAULT 0.8,
  honoring_pct       NUMERIC NOT NULL DEFAULT 80,
  price_tier1        NUMERIC NOT NULL DEFAULT 0,
  price_tier2        NUMERIC NOT NULL DEFAULT 0,
  tenant             TEXT NOT NULL DEFAULT 'UNIS',
  created_by         UUID,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant, code)
);

ALTER TABLE public.master_factories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view master_factories"
  ON public.master_factories FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can insert master_factories"
  ON public.master_factories FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update master_factories"
  ON public.master_factories FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Admin can delete master_factories"
  ON public.master_factories FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_master_factories_updated_at
  BEFORE UPDATE ON public.master_factories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_master_factories_tenant_code ON public.master_factories (tenant, code);

-- ────────────────────────────────────────────────────────────────────────
-- 3. master_branches (CN)
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE public.master_branches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  region      TEXT NOT NULL,
  lat         NUMERIC NOT NULL DEFAULT 0,
  lng         NUMERIC NOT NULL DEFAULT 0,
  z_factor    NUMERIC NOT NULL DEFAULT 1.65,
  manager     TEXT,
  tenant      TEXT NOT NULL DEFAULT 'UNIS',
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant, code)
);

ALTER TABLE public.master_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view master_branches"
  ON public.master_branches FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can insert master_branches"
  ON public.master_branches FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update master_branches"
  ON public.master_branches FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Admin can delete master_branches"
  ON public.master_branches FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_master_branches_updated_at
  BEFORE UPDATE ON public.master_branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_master_branches_tenant_code ON public.master_branches (tenant, code);

-- ────────────────────────────────────────────────────────────────────────
-- 4. master_containers
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE public.master_containers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  capacity_m2     NUMERIC NOT NULL DEFAULT 0,
  pallet_limit    INTEGER NOT NULL DEFAULT 0,
  weight_limit_kg NUMERIC NOT NULL DEFAULT 0,
  cost_per_km     NUMERIC NOT NULL DEFAULT 0,
  note            TEXT,
  tenant          TEXT NOT NULL DEFAULT 'UNIS',
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant, code)
);

ALTER TABLE public.master_containers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view master_containers"
  ON public.master_containers FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can insert master_containers"
  ON public.master_containers FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update master_containers"
  ON public.master_containers FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Admin can delete master_containers"
  ON public.master_containers FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_master_containers_updated_at
  BEFORE UPDATE ON public.master_containers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_master_containers_tenant_code ON public.master_containers (tenant, code);