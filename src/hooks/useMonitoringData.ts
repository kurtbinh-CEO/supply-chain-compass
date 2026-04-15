import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/components/TenantContext";

const tenantMap: Record<string, string> = {
  "UNIS Group": "UNIS",
  "TTC Agris": "TTC",
  "Mondelez": "MDLZ",
};

export interface FcAccuracyRow {
  cn: string;
  mapeNow: number;
  mapePrev: number;
  trend: string;
  best: string;
  fva: string;
}

export interface FcWeekRow {
  week: string;
  hw: number;
  ai: number;
}

export interface NmPerfRow {
  nm: string;
  honoring: number;
  ontime: number;
  ltDelta: string;
  trend: string;
  grade: string;
}

export function useFcAccuracy() {
  const { tenant } = useTenant();
  const tenantCode = tenantMap[tenant] || "UNIS";
  const [summaryData, setSummaryData] = useState<FcAccuracyRow[]>([]);
  const [weeklyData, setWeeklyData] = useState<FcWeekRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from("fc_accuracy")
      .select("*")
      .eq("tenant", tenantCode)
      .order("week", { ascending: true });

    if (error || !rows) {
      setSummaryData([]);
      setWeeklyData([]);
      setLoading(false);
      return;
    }

    // Weekly chart data from CN-BD (primary CN with full 12-week history)
    const bdRows = rows.filter(r => r.cn_code === "CN-BD");
    setWeeklyData(bdRows.map(r => ({
      week: r.week,
      hw: Number(r.mape_hw),
      ai: Number(r.mape_ai),
    })));

    // Summary: latest week per CN
    const latestByCn: Record<string, typeof rows[0]> = {};
    rows.forEach(r => {
      if (!latestByCn[r.cn_code] || r.week > latestByCn[r.cn_code].week) {
        latestByCn[r.cn_code] = r;
      }
    });

    // Get previous week data for comparison
    const prevByCn: Record<string, typeof rows[0]> = {};
    rows.forEach(r => {
      const latest = latestByCn[r.cn_code];
      if (latest && r.week < latest.week) {
        if (!prevByCn[r.cn_code] || r.week > prevByCn[r.cn_code].week) {
          prevByCn[r.cn_code] = r;
        }
      }
    });

    const summary: FcAccuracyRow[] = Object.entries(latestByCn).map(([cn, r]) => {
      const prev = prevByCn[cn];
      const mapeNow = Number(r.mape_hw);
      const mapePrev = prev ? Number(prev.mape_hw) : mapeNow;
      const diff = mapeNow - mapePrev;
      const trend = diff < -1 ? "↗ improving" : diff > 1 ? "↘ worse" : "→ stable";
      return {
        cn,
        mapeNow,
        mapePrev,
        trend,
        best: r.best_model || "",
        fva: r.fva || "",
      };
    });

    setSummaryData(summary);
    setLoading(false);
  }, [tenantCode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel(`fc_accuracy_${tenantCode}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "fc_accuracy", filter: `tenant=eq.${tenantCode}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantCode, fetchData]);

  return { summaryData, weeklyData, loading };
}

export function useNmPerformance() {
  const { tenant } = useTenant();
  const tenantCode = tenantMap[tenant] || "UNIS";
  const [data, setData] = useState<NmPerfRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from("nm_performance")
      .select("*")
      .eq("tenant", tenantCode);

    if (error || !rows) {
      setData([]);
      setLoading(false);
      return;
    }

    setData(rows.map(r => ({
      nm: r.nm_name,
      honoring: Number(r.honoring_pct),
      ontime: Number(r.ontime_pct),
      ltDelta: r.lt_delta || "",
      trend: r.trend || "",
      grade: r.grade || "",
    })));
    setLoading(false);
  }, [tenantCode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel(`nm_performance_${tenantCode}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "nm_performance", filter: `tenant=eq.${tenantCode}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantCode, fetchData]);

  return { data, loading };
}
