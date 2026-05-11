/**
 * useDrpResults — Layer 1 + Layer 2 dữ liệu từ plan_run_results.
 *
 * Layer 1: GROUP BY cn_code → { cn, demand, allocated, gap, fill_rate }
 * Layer 2: WHERE cn_code → từng SKU base với phân chia theo source_type
 *
 * Hook trả về:
 *  - planRuns: danh sách run gần đây (cho dropdown)
 *  - runId / setRunId: run đang chọn
 *  - layer1: 12 CN cards
 *  - layer2(cnCode): SKU breakdown
 *  - loading
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserTenantId } from "./useUserTenantId";

export interface PlanRunOption {
  id: string;
  run_name: string;
  fill_rate: number | null;
  completed_at: string | null;
  lifecycle: string;
}

export interface ResultRow {
  cn_code: string;
  sku_code: string;
  sku_base: string;
  demand_qty: number;
  allocated_qty: number;
  source_type: "ON_HAND" | "PIPELINE" | "HUB_PO" | "LCNB" | "INTERNAL_TO" | "GAP" | null;
  source_location: string | null;
  gap_qty: number | null;
}

export interface CnSummary {
  cn_code: string;
  demand: number;
  allocated: number;
  gap: number;
  fillRate: number;
  skuCount: number;
  shortageCount: number;
  /** allocated breakdown by source_type */
  bySource: Record<string, number>;
}

export interface SkuBreakdown {
  sku_base: string;
  demand: number;
  allocated: number;
  gap: number;
  fillRate: number;
  bySource: Record<string, number>;
  rows: ResultRow[];
}

export function useDrpResults() {
  const { data: tenantId } = useUserTenantId();
  const [planRuns, setPlanRuns] = useState<PlanRunOption[]>([]);
  const [runId, setRunId] = useState<string>("");
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Load recent plan_runs (SUCCEEDED/REVIEWED/APPROVED/PUBLISHED first)
  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("plan_runs")
        .select("id, run_name, fill_rate, completed_at, lifecycle")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (cancelled) return;
      const list = (data ?? []) as PlanRunOption[];
      setPlanRuns(list);
      // Auto-select most recent SUCCEEDED if nothing chosen
      setRunId((prev) => {
        if (prev && list.some(r => r.id === prev)) return prev;
        const best = list.find(r => r.lifecycle === "SUCCEEDED") ?? list[0];
        return best?.id ?? "";
      });
    })();
    return () => { cancelled = true; };
  }, [tenantId]);

  // Load result rows for selected run
  useEffect(() => {
    if (!runId) { setRows([]); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("plan_run_results")
        .select("cn_code, sku_code, sku_base, demand_qty, allocated_qty, source_type, source_location, gap_qty")
        .eq("plan_run_id", runId);
      if (cancelled) return;
      setRows((data ?? []) as ResultRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [runId]);

  // Layer 1: group by cn_code
  const layer1 = useMemo<CnSummary[]>(() => {
    // demand is per (cn, sku_base) — same value repeats across split rows.
    // So we aggregate demand by unique (cn, sku_base), allocated/gap summed by row.
    const demandKey = new Map<string, number>(); // `${cn}|${base}` -> demand
    const allocByCn = new Map<string, number>();
    const gapByCn = new Map<string, number>();
    const bySourceByCn = new Map<string, Record<string, number>>();
    const skuSetByCn = new Map<string, Set<string>>();
    const shortageByCn = new Map<string, Set<string>>();

    for (const r of rows) {
      const dk = `${r.cn_code}|${r.sku_base}`;
      demandKey.set(dk, Number(r.demand_qty ?? 0));
      allocByCn.set(r.cn_code, (allocByCn.get(r.cn_code) ?? 0) + Number(r.allocated_qty ?? 0));
      gapByCn.set(r.cn_code, (gapByCn.get(r.cn_code) ?? 0) + Number(r.gap_qty ?? 0));
      const bs = bySourceByCn.get(r.cn_code) ?? {};
      const st = r.source_type ?? "OTHER";
      bs[st] = (bs[st] ?? 0) + Number(r.allocated_qty ?? 0);
      bySourceByCn.set(r.cn_code, bs);
      const skuSet = skuSetByCn.get(r.cn_code) ?? new Set();
      skuSet.add(r.sku_base);
      skuSetByCn.set(r.cn_code, skuSet);
      if (r.source_type === "GAP" && Number(r.gap_qty ?? 0) > 0) {
        const sh = shortageByCn.get(r.cn_code) ?? new Set();
        sh.add(r.sku_base);
        shortageByCn.set(r.cn_code, sh);
      }
    }

    const demandByCn = new Map<string, number>();
    for (const [k, v] of demandKey.entries()) {
      const cn = k.split("|")[0];
      demandByCn.set(cn, (demandByCn.get(cn) ?? 0) + v);
    }

    const cnList = Array.from(new Set(rows.map(r => r.cn_code))).sort();
    return cnList.map<CnSummary>(cn => {
      const d = demandByCn.get(cn) ?? 0;
      const a = allocByCn.get(cn) ?? 0;
      const g = gapByCn.get(cn) ?? Math.max(d - a, 0);
      return {
        cn_code: cn,
        demand: d,
        allocated: a,
        gap: g,
        fillRate: d > 0 ? a / d : 0,
        skuCount: skuSetByCn.get(cn)?.size ?? 0,
        shortageCount: shortageByCn.get(cn)?.size ?? 0,
        bySource: bySourceByCn.get(cn) ?? {},
      };
    });
  }, [rows]);

  // Layer 2: SKU breakdown for a given CN
  const layer2 = useMemo(() => {
    return (cnCode: string): SkuBreakdown[] => {
      const filtered = rows.filter(r => r.cn_code === cnCode);
      const byBase = new Map<string, ResultRow[]>();
      for (const r of filtered) {
        const arr = byBase.get(r.sku_base) ?? [];
        arr.push(r);
        byBase.set(r.sku_base, arr);
      }
      return Array.from(byBase.entries()).map<SkuBreakdown>(([base, list]) => {
        const demand = Number(list[0]?.demand_qty ?? 0);
        const allocated = list.reduce((s, r) => s + Number(r.allocated_qty ?? 0), 0);
        const gap = list.reduce((s, r) => s + Number(r.gap_qty ?? 0), 0);
        const bySource: Record<string, number> = {};
        for (const r of list) {
          const st = r.source_type ?? "OTHER";
          bySource[st] = (bySource[st] ?? 0) + Number(r.allocated_qty ?? 0);
        }
        return {
          sku_base: base,
          demand, allocated,
          gap: gap > 0 ? gap : Math.max(demand - allocated, 0),
          fillRate: demand > 0 ? allocated / demand : 0,
          bySource, rows: list,
        };
      }).sort((a, b) => b.demand - a.demand);
    };
  }, [rows]);

  return { planRuns, runId, setRunId, layer1, layer2, loading };
}
