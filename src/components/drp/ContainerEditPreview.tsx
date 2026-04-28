/* ════════════════════════════════════════════════════════════════════════════
   §  ContainerEditPreview — workspace chỉnh chuyến với preview LIVE
   §  Mọi thay đổi (đổi loại xe / gỡ–gắn lại drop / đổi thứ tự) đều cập nhật
   §  fill% + tổng km + cước ngay lập tức, hiện song song "Hiện tại vs Sau khi sửa".
   ════════════════════════════════════════════════════════════════════════════ */
import { useState, useMemo, useEffect } from "react";
import {
  Truck, MapPin, GripVertical, ArrowUp, ArrowDown, RotateCcw, Save,
  AlertTriangle, Plus, X, Check, TrendingUp, TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import type { ContainerPlan, DropPoint } from "@/data/container-plans";
import { inferContainerRoute, REGION_LABELS } from "@/data/route-constraints";

/* ── Vehicle catalog (capacity m² + cost/km) ── */
const VEHICLES: Record<string, { label: string; capacity: number; costPerKm: number }> = {
  "Xe5T":  { label: "Xe 5 tấn",  capacity: 600,  costPerKm: 28_000 },
  "Xe10T": { label: "Xe 10 tấn", capacity: 1200, costPerKm: 45_000 },
  "20ft":  { label: "Container 20ft", capacity: 1600, costPerKm: 65_000 },
  "40ft":  { label: "Container 40ft", capacity: 2400, costPerKm: 85_000 },
};

const fmtVnd = (v: number) => v.toLocaleString("vi-VN") + "₫";
const fmtVndShort = (v: number) => {
  const abs = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M₫";
  if (abs >= 1_000) return sign + Math.round(abs / 1000) + "K₫";
  return sign + abs + "₫";
};
const fmtDelta = (v: number, suffix = "") => {
  if (v === 0) return `±0${suffix}`;
  const sign = v > 0 ? "+" : "−";
  return sign + Math.abs(v).toLocaleString("vi-VN") + suffix;
};

/* ── Distance & freight model ──
   Base (gốc): container.distanceKm + container.freightVnd.
   Mỗi drop chiếm avg ~ distance/dropCount km. Bỏ drop → trừ phần đó.
   Đổi thứ tự → +25% × deviation ratio (giống DropPointsEditor).
   Đổi xe → cước = km × costPerKm vehicle mới.
*/
function permutationDeviation(order: DropPoint[], baseline: DropPoint[]): number {
  if (baseline.length <= 1) return 0;
  const baseIdx = new Map(baseline.map((d, i) => [d.cnCode, i]));
  const filtered = order.filter((d) => baseIdx.has(d.cnCode));
  if (filtered.length <= 1) return 0;
  let dev = 0;
  filtered.forEach((d, i) => {
    const orig = baseIdx.get(d.cnCode) ?? i;
    dev += Math.abs(orig - i);
  });
  const maxDev = Math.floor((filtered.length * filtered.length) / 2);
  return maxDev > 0 ? dev / maxDev : 0;
}

interface RecalcInput {
  base: ContainerPlan;
  drops: DropPoint[];
  vehicleKey: string;
}
interface RecalcOutput {
  fillM2: number;
  fillPct: number;
  capacity: number;
  km: number;
  freight: number;
  vehicleLabel: string;
  overflow: number;
}
function recalc({ base, drops, vehicleKey }: RecalcInput): RecalcOutput {
  const v = VEHICLES[vehicleKey] ?? VEHICLES[base.vehicle] ?? VEHICLES["40ft"];
  const fillM2 = drops.reduce((a, d) => a + d.qtyM2, 0);
  const fillPct = v.capacity > 0 ? Math.round((fillM2 / v.capacity) * 100) : 0;
  const overflow = Math.max(0, fillM2 - v.capacity);

  // Km: bỏ drops giảm tỉ lệ, reorder tăng theo deviation
  const baseDropsCount = base.drops.length || 1;
  const remainCount = drops.filter((d) => base.drops.some((b) => b.cnCode === d.cnCode)).length;
  const dropRatio = baseDropsCount > 0 ? remainCount / baseDropsCount : 1;
  // Drop-removal saving: pickup factory leg luôn còn → giữ 60% km khi không có drop nào
  const reachedKm = base.distanceKm * (0.4 + 0.6 * dropRatio);
  const dev = permutationDeviation(drops, base.drops);
  const km = Math.round(reachedKm * (1 + dev * 0.25));
  const freight = Math.round(km * v.costPerKm);

  return { fillM2, fillPct, capacity: v.capacity, km, freight, vehicleLabel: v.label, overflow };
}

interface Props {
  container: ContainerPlan | null;
  onClose: () => void;
}

export function ContainerEditPreview({ container, onClose }: Props) {
  const [vehicleKey, setVehicleKey] = useState<string>(container?.vehicle ?? "40ft");
  const [activeDrops, setActiveDrops] = useState<DropPoint[]>(container?.drops ?? []);
  const [removed, setRemoved] = useState<DropPoint[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  // Reset when container changes
  useEffect(() => {
    if (!container) return;
    setVehicleKey(container.vehicle in VEHICLES ? container.vehicle : "40ft");
    setActiveDrops(container.drops);
    setRemoved([]);
  }, [container]);

  const before = useMemo<RecalcOutput | null>(
    () => container ? recalc({ base: container, drops: container.drops, vehicleKey: container.vehicle }) : null,
    [container],
  );
  const after = useMemo<RecalcOutput | null>(
    () => container ? recalc({ base: container, drops: activeDrops, vehicleKey }) : null,
    [container, activeDrops, vehicleKey],
  );

  const dirty = useMemo(() => {
    if (!container) return false;
    if (vehicleKey !== container.vehicle) return true;
    if (activeDrops.length !== container.drops.length) return true;
    return activeDrops.some((d, i) => d.cnCode !== container.drops[i]?.cnCode);
  }, [container, activeDrops, vehicleKey]);

  if (!container || !before || !after) return null;

  /* ── Handlers ── */
  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= activeDrops.length) return;
    const next = [...activeDrops];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setActiveDrops(next);
  };
  const removeDrop = (cnCode: string) => {
    const drop = activeDrops.find((d) => d.cnCode === cnCode);
    if (!drop) return;
    setActiveDrops((cur) => cur.filter((d) => d.cnCode !== cnCode));
    setRemoved((cur) => [...cur, drop]);
  };
  const restoreDrop = (cnCode: string) => {
    const drop = removed.find((d) => d.cnCode === cnCode);
    if (!drop) return;
    setRemoved((cur) => cur.filter((d) => d.cnCode !== cnCode));
    // chèn lại theo `order` tăng dần
    setActiveDrops((cur) => {
      const next = [...cur, drop];
      next.sort((a, b) => a.order - b.order);
      return next;
    });
  };
  const reset = () => {
    setVehicleKey(container.vehicle in VEHICLES ? container.vehicle : "40ft");
    setActiveDrops(container.drops);
    setRemoved([]);
  };
  const save = () => {
    if (!dirty) {
      toast.info("Không có thay đổi để lưu");
      return;
    }
    toast.success(
      `Đã lưu ${container.id}: ${after.vehicleLabel} · ${activeDrops.length} drop · ` +
      `Fill ${after.fillPct}% · Cước ${fmtVndShort(after.freight)}`,
    );
    onClose();
  };

  const dKm = after.km - before.km;
  const dFreight = after.freight - before.freight;
  const dFill = after.fillPct - before.fillPct;

  const dynamicRoute = activeDrops.length > 0
    ? `${container.factoryCode.replace(/^NM-/, "")} → ${activeDrops.map((d) => d.cnCode).join(" → ")}`
    : `${container.factoryCode.replace(/^NM-/, "")} (không có drop)`;

  return (
    <Dialog open={!!container} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0">
        {/* ── Header ── */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-surface-3 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Truck className="h-4 w-4 text-primary" />
            Chỉnh chuyến <span className="font-mono text-primary">{container.id}</span>
            <span className="text-text-3 font-normal">— {container.factoryName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* ── BEFORE / AFTER preview ── */}
          <div className="grid grid-cols-2 gap-3">
            <PreviewCard title="Hiện tại" tone="muted" snap={before} drops={container.drops} />
            <PreviewCard
              title="Sau khi sửa"
              tone={dirty ? (dFreight > 0 ? "warn" : "good") : "muted"}
              snap={after}
              drops={activeDrops}
              dKm={dirty ? dKm : 0}
              dFreight={dirty ? dFreight : 0}
              dFill={dirty ? dFill : 0}
              showDelta
            />
          </div>

          {/* ── Route line ── */}
          <div className="rounded-card border border-surface-3 bg-surface-2 px-3 py-2 flex items-center gap-2 text-table-sm">
            <MapPin className="h-3.5 w-3.5 text-text-3 shrink-0" />
            <span className="font-mono text-text-1 truncate">{dynamicRoute}</span>
            {!dirty && (
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-text-3">
                <Check className="h-3 w-3 text-success" /> Cấu hình gốc
              </span>
            )}
          </div>

          {/* ── Vehicle picker ── */}
          <div>
            <div className="text-table-sm font-semibold text-text-1 mb-1.5">Loại xe</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(VEHICLES).map(([key, v]) => {
                const selected = vehicleKey === key;
                const wouldOverflow = after.fillM2 > v.capacity;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setVehicleKey(key)}
                    className={cn(
                      "rounded-card border px-3 py-2 text-left transition-all",
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-surface-3 bg-surface-2 hover:border-primary/40",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-table-sm font-semibold text-text-1">{v.label}</span>
                      {selected && <Check className="h-3 w-3 text-primary" />}
                    </div>
                    <div className="text-[11px] text-text-3 tabular-nums mt-0.5">
                      {v.capacity.toLocaleString()}m² · {(v.costPerKm / 1000).toFixed(0)}K/km
                    </div>
                    {wouldOverflow && !selected && (
                      <div className="mt-1 text-[10px] text-danger flex items-center gap-1">
                        <AlertTriangle className="h-2.5 w-2.5" /> Vượt sức chứa
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {after.overflow > 0 && (
              <div className="mt-2 rounded-card border border-danger/40 bg-danger-bg/40 px-3 py-2 text-table-sm text-danger flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Vượt sức chứa <strong className="tabular-nums">{after.overflow.toLocaleString()}m²</strong> —
                  hãy chọn xe lớn hơn hoặc gỡ bớt drop.
                </span>
              </div>
            )}
          </div>

          {/* ── Active drops (reorderable + removable) ── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-table-sm font-semibold text-text-1">
                Điểm giao đang chở ({activeDrops.length})
              </div>
              <span className="text-[11px] text-text-3">Kéo-thả hoặc dùng ↑↓ để đổi thứ tự</span>
            </div>
            {activeDrops.length === 0 ? (
              <div className="rounded-card border border-dashed border-surface-3 bg-surface-2/50 px-3 py-4 text-center text-table-sm text-text-3">
                Chưa có drop nào. Gắn lại từ danh sách bên dưới.
              </div>
            ) : (
              <div className="rounded-card border border-surface-3 overflow-hidden">
                <table className="w-full text-table-sm">
                  <thead className="bg-surface-2">
                    <tr className="text-text-3 text-caption">
                      <th className="w-6 py-1.5"></th>
                      <th className="w-8 text-left py-1.5 px-2">#</th>
                      <th className="text-left py-1.5 font-medium">CN</th>
                      <th className="text-right py-1.5 font-medium">SL m²</th>
                      <th className="text-left py-1.5 font-medium pl-3">ETA</th>
                      <th className="text-right py-1.5 font-medium pr-2">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeDrops.map((d, i) => {
                      const isDragging = dragIdx === i;
                      const isOver = overIdx === i && dragIdx !== null && dragIdx !== i;
                      return (
                        <tr
                          key={d.cnCode}
                          draggable
                          onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = "move"; }}
                          onDragOver={(e) => {
                            if (dragIdx === null) return;
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            setOverIdx(i);
                          }}
                          onDragLeave={() => setOverIdx((c) => c === i ? null : c)}
                          onDrop={(e) => {
                            if (dragIdx === null) return;
                            e.preventDefault();
                            move(dragIdx, i);
                            setDragIdx(null); setOverIdx(null);
                          }}
                          onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                          className={cn(
                            "border-t border-surface-3 cursor-move select-none transition-colors",
                            isDragging && "opacity-40",
                            isOver && "bg-primary/10 outline outline-2 outline-primary/60",
                          )}
                        >
                          <td className="py-1.5 text-text-3 text-center">
                            <GripVertical className="h-3.5 w-3.5 inline" />
                          </td>
                          <td className="py-1.5 px-2 text-text-3 tabular-nums">{i + 1}</td>
                          <td className="py-1.5">
                            <span className="font-medium text-text-1">{d.cnName}</span>
                            <span className="text-text-3 ml-1">({d.cnCode})</span>
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-text-1">
                            {d.qtyM2.toLocaleString()}
                          </td>
                          <td className="py-1.5 pl-3 text-text-2 tabular-nums">{d.eta}</td>
                          <td className="py-1.5 pr-2 text-right">
                            <div className="inline-flex items-center gap-0.5">
                              <button
                                type="button"
                                disabled={i === 0}
                                onClick={() => move(i, i - 1)}
                                className="p-1 rounded hover:bg-surface-2 disabled:opacity-30"
                                title="Đẩy lên"
                              ><ArrowUp className="h-3 w-3 text-text-2" /></button>
                              <button
                                type="button"
                                disabled={i === activeDrops.length - 1}
                                onClick={() => move(i, i + 1)}
                                className="p-1 rounded hover:bg-surface-2 disabled:opacity-30"
                                title="Đẩy xuống"
                              ><ArrowDown className="h-3 w-3 text-text-2" /></button>
                              <button
                                type="button"
                                onClick={() => removeDrop(d.cnCode)}
                                className="p-1 rounded hover:bg-danger/10 text-danger ml-0.5"
                                title="Gỡ drop"
                              ><X className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Removed drops (can re-add) ── */}
          {removed.length > 0 && (
            <div>
              <div className="text-table-sm font-semibold text-text-1 mb-1.5">
                Đã gỡ ({removed.length}) — có thể gắn lại
              </div>
              <div className="flex flex-wrap gap-1.5">
                {removed.map((d) => (
                  <button
                    key={d.cnCode}
                    type="button"
                    onClick={() => restoreDrop(d.cnCode)}
                    className="inline-flex items-center gap-1 rounded-full border border-surface-3 bg-surface-2 px-2 py-1 text-[11px] text-text-2 hover:border-primary hover:text-primary transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    <span className="font-medium">{d.cnCode}</span>
                    <span className="text-text-3 tabular-nums">{d.qtyM2.toLocaleString()}m²</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="px-5 py-3 border-t border-surface-3 shrink-0 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            disabled={!dirty}
            className="gap-1"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Đặt lại
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>Đóng</Button>
            <Button onClick={save} disabled={!dirty || after.overflow > 0} className="gap-1">
              <Save className="h-3.5 w-3.5" />
              Lưu thay đổi
              {dirty && (
                <span className={cn(
                  "ml-1 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  dFreight > 0 ? "bg-warning/20 text-warning" : "bg-success/20 text-success",
                )}>
                  {fmtDelta(dFreight, "")}
                </span>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ────────── Sub-components ────────── */

interface PreviewCardProps {
  title: string;
  tone: "muted" | "good" | "warn";
  snap: RecalcOutput;
  drops: DropPoint[];
  dKm?: number;
  dFreight?: number;
  dFill?: number;
  showDelta?: boolean;
}
function PreviewCard({ title, tone, snap, drops, dKm = 0, dFreight = 0, dFill = 0, showDelta }: PreviewCardProps) {
  const fillSev = snap.overflow > 0 ? "danger" : snap.fillPct < 70 ? "warn" : "ok";
  return (
    <div className={cn(
      "rounded-card border p-3 space-y-2",
      tone === "muted" && "border-surface-3 bg-surface-2",
      tone === "good" && "border-success/40 bg-success-bg/40",
      tone === "warn" && "border-warning/40 bg-warning-bg/40",
    )}>
      <div className="flex items-center justify-between">
        <span className="text-caption text-text-3 uppercase font-semibold">{title}</span>
        <span className="text-[10px] text-text-3 tabular-nums">{drops.length} drop</span>
      </div>
      <div className="space-y-1.5">
        <Row
          label="Loại xe"
          value={snap.vehicleLabel}
        />
        <Row
          label="Lấp đầy"
          value={
            <span className={cn("tabular-nums font-semibold",
              fillSev === "ok" && "text-success",
              fillSev === "warn" && "text-warning",
              fillSev === "danger" && "text-danger",
            )}>
              {snap.fillPct}%
              <span className="text-text-3 font-normal ml-1">
                ({snap.fillM2.toLocaleString()}/{snap.capacity.toLocaleString()})
              </span>
            </span>
          }
          delta={showDelta && dFill !== 0 ? (
            <DeltaChip v={dFill} suffix="%" goodWhenPositive />
          ) : undefined}
        />
        <Row
          label="Tổng km"
          value={<span className="tabular-nums font-semibold text-text-1">{snap.km.toLocaleString()} km</span>}
          delta={showDelta && dKm !== 0 ? <DeltaChip v={dKm} suffix=" km" /> : undefined}
        />
        <Row
          label="Cước"
          value={<span className="tabular-nums font-semibold text-text-1">{fmtVnd(snap.freight)}</span>}
          delta={showDelta && dFreight !== 0 ? <DeltaChip v={dFreight} isMoney /> : undefined}
        />
      </div>
    </div>
  );
}

function Row({ label, value, delta }: { label: string; value: React.ReactNode; delta?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-table-sm gap-2">
      <span className="text-text-3 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0 text-right">
        <span className="truncate">{value}</span>
        {delta}
      </div>
    </div>
  );
}

function DeltaChip({
  v, suffix = "", isMoney = false, goodWhenPositive = false,
}: { v: number; suffix?: string; isMoney?: boolean; goodWhenPositive?: boolean }) {
  const positive = v > 0;
  const isGood = goodWhenPositive ? positive : !positive;
  const txt = isMoney ? fmtVndShort(v) : (positive ? "+" : "−") + Math.abs(v).toLocaleString("vi-VN") + suffix;
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums shrink-0",
      isGood ? "bg-success/15 text-success" : "bg-warning/15 text-warning",
    )}>
      {positive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {txt}
    </span>
  );
}
