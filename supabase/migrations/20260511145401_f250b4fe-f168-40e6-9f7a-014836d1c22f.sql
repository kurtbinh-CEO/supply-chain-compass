
-- TABLE 1: lead_times
CREATE TABLE public.lead_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source_code TEXT NOT NULL,
  dest_code TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'ROAD' CHECK (mode IN ('ROAD','RAIL','SEA')),
  leadtime_days INTEGER NOT NULL CHECK (leadtime_days > 0),
  transport_cost NUMERIC,
  priority INTEGER NOT NULL DEFAULT 1,
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, source_code, dest_code, mode)
);
CREATE INDEX idx_lead_times_tenant ON public.lead_times(tenant_id, source_code, dest_code);
ALTER TABLE public.lead_times ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View lead_times in tenant" ON public.lead_times FOR SELECT TO authenticated USING (user_has_tenant(auth.uid(), tenant_id));
CREATE POLICY "Insert lead_times admin sc" ON public.lead_times FOR INSERT TO authenticated WITH CHECK (user_has_tenant(auth.uid(), tenant_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sc_manager')));
CREATE POLICY "Update lead_times admin sc" ON public.lead_times FOR UPDATE TO authenticated USING (user_has_tenant(auth.uid(), tenant_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sc_manager')));
CREATE POLICY "Delete lead_times admin" ON public.lead_times FOR DELETE TO authenticated USING (user_has_tenant(auth.uid(), tenant_id) AND has_role(auth.uid(),'admin'));
CREATE TRIGGER lead_times_updated_at BEFORE UPDATE ON public.lead_times FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TABLE 2: substitution_lists
CREATE TABLE public.substitution_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  original_sku TEXT NOT NULL,
  substitute_sku TEXT NOT NULL,
  cn_code TEXT,
  priority INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 3),
  max_depth INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_substitution_lists_unique ON public.substitution_lists(tenant_id, original_sku, substitute_sku, COALESCE(cn_code,'ALL'));
ALTER TABLE public.substitution_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View substitution_lists in tenant" ON public.substitution_lists FOR SELECT TO authenticated USING (user_has_tenant(auth.uid(), tenant_id));
CREATE POLICY "Insert substitution_lists admin sc" ON public.substitution_lists FOR INSERT TO authenticated WITH CHECK (user_has_tenant(auth.uid(), tenant_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sc_manager')));
CREATE POLICY "Update substitution_lists admin sc" ON public.substitution_lists FOR UPDATE TO authenticated USING (user_has_tenant(auth.uid(), tenant_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sc_manager')));
CREATE POLICY "Delete substitution_lists admin" ON public.substitution_lists FOR DELETE TO authenticated USING (user_has_tenant(auth.uid(), tenant_id) AND has_role(auth.uid(),'admin'));

-- TABLE 3: stock_policies
CREATE TABLE public.stock_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sku_code TEXT NOT NULL,
  location_code TEXT NOT NULL,
  stock_days_min INTEGER NOT NULL,
  stock_days_target INTEGER NOT NULL,
  stock_days_max INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, sku_code, location_code),
  CHECK (stock_days_min < stock_days_target AND stock_days_target < stock_days_max)
);
ALTER TABLE public.stock_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View stock_policies in tenant" ON public.stock_policies FOR SELECT TO authenticated USING (user_has_tenant(auth.uid(), tenant_id));
CREATE POLICY "Insert stock_policies admin sc" ON public.stock_policies FOR INSERT TO authenticated WITH CHECK (user_has_tenant(auth.uid(), tenant_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sc_manager')));
CREATE POLICY "Update stock_policies admin sc" ON public.stock_policies FOR UPDATE TO authenticated USING (user_has_tenant(auth.uid(), tenant_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sc_manager')));
CREATE POLICY "Delete stock_policies admin" ON public.stock_policies FOR DELETE TO authenticated USING (user_has_tenant(auth.uid(), tenant_id) AND has_role(auth.uid(),'admin'));
CREATE TRIGGER stock_policies_updated_at BEFORE UPDATE ON public.stock_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SEED UNIS (tenant_id = 256ee065-09f6-4e7a-9b5c-b94e861031f5)
-- 60 lead_times: 5 NM × 12 CN
WITH nms(code, base_lt) AS (VALUES ('NM01',3),('NM02',5),('NM03',4),('NM04',6),('NM05',7)),
     cns(code, extra_lt, cost) AS (VALUES
       ('CN01',0,500000),('CN02',1,600000),('CN03',1,650000),('CN04',2,800000),
       ('CN05',2,850000),('CN06',3,1000000),('CN07',3,1100000),('CN08',4,1300000),
       ('CN09',4,1400000),('CN10',5,1600000),('CN11',5,1700000),('CN12',6,2000000))
INSERT INTO public.lead_times (tenant_id, source_code, dest_code, mode, leadtime_days, transport_cost, priority)
SELECT '256ee065-09f6-4e7a-9b5c-b94e861031f5', n.code, c.code, 'ROAD', n.base_lt + c.extra_lt, c.cost, 1
FROM nms n CROSS JOIN cns c;

-- 5 substitutions
INSERT INTO public.substitution_lists (tenant_id, original_sku, substitute_sku, cn_code, priority, max_depth) VALUES
('256ee065-09f6-4e7a-9b5c-b94e861031f5','SKU-001','SKU-002',NULL,1,3),
('256ee065-09f6-4e7a-9b5c-b94e861031f5','SKU-001','SKU-003',NULL,2,3),
('256ee065-09f6-4e7a-9b5c-b94e861031f5','SKU-010','SKU-011','CN01',1,2),
('256ee065-09f6-4e7a-9b5c-b94e861031f5','SKU-020','SKU-021',NULL,1,3),
('256ee065-09f6-4e7a-9b5c-b94e861031f5','SKU-030','SKU-031',NULL,1,3);

-- 15 stock_policies
WITH skus(code) AS (VALUES ('SKU-001'),('SKU-002'),('SKU-003'),('SKU-010'),('SKU-020')),
     locs(code) AS (VALUES ('CN01'),('CN02'),('CN03'))
INSERT INTO public.stock_policies (tenant_id, sku_code, location_code, stock_days_min, stock_days_target, stock_days_max)
SELECT '256ee065-09f6-4e7a-9b5c-b94e861031f5', s.code, l.code, 7, 14, 21
FROM skus s CROSS JOIN locs l;
