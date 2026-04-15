import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/components/TenantContext";

export interface PurchaseOrderRow {
  id: string;
  po_number: string;
  supplier: string;
  sku: string;
  quantity: number;
  unit_price: number;
  currency: string;
  status: string;
  order_date: string;
  expected_date: string | null;
  received_date: string | null;
  notes: string | null;
  tenant: string;
}

export interface POStatusGroup {
  status: string;
  label: string;
  count: number;
  totalQty: number;
  totalVnd: string;
  orders: PurchaseOrderRow[];
}

const tenantMap: Record<string, string> = {
  "UNIS Group": "UNIS",
  "TTC Agris": "TTC",
  "Mondelez": "MDLZ",
};

const statusLabels: Record<string, string> = {
  draft: "Draft — chờ gửi",
  submitted: "Submitted — chờ xác nhận",
  confirmed: "Confirmed — đã xác nhận",
  shipped: "Shipped — đang vận chuyển",
  received: "Received — đã nhận",
  cancelled: "Cancelled — đã hủy",
};

function formatVnd(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
  return v.toLocaleString();
}

function groupOrders(rows: PurchaseOrderRow[]): POStatusGroup[] {
  const byStatus: Record<string, PurchaseOrderRow[]> = {};
  rows.forEach((r) => {
    const st = r.status;
    if (!byStatus[st]) byStatus[st] = [];
    byStatus[st].push(r);
  });

  const statusOrder = ["draft", "submitted", "confirmed", "shipped", "received", "cancelled"];
  return statusOrder
    .filter((s) => byStatus[s])
    .map((s) => {
      const orders = byStatus[s];
      const totalQty = orders.reduce((a, o) => a + Number(o.quantity), 0);
      const totalValue = orders.reduce((a, o) => a + Number(o.quantity) * Number(o.unit_price), 0);
      return {
        status: s,
        label: statusLabels[s] || s,
        count: orders.length,
        totalQty,
        totalVnd: formatVnd(totalValue),
        orders,
      };
    });
}

export function usePurchaseOrders() {
  const { tenant } = useTenant();
  const [groups, setGroups] = useState<POStatusGroup[]>([]);
  const [allOrders, setAllOrders] = useState<PurchaseOrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const tenantCode = tenantMap[tenant] || "UNIS";

  const fetchOrders = useCallback(async () => {
    const { data: rows, error } = await supabase
      .from("purchase_orders")
      .select("*")
      .eq("tenant", tenantCode)
      .order("order_date", { ascending: false });

    if (error || !rows || rows.length === 0) {
      setGroups([]);
      setAllOrders([]);
      setLoading(false);
      return;
    }

    const typed = rows as PurchaseOrderRow[];
    setAllOrders(typed);
    setGroups(groupOrders(typed));
    setLoading(false);
  }, [tenantCode]);

  useEffect(() => {
    setLoading(true);
    fetchOrders();
  }, [fetchOrders]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`purchase_orders_${tenantCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "purchase_orders",
          filter: `tenant=eq.${tenantCode}`,
        },
        () => {
          // Re-fetch all orders on any change
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantCode, fetchOrders]);

  return { groups, allOrders, loading };
}
