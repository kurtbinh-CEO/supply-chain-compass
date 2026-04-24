-- M24.3 — Tighten realtime channel access to specific roles
DROP POLICY IF EXISTS "Authenticated can read realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can write realtime messages" ON realtime.messages;

CREATE POLICY "Manager roles can subscribe realtime"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'sc_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'cn_manager'::public.app_role)
  );

CREATE POLICY "Manager roles can publish realtime"
  ON realtime.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'sc_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'cn_manager'::public.app_role)
  );
