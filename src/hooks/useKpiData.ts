/**
 * useKpiData — KPI hero cards trên /monitoring lấy số thật từ DB.
 *
 * Lấy 2 plan_runs gần nhất (lifecycle SUCCEEDED) để tính:
 *   - Fill Rate (%)
 *   - Lost Sales (qty)
 * + SS Breaches: count(inventory) WHERE quantity − reserved_hard − quarantine − soft_reserved < safety_stock
 * + FC MAPE: avg(mape_hw) latest week trong fc_accuracy
 * + NM Reliability: avg(honoring_pct) trong nm_performance
 *
 * Mỗi KPI có {value, prev, trend} để HeroCard hiển thị mũi tên.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserTenantId } from "./useUserTenantId";
import { useTenant } from "@/components/TenantContext";

const tenantMap: Record<string, string> = {
  "UNIS Group": "UNIS",
  "TTC Agris": "TTC",
  "Mondelez": "MDLZ",
};

export interface KpiMetric {
  value: number | null;
  prev: number | null;
  delta: number | null;       // value - prev
  direction: "up" | "down" | "flat";
  isGood: boolean;            // delta good or bad
}

export interface KpiData {
  fillRate: KpiMetric;        // 0..1
  lostSales: KpiMetric;       // qty
  ssBreaches: KpiMetric;      // count
  fcMape: KpiMetric;          // 0..100 (%)
  nmReliability: KpiMetric;   // 0..100 (%)
  loading: boolean;
  planRun: { id: string; run_name: string } | null;
}

const empty = (): KpiMetric => ({ value: null, prev: null, delta: null, direction: "flat", isGood: true });

function buildMetric(value: number | null, prev: number | null, higherIsBetter: boolean): KpiMetric {
  if (value == null) return empty();
  if (prev == null) return { value, prev, delta: null, direction: "flat", isGood: true };
  const delta = value - prev;
  const direction: KpiMetric["direction"] = Math.abs(delta) < 1e-9 ? "flat" : delta > 0 ? "up" : "down";
  const isGood = direction === "flat" ? true : higherIsBetter ? delta > 0 : delta < 0;
  return { value, prev, delta, direction, isGood };
}

export function useKpiData(): KpiData {
  const { data: tenantId } = useUserTenantId();
  const { tenant } = useTenant();
  const tenantCode = tenantMap[tenant] ?? "UNIS";
  const [state, setState] = useState<KpiData>({
    fillRate: empty(), lostSales: empty(), ssBreaches: empty(),
    fcMape: empty(), nmReliability: empty(),
    loading: true, planRun: null,
  });

  const fetchAll = useCallback(async () => {
    if (!tenantId) return;
    setState(s => ({ ...s, loading: true }));

    // 1. Plan runs — last 2 SUCCEEDED
    const { data: runs } = await supabase
      .from("plan_runs")
      .select("id, run_name, fill_rate, lost_sales_qty, lifecycle, created_at")
      .eq("tenant_id", tenantId)
      .eq("lifecycle", "SUCCEEDED")
      .order("created_at", { ascending: false })
      .limit(2);

    const latest = runs?.[0];
    const prev = runs?.[1];

    const fillRate = buildMetric(
      latest?.fill_rate != null ? Number(latest.fill_rate) : null,
      prev?.fill_rate != null ? Number(prev.fill_rate) : null,
      true,
    );
    const lostSales = buildMetric(
      latest?.lost_sales_qty != null ? Number(latest.lost_sales_qty) : null,
      prev?.lost_sales_qty != null ? Number(prev.lost_sales_qty) : null,
      false,
    );

    // 2. SS Breaches — count rows below safety stock
    const { data: invRows } = await supabase
      .from("inventory")
      .select("quantity, reserved_hard, quarantine, soft_reserved, safety_stock");
    const breachCount = (invRows ?? []).reduce((acc, r: any) => {
      const avail = Number(r.quantity ?? 0) - Number(r.reserved_hard ?? 0)
        - Number(r.quarantine ?? 0) - Number(r.soft_reserved ?? 0);
      return acc + (avail < Number(r.safety_stock ?? 0) ? 1 : 0);
    }, 0);
    const ssBreaches = buildMetric(breachCount, null, false);

    // 3. FC MAPE — avg latest week
    const { data: fcRows } = await supabase
      .from("fc_accuracy")
      .select("week, mape_hw, mape_ai")
      .eq("tenant", tenantCode)
      .order("week", { ascending: false })
      .limit(50);

    let fcMape: KpiMetric = empty();
    if (fcRows && fcRows.length) {
      const latestWeek = fcRows[0].week;
      const latestRows = fcRows.filter(r => r.week === latestWeek);
      const avgLatest = latestRows.reduce((s, r) => s + Number(r.mape_hw ?? 0), 0) / latestRows.length;
      const otherWeeks = Array.from(new Set(fcRows.map(r => r.week))).filter(w => w !== latestWeek);
      const prevWeek = otherWeeks[0];
      let avgPrev: number | null = null;
      if (prevWeek) {
        const prevRows = fcRows.filter(r => r.week === prevWeek);
        avgPrev = prevRows.reduce((s, r) => s + Number(r.mape_hw ?? 0), 0) / prevRows.length;
      }
      fcMape = buildMetric(avgLatest, avgPrev, false);
    }

    // 4. NM Reliability
    const { data: nmRows } = await supabase
      .from("nm_performance")
      .select("honoring_pct")
      .eq("tenant", tenantCode);
    let nmReliability: KpiMetric = empty();
    if (nmRows && nmRows.length) {
      const avg = nmRows.reduce((s, r) => s + Number(r.honoring_pct ?? 0), 0) / nmRows.length;
      nmReliability = buildMetric(avg, null, true);
    }

    setState({
      fillRate, lostSales, ssBreaches, fcMape, nmReliability,
      loading: false,
      planRun: latest ? { id: latest.id, run_name: latest.run_name } : null,
    });
  }, [tenantId, tenantCode]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime: refetch when plan_runs change
  useEffect(() => {
    if (!tenantId) return;
    const ch = supabase
      .channel(`kpi_plan_runs_${tenantId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "plan_runs", filter: `tenant_id=eq.${tenantId}` },
        () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tenantId, fetchAll]);

  return state;
}
