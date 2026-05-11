/**
 * ToConTab — SmartTable of to_cons; create dispatches from APPROVED to_plans.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/components/TenantContext";
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useSkuUomConversion } from "@/hooks/useSkuUomConversion";

const TENANT_ID: Record<string, string> = {
  "UNIS Group": "11111111-1111-1111-1111-111111111111",
};

interface ToCon {
  id: string;
  to_plan_id: string;
  to_con_code: string;
  dispatch_qty: number;
  dispatch_date: string | null;
  vehicle_type: string | null;
  status: string;
  created_at: string;
}
interface ApprovedPlan {
  id: string;
  to_code: string;
  dest_cn: string;
  sku_code: string;
  planned_qty: number;
}

const STATUS_TONE: Record<string, string> = {
  CREATED: "bg-surface-2 text-text-2",
  ERP_POSTED: "bg-info-bg text-info",
  TRIP_ASSIGNED: "bg-info-bg text-info",
  DISPATCHED: "bg-warning-bg text-warning",
  COMPLETED: "bg-success-bg text-success",
  CANCELLED: "bg-danger-bg text-danger",
};

const NEXT_STATUS: Record<string, string | null> = {
  CREATED: "ERP_POSTED",
  ERP_POSTED: "TRIP_ASSIGNED",
  TRIP_ASSIGNED: "DISPATCHED",
  DISPATCHED: "COMPLETED",
  COMPLETED: null,
  CANCELLED: null,
};

export function ToConTab() {
  const { tenant } = useTenant();
  const tenantId = TENANT_ID[tenant];
  const [rows, setRows] = useState<ToCon[]>([]);
  const [planMap, setPlanMap] = useState<Record<string, ApprovedPlan>>({});
  const [approved, setApproved] = useState<ApprovedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<{ to_plan_id: string; dispatch_qty: number; dispatch_date: string; vehicle_type: string }>({
    to_plan_id: "", dispatch_qty: 0, dispatch_date: new Date().toISOString().slice(0, 10), vehicle_type: "TRUCK_5T",
  });
  const { fmtDual } = useSkuUomConversion();

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    Promise.all([
      supabase.from("to_cons").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(500),
      supabase.from("to_plans").select("id, to_code, dest_cn, sku_code, planned_qty, status").eq("tenant_id", tenantId).in("status", ["APPROVED", "IN_EXECUTION", "PARTIALLY_FULFILLED"]),
    ]).then(([c, p]) => {
      setRows((c.data ?? []) as ToCon[]);
      const plans = (p.data ?? []) as ApprovedPlan[];
      setApproved(plans);
      const m: Record<string, ApprovedPlan> = {};
      plans.forEach(pl => { m[pl.id] = pl; });
      setPlanMap(m);
      setLoading(false);
    });
  }, [tenantId, tick]);

  const advance = async (r: ToCon) => {
    const next = NEXT_STATUS[r.status];
    if (!next) return;
    const { error } = await supabase.from("to_cons").update({ status: next }).eq("id", r.id);
    if (error) { toast.error("Cập nhật thất bại", { description: error.message }); return; }
    toast.success(`TO Con → ${next}`);
    if (next === "COMPLETED") {
      // mark parent plan FULFILLED
      await supabase.from("to_plans").update({ status: "FULFILLED" }).eq("id", r.to_plan_id);
    }
    setTick(t => t + 1);
  };

  const cancel = async (r: ToCon) => {
    const { error } = await supabase.from("to_cons").update({ status: "CANCELLED" }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Đã hủy");
    setTick(t => t + 1);
  };

  const createCon = async () => {
    if (!draft.to_plan_id || draft.dispatch_qty <= 0) { toast.error("Chọn TO Plan & nhập số lượng"); return; }
    const plan = planMap[draft.to_plan_id];
    if (!plan) return;
    const code = `TC-${plan.to_code.replace("TO-", "")}-${Date.now().toString().slice(-4)}`;
    const { error } = await supabase.from("to_cons").insert({
      tenant_id: tenantId,
      to_plan_id: draft.to_plan_id,
      to_con_code: code,
      dispatch_qty: draft.dispatch_qty,
      dispatch_date: draft.dispatch_date,
      vehicle_type: draft.vehicle_type,
      status: "CREATED",
    });
    if (error) { toast.error("Tạo TO Con thất bại", { description: error.message }); return; }
    await supabase.from("to_plans").update({ status: "IN_EXECUTION" }).eq("id", draft.to_plan_id);
    toast.success(`Đã tạo ${code}`);
    setCreateOpen(false);
    setDraft({ to_plan_id: "", dispatch_qty: 0, dispatch_date: new Date().toISOString().slice(0, 10), vehicle_type: "TRUCK_5T" });
    setTick(t => t + 1);
  };

  const columns: SmartTableColumn<ToCon>[] = useMemo(() => [
    { key: "to_con_code", label: "Mã chuyến", width: 180, render: r => <span className="font-mono text-table-sm">{r.to_con_code}</span> },
    { key: "to_plan", label: "TO Plan", width: 170, render: r => <span className="font-mono text-table-sm">{planMap[r.to_plan_id]?.to_code ?? "—"}</span> },
    { key: "dest_cn", label: "CN đích", width: 100, render: r => <span className="font-mono text-table-sm">{planMap[r.to_plan_id]?.dest_cn ?? "—"}</span> },
    { key: "sku_code", label: "SKU", width: 140, render: r => <span className="font-mono text-table-sm">{planMap[r.to_plan_id]?.sku_code ?? "—"}</span> },
    {
      key: "dispatch_qty", label: "SL chuyến (cả 2 UOM)", width: 220, numeric: true, align: "right",
      render: r => {
        const sku = planMap[r.to_plan_id]?.sku_code ?? "";
        return <span className="font-mono text-table-sm">{fmtDual(sku, r.dispatch_qty)}</span>;
      },
    },
    { key: "dispatch_date", label: "Ngày", width: 110, accessor: r => r.dispatch_date ?? "—" },
    { key: "vehicle_type", label: "Xe", width: 110, accessor: r => r.vehicle_type ?? "—" },
    {
      key: "status", label: "Trạng thái", width: 150, filter: "enum",
      filterOptions: Object.keys(STATUS_TONE).map(s => ({ value: s, label: s })),
      accessor: r => r.status,
      render: r => <Badge className={STATUS_TONE[r.status] ?? ""}>{r.status}</Badge>,
    },
    {
      key: "actions", label: "Hành động", width: 240, align: "right",
      render: r => {
        const next = NEXT_STATUS[r.status];
        return (
          <div className="flex justify-end gap-1">
            {next && <Button size="sm" variant="outline" onClick={() => advance(r)}>→ {next}</Button>}
            {!["COMPLETED", "CANCELLED"].includes(r.status) && (
              <Button size="sm" variant="ghost" onClick={() => cancel(r)}>Hủy</Button>
            )}
          </div>
        );
      },
    },
  ], [planMap, fmtDual]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-table-sm text-text-3">
          Tổng: <span className="font-mono text-text-1">{rows.length}</span> chuyến · TO Plan đã duyệt: <span className="font-mono text-text-1">{approved.length}</span>
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setCreateOpen(true)} disabled={approved.length === 0}>+ Tạo TO Con</Button>
          <Button size="sm" variant="outline" onClick={() => setTick(t => t + 1)}>Làm mới</Button>
        </div>
      </div>

      <SmartTable
        screenId="to-cons"
        title="Chuyến điều chuyển (TO Con)"
        columns={columns}
        data={rows}
        defaultDensity="compact"
        isLoading={loading}
        getRowId={r => r.id}
        emptyState={{
          title: "Chưa có TO Con nào",
          description: "Tạo chuyến từ TO Plan đã được duyệt.",
        }}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo TO Con</DialogTitle>
            <DialogDescription>Tạo chuyến điều chuyển từ TO Plan đã duyệt.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>TO Plan đã duyệt</Label>
              <Select value={draft.to_plan_id} onValueChange={v => {
                const p = planMap[v];
                setDraft(d => ({ ...d, to_plan_id: v, dispatch_qty: p?.planned_qty ?? 0 }));
              }}>
                <SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger>
                <SelectContent>
                  {approved.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.to_code} · {p.dest_cn} · {p.sku_code} · {Math.round(p.planned_qty)} m²
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>SL chuyến (m²)</Label>
              <Input type="number" value={draft.dispatch_qty} onChange={e => setDraft(d => ({ ...d, dispatch_qty: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label>Ngày</Label>
              <Input type="date" value={draft.dispatch_date} onChange={e => setDraft(d => ({ ...d, dispatch_date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Loại xe</Label>
              <Select value={draft.vehicle_type} onValueChange={v => setDraft(d => ({ ...d, vehicle_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRUCK_1T5">Xe tải 1.5T</SelectItem>
                  <SelectItem value="TRUCK_5T">Xe tải 5T</SelectItem>
                  <SelectItem value="TRUCK_10T">Xe tải 10T</SelectItem>
                  <SelectItem value="CONTAINER_20">Container 20'</SelectItem>
                  <SelectItem value="CONTAINER_40">Container 40'</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button onClick={createCon}>Tạo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
