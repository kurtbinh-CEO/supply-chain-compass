CREATE TABLE public.workflow_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  planning_period TEXT NOT NULL,
  current_step TEXT,
  steps_completed TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, planning_period)
);

ALTER TABLE public.workflow_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own workflow_sessions"
  ON public.workflow_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND user_has_tenant(auth.uid(), tenant_id));

CREATE POLICY "Insert own workflow_sessions"
  ON public.workflow_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND user_has_tenant(auth.uid(), tenant_id));

CREATE POLICY "Update own workflow_sessions"
  ON public.workflow_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND user_has_tenant(auth.uid(), tenant_id));

CREATE POLICY "Delete own workflow_sessions"
  ON public.workflow_sessions FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND user_has_tenant(auth.uid(), tenant_id));

CREATE TRIGGER update_workflow_sessions_updated_at
  BEFORE UPDATE ON public.workflow_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_workflow_sessions_lookup
  ON public.workflow_sessions (tenant_id, user_id, planning_period);