import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/components/TenantContext";
import type { ConsensusRow, SkuRow } from "@/pages/SopPage";

const tenantMap: Record<string, string> = {
  "UNIS Group": "UNIS",
  "TTC Agris": "TTC",
  "Mondelez": "MDLZ",
};

export function useSopConsensus(period = "2026-05") {
  const { tenant } = useTenant();
  const tenantCode = tenantMap[tenant] || "UNIS";
  const [data, setData] = useState<ConsensusRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from("sop_consensus")
      .select("*")
      .eq("tenant", tenantCode)
      .eq("period", period);

    if (error || !rows || rows.length === 0) {
      setData([]);
      setLoading(false);
      return;
    }

    // Group by cn_code
    const byCn: Record<string, typeof rows> = {};
    rows.forEach((r) => {
      if (!byCn[r.cn_code]) byCn[r.cn_code] = [];
      byCn[r.cn_code].push(r);
    });

    const result: ConsensusRow[] = Object.entries(byCn).map(([cn, items]) => {
      const skus: SkuRow[] = items.map((r) => {
        const parts = r.sku.split(" ");
        return {
          item: parts[0] || r.sku,
          variant: parts[1] || "",
          v0: Number(r.v0),
          v1: Number(r.v1),
          v2: Number(r.v2),
          v3: Number(r.v3),
          aop: Number(r.aop),
          note: r.note || "",
        };
      });
      return {
        cn: `CN-${cn}`,
        v0: skus.reduce((a, s) => a + s.v0, 0),
        v1: skus.reduce((a, s) => a + s.v1, 0),
        v2: skus.reduce((a, s) => a + s.v2, 0),
        v3: skus.reduce((a, s) => a + s.v3, 0),
        aop: skus.reduce((a, s) => a + s.aop, 0),
        fvaBest: items[0]?.fva_best || "",
        skus,
      };
    });

    setData(result);
    setLoading(false);
  }, [tenantCode, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`sop_consensus_${tenantCode}_${period}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "sop_consensus",
        filter: `tenant=eq.${tenantCode}`,
      }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantCode, period, fetchData]);

  return { data, loading };
}
