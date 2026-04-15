import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/components/TenantContext";

export interface DemandCnSummary {
  cn: string;
  fc: number;
  b2b: number;
  po: number;
  total: number;
  skus: DemandSkuSummary[];
}

export interface DemandSkuSummary {
  sku: string;
  item: string;
  variant: string;
  fc: number;
  source: string;
  adjustment: number;
  confidence: number;
}

const tenantMap: Record<string, string> = {
  "UNIS Group": "UNIS",
  "TTC Agris": "TTC",
  "Mondelez": "MDLZ",
};

export function useDemandForecasts() {
  const { tenant } = useTenant();
  const [cnSummaries, setCnSummaries] = useState<DemandCnSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      setLoading(true);
      const tenantCode = tenantMap[tenant] || "UNIS";
      const { data: rows, error } = await supabase
        .from("demand_forecasts")
        .select("*")
        .eq("tenant", tenantCode);

      if (cancelled) return;

      if (error || !rows || rows.length === 0) {
        setCnSummaries([]);
        setLoading(false);
        return;
      }

      // Group by cn_code
      const byCn: Record<string, typeof rows> = {};
      rows.forEach((r) => {
        if (!byCn[r.cn_code]) byCn[r.cn_code] = [];
        byCn[r.cn_code].push(r);
      });

      const summaries: DemandCnSummary[] = Object.entries(byCn).map(([cn, items]) => {
        const fc = items.reduce((s, r) => s + Number(r.forecast_qty), 0);
        const b2b = items.filter((r) => r.source === "b2b").reduce((s, r) => s + Number(r.forecast_qty), 0);
        const po = items.filter((r) => r.source === "manual").reduce((s, r) => s + Number(r.forecast_qty), 0);
        const skus: DemandSkuSummary[] = items.map((r) => {
          const parts = r.sku.split(" ");
          return {
            sku: r.sku,
            item: parts[0] || r.sku,
            variant: parts[1] || "",
            fc: Number(r.forecast_qty),
            source: r.source,
            adjustment: Number(r.adjustment_qty) || 0,
            confidence: Number(r.confidence) || 0,
          };
        });
        return { cn: `CN-${cn}`, fc, b2b, po, total: fc + b2b + po, skus };
      });

      setCnSummaries(summaries);
      setLoading(false);
    }
    fetch();
    return () => { cancelled = true; };
  }, [tenant]);

  return { cnSummaries, loading };
}
