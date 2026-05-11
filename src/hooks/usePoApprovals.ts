/**
 * usePoApprovals — fetch & mutate `to_plans` rows the current user can approve.
 * RLS already filters per tenant; CN scope filter is applied client-side
 * because RLS allows viewing any to_plan in tenant — CN restriction here is
 * for the UI scope (CN_MANAGER only acts on their own dest_cn).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/components/TenantContext";

const TENANT_ID: Record<string, string> = {
  "UNIS Group": "11111111-1111-1111-1111-111111111111",
};

export interface PoApprovalRow {
  id: string;
  to_code: string;
  source_nm: string | null;
  dest_cn: string;
  sku_code: string;
  planned_qty: number;
  dispatch_date: string | null;
  status: string;
  created_at: string;
  approved_at: string | null;
}

const PENDING_STATUSES = ["DRAFT", "SUBMITTED"];
const SLA_HOURS = 24;

export function usePoApprovals(cnScope: string | null) {
  const { tenant } = useTenant();
  const tenantId = TENANT_ID[tenant];
  const [rows, setRows] = useState<PoApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    let q = supabase
      .from("to_plans")
      .select("id, to_code, source_nm, dest_cn, sku_code, planned_qty, dispatch_date, status, created_at, approved_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (cnScope) q = q.eq("dest_cn", cnScope);
    q.then(({ data }) => {
      setRows((data ?? []) as PoApprovalRow[]);
      setLoading(false);
    });
  }, [tenantId, cnScope, tick]);

  const refresh = useCallback(() => setTick(t => t + 1), []);

  const approve = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("to_plans")
      .update({ status: "APPROVED", approved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    refresh();
  }, [refresh]);

  const reject = useCallback(async (id: string) => {
    const { error } = await supabase.from("to_plans").update({ status: "CANCELLED" }).eq("id", id);
    if (error) throw error;
    refresh();
  }, [refresh]);

  const summary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const slaCutoff = Date.now() - SLA_HOURS * 3_600_000;
    const pending = rows.filter(r => PENDING_STATUSES.includes(r.status));
    const approvedToday = rows.filter(r => r.status === "APPROVED" && r.approved_at?.slice(0, 10) === today);
    const overdue = pending.filter(r => new Date(r.created_at).getTime() < slaCutoff);
    return { pending, approvedToday, overdue };
  }, [rows]);

  return { rows, loading, refresh, approve, reject, summary };
}

/** Count for sidebar badge: pending TO Plans visible to current user. */
export function usePoApprovalCount(cnScope: string | null) {
  const { tenant } = useTenant();
  const tenantId = TENANT_ID[tenant];
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    const run = async () => {
      let q = supabase
        .from("to_plans")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .in("status", PENDING_STATUSES);
      if (cnScope) q = q.eq("dest_cn", cnScope);
      const { count: c } = await q;
      if (!cancelled) setCount(c ?? 0);
    };
    run();
    const id = setInterval(run, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [tenantId, cnScope]);

  return count;
}
