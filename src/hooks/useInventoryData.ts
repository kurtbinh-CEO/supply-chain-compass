import { useEffect, useState, useCallback } from "react";
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

export interface InventoryBucketRow {
  id: string;
  warehouse_code: string;
  cn_code: string;
  sku: string;
  unit: string;
  quantity: number;        // Physical on-hand
  reserved_hard: number;
  quarantine: number;
  soft_reserved: number;
  available: number;       // Derived: quantity − reserved_hard − quarantine − soft_reserved
  safety_stock: number;
  updated_at: string;
}

export interface InventoryBucketTotals {
  quantity: number;
  reserved_hard: number;
  quarantine: number;
  soft_reserved: number;
  available: number;
}

export function useInventoryData() {
  const { tenant } = useTenant();
  const [data, setData] = useState<NMSummary[]>([]);
  const [bucketRows, setBucketRows] = useState<InventoryBucketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantCode = tenantMap[tenant] || "UNIS";

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: rows, error: err } = await supabase
      .from("inventory")
      .select("*")
      .eq("tenant", tenantCode);

    if (err) {
      setError(err.message);
      setData([]);
      setBucketRows([]);
      setLoading(false);
      return;
    }

    if (!rows || rows.length === 0) {
      setData([]);
      setBucketRows([]);
      setLoading(false);
      return;
    }

    // Bucket rows for the new "Inventory buckets" view (5-column breakdown).
    const buckets: InventoryBucketRow[] = rows.map((r) => {
      const qty = Number(r.quantity ?? 0);
      const rh = Number((r as { reserved_hard?: number }).reserved_hard ?? 0);
      const qa = Number((r as { quarantine?: number }).quarantine ?? 0);
      const sr = Number((r as { soft_reserved?: number }).soft_reserved ?? 0);
      return {
        id: r.id,
        warehouse_code: r.warehouse_code,
        cn_code: r.cn_code,
        sku: r.sku,
        unit: r.unit,
        quantity: qty,
        reserved_hard: rh,
        quarantine: qa,
        soft_reserved: sr,
        available: qty - rh - qa - sr,
        safety_stock: Number(r.safety_stock ?? 0),
        updated_at: r.updated_at,
      };
    });

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
    setBucketRows(buckets);
    setLoading(false);
  }, [tenantCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel(`inventory_${tenantCode}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory", filter: `tenant=eq.${tenantCode}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantCode, fetchData]);

  const bucketTotals: InventoryBucketTotals = bucketRows.reduce(
    (acc, r) => ({
      quantity: acc.quantity + r.quantity,
      reserved_hard: acc.reserved_hard + r.reserved_hard,
      quarantine: acc.quarantine + r.quarantine,
      soft_reserved: acc.soft_reserved + r.soft_reserved,
      available: acc.available + r.available,
    }),
    { quantity: 0, reserved_hard: 0, quarantine: 0, soft_reserved: 0, available: 0 },
  );

  return { data, bucketRows, bucketTotals, loading, error };
}
