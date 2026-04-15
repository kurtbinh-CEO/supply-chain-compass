
-- ============================================
-- 1. INVENTORY TABLE
-- ============================================
CREATE TABLE public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT NOT NULL,
  cn_code TEXT NOT NULL,
  warehouse_code TEXT NOT NULL DEFAULT 'WH-01',
  quantity NUMERIC NOT NULL DEFAULT 0,
  safety_stock NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'carton',
  batch_number TEXT,
  tenant TEXT NOT NULL DEFAULT 'UNIS',
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_sku ON public.inventory(sku);
CREATE INDEX idx_inventory_cn ON public.inventory(cn_code);
CREATE INDEX idx_inventory_tenant ON public.inventory(tenant);
CREATE UNIQUE INDEX idx_inventory_sku_cn_wh ON public.inventory(sku, cn_code, warehouse_code, tenant);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read
CREATE POLICY "Authenticated users can view inventory"
  ON public.inventory FOR SELECT TO authenticated
  USING (true);

-- Admin and SC Manager can insert
CREATE POLICY "Admin and SC Manager can insert inventory"
  ON public.inventory FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sc_manager'));

-- Admin and SC Manager can update
CREATE POLICY "Admin and SC Manager can update inventory"
  ON public.inventory FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sc_manager'));

-- Admin can delete
CREATE POLICY "Admin can delete inventory"
  ON public.inventory FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-update timestamp
CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. PURCHASE ORDERS TABLE
-- ============================================
CREATE TYPE public.po_status AS ENUM ('draft', 'submitted', 'confirmed', 'shipped', 'received', 'cancelled');

CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  po_number TEXT NOT NULL,
  supplier TEXT NOT NULL,
  sku TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'VND',
  status public.po_status NOT NULL DEFAULT 'draft',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  received_date DATE,
  notes TEXT,
  tenant TEXT NOT NULL DEFAULT 'UNIS',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_po_number_tenant ON public.purchase_orders(po_number, tenant);
CREATE INDEX idx_po_status ON public.purchase_orders(status);
CREATE INDEX idx_po_sku ON public.purchase_orders(sku);
CREATE INDEX idx_po_tenant ON public.purchase_orders(tenant);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view POs"
  ON public.purchase_orders FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin and SC Manager can insert POs"
  ON public.purchase_orders FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sc_manager'));

CREATE POLICY "Admin and SC Manager can update POs"
  ON public.purchase_orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sc_manager'));

CREATE POLICY "Admin can delete POs"
  ON public.purchase_orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_po_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 3. DEMAND FORECASTS TABLE
-- ============================================
CREATE TYPE public.forecast_source AS ENUM ('system', 'manual', 'b2b');

CREATE TABLE public.demand_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT NOT NULL,
  cn_code TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  forecast_qty NUMERIC NOT NULL DEFAULT 0,
  actual_qty NUMERIC DEFAULT 0,
  adjustment_qty NUMERIC DEFAULT 0,
  source public.forecast_source NOT NULL DEFAULT 'system',
  confidence NUMERIC DEFAULT 0.8,
  tenant TEXT NOT NULL DEFAULT 'UNIS',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_forecast_sku ON public.demand_forecasts(sku);
CREATE INDEX idx_forecast_cn ON public.demand_forecasts(cn_code);
CREATE INDEX idx_forecast_period ON public.demand_forecasts(period_start, period_end);
CREATE INDEX idx_forecast_tenant ON public.demand_forecasts(tenant);

ALTER TABLE public.demand_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view forecasts"
  ON public.demand_forecasts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin SC CN Manager can insert forecasts"
  ON public.demand_forecasts FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sc_manager')
    OR public.has_role(auth.uid(), 'cn_manager')
  );

CREATE POLICY "Admin SC CN Manager can update forecasts"
  ON public.demand_forecasts FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'sc_manager')
    OR public.has_role(auth.uid(), 'cn_manager')
  );

CREATE POLICY "Admin can delete forecasts"
  ON public.demand_forecasts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_forecast_updated_at
  BEFORE UPDATE ON public.demand_forecasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
