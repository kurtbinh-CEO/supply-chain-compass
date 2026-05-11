/**
 * ToPlanTab — SmartTable of to_plans with Submit/Approve/Cancel actions.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/components/TenantContext";
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useSkuUomConversion } from "@/hooks/useSkuUomConversion";

const TENANT_ID: Record<string, string> = {
  "UNIS Group": "11111111-1111-1111-1111-111111111111",
};

interface ToPlan {
  id: string;
  to_code: string;
  source_nm: string | null;
  dest_cn: string;
  sku_code: string;
  planned_qty: number;
  dispatch_date: string | null;
  status: string;
  created_at: string;
  plan_run_id: string | null;
}

const STATUS_TONE: Record<string, string> = {
  DRAFT: "bg-surface-2 text-text-2",
  SUBMITTED: "bg-info-bg text-info",
  APPROVED: "bg-success-bg text-success",
  IN_EXECUTION: "bg-warning-bg text-warning",
  FULFILLED: "bg-success-bg text-success",
  PARTIALLY_FULFILLED: "bg-warning-bg text-warning",
  CANCELLED: "bg-danger-bg text-danger",
};

export function ToPlanTab() {
  const { tenant } = useTenant();
  const tenantId = TENANT_ID[tenant];
  const [rows, setRows] = useState<ToPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const { fmtDual } = useSkuUomConversion();

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    supabase
      .from("to_plans")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (error) toast.error("Lỗi tải TO Plan", { description: error.message });
        setRows((data ?? []) as ToPlan[]);
        setLoading(false);
      });
  }, [tenantId, refreshTick]);

  const updateStatus = async (id: string, status: string, extra: Record<string, any> = {}) => {
    const { error } = await supabase.from("to_plans").update({ status, ...extra }).eq("id", id);
    if (error) {
      toast.error("Cập nhật thất bại", { description: error.message });
      return;
    }
    toast.success(`TO Plan → ${status}`);
    setRefreshTick(t => t + 1);
  };

  const columns: SmartTableColumn<ToPlan>[] = useMemo(() => [
    { key: "to_code", label: "Mã TO", width: 170, accessor: r => r.to_code, render: r => <span className="font-mono text-table-sm">{r.to_code}</span> },
    { key: "source_nm", label: "Nguồn", width: 110, accessor: r => r.source_nm ?? "—", render: r => <span className="font-mono text-table-sm">{r.source_nm ?? "—"}</span> },
    { key: "dest_cn", label: "CN đích", width: 100, accessor: r => r.dest_cn, render: r => <span className="font-mono text-table-sm">{r.dest_cn}</span> },
    { key: "sku_code", label: "SKU", width: 140, accessor: r => r.sku_code, render: r => <span className="font-mono text-table-sm">{r.sku_code}</span> },
    {
      key: "planned_qty", label: "Số lượng (cả 2 UOM)", width: 220, numeric: true, align: "right",
      accessor: r => r.planned_qty,
      render: r => <span className="font-mono text-table-sm">{fmtDual(r.sku_code, r.planned_qty)}</span>,
    },
    { key: "dispatch_date", label: "Ngày xuất", width: 120, accessor: r => r.dispatch_date ?? "—" },
    {
      key: "status", label: "Trạng thái", width: 150, filter: "enum",
      filterOptions: Object.keys(STATUS_TONE).map(s => ({ value: s, label: s })),
      accessor: r => r.status,
      render: r => <Badge className={STATUS_TONE[r.status] ?? ""}>{r.status}</Badge>,
    },
    {
      key: "actions", label: "Hành động", width: 280, align: "right",
      render: r => (
        <div className="flex justify-end gap-1">
          {r.status === "DRAFT" && (
            <>
              <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "SUBMITTED")}>Gửi duyệt</Button>
              <Button size="sm" variant="ghost" onClick={() => updateStatus(r.id, "CANCELLED")}>Hủy</Button>
            </>
          )}
          {r.status === "SUBMITTED" && (
            <>
              <Button size="sm" onClick={() => updateStatus(r.id, "APPROVED", { approved_at: new Date().toISOString() })}>Duyệt</Button>
              <Button size="sm" variant="ghost" onClick={() => updateStatus(r.id, "CANCELLED")}>Hủy</Button>
            </>
          )}
          {r.status === "APPROVED" && (
            <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "IN_EXECUTION")}>Bắt đầu thực hiện</Button>
          )}
        </div>
      ),
    },
  ], [fmtDual]);

  const summary = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach(r => { counts[r.status] = (counts[r.status] ?? 0) + 1; });
    return counts;
  }, [rows]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(summary).map(([k, v]) => (
            <Badge key={k} variant="outline" className={STATUS_TONE[k] ?? ""}>{k}: {v}</Badge>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={() => setRefreshTick(t => t + 1)}>Làm mới</Button>
      </div>
      <SmartTable
        screenId="to-plans"
        title="Kế hoạch điều chuyển (TO Plan)"
        columns={columns}
        data={rows}
        defaultDensity="compact"
        isLoading={loading}
        getRowId={r => r.id}
        emptyState={{
          title: "Chưa có TO Plan nào",
          description: "Chạy DRP để tự động tạo TO Plan ở trạng thái NHÁP từ kết quả phân bổ.",
        }}
      />
    </div>
  );
}
