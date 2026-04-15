import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/components/TenantContext";
import type { NMSummary, NMSkuRow } from "@/components/supply/supplyData";

// Map warehouse codes to NM names for display
const warehouseToNm: Record<string, { nm: string; id: string }> = {
  "WH-BD-01": { nm: "Mikado", id: "mikado" },
  "WH-HN-01": { nm: "Toko", id: "toko" },
  "WH-DN-01": { nm: "Đồng Tâm", id: "dongtam" },
  "WH-CT-01": { nm: "Vigracera", id: "vigracera" },
};

const tenantMap: Record<string, string> = {
  "UNIS Group": "UNIS",
  "TTC Agris": "TTC",
  "Mondelez": "MDLZ",
};

export function useInventoryData() {
  const { tenant } = useTenant();
  const [data, setData] = useState<NMSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      const tenantCode = tenantMap[tenant] || "UNIS";
      const { data: rows, error: err } = await supabase
        .from("inventory")
        .select("*")
        .eq("tenant", tenantCode);

      if (cancelled) return;

      if (err) {
        setError(err.message);
        setData([]);
        setLoading(false);
        return;
      }

      if (!rows || rows.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      // Group by warehouse_code
      const grouped: Record<string, typeof rows> = {};
      rows.forEach((r) => {
        const wh = r.warehouse_code;
        if (!grouped[wh]) grouped[wh] = [];
        grouped[wh].push(r);
      });

      const summaries: NMSummary[] = Object.entries(grouped).map(([wh, items]) => {
        const info = warehouseToNm[wh] || { nm: wh, id: wh };
        const skus: NMSkuRow[] = items.map((r) => {
          const parts = r.sku.split(" ");
          return {
            item: parts[0] || r.sku,
            variant: parts[1] || "",
            tonKho: Number(r.quantity),
            unisDung: Math.round(Number(r.quantity) * 0.6),
            dangVe: 0,
            dangVeEta: "",
            updatedAt: new Date(r.updated_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
          };
        });
        const tongTon = skus.reduce((s, r) => s + r.tonKho, 0);
        const unisDung = skus.reduce((s, r) => s + r.unisDung, 0);
        return {
          id: info.id,
          nm: info.nm,
          tongTon,
          unisDung,
          dangVe: 0,
          dangVeNote: "0",
          updatedAt: skus[0]?.updatedAt ? `Hôm nay ${skus[0].updatedAt}` : "—",
          updatedAgo: "today" as const,
          share: 0.6,
          skus,
        };
      });

      setData(summaries);
      setLoading(false);
    }
    fetchData();
    return () => { cancelled = true; };
  }, [tenant]);

  return { data, loading, error };
}
