import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck,
  PauseCircle,
  Package,
  ChevronRight,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  Route as RouteIcon,
  Pencil,
  Shield,
  Phone,
  Building2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { HoldOrShipPanel } from "@/components/orders/HoldOrShipPanel";
import { TermTooltip } from "@/components/TermTooltip";
import { useRbac } from "@/components/RbacContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  TRANSPORT_PLANS,
  BRANCHES,
  FACTORIES,
  SKU_BASES,
  CARRIERS,
  CN_REGION,
  type TransportPlan,
  type Carrier,
} from "@/data/unis-enterprise-dataset";

const fmt = (n: number) => `${n.toLocaleString("vi-VN")} m²`;
const fmtVnd = (n: number) => `${(n / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu ₫`;

function nodeName(code: string): string {
  if (code.startsWith("NM-")) return FACTORIES.find((f) => f.code === code)?.name ?? code;
  return BRANCHES.find((b) => b.code === code)?.name ?? code;
}

const CN_HSTK_DAYS: Record<string, number> = {
  "CN-HN": 5.2, "CN-HCM": 4.1, "CN-DN": 6.8, "CN-CT": 7.2, "CN-NA": 3.4,
  "CN-NT": 4.8, "CN-HP": 6.0, "CN-BMT": 2.6, "CN-LA": 5.8, "CN-PK": 7.5,
  "CN-QN": 5.0, "CN-BD": 8.2,
};

type Decision = "SHIP" | "HOLD" | "TOP_UP";

function decisionFor(p: TransportPlan): Decision {
  if (p.status === "TOP_UP_SUGGESTED") return "TOP_UP";
  if (p.status === "HOLD") return "HOLD";
  return "SHIP";
}

function FillBadge({ pct }: { pct: number }) {
  const tone =
    pct >= 85
      ? "bg-success-bg text-success border-success/30"
      : pct >= 60
      ? "bg-warning-bg text-warning border-warning/30"
      : "bg-danger-bg text-danger border-danger/30";
  const icon = pct >= 85 ? "🟢" : pct >= 60 ? "🟡" : "🔴";
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-caption font-semibold inline-flex items-center gap-1", tone)}>
      {icon} {pct}%
    </span>
  );
}

function DecisionBadge({ d }: { d: Decision }) {
  const meta =
    d === "SHIP"
      ? { label: "XUẤT", icon: "✅", cls: "bg-success/10 text-success border-success/30" }
      : d === "HOLD"
      ? { label: "GIỮ", icon: "⏸️", cls: "bg-warning/10 text-warning border-warning/30" }
      : { label: "GỢI Ý GOM", icon: "📦", cls: "bg-info/10 text-primary border-primary/30" };
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-caption font-bold inline-flex items-center gap-1", meta.cls)}>
      {meta.icon} {meta.label}
    </span>
  );
}

function topUpSuggestions(plan: TransportPlan) {
  const nm = plan.fromCode;
  const candidates = SKU_BASES.filter((b) => `NM-${b.nmId}` === nm).slice(0, 3);
  const fallback = SKU_BASES.slice(0, 3);
  const list = candidates.length > 0 ? candidates : fallback;
  return list.map((c, i) => ({
    sku: c.code,
    qty: 80 + i * 60,
    reason: i === 0 ? "Gần ngưỡng SS · cùng NM" : i === 1 ? "Cầu tăng đột biến tuần 21" : "Tận dụng container chưa đầy",
  }));
}

/* ─────────────────────────────────────────────────────────── */
/* Carrier selector dropdown                                  */
/* ─────────────────────────────────────────────────────────── */
function CarrierPicker({
  plan,
  current,
  onAssign,
}: {
  plan: TransportPlan;
  current: Carrier | null;
  onAssign: (carrierId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const region = CN_REGION[plan.toCnCode] ?? "Nam";
  const candidates = CARRIERS.filter((c) => c.available && c.region.includes(region));

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-caption transition-colors",
          current
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-dashed border-surface-3 text-text-3 hover:bg-surface-2"
        )}
        title="Chọn nhà xe"
      >
        <Building2 className="h-3 w-3" />
        {current ? current.name : "Chọn nhà xe"}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-7 z-30 w-72 rounded-card border border-surface-3 bg-surface-0 shadow-lg p-1.5"
        >
          <div className="px-2 py-1 text-caption text-text-3 border-b border-surface-3 mb-1">
            Vùng <strong className="text-text-1">{region}</strong> · {candidates.length} nhà xe khả dụng
          </div>
          {candidates.map((c) => {
            const rate = plan.containerType === "40ft" ? c.rate40ft : c.rate20ft;
            return (
              <button
                key={c.id}
                onClick={() => {
                  onAssign(c.id);
                  setOpen(false);
                  toast.success(`Đã gán ${c.name} cho ${plan.id}`, {
                    description: `${plan.containerType} · SLA đúng giờ ${c.slaOnTimePct}%`,
                  });
                }}
                className="w-full text-left rounded-button px-2 py-1.5 hover:bg-surface-2 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-text-1 text-table-sm">{c.name}</span>
                  <span className="text-caption font-mono text-success">SLA {c.slaOnTimePct}%</span>
                </div>
                <div className="text-caption text-text-3 mt-0.5">
                  {rate > 0 ? `${fmtVnd(rate)}/${plan.containerType}` : "NM tự vận chuyển — không tính phí"} · {c.type}
                </div>
              </button>
            );
          })}
          {candidates.length === 0 && (
            <div className="px-2 py-3 text-caption text-text-3 text-center">
              Không có nhà xe khả dụng cho vùng {region}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Edit container dialog                                      */
/* ─────────────────────────────────────────────────────────── */
function EditContainerDialog({
  plan,
  open,
  onOpenChange,
  onUpdate,
}: {
  plan: TransportPlan;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdate: (patch: Partial<TransportPlan>) => void;
}) {
  const [containerType, setContainerType] = useState(plan.containerType);
  const [loadedM2, setLoadedM2] = useState(plan.loadedM2);

  const capacity = containerType === "40ft" ? 1800 : 900;
  const fillPct = Math.round((loadedM2 / capacity) * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Chỉnh sửa container {plan.id}</DialogTitle>
          <DialogDescription>
            Thay loại container hoặc tách/gom. Hệ thống sẽ tính lại{" "}
            <TermTooltip term="FILL_RATE">tỉ lệ lấp đầy</TermTooltip> và áp dụng lại quy tắc{" "}
            <TermTooltip term="HOLD_OR_SHIP">Giữ hay Xuất</TermTooltip>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-table-sm font-medium text-text-1 mb-1.5 block">Loại container</label>
            <div className="inline-flex rounded-button border border-surface-3 bg-surface-1 p-0.5">
              {(["20ft", "40ft"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setContainerType(t)}
                  className={cn(
                    "px-3 py-1 text-table-sm font-medium rounded-button transition-colors",
                    containerType === t
                      ? "bg-gradient-primary text-primary-foreground"
                      : "text-text-2 hover:text-text-1"
                  )}
                >
                  {t} ({t === "40ft" ? "1.800" : "900"} m²)
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-table-sm font-medium text-text-1 mb-1.5 block">
              Tải hàng (m²)
            </label>
            <input
              type="number"
              value={loadedM2}
              max={capacity}
              onChange={(e) => setLoadedM2(Math.min(capacity, Number(e.target.value) || 0))}
              className="w-full rounded-button border border-surface-3 bg-surface-0 px-3 py-1.5 text-table-sm font-mono"
            />
            <div className="mt-1.5 flex items-center gap-2 text-caption text-text-3">
              <span>Lấp đầy mới:</span>
              <FillBadge pct={fillPct} />
              {fillPct < 60 && <span className="text-warning">→ Sẽ chuyển sang GIỮ</span>}
              {fillPct >= 60 && fillPct < 85 && (
                <span className="text-primary">→ Sẽ gợi ý gom thêm hàng</span>
              )}
              {fillPct >= 85 && <span className="text-success">→ Đủ điều kiện XUẤT</span>}
            </div>
          </div>

          <div className="rounded-card border border-surface-3 bg-surface-2/40 p-3 space-y-2">
            <div className="text-caption font-semibold text-text-1">Hành động nâng cao</div>
            <button
              onClick={() => {
                toast("Đã tách 1 container 40ft → 2 container 20ft", {
                  description: `${plan.id}A: 900m² · ${plan.id}B: ${loadedM2 - 900}m²`,
                });
                onOpenChange(false);
              }}
              disabled={containerType !== "40ft" || loadedM2 < 900}
              className="w-full rounded-button border border-surface-3 bg-surface-0 px-3 py-1.5 text-table-sm text-left hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ✂️ Tách container — 1×40ft → 2×20ft
            </button>
            <button
              onClick={() => {
                toast("Đã gom 2 container 20ft cùng tuyến → 1 container 40ft");
                onOpenChange(false);
              }}
              className="w-full rounded-button border border-surface-3 bg-surface-0 px-3 py-1.5 text-table-sm text-left hover:bg-surface-2"
            >
              🔗 Gom container — 2×20ft cùng tuyến → 1×40ft
            </button>
            <button
              onClick={() => {
                toast("Mở danh sách PO cùng NM để thêm/bớt");
                onOpenChange(false);
              }}
              className="w-full rounded-button border border-surface-3 bg-surface-0 px-3 py-1.5 text-table-sm text-left hover:bg-surface-2"
            >
              📋 Thêm/bớt PO trong container
            </button>
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-button border border-surface-3 px-3 py-1.5 text-table-sm hover:bg-surface-2"
          >
            Huỷ
          </button>
          <button
            onClick={() => {
              const newCapacity = containerType === "40ft" ? 1800 : 900;
              const newFill = Math.round((loadedM2 / newCapacity) * 100);
              onUpdate({
                containerType,
                capacityM2: newCapacity,
                loadedM2,
                fillPct: newFill,
                status:
                  newFill < 60 ? "HOLD" : newFill < 85 ? "TOP_UP_SUGGESTED" : "SHIP",
                recommendation:
                  newFill < 60
                    ? `Chờ gom hàng — lấp đầy ${newFill}% < 60%`
                    : newFill < 85
                    ? `Gợi ý bổ sung ${(newCapacity - loadedM2).toLocaleString("vi-VN")}m² để lấp đầy`
                    : "Khởi hành đúng kế hoạch",
              });
              toast.success(`Đã cập nhật ${plan.id}`, {
                description: `${containerType} · ${fmt(loadedM2)} · ${newFill}%`,
              });
              onOpenChange(false);
            }}
            className="rounded-button bg-gradient-primary text-primary-foreground px-3 py-1.5 text-table-sm font-medium"
          >
            Lưu thay đổi
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Override dialog (SC Manager)                                */
/* ─────────────────────────────────────────────────────────── */
function OverrideDialog({
  plan,
  open,
  onOpenChange,
  onOverride,
}: {
  plan: TransportPlan;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onOverride: (newDecision: Decision, reason: string) => void;
}) {
  const currentDecision = decisionFor(plan);
  const targetIsShip = currentDecision !== "SHIP";
  const reasons = targetIsShip
    ? ["CN cần gấp", "NM chỉ ship 1 lần/tuần", "Khác"]
    : ["Chờ NM xác nhận", "CN chưa sẵn sàng nhận", "Khác"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Shield className="h-5 w-5 text-warning" />
            Override quyết định
          </DialogTitle>
          <DialogDescription>
            Container <strong className="text-text-1">{plan.id}</strong> đang ở trạng thái{" "}
            <DecisionBadge d={currentDecision} />. Override sang{" "}
            <DecisionBadge d={targetIsShip ? "SHIP" : "HOLD"} />?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <div className="text-table-sm font-medium text-text-1">Lý do override:</div>
          {reasons.map((r) => (
            <button
              key={r}
              onClick={() => {
                onOverride(targetIsShip ? "SHIP" : "HOLD", r);
                onOpenChange(false);
              }}
              className="w-full text-left rounded-button border border-surface-3 bg-surface-0 px-3 py-2 text-table-sm hover:bg-warning/10 hover:border-warning/30 transition-colors"
            >
              {r}
            </button>
          ))}
        </div>

        <div className="rounded-card border border-warning/30 bg-warning-bg p-2 text-caption text-warning flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>Hành động sẽ được ghi log và thông báo các bên liên quan.</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Packing tab                                                */
/* ─────────────────────────────────────────────────────────── */
export function PackingTab() {
  const { user } = useRbac();
  const isScManager = user.role === "SC_MANAGER";

  const [plans, setPlans] = useState<TransportPlan[]>(TRANSPORT_PLANS);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actioned, setActioned] = useState<Record<string, Decision | undefined>>({});
  const [editingPlan, setEditingPlan] = useState<TransportPlan | null>(null);
  const [overridePlan, setOverridePlan] = useState<TransportPlan | null>(null);

  const updatePlan = (id: string, patch: Partial<TransportPlan>) =>
    setPlans((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  return (
    <>
      <div className="rounded-card border border-info/30 bg-info-bg/40 p-3 mb-3 text-table-sm text-text-2 flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <span>
          Mỗi <TermTooltip term="CONTAINER">container</TermTooltip> được chấm điểm theo{" "}
          <TermTooltip term="FILL_RATE">tỉ lệ lấp đầy</TermTooltip> và áp dụng quy tắc{" "}
          <TermTooltip term="HOLD_OR_SHIP">Giữ hay Xuất</TermTooltip>. Planner có thể chọn{" "}
          <TermTooltip term="CARRIER">nhà xe</TermTooltip>, chỉnh sửa container hoặc override (chỉ SC Manager).
        </span>
      </div>

      <div className="rounded-card border border-surface-3 bg-surface-1 overflow-visible">
        <table className="w-full">
          <thead className="bg-surface-2/50 border-b border-surface-3">
            <tr className="text-table-sm text-text-3 text-left">
              <th className="px-3 py-2.5 font-medium">Container</th>
              <th className="px-3 py-2.5 font-medium">Tuyến</th>
              <th className="px-3 py-2.5 font-medium">Loại</th>
              <th className="px-3 py-2.5 font-medium text-right">Tải</th>
              <th className="px-3 py-2.5 font-medium text-center">Lấp đầy</th>
              <th className="px-3 py-2.5 font-medium text-center">Quyết định</th>
              <th className="px-3 py-2.5 font-medium">Nhà xe</th>
              <th className="px-3 py-2.5 font-medium text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => {
              const d = actioned[p.id] ?? decisionFor(p);
              const isOpen = expanded === p.id;
              const canExpand = d === "TOP_UP";
              const carrier = p.carrierId ? CARRIERS.find((c) => c.id === p.carrierId) ?? null : null;
              return (
                <>
                  <tr
                    key={p.id}
                    className={cn(
                      "border-b border-surface-3 transition-colors",
                      canExpand ? "cursor-pointer hover:bg-surface-2/40" : "hover:bg-surface-2/20",
                    )}
                    onClick={() => canExpand && setExpanded(isOpen ? null : p.id)}
                  >
                    <td className="px-3 py-3 font-mono text-table-sm text-text-1">
                      <span className="inline-flex items-center gap-1">
                        {canExpand && (isOpen ? <ChevronDown className="h-3 w-3 text-text-3" /> : <ChevronRight className="h-3 w-3 text-text-3" />)}
                        {p.id}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-table-sm text-text-2">
                      {nodeName(p.fromCode)} <ChevronRight className="inline h-3 w-3 text-text-3" /> {nodeName(p.toCnCode)}
                    </td>
                    <td className="px-3 py-3 text-table-sm text-text-2">{p.containerType}</td>
                    <td className="px-3 py-3 text-table-sm text-text-1 font-mono text-right">
                      {fmt(p.loadedM2)} <span className="text-text-3">/ {fmt(p.capacityM2)}</span>
                    </td>
                    <td className="px-3 py-3 text-center"><FillBadge pct={p.fillPct} /></td>
                    <td className="px-3 py-3 text-center"><DecisionBadge d={d} /></td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <CarrierPicker
                        plan={p}
                        current={carrier}
                        onAssign={(cid) => updatePlan(p.id, { carrierId: cid })}
                      />
                    </td>
                    <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => {
                            setActioned((s) => ({ ...s, [p.id]: "SHIP" }));
                            toast.success(`Đã xuất ${p.id}`, { description: `${nodeName(p.fromCode)} → ${nodeName(p.toCnCode)}` });
                          }}
                          className="rounded-button border border-surface-3 bg-surface-0 px-2 py-1 text-caption font-medium text-text-1 hover:bg-success/10 hover:border-success/30 hover:text-success transition-colors"
                          title="Xuất ngay"
                        >
                          <Truck className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => {
                            setActioned((s) => ({ ...s, [p.id]: "HOLD" }));
                            toast(`Giữ ${p.id} 1–2 ngày`);
                          }}
                          className="rounded-button border border-surface-3 bg-surface-0 px-2 py-1 text-caption font-medium text-text-1 hover:bg-warning/10 hover:border-warning/30 hover:text-warning transition-colors"
                          title="Giữ"
                        >
                          <PauseCircle className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => setEditingPlan(p)}
                          className="rounded-button border border-surface-3 bg-surface-0 px-2 py-1 text-caption font-medium text-text-1 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors"
                          title="Chỉnh sửa container"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        {isScManager && (
                          <button
                            onClick={() => setOverridePlan(p)}
                            className="rounded-button border border-warning/30 bg-warning-bg px-2 py-1 text-caption font-medium text-warning hover:bg-warning/20 transition-colors"
                            title="Override (SC Manager)"
                          >
                            <Shield className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {canExpand && isOpen && (
                    <tr key={`${p.id}-exp`} className="bg-info-bg/40 border-b border-surface-3">
                      <td colSpan={8} className="px-4 py-3">
                        <div className="flex items-center gap-2 mb-2 text-table-sm font-semibold text-text-1">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          Gợi ý gom thêm — cùng NM, gần ngưỡng SS trước
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {topUpSuggestions(p).map((s, i) => (
                            <div key={i} className="rounded-button border border-surface-3 bg-surface-0 p-2.5">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-table-sm text-text-1">{s.sku}</span>
                                <span className="text-caption font-mono text-text-2">{fmt(s.qty)}</span>
                              </div>
                              <p className="text-caption text-text-3 italic mt-0.5">{s.reason}</p>
                              <button
                                onClick={() => toast.success(`Đã thêm ${s.sku} (${fmt(s.qty)}) vào ${p.id}`)}
                                className="mt-1.5 w-full rounded-button bg-primary/10 px-2 py-1 text-caption font-medium text-primary hover:bg-primary/20 transition-colors"
                              >
                                + Thêm vào container
                              </button>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingPlan && (
        <EditContainerDialog
          plan={editingPlan}
          open={!!editingPlan}
          onOpenChange={(v) => !v && setEditingPlan(null)}
          onUpdate={(patch) => updatePlan(editingPlan.id, patch)}
        />
      )}
      {overridePlan && (
        <OverrideDialog
          plan={overridePlan}
          open={!!overridePlan}
          onOpenChange={(v) => !v && setOverridePlan(null)}
          onOverride={(newD, reason) => {
            setActioned((s) => ({ ...s, [overridePlan.id]: newD }));
            toast.success(`Đã override ${overridePlan.id} → ${newD}`, {
              description: `Lý do: ${reason} · Ghi log audit.`,
            });
          }}
        />
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Routes tab (unchanged logic)                               */
/* ─────────────────────────────────────────────────────────── */
function RoutesTab() {
  const grouped = useMemo(() => {
    const m = new Map<string, TransportPlan[]>();
    TRANSPORT_PLANS.forEach((p) => {
      const arr = m.get(p.fromCode) ?? [];
      arr.push(p);
      m.set(p.fromCode, arr);
    });
    m.forEach((arr) =>
      arr.sort((a, b) => (CN_HSTK_DAYS[a.toCnCode] ?? 9) - (CN_HSTK_DAYS[b.toCnCode] ?? 9)),
    );
    return Array.from(m.entries());
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-info/30 bg-info-bg/40 p-3 text-table-sm text-text-2 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <span>
          Mỗi tuyến: CN ưu tiên theo <TermTooltip term="HSTK">HSTK</TermTooltip> thấp nhất → giao trước.
          CN HSTK ≤ 3 ngày = khẩn cấp.
        </span>
      </div>
      {grouped.map(([from, plans]) => (
        <div key={from} className="rounded-card border border-surface-3 bg-surface-1 overflow-hidden">
          <div className="px-4 py-2.5 bg-surface-2/50 border-b border-surface-3 flex items-center gap-2">
            <RouteIcon className="h-4 w-4 text-primary" />
            <span className="font-display text-section-header text-text-1">{nodeName(from)}</span>
            <span className="text-caption text-text-3">· {plans.length} điểm giao</span>
          </div>
          <table className="w-full">
            <thead className="bg-surface-2/30">
              <tr className="text-caption text-text-3 text-left">
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Đến CN</th>
                <th className="px-4 py-2 font-medium text-right">HSTK (ngày)</th>
                <th className="px-4 py-2 font-medium text-right">Tải</th>
                <th className="px-4 py-2 font-medium text-center">Lấp đầy</th>
                <th className="px-4 py-2 font-medium">Container</th>
                <th className="px-4 py-2 font-medium">Lịch xuất</th>
                <th className="px-4 py-2 font-medium text-center">Quyết định</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p, i) => {
                const hstk = CN_HSTK_DAYS[p.toCnCode] ?? 4;
                const urgent = hstk <= 3;
                return (
                  <tr key={p.id} className={cn("border-t border-surface-3", urgent && "bg-danger/5")}>
                    <td className="px-4 py-2.5 text-caption font-mono text-text-3">#{i + 1}</td>
                    <td className="px-4 py-2.5 text-table-sm text-text-1 font-medium">{nodeName(p.toCnCode)}</td>
                    <td className={cn("px-4 py-2.5 text-table-sm font-mono text-right", urgent ? "text-danger font-bold" : "text-text-2")}>
                      {hstk.toFixed(1)}{urgent && " 🔴"}
                    </td>
                    <td className="px-4 py-2.5 text-table-sm text-text-2 font-mono text-right">{fmt(p.loadedM2)}</td>
                    <td className="px-4 py-2.5 text-center"><FillBadge pct={p.fillPct} /></td>
                    <td className="px-4 py-2.5 text-table-sm text-text-2">{p.containerType}</td>
                    <td className="px-4 py-2.5 text-caption font-mono text-text-3">{p.scheduledDate}</td>
                    <td className="px-4 py-2.5 text-center"><DecisionBadge d={decisionFor(p)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Carrier management tab                                     */
/* ─────────────────────────────────────────────────────────── */
export function CarriersTab() {
  const [selected, setSelected] = useState<Carrier | null>(null);
  const unavailable = CARRIERS.filter((c) => !c.available);

  return (
    <div className="space-y-4">
      {unavailable.length > 0 && (
        <div className="rounded-card border border-warning/30 bg-warning-bg p-3 flex items-start gap-2 text-table-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <strong>⚠️ {unavailable.length} nhà xe tạm ngưng:</strong>{" "}
            {unavailable.map((c) => `${c.name} (${c.note})`).join(" · ")}
          </div>
        </div>
      )}

      <div className="rounded-card border border-surface-3 bg-surface-1 overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface-2/50 border-b border-surface-3">
            <tr className="text-table-sm text-text-3 text-left">
              <th className="px-4 py-2.5 font-medium">Tên nhà xe</th>
              <th className="px-4 py-2.5 font-medium">Loại</th>
              <th className="px-4 py-2.5 font-medium">Vùng</th>
              <th className="px-4 py-2.5 font-medium text-right">Giá 20ft</th>
              <th className="px-4 py-2.5 font-medium text-right">Giá 40ft</th>
              <th className="px-4 py-2.5 font-medium text-center">SLA đúng giờ</th>
              <th className="px-4 py-2.5 font-medium text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {CARRIERS.map((c) => (
              <tr
                key={c.id}
                onClick={() => setSelected(c)}
                className={cn(
                  "border-b border-surface-3 cursor-pointer hover:bg-surface-2/30 transition-colors",
                  !c.available && "opacity-60",
                )}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-text-1">{c.name}</div>
                  <div className="text-caption font-mono text-text-3">{c.id} · {c.phone}</div>
                </td>
                <td className="px-4 py-3 text-table-sm text-text-2">{c.type}</td>
                <td className="px-4 py-3 text-caption">
                  {c.region.map((r) => (
                    <span key={r} className="rounded-full border border-surface-3 px-1.5 py-0.5 mr-1 text-text-2">
                      {r}
                    </span>
                  ))}
                </td>
                <td className="px-4 py-3 text-table-sm font-mono text-right text-text-1">
                  {c.rate20ft > 0 ? fmtVnd(c.rate20ft) : "—"}
                </td>
                <td className="px-4 py-3 text-table-sm font-mono text-right text-text-1">
                  {c.rate40ft > 0 ? fmtVnd(c.rate40ft) : "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-caption font-semibold",
                      c.slaOnTimePct >= 90
                        ? "bg-success-bg text-success border-success/30"
                        : c.slaOnTimePct >= 85
                        ? "bg-warning-bg text-warning border-warning/30"
                        : "bg-danger-bg text-danger border-danger/30",
                    )}
                  >
                    {c.slaOnTimePct}%
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {c.available ? (
                    <span className="inline-flex items-center gap-1 text-success text-caption font-medium">
                      <CheckCircle2 className="h-3 w-3" /> Khả dụng
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-danger text-caption font-medium">
                      <XCircle className="h-3 w-3" /> Tạm ngưng
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {selected.name}
                </DialogTitle>
                <DialogDescription>
                  {selected.id} · {selected.type}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-table-sm">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-text-3" />
                  <span className="font-mono">{selected.phone}</span>
                </div>
                <div>
                  <div className="text-caption text-text-3 mb-1">Vùng phục vụ</div>
                  <div>{selected.region.join(" · ")}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-card border border-surface-3 p-2">
                    <div className="text-caption text-text-3">Giá 20ft</div>
                    <div className="font-mono font-semibold text-text-1">
                      {selected.rate20ft > 0 ? fmtVnd(selected.rate20ft) : "Miễn phí"}
                    </div>
                  </div>
                  <div className="rounded-card border border-surface-3 p-2">
                    <div className="text-caption text-text-3">Giá 40ft</div>
                    <div className="font-mono font-semibold text-text-1">
                      {selected.rate40ft > 0 ? fmtVnd(selected.rate40ft) : "Miễn phí"}
                    </div>
                  </div>
                </div>
                <div className="rounded-card border border-surface-3 p-2">
                  <div className="text-caption text-text-3">SLA đúng giờ 90 ngày qua</div>
                  <div className="font-mono font-semibold text-success">{selected.slaOnTimePct}%</div>
                </div>
                <div className="rounded-card border border-info/30 bg-info-bg p-2 text-caption text-text-2 italic">
                  {selected.note}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TransportPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"packing" | "routes" | "carriers">("packing");

  const summary = useMemo(() => {
    const ship = TRANSPORT_PLANS.filter((p) => decisionFor(p) === "SHIP").length;
    const hold = TRANSPORT_PLANS.filter((p) => decisionFor(p) === "HOLD").length;
    const topUp = TRANSPORT_PLANS.filter((p) => decisionFor(p) === "TOP_UP").length;
    return { ship, hold, topUp, total: TRANSPORT_PLANS.length };
  }, []);

  return (
    <AppLayout>
      <div className="p-8 max-w-screen-2xl mx-auto">
        <ScreenHeader
          title="Đóng hàng & Vận tải"
          subtitle={`F2-B5 · ${summary.total} container · ${summary.ship} XUẤT · ${summary.hold} GIỮ · ${summary.topUp} GỢI Ý GOM · ${CARRIERS.filter((c) => c.available).length}/${CARRIERS.length} nhà xe khả dụng`}
        />

        <div className="flex items-center gap-1 mb-5 border-b border-surface-3">
          {([
            { id: "packing", label: "Đóng hàng", icon: Package },
            { id: "routes", label: "Tuyến giao", icon: RouteIcon },
            { id: "carriers", label: "Nhà xe", icon: Building2 },
          ] as const).map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-4 py-2.5 text-table-sm font-medium border-b-2 transition-colors -mb-px",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-text-3 hover:text-text-1 hover:border-surface-3",
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "packing" && (
          <div className="space-y-5">
            <PackingTab />
            <div>
              <h3 className="font-display text-section-header text-text-1 mb-2">
                Quyết định Giữ / Xuất container
              </h3>
              <HoldOrShipPanel />
            </div>
          </div>
        )}

        {tab === "routes" && <RoutesTab />}
        {tab === "carriers" && <CarriersTab />}

        <button
          onClick={() => navigate("/orders")}
          className="mt-6 w-full rounded-card border border-primary/30 bg-primary/5 px-5 py-3 flex items-center justify-between hover:bg-primary/10 transition-colors group"
        >
          <div className="text-left">
            <div className="text-caption text-text-3 uppercase tracking-wider">Bước tiếp</div>
            <div className="text-table font-semibold text-text-1 mt-0.5">
              Đóng hàng xong → Duyệt PO/TO & release ERP
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-primary font-medium text-table-sm">
            Mở Orders <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>

        <ScreenFooter actionCount={summary.total} />
      </div>
    </AppLayout>
  );
}
