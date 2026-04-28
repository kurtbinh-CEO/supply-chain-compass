/**
 * ContainerPlanningSection — DRP Bước 3 (giữa Summary và Exception)
 * - 4 SummaryCards inline
 * - SmartTable danh sách container (12 chuyến mock)
 * - Drill-down: route + drops + SKU lines + gợi ý hold/ship
 * - Dialog Sửa container, Tạo container thủ công
 * - Popup ghép tuyến
 */
import { useMemo, useState } from "react";
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";
import { SummaryCards, type SummaryCard } from "@/components/SummaryCards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Truck, Package, Route, Plus, Pencil, AlertTriangle, MapPin,
  Clock, Sparkles, X, Trash2, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CONTAINER_PLANS, VEHICLE_LABEL, STATUS_META,
  fillTone, formatVnd, summarizeContainerPlans,
  type ContainerPlan, type VehicleType, type DropPoint,
} from "@/data/container-plans";

// ───────────────────────────────────────────────────────────────────
// Sub-components
// ───────────────────────────────────────────────────────────────────

function FillBadge({ pct }: { pct: number }) {
  const tone = fillTone(pct);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-table-sm font-semibold tabular-nums",
        tone === "ok" && "bg-success-bg text-success",
        tone === "warn" && "bg-warning-bg text-warning",
        tone === "danger" && "bg-danger-bg text-danger",
      )}
      title={`Fill rate ${pct}%`}
    >
      {tone === "danger" && "🔴"}
      {tone === "warn" && "🟡"}
      {tone === "ok" && "🟢"}
      {pct}%
    </span>
  );
}

function StatusPill({ status }: { status: ContainerPlan["status"] }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium border",
        meta.tone === "ok" && "border-success/30 bg-success-bg text-success",
        meta.tone === "warn" && "border-warning/30 bg-warning-bg text-warning",
        meta.tone === "danger" && "border-danger/30 bg-danger-bg text-danger",
        meta.tone === "info" && "border-primary/30 bg-primary/10 text-primary",
        meta.tone === "neutral" && "border-surface-3 bg-surface-2 text-text-2",
      )}
    >
      {meta.label}
    </span>
  );
}

function RouteCell({ plan }: { plan: ContainerPlan }) {
  const drops = plan.drops;
  return (
    <div className="flex items-center gap-1 text-table-sm">
      <span className="font-mono font-medium text-text-2">{plan.nmShortCode}</span>
      {drops.map((d, i) => (
        <span key={d.cnCode} className="flex items-center gap-1">
          <ArrowRight className="h-3 w-3 text-text-3" />
          <span className="font-mono text-text-1">{d.cnCode}</span>
          {i < drops.length - 1 && null}
        </span>
      ))}
    </div>
  );
}

function ConsolidatedBadge({ plan, onClick }: { plan: ContainerPlan; onClick?: () => void }) {
  if (!plan.isConsolidated) return null;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className="inline-flex items-center gap-1 rounded-full border border-orange-400/40 bg-orange-50 dark:bg-orange-500/10 px-2 py-0.5 text-caption font-semibold text-orange-700 dark:text-orange-300 hover:border-orange-500/60"
    >
      <Route className="h-3 w-3" /> GHÉP
    </button>
  );
}

// ───────────────────────────────────────────────────────────────────
// Drill-down content
// ───────────────────────────────────────────────────────────────────

function ContainerDrillDown({
  plan,
  onShowConsolidate,
  onMergeMore,
}: {
  plan: ContainerPlan;
  onShowConsolidate: () => void;
  onMergeMore: () => void;
}) {
  const totalDistance = plan.drops.reduce((a, d) => a + d.distanceKm, 0);
  const isLow = plan.fillPct < 70;

  return (
    <div className="bg-surface-1/40 border-l-4 border-l-primary/30 px-4 py-3 space-y-3">
      {/* Header line */}
      <div className="flex flex-wrap items-center gap-2 text-table-sm text-text-2">
        <span className="font-semibold text-text-1">{plan.id}</span>
        <span>·</span>
        <span>{plan.vehicleLabel}</span>
        <span>·</span>
        <span>{plan.nmName}</span>
        <span>·</span>
        <span>Fill <FillBadge pct={plan.fillPct} /></span>
        <span className="text-text-3">({plan.totalQtyM2.toLocaleString("vi-VN")}/{plan.capacityM2.toLocaleString("vi-VN")} m²)</span>
        {isLow && <span className="text-warning font-semibold">⚠️</span>}
      </div>

      {/* Route box */}
      <div className="rounded-card border border-surface-3 bg-surface-2 p-3 space-y-2">
        <div className="flex items-start gap-2 text-table-sm">
          <Route className="h-4 w-4 text-primary mt-0.5" />
          <div className="flex-1">
            <div className="font-medium text-text-1">
              TUYẾN: {plan.nmShortCode}
              {plan.drops.map((d) => (
                <span key={d.cnCode}> → {d.cnCode} (drop {d.order})</span>
              ))}
            </div>
            <div className="text-caption text-text-3 mt-0.5">
              Khoảng cách: {plan.drops.map(d => `${d.distanceKm}km`).join(" + ")} = {totalDistance}km
            </div>
            <div className="text-caption text-text-2 mt-0.5">
              Cước: <span className="font-semibold tabular-nums">{formatVnd(plan.estimatedCost)}₫</span>
              {plan.savingAmount > 0 && (
                <span className="text-success ml-1">
                  (vs xe riêng: {formatVnd(plan.estimatedCost + plan.savingAmount)}₫ → tiết kiệm {formatVnd(plan.savingAmount)}₫)
                </span>
              )}
            </div>
          </div>
          {plan.isConsolidated && (
            <Button size="sm" variant="outline" className="h-7 text-caption"
              onClick={onShowConsolidate}>
              <Route className="h-3 w-3 mr-1" /> Chi tiết ghép tuyến
            </Button>
          )}
        </div>
      </div>

      {/* Drops table */}
      <div className="rounded-card border border-surface-3 overflow-hidden">
        <div className="bg-surface-2 px-3 py-2 text-caption font-semibold uppercase text-text-3 flex items-center gap-1">
          <MapPin className="h-3 w-3" /> Điểm giao ({plan.drops.length})
        </div>
        <table className="w-full text-table-sm">
          <thead>
            <tr className="border-b border-surface-3 bg-surface-1/40">
              <th className="px-3 py-1.5 text-left text-caption font-semibold text-text-3 w-10">#</th>
              <th className="px-3 py-1.5 text-left text-caption font-semibold text-text-3">CN</th>
              <th className="px-3 py-1.5 text-right text-caption font-semibold text-text-3 w-24">Số lượng</th>
              <th className="px-3 py-1.5 text-left text-caption font-semibold text-text-3 w-32">PO</th>
              <th className="px-3 py-1.5 text-left text-caption font-semibold text-text-3">Mã hàng</th>
              <th className="px-3 py-1.5 text-left text-caption font-semibold text-text-3 w-28">ETA</th>
            </tr>
          </thead>
          <tbody>
            {plan.drops.map((d) => (
              <tr key={d.cnCode} className="border-b border-surface-3 last:border-0">
                <td className="px-3 py-2 text-text-2">{d.order}</td>
                <td className="px-3 py-2 font-medium text-text-1">{d.cnCode}<div className="text-caption text-text-3">{d.cnName}</div></td>
                <td className="px-3 py-2 text-right tabular-nums text-text-1">{d.qtyM2.toLocaleString("vi-VN")} m²</td>
                <td className="px-3 py-2 font-mono text-caption text-primary">{d.poId}</td>
                <td className="px-3 py-2 text-text-2 text-caption">
                  {d.skuLines.map(s => `${s.sku} ${s.qty}`).join(" + ")}
                </td>
                <td className="px-3 py-2 text-text-3 text-caption">{d.eta}</td>
              </tr>
            ))}
            <tr className="bg-surface-1/40 font-semibold">
              <td className="px-3 py-2"></td>
              <td className="px-3 py-2 text-text-1">TỔNG</td>
              <td className="px-3 py-2 text-right tabular-nums text-text-1">{plan.totalQtyM2.toLocaleString("vi-VN")} m²</td>
              <td className="px-3 py-2 text-text-2">{plan.poIds.length} PO</td>
              <td colSpan={2} className="px-3 py-2 text-text-3 text-caption">
                {plan.drops.reduce((a, d) => a + d.skuLines.length, 0)} SKU lines
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* NM + carrier info */}
      <div className="text-caption text-text-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>NM capacity: <span className="text-text-2">{plan.nmName}</span> · Sẵn hàng ✅</span>
        <span>Carrier: <span className="text-text-2">{plan.carrier ?? "Chưa chọn (sẽ chọn khi duyệt PO)"}</span></span>
      </div>

      {/* Suggestions for low-fill */}
      {isLow && (
        <div className="rounded-card border border-warning/30 bg-warning-bg/40 p-3 space-y-2">
          <div className="flex items-center gap-2 text-table-sm font-semibold text-warning">
            <Sparkles className="h-4 w-4" /> GỢI Ý HỆ THỐNG (Fill {plan.fillPct}% &lt; ngưỡng 70%)
          </div>
          <div className="space-y-1.5 text-table-sm">
            <button
              onClick={onMergeMore}
              className="w-full text-left rounded border border-surface-3 bg-surface-2 px-3 py-2 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-text-1">Gom thêm PO tuần tới</span>
              </div>
              <div className="text-caption text-text-3 ml-5 mt-0.5">
                "PO-NA-W21 có 250 m² cùng NM" → fill tăng 85% · giữ chờ {plan.holdDaysLeft ?? 3} ngày
              </div>
            </button>
            <button className="w-full text-left rounded border border-surface-3 bg-surface-2 px-3 py-2 hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-2">
                <Truck className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-text-1">Xuất ngay dù fill thấp</span>
              </div>
              <div className="text-caption text-text-3 ml-5 mt-0.5">
                Cước {formatVnd(plan.estimatedCost)}₫ cho {plan.totalQtyM2}m² ={" "}
                {Math.round(plan.estimatedCost / plan.totalQtyM2).toLocaleString("vi-VN")}₫/m²
              </div>
            </button>
            <button className="w-full text-left rounded border border-surface-3 bg-surface-2 px-3 py-2 hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-2">
                <X className="h-3.5 w-3.5 text-text-3" />
                <span className="font-medium text-text-1">Tách 2 xe nhỏ</span>
              </div>
              <div className="text-caption text-text-3 ml-5 mt-0.5">
                2 × xe 5T: {plan.drops.map(d => `${d.cnCode} ${d.qtyM2}m²`).join(" + ")}
              </div>
            </button>
          </div>
          {plan.holdDaysLeft !== undefined && (
            <div className="flex items-center gap-2 text-caption text-warning pt-1 border-t border-warning/20">
              <Clock className="h-3 w-3" />
              Hold tối đa 3 ngày — còn {plan.holdDaysLeft} ngày (hết hạn {plan.holdDeadline}). Auto xuất sau.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────
// Edit container dialog
// ───────────────────────────────────────────────────────────────────

function EditContainerDialog({
  plan, open, onClose, onSave,
}: {
  plan: ContainerPlan | null;
  open: boolean;
  onClose: () => void;
  onSave: (updated: ContainerPlan) => void;
}) {
  const [vehicle, setVehicle] = useState<VehicleType>(plan?.vehicleType ?? "cont_40ft");
  const [drops, setDrops] = useState<DropPoint[]>(plan?.drops ?? []);
  const [note, setNote] = useState(plan?.noteFromFarmer ?? "");

  // Reset state when plan changes
  useMemo(() => {
    if (plan) {
      setVehicle(plan.vehicleType);
      setDrops(plan.drops);
      setNote(plan.noteFromFarmer ?? "");
    }
  }, [plan]);

  if (!plan) return null;

  const newCapacity = VEHICLE_LABEL[vehicle].capacity;
  const totalQty = drops.reduce((a, d) => a + d.qtyM2, 0);
  const newFill = newCapacity > 0 ? Math.round((totalQty / newCapacity) * 100) : 0;
  const overflow = newFill > 100;

  const handleRemoveDrop = (cnCode: string) => {
    if (drops.length <= 1) return;
    setDrops(drops.filter(d => d.cnCode !== cnCode));
  };

  const handleSave = () => {
    onSave({
      ...plan,
      vehicleType: vehicle,
      vehicleLabel: VEHICLE_LABEL[vehicle].label,
      capacityM2: newCapacity,
      drops: drops.map((d, i) => ({ ...d, order: i + 1 })),
      totalQtyM2: totalQty,
      fillPct: newFill,
      isConsolidated: drops.length > 1,
      noteFromFarmer: note || undefined,
      poIds: drops.map(d => d.poId),
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa container {plan.id}</DialogTitle>
          <DialogDescription>
            Thay đổi loại xe, drop points, hoặc PO. Fill % và cước sẽ tự tính lại.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Vehicle type */}
          <div className="space-y-1.5">
            <Label className="text-table-sm">Loại xe</Label>
            <Select value={vehicle} onValueChange={(v) => setVehicle(v as VehicleType)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(VEHICLE_LABEL) as VehicleType[]).map(vt => {
                  const cap = VEHICLE_LABEL[vt].capacity;
                  const projFill = Math.round((totalQty / cap) * 100);
                  return (
                    <SelectItem key={vt} value={vt}>
                      <span className="flex items-center gap-2">
                        {VEHICLE_LABEL[vt].label}
                        <span className="text-caption text-text-3">
                          (cap {cap.toLocaleString("vi-VN")}m² · fill {projFill}%)
                        </span>
                        {projFill > 100 && <span className="text-danger text-caption">❌ vượt</span>}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <div className="text-caption text-text-3">
              Fill mới: <FillBadge pct={Math.min(newFill, 100)} />
              {overflow && (
                <span className="text-danger font-semibold ml-2">
                  ❌ Vượt capacity ({newFill}%) — chọn xe lớn hơn
                </span>
              )}
            </div>
          </div>

          {/* Drops */}
          <div className="space-y-1.5">
            <Label className="text-table-sm">
              Drop points ({drops.length}) {drops.length > 1 && <Badge variant="outline" className="ml-1 text-caption">Ghép tuyến</Badge>}
            </Label>
            <div className="space-y-1.5">
              {drops.map((d, i) => (
                <div key={d.cnCode} className="flex items-center gap-2 rounded border border-surface-3 bg-surface-2 px-3 py-2">
                  <span className="font-mono text-caption text-text-3">#{i + 1}</span>
                  <div className="flex-1">
                    <div className="text-table-sm font-medium text-text-1">{d.cnCode} · {d.cnName}</div>
                    <div className="text-caption text-text-3">{d.qtyM2.toLocaleString("vi-VN")} m² · {d.poId}</div>
                  </div>
                  {drops.length > 1 && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRemoveDrop(d.cnCode)}>
                      <Trash2 className="h-3.5 w-3.5 text-danger" />
                    </Button>
                  )}
                </div>
              ))}
              <Button size="sm" variant="outline" className="h-8 w-full text-caption" disabled>
                <Plus className="h-3.5 w-3.5 mr-1" /> Thêm Drop (cần CN cùng tuyến)
              </Button>
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label className="text-table-sm">Ghi chú farmer</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Tuyến ĐT→BD→DN hay kẹt xe chiều về. Nên giao CN-DN trước."
              className="min-h-20 text-table-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button onClick={handleSave} disabled={overflow}>Lưu thay đổi ✓</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────────────────────────────────────────────────
// Create container dialog
// ───────────────────────────────────────────────────────────────────

function CreateContainerDialog({
  open, onClose, onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (plan: ContainerPlan) => void;
}) {
  const [vehicle, setVehicle] = useState<VehicleType>("cont_40ft");
  const [nm, setNm] = useState("NM-DT");
  const [cn, setCn] = useState("CN-BD");
  const [qty, setQty] = useState("1500");

  const handleCreate = () => {
    const cap = VEHICLE_LABEL[vehicle].capacity;
    const q = Number(qty) || 0;
    const newPlan: ContainerPlan = {
      id: `TP-${String(Date.now()).slice(-3)}`,
      vehicleType: vehicle,
      vehicleLabel: VEHICLE_LABEL[vehicle].label,
      nmId: nm, nmName: nm === "NM-DT" ? "NM Đồng Tâm" : nm === "NM-MKD" ? "NM Mikado" : "NM Toko",
      nmShortCode: nm === "NM-DT" ? "ĐT" : nm === "NM-MKD" ? "MKD" : "TOKO",
      capacityM2: cap, totalQtyM2: q,
      fillPct: cap > 0 ? Math.round((q / cap) * 100) : 0,
      isConsolidated: false,
      estimatedCost: Math.round(q * 7000),
      savingAmount: 0,
      status: "draft",
      poIds: [`PO-MAN-${Date.now().toString().slice(-4)}`],
      drops: [{
        order: 1, cnCode: cn, cnName: cn,
        qtyM2: q, poId: `PO-MAN-${Date.now().toString().slice(-4)}`,
        eta: "—", distanceKm: 50,
        skuLines: [{ sku: "MANUAL", qty: q }],
      }],
      noteFromFarmer: "Container thủ công bởi farmer",
    };
    onCreate(newPlan);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo container thủ công</DialogTitle>
          <DialogDescription>
            Hệ thống không tự tối ưu container thủ công. Chỉ dùng khi cần ghép gấp ngoài DRP.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-table-sm">Loại xe</Label>
            <Select value={vehicle} onValueChange={(v) => setVehicle(v as VehicleType)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(VEHICLE_LABEL) as VehicleType[]).map(vt => (
                  <SelectItem key={vt} value={vt}>{VEHICLE_LABEL[vt].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-table-sm">Nhà máy</Label>
            <Select value={nm} onValueChange={setNm}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NM-DT">Đồng Tâm</SelectItem>
                <SelectItem value="NM-MKD">Mikado</SelectItem>
                <SelectItem value="NM-TOKO">Toko</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-table-sm">Drop 1 — CN</Label>
            <Select value={cn} onValueChange={setCn}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CN-BD">CN Bình Dương</SelectItem>
                <SelectItem value="CN-DN">CN Đồng Nai</SelectItem>
                <SelectItem value="CN-HN">CN Hà Nội</SelectItem>
                <SelectItem value="CN-CT">CN Cần Thơ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-table-sm">Số lượng (m²)</Label>
            <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="h-9" />
          </div>

          <div className="rounded border border-warning/30 bg-warning-bg/40 px-3 py-2 text-caption text-warning">
            ⚠️ Container thủ công. Hệ thống không tự tối ưu fill rate hay tuyến.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button onClick={handleCreate}>Tạo ✓</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────────────────────────────────────────────────
// Consolidate detail popover (popup ghép tuyến)
// ───────────────────────────────────────────────────────────────────

function ConsolidatePopup({
  plan, open, onClose, onSplit,
}: {
  plan: ContainerPlan | null;
  open: boolean;
  onClose: () => void;
  onSplit: (plan: ContainerPlan) => void;
}) {
  if (!plan) return null;
  const totalDistance = plan.drops.reduce((a, d) => a + d.distanceKm, 0);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-4 w-4 text-orange-500" /> Ghép tuyến — {plan.id}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 text-table-sm">
          <div className="rounded border border-surface-3 bg-surface-2 p-3 space-y-1">
            <div className="font-medium text-text-1">
              {plan.nmShortCode}
              {plan.drops.map(d => <span key={d.cnCode}> → {d.cnCode} (drop {d.order})</span>)}
            </div>
            <div className="text-caption text-text-3">
              {plan.drops.length} CN · {plan.vehicleLabel}
            </div>
          </div>
          <div className="space-y-1 text-caption">
            <div className="flex justify-between">
              <span className="text-text-3">Tiết kiệm:</span>
              <span className="font-semibold text-success">
                {formatVnd(plan.savingAmount)}₫ (vs {formatVnd(plan.estimatedCost + plan.savingAmount)}₫ xe riêng)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-3">Khoảng cách tổng:</span>
              <span className="font-semibold text-text-1">
                {plan.drops.map(d => `${d.distanceKm}km`).join(" + ")} = {totalDistance}km
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-3">Cước hiện tại:</span>
              <span className="font-semibold tabular-nums">{formatVnd(plan.estimatedCost)}₫</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onSplit(plan)}>
            <X className="h-3.5 w-3.5 mr-1" /> Tách 2 xe riêng
          </Button>
          <Button onClick={onClose}>✅ Giữ ghép</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────────────────────────────────────────────────
// MAIN section
// ───────────────────────────────────────────────────────────────────

export function ContainerPlanningSection() {
  const [plans, setPlans] = useState<ContainerPlan[]>(CONTAINER_PLANS);
  const [editPlan, setEditPlan] = useState<ContainerPlan | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [consolidatePlan, setConsolidatePlan] = useState<ContainerPlan | null>(null);

  const summary = useMemo(() => summarizeContainerPlans(plans), [plans]);

  // Sort: low fill first
  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => {
      // Active first, then fill asc
      const aActive = a.status !== "delivered" ? 0 : 1;
      const bActive = b.status !== "delivered" ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return a.fillPct - b.fillPct;
    }),
    [plans],
  );

  const handleSavePlan = (updated: ContainerPlan) => {
    setPlans(ps => ps.map(p => p.id === updated.id ? updated : p));
  };

  const handleCreate = (newPlan: ContainerPlan) => {
    setPlans(ps => [newPlan, ...ps]);
  };

  const handleSplitConsolidate = (plan: ContainerPlan) => {
    // Tạo N container riêng từ N drops
    const splits: ContainerPlan[] = plan.drops.map((d, i) => ({
      ...plan,
      id: `${plan.id}-S${i + 1}`,
      isConsolidated: false,
      drops: [{ ...d, order: 1 }],
      totalQtyM2: d.qtyM2,
      fillPct: Math.round((d.qtyM2 / plan.capacityM2) * 100),
      poIds: [d.poId],
      estimatedCost: Math.round((plan.estimatedCost + plan.savingAmount) / plan.drops.length),
      savingAmount: 0,
    }));
    setPlans(ps => [...splits, ...ps.filter(p => p.id !== plan.id)]);
    setConsolidatePlan(null);
  };

  const cards: SummaryCard[] = [
    {
      key: "total", label: "Tổng chuyến", value: summary.totalContainers, unit: "chuyến",
      severity: "ok",
      tooltip: `${summary.totalCont} container + ${summary.totalTruck} xe tải`,
    },
    {
      key: "consolidated", label: "Ghép tuyến", value: summary.consolidatedCount, unit: "chuyến",
      severity: summary.consolidatedCount > 0 ? "ok" : "neutral",
      tooltip: "Số chuyến chở 2-3 CN — tiết kiệm cước & xe",
      trend: summary.totalSaving > 0
        ? { delta: `Tiết kiệm ${formatVnd(summary.totalSaving)}₫`, direction: "down", color: "green" }
        : undefined,
    },
    {
      key: "fill", label: "Fill TB", value: `${summary.avgFill}%`,
      severity: summary.avgFill >= 80 ? "ok" : summary.avgFill >= 70 ? "warn" : "critical",
      tooltip: `${summary.lowFillCount} chuyến < 70% (cần xử lý)`,
      trend: summary.lowFillCount > 0
        ? { delta: `⚠️ ${summary.lowFillCount} chuyến < 70%`, direction: "flat", color: "red" }
        : undefined,
    },
    {
      key: "cost", label: "Cước tổng", value: `${formatVnd(summary.totalCost)}`, unit: "₫",
      severity: "ok",
      tooltip: "Tổng cước vận chuyển dự kiến",
      trend: summary.totalSaving > 0
        ? { delta: `↓ tiết kiệm ${formatVnd(summary.totalSaving)}₫`, direction: "down", color: "green" }
        : undefined,
    },
  ];

  // Columns
  const columns: SmartTableColumn<ContainerPlan>[] = [
    {
      key: "id", label: "Chuyến", width: 90, sortable: true, filter: "text",
      accessor: r => r.id,
      render: r => <span className="font-mono font-semibold text-text-1">{r.id}</span>,
    },
    {
      key: "vehicle", label: "Loại", width: 90, sortable: true, filter: "enum",
      accessor: r => r.vehicleLabel,
      filterOptions: [
        { value: "20ft", label: "20ft" }, { value: "40ft", label: "40ft" },
        { value: "Xe 10T", label: "Xe 10T" }, { value: "Xe 15T", label: "Xe 15T" },
      ],
      render: r => <span className="text-table-sm text-text-2">{r.vehicleLabel}</span>,
    },
    {
      key: "nm", label: "Nhà máy", width: 130, sortable: true, filter: "enum",
      accessor: r => r.nmName,
      filterOptions: Array.from(new Set(CONTAINER_PLANS.map(p => p.nmName))).map(n => ({ value: n, label: n })),
      render: r => <span className="text-table-sm text-text-1">{r.nmName.replace(/^NM\s+/, "")}</span>,
    },
    {
      key: "route", label: "Tuyến", minWidth: 180,
      render: r => <RouteCell plan={r} />,
    },
    {
      key: "qty", label: "Số lượng", width: 110, sortable: true, numeric: true, align: "right",
      accessor: r => r.totalQtyM2,
      render: r => <span className="tabular-nums text-text-1">{r.totalQtyM2.toLocaleString("vi-VN")} m²</span>,
    },
    {
      key: "fill", label: "Fill", width: 80, sortable: true, align: "center",
      accessor: r => r.fillPct,
      render: r => <FillBadge pct={r.fillPct} />,
    },
    {
      key: "po", label: "Số PO", width: 70, sortable: true, align: "center", numeric: true,
      accessor: r => r.poIds.length,
      render: r => <span className="text-table-sm text-text-2 tabular-nums">{r.poIds.length} PO</span>,
    },
    {
      key: "cost", label: "Cước", width: 100, sortable: true, numeric: true, align: "right",
      accessor: r => r.estimatedCost,
      render: r => (
        <div className="text-right">
          <div className="tabular-nums text-text-1">{formatVnd(r.estimatedCost)}₫</div>
          {r.isConsolidated && <ConsolidatedBadge plan={r} onClick={() => setConsolidatePlan(r)} />}
        </div>
      ),
    },
    {
      key: "status", label: "Trạng thái", width: 130, sortable: true, filter: "enum",
      accessor: r => STATUS_META[r.status].label,
      filterOptions: Object.entries(STATUS_META).map(([v, m]) => ({ value: m.label, label: m.label })),
      render: r => <StatusPill status={r.status} />,
    },
    {
      key: "actions", label: "Hành động", width: 130, align: "center",
      render: r => {
        const editable = r.status === "draft" || r.status === "low_fill" || r.status === "ready";
        return editable ? (
          <div className="flex justify-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="outline" className="h-7 px-2 text-caption" onClick={() => setEditPlan(r)}>
              <Pencil className="h-3 w-3 mr-1" /> Sửa
            </Button>
          </div>
        ) : <span className="text-text-3 text-caption">—</span>;
      },
    },
  ];

  return (
    <section className="space-y-3 mt-6 mb-6 rounded-card border border-primary/20 bg-primary/5 p-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-card-title font-semibold text-text-1 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Đóng container — {summary.totalContainers} chuyến · {summary.totalM2.toLocaleString("vi-VN")} m² · {formatVnd(summary.totalCost)}₫
          </h3>
          <p className="text-caption text-text-3 mt-0.5">
            Hệ thống tự đóng container từ {plans.reduce((a, p) => a + p.poIds.length, 0)} PO. Farmer có thể chỉnh sửa.
          </p>
        </div>
        <Button size="sm" variant="outline" className="h-8" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Tạo container mới
        </Button>
      </div>

      {/* Summary cards (4 inline) */}
      <SummaryCards cards={cards} screenId="drp-container-planning" editable={false} />

      {/* Table */}
      <SmartTable<ContainerPlan>
        columns={columns}
        data={sortedPlans}
        screenId="drp-container-list"
        defaultDensity="compact"
        title="Danh sách container"
        exportFilename="container-plans"
        getRowId={(r) => r.id}
        rowSeverity={(r) => r.fillPct < 70 ? "watch" : undefined}
        drillDown={(r) => (
          <ContainerDrillDown
            plan={r}
            onShowConsolidate={() => setConsolidatePlan(r)}
            onMergeMore={() => alert(`Gom thêm PO cho ${r.id} (mock)`)}
          />
        )}
        autoExpandWhen={(r) => r.fillPct < 70}
        emptyState={{
          icon: <Truck />,
          title: "Chưa có container",
          description: "DRP sẽ tự đóng container khi có PO/TO được tạo.",
          action: { label: "Tạo container thủ công", onClick: () => setCreateOpen(true) },
        }}
      />

      {/* Hold/ship reminder for low fill */}
      {summary.lowFillCount > 0 && (
        <div className="rounded-card border border-warning/30 bg-warning-bg/40 px-3 py-2 text-table-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <div className="text-text-2">
            <span className="font-semibold text-warning">{summary.lowFillCount} chuyến fill &lt; 70%</span> đang được giữ tối đa 3 ngày.
            Hệ thống sẽ tự xuất sau hoặc gom PO tuần tới — mở chi tiết để xử lý ngay.
          </div>
        </div>
      )}

      {/* Dialogs */}
      <EditContainerDialog
        plan={editPlan}
        open={!!editPlan}
        onClose={() => setEditPlan(null)}
        onSave={handleSavePlan}
      />
      <CreateContainerDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
      <ConsolidatePopup
        plan={consolidatePlan}
        open={!!consolidatePlan}
        onClose={() => setConsolidatePlan(null)}
        onSplit={handleSplitConsolidate}
      />
    </section>
  );
}
