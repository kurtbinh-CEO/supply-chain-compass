-- ═══════════════════════════════════════════════════════════
-- M24 — Security hardening: vá RLS trên master_* tables
-- ═══════════════════════════════════════════════════════════

-- 1) master_items — restrict INSERT/UPDATE
DROP POLICY IF EXISTS "Authenticated can insert master_items" ON public.master_items;
DROP POLICY IF EXISTS "Authenticated can update master_items" ON public.master_items;
DROP POLICY IF EXISTS "Public can view master_items" ON public.master_items;

CREATE POLICY "Authenticated can view master_items"
  ON public.master_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin SC Manager can insert master_items"
  ON public.master_items FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sc_manager'::app_role));

CREATE POLICY "Admin SC Manager can update master_items"
  ON public.master_items FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sc_manager'::app_role));

-- 2) master_factories — restrict INSERT/UPDATE + SELECT to authenticated
DROP POLICY IF EXISTS "Authenticated can insert master_factories" ON public.master_factories;
DROP POLICY IF EXISTS "Authenticated can update master_factories" ON public.master_factories;
DROP POLICY IF EXISTS "Public can view master_factories" ON public.master_factories;

CREATE POLICY "Authenticated can view master_factories"
  ON public.master_factories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin SC Manager can insert master_factories"
  ON public.master_factories FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sc_manager'::app_role));

CREATE POLICY "Admin SC Manager can update master_factories"
  ON public.master_factories FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sc_manager'::app_role));

-- 3) master_branches — restrict INSERT/UPDATE + SELECT to authenticated
DROP POLICY IF EXISTS "Authenticated can insert master_branches" ON public.master_branches;
DROP POLICY IF EXISTS "Authenticated can update master_branches" ON public.master_branches;
DROP POLICY IF EXISTS "Public can view master_branches" ON public.master_branches;

CREATE POLICY "Authenticated can view master_branches"
  ON public.master_branches FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin SC Manager can insert master_branches"
  ON public.master_branches FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sc_manager'::app_role));

CREATE POLICY "Admin SC Manager can update master_branches"
  ON public.master_branches FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sc_manager'::app_role));

-- 4) master_containers — restrict INSERT/UPDATE + SELECT to authenticated
DROP POLICY IF EXISTS "Authenticated can insert master_containers" ON public.master_containers;
DROP POLICY IF EXISTS "Authenticated can update master_containers" ON public.master_containers;
DROP POLICY IF EXISTS "Public can view master_containers" ON public.master_containers;

CREATE POLICY "Authenticated can view master_containers"
  ON public.master_containers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin SC Manager can insert master_containers"
  ON public.master_containers FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sc_manager'::app_role));

CREATE POLICY "Admin SC Manager can update master_containers"
  ON public.master_containers FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sc_manager'::app_role));

-- 5) master_data_audit — SELECT chỉ authenticated; INSERT chỉ admin/sc_manager
DROP POLICY IF EXISTS "Public can view master_data_audit" ON public.master_data_audit;
DROP POLICY IF EXISTS "Authenticated can insert master_data_audit" ON public.master_data_audit;

CREATE POLICY "Authenticated can view master_data_audit"
  ON public.master_data_audit FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin SC Manager can insert master_data_audit"
  ON public.master_data_audit FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sc_manager'::app_role));
