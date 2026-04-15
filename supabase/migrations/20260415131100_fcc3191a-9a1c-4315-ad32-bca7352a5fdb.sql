
-- FC Accuracy table
CREATE TABLE public.fc_accuracy (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cn_code TEXT NOT NULL,
  week TEXT NOT NULL,
  mape_hw NUMERIC NOT NULL DEFAULT 0,
  mape_ai NUMERIC NOT NULL DEFAULT 0,
  stdev_hw NUMERIC NOT NULL DEFAULT 0,
  stdev_ai NUMERIC NOT NULL DEFAULT 0,
  best_model TEXT,
  fva TEXT,
  tenant TEXT NOT NULL DEFAULT 'UNIS',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fc_accuracy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view fc_accuracy" ON public.fc_accuracy FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin SC Manager can insert fc_accuracy" ON public.fc_accuracy FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sc_manager'));
CREATE POLICY "Admin SC Manager can update fc_accuracy" ON public.fc_accuracy FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sc_manager'));
CREATE POLICY "Admin can delete fc_accuracy" ON public.fc_accuracy FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_fc_accuracy_updated_at BEFORE UPDATE ON public.fc_accuracy FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.fc_accuracy;

-- NM Performance table
CREATE TABLE public.nm_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nm_code TEXT NOT NULL,
  nm_name TEXT NOT NULL,
  honoring_pct NUMERIC NOT NULL DEFAULT 0,
  ontime_pct NUMERIC NOT NULL DEFAULT 0,
  lt_delta TEXT,
  trend TEXT,
  grade TEXT,
  tenant TEXT NOT NULL DEFAULT 'UNIS',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nm_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view nm_performance" ON public.nm_performance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin SC Manager can insert nm_performance" ON public.nm_performance FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sc_manager'));
CREATE POLICY "Admin SC Manager can update nm_performance" ON public.nm_performance FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sc_manager'));
CREATE POLICY "Admin can delete nm_performance" ON public.nm_performance FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_nm_performance_updated_at BEFORE UPDATE ON public.nm_performance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.nm_performance;

-- Seed data for fc_accuracy (UNIS)
INSERT INTO public.fc_accuracy (cn_code, week, mape_hw, mape_ai, stdev_hw, stdev_ai, best_model, fva, tenant) VALUES
('CN-BD', 'W01', 28, 22, 4.2, 1.8, 'v2 CN Input', '+3%', 'UNIS'),
('CN-BD', 'W02', 26, 24, 4.0, 1.9, 'v2 CN Input', '+3%', 'UNIS'),
('CN-BD', 'W03', 30, 25, 4.5, 2.0, 'v2 CN Input', '+3%', 'UNIS'),
('CN-BD', 'W04', 27, 23, 4.1, 1.7, 'v2 CN Input', '+3%', 'UNIS'),
('CN-BD', 'W05', 29, 28, 4.3, 2.1, 'v2 CN Input', '+3%', 'UNIS'),
('CN-BD', 'W06', 25, 27, 3.9, 2.2, 'v2 CN Input', '+3%', 'UNIS'),
('CN-BD', 'W07', 24, 30, 3.8, 2.5, 'v2 CN Input', '+3%', 'UNIS'),
('CN-BD', 'W08', 26, 29, 4.0, 2.4, 'v2 CN Input', '+3%', 'UNIS'),
('CN-BD', 'W09', 23, 26, 3.7, 2.1, 'v2 CN Input', '+3%', 'UNIS'),
('CN-BD', 'W10', 22, 20, 3.5, 1.6, 'v2 CN Input', '+3%', 'UNIS'),
('CN-BD', 'W11', 20, 18, 3.3, 1.5, 'v2 CN Input', '+3%', 'UNIS'),
('CN-BD', 'W12', 24.8, 16.2, 4.2, 1.8, 'v2 CN Input', '+3%', 'UNIS'),
('CN-ĐN', 'W12', 22, 18, 3.8, 2.0, 'v1 Sales', '-2%', 'UNIS'),
('CN-HN', 'W12', 31, 25, 5.0, 2.8, 'v0 Statistical', '-3%', 'UNIS'),
('CN-CT', 'W12', 15, 12, 2.5, 1.2, 'v3 Consensus', '+1%', 'UNIS');

-- Seed data for fc_accuracy (TTC)
INSERT INTO public.fc_accuracy (cn_code, week, mape_hw, mape_ai, stdev_hw, stdev_ai, best_model, fva, tenant) VALUES
('CN-BD', 'W12', 20, 14, 3.5, 1.5, 'v2 CN Input', '+4%', 'TTC'),
('CN-HN', 'W12', 25, 19, 4.0, 2.0, 'v1 Sales', '-1%', 'TTC');

-- Seed data for fc_accuracy (MDLZ)
INSERT INTO public.fc_accuracy (cn_code, week, mape_hw, mape_ai, stdev_hw, stdev_ai, best_model, fva, tenant) VALUES
('CN-BD', 'W12', 18, 12, 3.0, 1.3, 'v2 CN Input', '+5%', 'MDLZ'),
('CN-ĐN', 'W12', 28, 22, 4.5, 2.2, 'v0 Statistical', '-2%', 'MDLZ');

-- Seed data for nm_performance
INSERT INTO public.nm_performance (nm_code, nm_name, honoring_pct, ontime_pct, lt_delta, trend, grade, tenant) VALUES
('mikado', 'Mikado', 92, 88, '+1.2d', '→ stable', 'A', 'UNIS'),
('toko', 'Toko', 68, 52, '+5.5d', '↘ worse', 'C', 'UNIS'),
('dongtam', 'Đồng Tâm', 85, 80, '+2.0d', '↗ improving', 'B', 'UNIS'),
('vigracera', 'Vigracera', 90, 85, '+1.5d', '→ stable', 'A', 'UNIS'),
('mikado', 'Mikado', 88, 82, '+1.8d', '→ stable', 'B', 'TTC'),
('toko', 'Toko', 75, 60, '+4.0d', '↘ worse', 'C', 'TTC'),
('mikado', 'Mikado', 95, 92, '+0.8d', '↗ improving', 'A', 'MDLZ'),
('dongtam', 'Đồng Tâm', 80, 75, '+2.5d', '→ stable', 'B', 'MDLZ');
