import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/components/TenantContext";

const TENANT_ID: Record<string, string> = {
  "UNIS Group": "11111111-1111-1111-1111-111111111111",
};

export interface UomConv {
  pcs_per_box?: number | null;
  boxes_per_pallet?: number | null;
  m2_per_box?: number | null;
}

/** Returns map: sku_code → conversion info (m²/box, box/pallet). */
export function useSkuUomConversion() {
  const { tenant } = useTenant();
  const [map, setMap] = useState<Map<string, UomConv>>(new Map());

  useEffect(() => {
    const tid = TENANT_ID[tenant];
    if (!tid) return;
    supabase
      .from("sku_unit_conversion")
      .select("sku_code, from_uom, to_uom, conversion_factor, pcs_per_box, boxes_per_pallet")
      .eq("tenant_id", tid)
      .eq("is_active", true)
      .then(({ data }) => {
        const m = new Map<string, UomConv>();
        for (const r of data ?? []) {
          const cur = m.get(r.sku_code) ?? {};
          if (r.from_uom === "M2" && r.to_uom === "BOX") cur.m2_per_box = 1 / Number(r.conversion_factor);
          if (r.from_uom === "BOX" && r.to_uom === "M2") cur.m2_per_box = Number(r.conversion_factor);
          if (r.pcs_per_box != null) cur.pcs_per_box = r.pcs_per_box;
          if (r.boxes_per_pallet != null) cur.boxes_per_pallet = r.boxes_per_pallet;
          m.set(r.sku_code, cur);
        }
        setMap(m);
      });
  }, [tenant]);

  /** Format m² → "X m² (~Y box)" using conversion if available. */
  const fmtDual = (sku: string, qtyM2: number): string => {
    const c = map.get(sku);
    const m2 = `${Math.round(qtyM2).toLocaleString("vi-VN")} m²`;
    if (c?.m2_per_box && c.m2_per_box > 0) {
      const boxes = Math.round(qtyM2 / c.m2_per_box);
      return `${m2} (~${boxes.toLocaleString("vi-VN")} box)`;
    }
    return m2;
  };

  return { map, fmtDual };
}
