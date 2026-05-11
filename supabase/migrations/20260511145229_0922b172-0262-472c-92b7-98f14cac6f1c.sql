
-- TABLE 1: cn_sku_pricing
CREATE TABLE public.cn_sku_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cn_code TEXT NOT NULL,
  sku_code TEXT NOT NULL,
  price_list NUMERIC NOT NULL CHECK (price_list > 0),
  price_promo NUMERIC,
  discount_max_pct NUMERIC CHECK (discount_max_pct BETWEEN 0 AND 50),
  effective_from DATE NOT NULL,
  effective_to DATE,
  currency TEXT NOT NULL DEFAULT 'VND',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, cn_code, sku_code, effective_from),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
CREATE INDEX idx_cn_sku_pricing_tenant ON public.cn_sku_pricing(tenant_id, cn_code, sku_code);
ALTER TABLE public.cn_sku_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View cn_sku_pricing in tenant" ON public.cn_sku_pricing FOR SELECT TO authenticated
  USING (user_has_tenant(auth.uid(), tenant_id));
CREATE POLICY "Insert cn_sku_pricing admin sc" ON public.cn_sku_pricing FOR INSERT TO authenticated
  WITH CHECK (user_has_tenant(auth.uid(), tenant_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sc_manager')));
CREATE POLICY "Update cn_sku_pricing admin sc" ON public.cn_sku_pricing FOR UPDATE TO authenticated
  USING (user_has_tenant(auth.uid(), tenant_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sc_manager')));
CREATE POLICY "Delete cn_sku_pricing admin" ON public.cn_sku_pricing FOR DELETE TO authenticated
  USING (user_has_tenant(auth.uid(), tenant_id) AND has_role(auth.uid(),'admin'));
CREATE TRIGGER cn_sku_pricing_updated_at BEFORE UPDATE ON public.cn_sku_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TABLE 2: sku_unit_conversion
CREATE TABLE public.sku_unit_conversion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sku_code TEXT NOT NULL,
  from_uom TEXT NOT NULL CHECK (from_uom IN ('M2','BOX','PALLET','PIECE','KG','TON')),
  to_uom TEXT NOT NULL CHECK (to_uom IN ('M2','BOX','PALLET','PIECE','KG','TON')),
  conversion_factor NUMERIC NOT NULL CHECK (conversion_factor > 0),
  pcs_per_box INTEGER,
  boxes_per_pallet INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, sku_code, from_uom, to_uom)
);
CREATE INDEX idx_sku_unit_conversion_tenant ON public.sku_unit_conversion(tenant_id, sku_code);
ALTER TABLE public.sku_unit_conversion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View sku_unit_conversion in tenant" ON public.sku_unit_conversion FOR SELECT TO authenticated
  USING (user_has_tenant(auth.uid(), tenant_id));
CREATE POLICY "Insert sku_unit_conversion admin sc" ON public.sku_unit_conversion FOR INSERT TO authenticated
  WITH CHECK (user_has_tenant(auth.uid(), tenant_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sc_manager')));
CREATE POLICY "Update sku_unit_conversion admin sc" ON public.sku_unit_conversion FOR UPDATE TO authenticated
  USING (user_has_tenant(auth.uid(), tenant_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sc_manager')));
CREATE POLICY "Delete sku_unit_conversion admin" ON public.sku_unit_conversion FOR DELETE TO authenticated
  USING (user_has_tenant(auth.uid(), tenant_id) AND has_role(auth.uid(),'admin'));

-- TABLE 3: nm_sku_constraint
CREATE TABLE public.nm_sku_constraint (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nm_code TEXT NOT NULL,
  sku_code TEXT NOT NULL,
  moq_base_uom NUMERIC NOT NULL CHECK (moq_base_uom > 0),
  moq_uom TEXT NOT NULL DEFAULT 'M2',
  price_tier1 NUMERIC,
  price_tier1_min_qty NUMERIC DEFAULT 0,
  price_tier2 NUMERIC,
  price_tier2_min_qty NUMERIC,
  production_lot_size NUMERIC,
  can_produce BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, nm_code, sku_code)
);
CREATE INDEX idx_nm_sku_constraint_tenant ON public.nm_sku_constraint(tenant_id, nm_code, sku_code);
ALTER TABLE public.nm_sku_constraint ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View nm_sku_constraint in tenant" ON public.nm_sku_constraint FOR SELECT TO authenticated
  USING (user_has_tenant(auth.uid(), tenant_id));
CREATE POLICY "Insert nm_sku_constraint admin sc" ON public.nm_sku_constraint FOR INSERT TO authenticated
  WITH CHECK (user_has_tenant(auth.uid(), tenant_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sc_manager')));
CREATE POLICY "Update nm_sku_constraint admin sc" ON public.nm_sku_constraint FOR UPDATE TO authenticated
  USING (user_has_tenant(auth.uid(), tenant_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sc_manager')));
CREATE POLICY "Delete nm_sku_constraint admin" ON public.nm_sku_constraint FOR DELETE TO authenticated
  USING (user_has_tenant(auth.uid(), tenant_id) AND has_role(auth.uid(),'admin'));
CREATE TRIGGER nm_sku_constraint_updated_at BEFORE UPDATE ON public.nm_sku_constraint
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- bravo_code
ALTER TABLE public.master_items ADD COLUMN IF NOT EXISTS bravo_code VARCHAR(30);
ALTER TABLE public.master_factories ADD COLUMN IF NOT EXISTS bravo_code VARCHAR(30);
ALTER TABLE public.master_branches ADD COLUMN IF NOT EXISTS bravo_code VARCHAR(30);
