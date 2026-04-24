-- M24.4 — CRITICAL: Block self-role-escalation on user_roles
-- The existing "Admins can manage all roles" policy uses USING (...) which
-- only protects existing rows. INSERT needs explicit WITH CHECK.
-- Trigger handle_new_user_role is SECURITY DEFINER → bypasses RLS so still works.

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- SELECT: user xem role của chính mình; admin xem tất cả
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- INSERT: chỉ admin
CREATE POLICY "Only admin can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- UPDATE: chỉ admin
CREATE POLICY "Only admin can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- DELETE: chỉ admin
CREATE POLICY "Only admin can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
