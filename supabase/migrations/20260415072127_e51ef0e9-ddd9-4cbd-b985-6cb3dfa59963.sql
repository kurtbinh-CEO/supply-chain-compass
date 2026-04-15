-- Create sop_consensus table
CREATE TABLE public.sop_consensus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant TEXT NOT NULL DEFAULT 'UNIS',
  period TEXT NOT NULL DEFAULT '2026-05',
  cn_code TEXT NOT NULL,
  sku TEXT NOT NULL,
  v0 NUMERIC NOT NULL DEFAULT 0,
  v1 NUMERIC NOT NULL DEFAULT 0,
  v2 NUMERIC NOT NULL DEFAULT 0,
  v3 NUMERIC NOT NULL DEFAULT 0,
  aop NUMERIC NOT NULL DEFAULT 0,
  fva_best TEXT,
  note TEXT DEFAULT '',
  locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant, period, cn_code, sku)
);

-- Enable RLS
ALTER TABLE public.sop_consensus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sop_consensus"
  ON public.sop_consensus FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin SC CN Manager can insert sop_consensus"
  ON public.sop_consensus FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sc_manager'::app_role) OR has_role(auth.uid(), 'cn_manager'::app_role));

CREATE POLICY "Admin SC CN Manager can update sop_consensus"
  ON public.sop_consensus FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sc_manager'::app_role) OR has_role(auth.uid(), 'cn_manager'::app_role));

CREATE POLICY "Admin can delete sop_consensus"
  ON public.sop_consensus FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_sop_consensus_updated_at
  BEFORE UPDATE ON public.sop_consensus
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sop_consensus;

-- Seed data for UNIS
INSERT INTO public.sop_consensus (tenant, period, cn_code, sku, v0, v1, v2, v3, aop, fva_best, note) VALUES
('UNIS', '2026-05', 'BD', 'GA-300 A4', 580, 650, 617, 617, 420, 'v2 CN (MAPE 12%)', 'Nhà thầu mới Q2'),
('UNIS', '2026-05', 'BD', 'GA-300 B2', 120, 140, 130, 130, 100, 'v2 CN (MAPE 12%)', ''),
('UNIS', '2026-05', 'BD', 'GA-300 C1', 350, 480, 410, 410, 280, 'v2 CN (MAPE 12%)', ''),
('UNIS', '2026-05', 'BD', 'GA-400 A4', 600, 750, 690, 690, 500, 'v2 CN (MAPE 12%)', ''),
('UNIS', '2026-05', 'BD', 'GA-600 A4', 350, 540, 500, 500, 300, 'v2 CN (MAPE 12%)', 'Vingroup Grand Park'),
('UNIS', '2026-05', 'BD', 'GA-600 B2', 100, 240, 203, 203, 116, 'v2 CN (MAPE 12%)', ''),
('UNIS', '2026-05', 'DN', 'GA-400 A4', 800, 950, 870, 870, 600, 'v1 Sales (MAPE 18%)', ''),
('UNIS', '2026-05', 'DN', 'GA-600 A4', 500, 620, 560, 560, 380, 'v1 Sales (MAPE 18%)', ''),
('UNIS', '2026-05', 'DN', 'GA-600 B2', 350, 430, 370, 370, 239, 'v1 Sales (MAPE 18%)', ''),
('UNIS', '2026-05', 'HN', 'GA-300 A4', 600, 780, 680, 680, 430, 'v0 Stat (MAPE 8%)', ''),
('UNIS', '2026-05', 'HN', 'GA-300 C1', 450, 570, 500, 500, 320, 'v0 Stat (MAPE 8%)', ''),
('UNIS', '2026-05', 'HN', 'GA-400 D5', 350, 420, 390, 390, 250, 'v0 Stat (MAPE 8%)', ''),
('UNIS', '2026-05', 'HN', 'GA-600 B2', 500, 630, 530, 530, 326, 'v0 Stat (MAPE 8%)', ''),
('UNIS', '2026-05', 'CT', 'GA-400 D5', 400, 470, 430, 430, 340, 'v3 Consensus', ''),
('UNIS', '2026-05', 'CT', 'GA-600 A4', 450, 510, 480, 480, 370, 'v3 Consensus', ''),
('UNIS', '2026-05', 'CT', 'GA-600 B2', 300, 320, 290, 290, 229, 'v3 Consensus', '');

-- Seed data for TTC (scale 0.75)
INSERT INTO public.sop_consensus (tenant, period, cn_code, sku, v0, v1, v2, v3, aop, fva_best, note) VALUES
('TTC', '2026-05', 'BD', 'GA-300 A4', 435, 488, 463, 463, 315, 'v2 CN (MAPE 12%)', ''),
('TTC', '2026-05', 'BD', 'GA-300 B2', 90, 105, 98, 98, 75, 'v2 CN (MAPE 12%)', ''),
('TTC', '2026-05', 'BD', 'GA-300 C1', 263, 360, 308, 308, 210, 'v2 CN (MAPE 12%)', ''),
('TTC', '2026-05', 'BD', 'GA-400 A4', 450, 563, 518, 518, 375, 'v2 CN (MAPE 12%)', ''),
('TTC', '2026-05', 'BD', 'GA-600 A4', 263, 405, 375, 375, 225, 'v2 CN (MAPE 12%)', ''),
('TTC', '2026-05', 'BD', 'GA-600 B2', 75, 180, 152, 152, 87, 'v2 CN (MAPE 12%)', ''),
('TTC', '2026-05', 'DN', 'GA-400 A4', 600, 713, 653, 653, 450, 'v1 Sales (MAPE 18%)', ''),
('TTC', '2026-05', 'DN', 'GA-600 A4', 375, 465, 420, 420, 285, 'v1 Sales (MAPE 18%)', ''),
('TTC', '2026-05', 'DN', 'GA-600 B2', 263, 323, 278, 278, 179, 'v1 Sales (MAPE 18%)', ''),
('TTC', '2026-05', 'HN', 'GA-300 A4', 450, 585, 510, 510, 323, 'v0 Stat (MAPE 8%)', ''),
('TTC', '2026-05', 'HN', 'GA-300 C1', 338, 428, 375, 375, 240, 'v0 Stat (MAPE 8%)', ''),
('TTC', '2026-05', 'HN', 'GA-400 D5', 263, 315, 293, 293, 188, 'v0 Stat (MAPE 8%)', ''),
('TTC', '2026-05', 'HN', 'GA-600 B2', 375, 473, 398, 398, 245, 'v0 Stat (MAPE 8%)', ''),
('TTC', '2026-05', 'CT', 'GA-400 D5', 300, 353, 323, 323, 255, 'v3 Consensus', ''),
('TTC', '2026-05', 'CT', 'GA-600 A4', 338, 383, 360, 360, 278, 'v3 Consensus', ''),
('TTC', '2026-05', 'CT', 'GA-600 B2', 225, 240, 218, 218, 172, 'v3 Consensus', '');

-- Seed data for MDLZ (scale 1.2)
INSERT INTO public.sop_consensus (tenant, period, cn_code, sku, v0, v1, v2, v3, aop, fva_best, note) VALUES
('MDLZ', '2026-05', 'BD', 'GA-300 A4', 696, 780, 740, 740, 504, 'v2 CN (MAPE 12%)', ''),
('MDLZ', '2026-05', 'BD', 'GA-300 B2', 144, 168, 156, 156, 120, 'v2 CN (MAPE 12%)', ''),
('MDLZ', '2026-05', 'BD', 'GA-300 C1', 420, 576, 492, 492, 336, 'v2 CN (MAPE 12%)', ''),
('MDLZ', '2026-05', 'BD', 'GA-400 A4', 720, 900, 828, 828, 600, 'v2 CN (MAPE 12%)', ''),
('MDLZ', '2026-05', 'BD', 'GA-600 A4', 420, 648, 600, 600, 360, 'v2 CN (MAPE 12%)', ''),
('MDLZ', '2026-05', 'BD', 'GA-600 B2', 120, 288, 244, 244, 139, 'v2 CN (MAPE 12%)', ''),
('MDLZ', '2026-05', 'DN', 'GA-400 A4', 960, 1140, 1044, 1044, 720, 'v1 Sales (MAPE 18%)', ''),
('MDLZ', '2026-05', 'DN', 'GA-600 A4', 600, 744, 672, 672, 456, 'v1 Sales (MAPE 18%)', ''),
('MDLZ', '2026-05', 'DN', 'GA-600 B2', 420, 516, 444, 444, 287, 'v1 Sales (MAPE 18%)', ''),
('MDLZ', '2026-05', 'HN', 'GA-300 A4', 720, 936, 816, 816, 516, 'v0 Stat (MAPE 8%)', ''),
('MDLZ', '2026-05', 'HN', 'GA-300 C1', 540, 684, 600, 600, 384, 'v0 Stat (MAPE 8%)', ''),
('MDLZ', '2026-05', 'HN', 'GA-400 D5', 420, 504, 468, 468, 300, 'v0 Stat (MAPE 8%)', ''),
('MDLZ', '2026-05', 'HN', 'GA-600 B2', 600, 756, 636, 636, 391, 'v0 Stat (MAPE 8%)', ''),
('MDLZ', '2026-05', 'CT', 'GA-400 D5', 480, 564, 516, 516, 408, 'v3 Consensus', ''),
('MDLZ', '2026-05', 'CT', 'GA-600 A4', 540, 612, 576, 576, 444, 'v3 Consensus', ''),
('MDLZ', '2026-05', 'CT', 'GA-600 B2', 360, 384, 348, 348, 275, 'v3 Consensus', '');