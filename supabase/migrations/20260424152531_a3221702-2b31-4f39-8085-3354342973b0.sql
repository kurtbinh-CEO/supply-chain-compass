-- M24.1 — Restrict audit log SELECT to admin/sc_manager
DROP POLICY IF EXISTS "Authenticated can view master_data_audit" ON public.master_data_audit;
DROP POLICY IF EXISTS "Authenticated users can view drp_audit_log" ON public.drp_audit_log;

CREATE POLICY "Admin SC Manager can view master_data_audit"
  ON public.master_data_audit FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sc_manager'::app_role));

CREATE POLICY "Admin SC Manager can view drp_audit_log"
  ON public.drp_audit_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sc_manager'::app_role));
