import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck, Package, AlertTriangle, ArrowRight, Clock, MapPin, Pencil,
  TrendingUp, Link2, GripVertical, ArrowUp, ArrowDown, RotateCcw, Save,
  Shuffle, Check, FileClock, X, ChevronDown, ChevronRight, Info,
  Plus, Scissors, Weight, Sparkles, ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";
import {
  CONTAINER_PLANS, summarizeContainers, containerWeightKg, getPoLines,
  skuWeight, VEHICLE_MAX_WEIGHT_KG, UNSCHEDULED_POS,
  type ContainerPlan, type UnscheduledPo,
} from "@/data/container-plans";
import { RouteMapPreview } from "./RouteMapPreview";
import { KpiImpactGrid } from "./KpiImpactGrid";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  getDraft, saveDraft, clearDraft, formatDraftAge,
  type ContainerEditDraft,
} from "@/lib/container-edit-drafts";
import { ContainerEditPreview } from "@/components/drp/ContainerEditPreview";
import { validateQtyEdit, DECREASE_REASONS, type QtyEditValidation } from "@/data/edit-thresholds";
import { decideFillUp, STRATEGY_LABELS } from "@/data/fill-up-decision";
import { getCandidateDropCns } from "@/data/drop-eligibility";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const fmtVnd = (v: number) => v.toLocaleString("vi-VN") + "₫";
const fmtVndShort = (v: number) => {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M₫";
  if (v >= 1_000) return Math.round(v / 1000) + "K₫";
  return v + "₫";
};

const STATUS_LABEL: Record<ContainerPlan["status"], string> = {
  draft: "Nháp",
  ready: "Sẵn sàng",
  hold: "Giữ chờ",
  in_transit: "Đang vận chuyển",
  delivered: "Đã giao",
};

const STATUS_CLASS: Record<ContainerPlan["status"], string> = {
  draft: "border-surface-3 bg-surface-2 text-text-2",
  ready: "border-info/30 bg-info-bg text-info",
  hold: "border-warning/30 bg-warning-bg text-warning",
  in_transit: "border-primary/30 bg-primary/10 text-primary",
  delivered: "border-success/30 bg-success-bg text-success",
};

const SUGGESTION_CLASS: Record<string, string> = {
  gom_them: "border-warning/40 bg-warning-bg text-warning",
  xuat_ngay: "border-success/40 bg-success-bg text-success",
  tach_xe: "border-info/40 bg-info-bg text-info",
};

/* ════════════════════════════════════════════════════════════════════════════
   §  DropPointsEditor — sắp xếp lại thứ tự giao bằng drag-and-drop
   §  Live recalc: km tăng tỉ lệ với độ lệch khỏi thứ tự gốc (tối ưu).
   §  Cước tỉ lệ thuận với km. Tiết kiệm giảm dần khi route lệch.
   ════════════════════════════════════════════════════════════════════════════ */
import type { DropPoint, ContainerPlan as _CP } from "@/data/container-plans";

function permutationDeviation(order: DropPoint[], baseline: DropPoint[]): number {
  if (baseline.length <= 1) return 0;
  const baseIdx = new Map(baseline.map((d, i) => [d.cnCode, i]));
  let dev = 0;
  order.forEach((d, i) => {
    const orig = baseIdx.get(d.cnCode) ?? i;
    dev += Math.abs(orig - i);
  });
  const maxDev = Math.floor((baseline.length * baseline.length) / 2);
  return maxDev > 0 ? dev / maxDev : 0;
}

function recalcRoute(container: _CP, newOrder: DropPoint[]) {
  const dev = permutationDeviation(newOrder, container.drops);
  const kmFactor = 1 + dev * 0.25;
  const newKm = Math.round(container.distanceKm * kmFactor);
  const newFreight = Math.round(container.freightVnd * kmFactor);
  const deltaKm = newKm - container.distanceKm;
  const deltaFreight = newFreight - container.freightVnd;
  return { newKm, newFreight, deltaKm, deltaFreight, dev };
}

interface DropPointsEditorProps {
  container: _CP;
  onCnClick?: (cnCode: string) => void;
  /** Báo dirty state lên parent (để parent gắn beforeCollapse guard). */
  onDirtyChange?: (containerId: string, dirty: boolean) => void;
  /** Tăng số này từ parent khi user click row đang mở → editor sẽ xử lý confirm. */
  closeRequestNonce?: number;
  /** Editor gọi khi user xác nhận đóng (đã save / đã discard / không dirty). */
  onCloseAllowed?: () => void;
}

function DropPointsEditor({
  container, onCnClick,
  onDirtyChange, closeRequestNonce, onCloseAllowed,
}: DropPointsEditorProps) {
  const [reorderMode, setReorderMode] = useState(false);
  const [order, setOrder] = useState<DropPoint[]>(container.drops);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);

  // ── Draft state ──────────────────────────────────────────────────────────
  const [pendingDraft, setPendingDraft] = useState<ContainerEditDraft | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const autoSaveTimer = useRef<number | null>(null);

  const calc = useMemo(() => recalcRoute(container, order), [container, order]);
  const dirty = useMemo(
    () => order.some((d, i) => d.cnCode !== container.drops[i]?.cnCode),
    [order, container.drops],
  );
  const canReorder = container.drops.length >= 2 &&
    (container.status === "draft" || container.status === "ready" || container.status === "hold");

  // Báo dirty state lên parent (cho beforeCollapse guard ở SmartTable)
  useEffect(() => {
    onDirtyChange?.(container.id, dirty);
    return () => onDirtyChange?.(container.id, false);
  }, [dirty, container.id, onDirtyChange]);

  // Cảnh báo trước khi rời trang/đóng tab khi có dirty changes
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ""; // chrome cần returnValue truthy
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Parent yêu cầu đóng (user click row) — nếu dirty, hiện confirm.
  // Bỏ qua nonce=0 (lần mount đầu, chưa có yêu cầu thực sự).
  useEffect(() => {
    if (!closeRequestNonce) return;
    if (dirty) {
      setCloseConfirmOpen(true);
    } else {
      onCloseAllowed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeRequestNonce]);

  // Mở/đổi container: reset state + check nháp đã lưu trước đó
  useEffect(() => {
    setOrder(container.drops);
    setReorderMode(false);
    setDraftSavedAt(null);
    setPendingDraft(null);
    const existing = getDraft(container.id);
    if (existing && container.drops.length >= 2) {
      const baseline = container.drops.map((d) => d.cnCode).join("|");
      const draftKey = existing.cnOrder.join("|");
      const validCodes = existing.cnOrder.every((c) =>
        container.drops.some((d) => d.cnCode === c),
      );
      const sameLength = existing.cnOrder.length === container.drops.length;
      if (validCodes && sameLength && draftKey !== baseline) {
        setPendingDraft(existing);
      } else if (!validCodes || !sameLength) {
        clearDraft(container.id);
      }
    }
  }, [container]);

  // Auto-save mỗi khi `order` thay đổi trong reorderMode (debounce 500ms)
  useEffect(() => {
    if (!reorderMode || !dirty) return;
    if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = window.setTimeout(() => {
      const d = saveDraft(container.id, order.map((x) => x.cnCode), { auto: true });
      setDraftSavedAt(d.savedAt);
    }, 500);
    return () => {
      if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
    };
  }, [order, reorderMode, dirty, container.id]);

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= order.length) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setOrder(next);
  };

  const reset = () => {
    setOrder(container.drops);
    clearDraft(container.id);
    setDraftSavedAt(null);
    toast.info(`Đã hoàn tác — nháp ${container.id} bị xoá`);
  };

  const save = () => {
    setReorderMode(false);
    clearDraft(container.id);
    setDraftSavedAt(null);
    if (!dirty) return;
    toast.success(
      `Đã lưu thứ tự mới cho ${container.id}: ${order.map((d) => d.cnCode).join(" → ")} ` +
      `(+${calc.deltaKm}km · ${calc.deltaFreight >= 0 ? "+" : ""}${(calc.deltaFreight / 1_000_000).toFixed(1)}M₫)`,
    );
  };

  const saveDraftManual = () => {
    const d = saveDraft(container.id, order.map((x) => x.cnCode), { auto: false });
    setDraftSavedAt(d.savedAt);
    toast.success(`Đã lưu nháp ${container.id} — quay lại tiếp tục bất cứ lúc nào`);
  };

  const restoreDraft = () => {
    if (!pendingDraft) return;
    const map = new Map(container.drops.map((d) => [d.cnCode, d]));
    const restored = pendingDraft.cnOrder
      .map((c) => map.get(c))
      .filter((d): d is DropPoint => !!d);
    if (restored.length === container.drops.length) {
      setOrder(restored);
      setReorderMode(true);
      setDraftSavedAt(pendingDraft.savedAt);
      toast.info(`Đã khôi phục nháp ${container.id} (${formatDraftAge(pendingDraft.savedAt)})`);
    }
    setPendingDraft(null);
  };

  const discardDraft = () => {
    if (!pendingDraft) return;
    clearDraft(container.id);
    setPendingDraft(null);
    toast.info(`Đã bỏ nháp ${container.id}`);
  };

  // ── Close-confirm handlers (gọi từ Dialog "Đóng preview khi có thay đổi") ──
  const handleConfirmSave = () => {
    save();
    setCloseConfirmOpen(false);
    onCloseAllowed?.();
  };
  const handleConfirmDiscard = () => {
    setOrder(container.drops);
    clearDraft(container.id);
    setDraftSavedAt(null);
    setReorderMode(false);
    setCloseConfirmOpen(false);
    toast.info(`Đã bỏ thay đổi cho ${container.id}`);
    onCloseAllowed?.();
  };
  const handleConfirmCancel = () => {
    setCloseConfirmOpen(false);
  };

  const fmtDelta = (v: number) => {
    const sign = v >= 0 ? "+" : "−";
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M₫";
    if (abs >= 1_000) return sign + Math.round(abs / 1000) + "K₫";
    return sign + abs + "₫";
  };

  const dynamicRoute = order.length > 0
    ? `${container.factoryCode.replace(/^NM-/, "")} → ${order.map((d) => d.cnCode).join(" → ")}`
    : container.routeLabel;

  return (
    <div className="space-y-2">
      {/* Banner nháp đã lưu trước đó — chờ user quyết định */}
      {pendingDraft && !reorderMode && (
        <div className="rounded-card border border-info/40 bg-info-bg px-3 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-table-sm text-info min-w-0">
            <FileClock className="h-4 w-4 shrink-0" />
            <span className="min-w-0">
              <strong>Có nháp chưa lưu</strong> cho {container.id} —{" "}
              <span className="font-mono">
                {container.factoryCode.replace(/^NM-/, "")} → {pendingDraft.cnOrder.join(" → ")}
              </span>
              <span className="text-text-3 ml-1">({formatDraftAge(pendingDraft.savedAt)})</span>
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={restoreDraft}
              className="inline-flex items-center gap-1 rounded-button bg-info text-info-foreground px-2.5 py-1 text-[11px] font-semibold hover:bg-info/90"
            >
              <RotateCcw className="h-3 w-3" /> Tiếp tục chỉnh
            </button>
            <button
              type="button"
              onClick={discardDraft}
              className="inline-flex items-center gap-1 rounded-button border border-info/30 bg-surface-1 px-2 py-1 text-[11px] font-medium text-text-2 hover:text-text-1"
              title="Bỏ nháp"
            >
              <X className="h-3 w-3" /> Bỏ
            </button>
          </div>
        </div>
      )}

      {/* Bản đồ lộ trình — luôn hiện, panel "Sau khi sửa" chỉ bật khi reorderMode */}
      <RouteMapPreview
        factoryCode={container.factoryCode}
        baselineCnCodes={container.drops.map((d) => d.cnCode)}
        currentCnCodes={order.map((d) => d.cnCode)}
        showProjected={reorderMode}
      />

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-caption text-text-3 font-medium flex items-center gap-2">
          <span>Điểm giao ({order.length})</span>
          {reorderMode && draftSavedAt && (
            <span className="inline-flex items-center gap-1 text-[10px] text-text-3">
              <FileClock className="h-3 w-3" />
              Nháp tự lưu · {formatDraftAge(draftSavedAt)}
            </span>
          )}
        </div>
        {canReorder && (
          <div className="flex items-center gap-1">
            {reorderMode && dirty && (
              <>
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-1 rounded-button border border-surface-3 bg-surface-1 px-2 py-1 text-[11px] font-medium text-text-2 hover:text-text-1"
                >
                  <RotateCcw className="h-3 w-3" /> Hoàn tác
                </button>
                <button
                  type="button"
                  onClick={saveDraftManual}
                  className="inline-flex items-center gap-1 rounded-button border border-info/40 bg-info-bg text-info px-2 py-1 text-[11px] font-medium hover:bg-info hover:text-info-foreground transition-colors"
                  title="Lưu nháp để quay lại tiếp tục sau"
                >
                  <FileClock className="h-3 w-3" /> Lưu nháp
                </button>
              </>
            )}
            {reorderMode ? (
              <button
                type="button"
                onClick={save}
                className="inline-flex items-center gap-1 rounded-button bg-primary text-primary-foreground px-2.5 py-1 text-[11px] font-semibold hover:bg-primary/90"
              >
                <Save className="h-3 w-3" /> Lưu thứ tự
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setReorderMode(true)}
                className="inline-flex items-center gap-1 rounded-button border border-primary/40 bg-primary/5 text-primary px-2.5 py-1 text-[11px] font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                title="Bật chế độ kéo-thả để sắp xếp lại thứ tự giao"
              >
                <Shuffle className="h-3 w-3" /> Sắp xếp lại thứ tự giao
              </button>
            )}
          </div>
        )}
      </div>

      {/* KPI Impact Grid — luôn hiện trong drill-down, flash khi value đổi */}
      <KpiImpactGrid
        baseFillPct={container.fillPct}
        baseKm={container.distanceKm}
        baseFreightVnd={container.freightVnd}
        newFillPct={container.fillPct /* fill không đổi vì cùng SKU/qty */}
        newKm={calc.newKm}
        newFreightVnd={calc.newFreight}
        editing={reorderMode}
        dirty={dirty}
      />

      {/* Dòng route gọn — chỉ trong reorderMode để biết chuỗi đang preview */}
      {reorderMode && (
        <div className={cn(
          "rounded-card border px-3 py-1.5 text-table-sm flex items-center gap-2 transition-colors",
          dirty
            ? calc.deltaKm > 0
              ? "border-warning/40 bg-warning-bg/40"
              : "border-info/40 bg-info-bg"
            : "border-surface-3 bg-surface-2",
        )}>
          <MapPin className="h-3.5 w-3.5 text-text-3 shrink-0" />
          <span className="font-mono text-text-1 truncate flex-1">{dynamicRoute}</span>
          {!dirty && (
            <span className="inline-flex items-center gap-1 text-[10px] text-text-3 shrink-0">
              <Check className="h-3 w-3 text-success" /> Thứ tự gốc (tối ưu)
            </span>
          )}
        </div>
      )}

      {/* Drop points table */}
      <table className="w-full text-table-sm">
        <thead>
          <tr className="text-text-3 text-caption border-b border-surface-3">
            {reorderMode && <th className="w-6"></th>}
            <th className="text-left py-1 font-medium w-8">#</th>
            <th className="text-left py-1 font-medium">CN</th>
            <th className="text-right py-1 font-medium">SL m²</th>
            {!reorderMode && <th className="text-left py-1 font-medium pl-3">SKU</th>}
            <th className="text-left py-1 font-medium">ETA</th>
            <th className="text-right py-1 font-medium">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {order.map((d, i) => {
            const isDragging = dragIdx === i;
            const isOver = overIdx === i && dragIdx !== null && dragIdx !== i;
            return (
              <tr
                key={d.cnCode}
                draggable={reorderMode}
                onDragStart={(e) => {
                  if (!reorderMode) return;
                  setDragIdx(i);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  if (!reorderMode || dragIdx === null) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setOverIdx(i);
                }}
                onDragLeave={() => setOverIdx((cur) => (cur === i ? null : cur))}
                onDrop={(e) => {
                  if (!reorderMode || dragIdx === null) return;
                  e.preventDefault();
                  move(dragIdx, i);
                  setDragIdx(null);
                  setOverIdx(null);
                }}
                onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                className={cn(
                  "border-b border-surface-3/40 transition-colors",
                  reorderMode && "cursor-move select-none",
                  isDragging && "opacity-40",
                  isOver && "bg-primary/10 outline outline-2 outline-primary/60",
                )}
              >
                {reorderMode && (
                  <td className="py-1.5 text-text-3">
                    <GripVertical className="h-3.5 w-3.5" />
                  </td>
                )}
                <td className="py-1.5 text-text-3 tabular-nums">{i + 1}</td>
                <td className="py-1.5">
                  {reorderMode ? (
                    <span className="font-medium text-text-1">{d.cnName}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onCnClick?.(d.cnCode)}
                      className="text-primary hover:underline font-medium"
                      title="Xem phân bổ CN này"
                    >
                      {d.cnName}
                    </button>
                  )}
                  <span className="text-text-3 ml-1">({d.cnCode})</span>
                </td>
                <td className="py-1.5 text-right tabular-nums text-text-1">
                  {d.qtyM2.toLocaleString()}
                </td>
                {!reorderMode && (
                  <td className="py-1.5 pl-3 text-text-2">
                    {d.skuLines.map((s) => `${s.sku} ${s.qty}m²`).join(" · ")}
                  </td>
                )}
                <td className="py-1.5 text-text-2 tabular-nums">{d.eta}</td>
                <td className="py-1.5 text-right">
                  {reorderMode ? (
                    <div className="inline-flex items-center gap-0.5">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => move(i, i - 1)}
                        className="p-1 rounded hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Đẩy lên"
                      >
                        <ArrowUp className="h-3 w-3 text-text-2" />
                      </button>
                      <button
                        type="button"
                        disabled={i === order.length - 1}
                        onClick={() => move(i, i + 1)}
                        className="p-1 rounded hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Đẩy xuống"
                      >
                        <ArrowDown className="h-3 w-3 text-text-2" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toast.info(`Gỡ ${d.cnCode} khỏi ${container.id}`)}
                      className="text-[11px] text-danger hover:underline"
                    >
                      Gỡ
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Confirm khi đóng preview với thay đổi chưa lưu */}
      <Dialog
        open={closeConfirmOpen}
        onOpenChange={(open) => { if (!open) handleConfirmCancel(); }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Có thay đổi chưa lưu cho {container.id}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-table-sm">
            <p className="text-text-2">
              Bạn vừa sắp xếp lại thứ tự giao nhưng chưa bấm <strong>Lưu thứ tự</strong>.
              Đóng bây giờ sẽ mất thay đổi này.
            </p>
            <div className="rounded-card border border-surface-3 bg-surface-2 px-3 py-2 space-y-1">
              <div className="flex items-center justify-between text-text-3 text-caption">
                <span>Thứ tự mới</span>
                <span className="font-mono text-text-1">{dynamicRoute}</span>
              </div>
              <div className="flex items-center justify-between text-text-3 text-caption">
                <span>Tác động</span>
                <span className="tabular-nums">
                  <span className={cn(
                    "font-semibold",
                    calc.deltaKm > 0 ? "text-warning" : "text-success",
                  )}>
                    {calc.deltaKm > 0 ? "+" : ""}{calc.deltaKm}km
                  </span>
                  <span className="text-text-3 mx-1">·</span>
                  <span className={cn(
                    "font-semibold",
                    calc.deltaFreight > 0 ? "text-warning" : "text-success",
                  )}>
                    {fmtDelta(calc.deltaFreight)}
                  </span>
                </span>
              </div>
            </div>
            <p className="text-caption text-text-3">
              💡 Nháp đã được tự động lưu — có thể quay lại tiếp tục sau.
            </p>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="ghost"
              onClick={handleConfirmCancel}
              className="text-text-2"
            >
              Tiếp tục chỉnh
            </Button>
            <Button
              variant="outline"
              onClick={handleConfirmDiscard}
              className="border-danger/40 text-danger hover:bg-danger hover:text-danger-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Hủy thay đổi
            </Button>
            <Button
              onClick={handleConfirmSave}
              className="bg-primary text-primary-foreground"
            >
              <Save className="h-3.5 w-3.5 mr-1" /> Lưu & Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface Props {
  /** Cross-link: click CN badge → switch sang tab Phân bổ + highlight CN */
  onCnClick?: (cnCode: string) => void;
  /** External highlight target (TP-xxx) khi user vừa cross-link từ tab Phân bổ */
  highlightId?: string | null;
}

export function ContainerPlanningSection({ onCnClick, highlightId }: Props) {
  const navigate = useNavigate();
  const summary = summarizeContainers(CONTAINER_PLANS);

  const [editing, setEditing] = useState<ContainerPlan | null>(null);

  // ── Dirty tracking per container (cho close-confirm guard) ──
  const dirtyMap = useRef<Map<string, boolean>>(new Map());
  const [closeRequests, setCloseRequests] = useState<Record<string, number>>({});
  const [collapseSignal, setCollapseSignal] =
    useState<{ id: string; nonce: number } | null>(null);

  const handleDirtyChange = (containerId: string, dirty: boolean) => {
    if (dirty) dirtyMap.current.set(containerId, true);
    else dirtyMap.current.delete(containerId);
  };

  // Trả false → chặn collapse, editor sẽ hiển thị confirm Dialog
  const beforeCollapse = (row: ContainerPlan): boolean => {
    if (!dirtyMap.current.get(row.id)) return true;
    setCloseRequests((m) => ({ ...m, [row.id]: (m[row.id] ?? 0) + 1 }));
    return false;
  };

  // Editor xác nhận xong (Lưu hoặc Hủy) → ra lệnh SmartTable collapse row
  const handleCloseAllowed = (containerId: string) => {
    dirtyMap.current.delete(containerId);
    setCollapseSignal({ id: containerId, nonce: Date.now() });
  };

/* ════════════════════════════════════════════════════════════════════════════
   §  ① LogicExplainer — collapsible 4-bước đóng container
   ════════════════════════════════════════════════════════════════════════════ */
function LogicExplainer() {
  const [open, setOpen] = useState(false);
  const steps = [
    { n: "❶", title: "GỘP", desc: "PO cùng nhà máy + cùng hướng + cùng ngày giao → ghép vào 1 chuyến." },
    { n: "❷", title: "CHỌN XE", desc: "Ưu tiên xe lớn nhất (40ft → 20ft → Xe 10T). Greedy fill từ trên xuống." },
    { n: "❸", title: "ROUND UP", desc: "Khoảng trống < 15% MOQ → gợi ý thêm SKU bán chạy để đầy chuyến." },
    { n: "❹", title: "CÂN TRỌNG TẢI", desc: "Mỗi chuyến tối đa 28T. Vượt → tự động tách 2 chuyến." },
  ];
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button type="button"
          className="w-full flex items-center justify-between rounded-card border border-info/30 bg-info-bg px-3 py-2 text-table-sm text-info hover:bg-info-bg/70 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            <strong>4 bước đóng container</strong>
            <span className="text-info/70 hidden sm:inline">— hệ thống tối ưu thế nào?</span>
          </span>
          <span className="inline-flex items-center gap-1 text-caption font-medium">
            {open ? <>Thu gọn <ChevronDown className="h-3.5 w-3.5" /></> : <>Xem <ChevronRight className="h-3.5 w-3.5" /></>}
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 rounded-card border border-info/20 bg-surface-1 p-3 space-y-2">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {steps.map((s) => (
              <div key={s.n} className="rounded-card border border-surface-3 bg-surface-2 p-2.5">
                <div className="flex items-center gap-1.5 text-text-1 font-semibold text-table-sm">
                  <span>{s.n}</span><span>{s.title}</span>
                </div>
                <div className="text-caption text-text-2 mt-1 leading-snug">{s.desc}</div>
              </div>
            ))}
          </div>
          <div className="text-caption text-text-3 border-t border-surface-3 pt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <strong className="text-text-2">Ưu tiên:</strong>
            <span>Fill% cao</span><ArrowRight className="h-3 w-3" />
            <span>Ít chuyến</span><ArrowRight className="h-3 w-3" />
            <span>Ít cước</span><ArrowRight className="h-3 w-3" />
            <span>Đúng SLA</span>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   §  Drill Zone A — PO lines bên trong container (editable qty)
   ════════════════════════════════════════════════════════════════════════════ */
function PoLinesEditor({ container }: { container: ContainerPlan }) {
  const initial = useMemo(() => getPoLines(container), [container]);
  const [lines, setLines] = useState(initial);
  // Track original qty per line index để validate
  const originalQtys = useMemo(() => initial.map((l) => l.qtyM2), [initial]);
  const [editValidations, setEditValidations] = useState<Record<number, QtyEditValidation | null>>({});
  const [decreaseReasons, setDecreaseReasons] = useState<Record<number, string>>({});
  useEffect(() => {
    setLines(getPoLines(container));
    setEditValidations({});
    setDecreaseReasons({});
  }, [container]);

  const totalM2 = lines.reduce((a, l) => a + l.qtyM2, 0);
  const totalKg = lines.reduce((a, l) => a + l.qtyM2 * skuWeight(l.sku), 0);
  const remainM2 = container.capacityM2 - totalM2;
  const remainKg = VEHICLE_MAX_WEIGHT_KG - totalKg;
  const overWeight = totalKg > VEHICLE_MAX_WEIGHT_KG;
  const nearLimit = !overWeight && totalKg > VEHICLE_MAX_WEIGHT_KG * 0.91;

  // Mock NM available qty (heuristic: 150% original cho mỗi line)
  const nmAvailableFor = (idx: number) => Math.round(originalQtys[idx] * 1.5);
  // Mock SKU MOQ
  const moqFor = () => 500;

  const editQty = (idx: number, v: number) => {
    const newQty = Math.max(0, v);
    const orig = originalQtys[idx];
    const sku = lines[idx].sku;
    // Tổng container weight TRỪ original line này (để validate độc lập)
    const otherLinesWeight = lines.reduce(
      (a, l, i) => i === idx ? a : a + l.qtyM2 * skuWeight(l.sku), 0,
    );
    const otherLinesM2 = lines.reduce(
      (a, l, i) => i === idx ? a : a + l.qtyM2, 0,
    );
    const validation = validateQtyEdit({
      originalQty: orig,
      newQty,
      sku,
      containerCurrentWeightKg: otherLinesWeight,
      containerCapacityM2: container.capacityM2,
      containerCurrentFillM2: otherLinesM2,
      nmAvailableQty: nmAvailableFor(idx),
      skuMoq: moqFor(),
    });
    // Nếu BLOCK → không cho update
    if (validation.severity === "block") {
      setEditValidations((m) => ({ ...m, [idx]: validation }));
      toast.error(`Không thể cập nhật: ${validation.message}`);
      return;
    }
    setLines((arr) => arr.map((l, i) => i === idx ? { ...l, qtyM2: newQty } : l));
    setEditValidations((m) => ({ ...m, [idx]: validation }));
  };
  const removePo = (idx: number) => {
    const removed = lines[idx];
    setLines((arr) => arr.filter((_, i) => i !== idx));
    setEditValidations((m) => { const c = { ...m }; delete c[idx]; return c; });
    toast.info(`Đã gỡ ${removed.poNumber} (${removed.sku}) — chuyển sang "PO chưa xếp"`);
  };

  // Drop eligibility cho "Thêm drop"
  const currentCns = useMemo(() => Array.from(new Set(lines.map((l) => l.cnCode))), [lines]);
  const baseCn = currentCns[0];
  const candidates = useMemo(
    () => baseCn ? getCandidateDropCns(container.factoryCode, baseCn, currentCns) : [],
    [container.factoryCode, baseCn, currentCns],
  );
  const eligibleCandidates = candidates.filter((c) => c.eligible);
  const ineligibleCandidates = candidates.filter((c) => !c.eligible);

  return (
    <div className="rounded-card border border-surface-3 bg-surface-1 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-table-sm font-semibold text-text-1 flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5 text-primary" /> PO trong container
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]"
            onClick={() => toast.info("Thêm PO — chọn từ danh sách PO chưa xếp")}>
            <Plus className="h-3 w-3 mr-0.5" /> Thêm PO
          </Button>
          {/* Thêm drop — dropdown filter theo eligibility */}
          {baseCn && candidates.length > 0 && (
            <Select onValueChange={(cn) => {
              const pair = candidates.find((c) => c.cn2 === cn);
              if (!pair) return;
              if (!pair.eligible) {
                toast.error(`Không thể ghép ${cn}: ${pair.reason}`);
                return;
              }
              toast.success(
                `Đã thêm ${cn} vào chuyến (detour +${pair.detourKm}km, ` +
                `tiết kiệm ~${((pair.estSavingVnd ?? 0) / 1_000_000).toFixed(1)}M₫)`,
              );
            }}>
              <SelectTrigger className="h-6 px-2 text-[11px] w-auto gap-1 border-0 bg-transparent hover:bg-surface-2">
                <Plus className="h-3 w-3" /> <span>Thêm drop</span>
              </SelectTrigger>
              <SelectContent className="max-w-[320px]">
                {eligibleCandidates.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[10px] uppercase font-semibold text-success">
                      ✓ Có thể ghép ({eligibleCandidates.length})
                    </div>
                    {eligibleCandidates.map((c) => (
                      <SelectItem key={c.cn2} value={c.cn2} className="text-[11px]">
                        <div className="flex flex-col gap-0.5 py-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-semibold">{c.cn2}</span>
                            <span className="text-text-3">+{c.detourKm}km</span>
                            {c.estSavingVnd && (
                              <span className="text-success text-[10px] font-semibold">
                                tiết kiệm ~{((c.estSavingVnd) / 1_000_000).toFixed(1)}M₫
                              </span>
                            )}
                          </div>
                          {c.direction && (
                            <div className="text-text-3 text-[10px] italic">{c.direction}</div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
                {ineligibleCandidates.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[10px] uppercase font-semibold text-text-3 mt-1">
                      ✗ Không ghép được ({ineligibleCandidates.length})
                    </div>
                    {ineligibleCandidates.map((c) => (
                      <SelectItem key={c.cn2} value={c.cn2} disabled className="text-[11px] opacity-50">
                        <div className="flex flex-col gap-0.5 py-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono line-through">{c.cn2}</span>
                            <span className="text-text-3">+{c.detourKm}km</span>
                          </div>
                          <div className="text-danger text-[10px]">{c.reason}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <table className="w-full text-table-sm">
        <thead>
          <tr className="text-text-3 text-caption border-b border-surface-3">
            <th className="text-left py-1 font-medium">PO#</th>
            <th className="text-left py-1 font-medium">CN</th>
            <th className="text-left py-1 font-medium">SKU</th>
            <th className="text-right py-1 font-medium">SL m²</th>
            <th className="text-right py-1 font-medium">KG</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => {
            const kg = l.qtyM2 * skuWeight(l.sku);
            const v = editValidations[i];
            const orig = originalQtys[i];
            const changed = l.qtyM2 !== orig;
            const sevColor =
              v?.severity === "warn" ? "border-warning/60 bg-warning-bg/50 text-warning" :
              v?.severity === "require_reason" ? "border-warning/60 bg-warning-bg/60 text-warning" :
              v?.severity === "block" ? "border-danger/60 bg-danger-bg/50 text-danger" :
              changed ? "border-info/60 bg-info-bg/40 text-info" :
              "border-surface-3 bg-surface-1 text-text-1";
            return (
              <Fragment key={`${l.poNumber}-${l.sku}-${i}`}>
                <tr className="border-b border-surface-3/40">
                  <td className="py-1.5 font-mono text-text-1 text-[11px]">{l.poNumber}</td>
                  <td className="py-1.5 text-text-2">{l.cnCode}</td>
                  <td className="py-1.5 text-text-2 font-mono text-[11px]">{l.sku}</td>
                  <td className="py-1.5 text-right">
                    <div className="inline-flex flex-col items-end gap-0.5">
                      <input type="number" value={l.qtyM2}
                        onChange={(e) => editQty(i, Number(e.target.value))}
                        className={cn(
                          "w-20 h-6 px-1.5 text-right tabular-nums rounded-button border focus:outline-none focus:ring-1 focus:ring-primary/40",
                          sevColor,
                        )}
                      />
                      {changed && (
                        <span className="text-[10px] text-text-3 tabular-nums">
                          gốc: {orig.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-text-2">{kg.toLocaleString()}</td>
                  <td className="py-1.5 text-right">
                    <button type="button" onClick={() => removePo(i)}
                      className="text-danger hover:bg-danger/10 rounded p-0.5" title="Gỡ PO">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
                {v && v.severity !== "ok" && (
                  <tr key={`${l.poNumber}-${i}-msg`} className="border-b border-surface-3/40">
                    <td colSpan={6} className="pb-2 pl-2">
                      <div className={cn(
                        "rounded-card border px-2.5 py-1.5 text-[11px] flex items-start gap-1.5",
                        v.severity === "block" && "border-danger/40 bg-danger-bg text-danger",
                        v.severity === "warn" && "border-warning/40 bg-warning-bg text-warning",
                        v.severity === "require_reason" && "border-warning/40 bg-warning-bg text-warning",
                      )}>
                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                        <div className="flex-1 space-y-1">
                          <div>{v.message}</div>
                          {v.severity === "require_reason" && (
                            <Select
                              value={decreaseReasons[i] ?? ""}
                              onValueChange={(val) =>
                                setDecreaseReasons((m) => ({ ...m, [i]: val }))
                              }
                            >
                              <SelectTrigger className="h-6 text-[11px] w-full max-w-xs">
                                <SelectValue placeholder="Chọn lý do giảm…" />
                              </SelectTrigger>
                              <SelectContent>
                                {DECREASE_REASONS.map((r) => (
                                  <SelectItem key={r.value} value={r.value} className="text-[11px]">
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-surface-3 font-semibold text-text-1">
            <td colSpan={3} className="py-1.5 text-right text-text-3">TỔNG</td>
            <td className="py-1.5 text-right tabular-nums">{totalM2.toLocaleString()}m²</td>
            <td className={cn("py-1.5 text-right tabular-nums", overWeight && "text-danger", nearLimit && "text-warning")}>
              {totalKg.toLocaleString()}kg
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      <div className="flex flex-wrap items-center justify-between gap-2 text-caption">
        <div className="flex items-center gap-3">
          <span className="text-text-3">
            Capacity: <span className="text-text-1 tabular-nums font-medium">{container.capacityM2.toLocaleString()}m²</span> /{" "}
            <span className="text-text-1 tabular-nums font-medium">{VEHICLE_MAX_WEIGHT_KG.toLocaleString()}kg</span>
          </span>
          <span className="text-text-3">·</span>
          <span className={cn("tabular-nums font-medium",
            remainM2 < 0 || remainKg < 0 ? "text-danger" : "text-success")}>
            Còn: {Math.max(0, remainM2).toLocaleString()}m² ({Math.max(0, remainKg).toLocaleString()}kg)
          </span>
        </div>
        {overWeight && (
          <span className="inline-flex items-center gap-1 rounded-full border border-danger/40 bg-danger-bg px-2 py-0.5 text-[11px] font-semibold text-danger">
            <AlertTriangle className="h-3 w-3" /> Vượt 28T! Giảm hoặc tách chuyến.
          </span>
        )}
        {nearLimit && (
          <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning-bg px-2 py-0.5 text-[11px] font-semibold text-warning">
            <Weight className="h-3 w-3" /> Gần trọng tải tối đa
          </span>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   §  Drill Zone B — Round-up gợi ý
   ════════════════════════════════════════════════════════════════════════════ */
function RoundUpSuggestion({ container }: { container: ContainerPlan }) {
  const totalM2 = container.fillM2;
  const moq = container.factoryCode === "NM-DT" ? 3000 :
              container.factoryCode === "NM-VGR" ? 2500 : 2000;
  const gap = moq - totalM2;
  const gapPct = (gap / moq) * 100;
  const remainCap = container.capacityM2 - totalM2;
  const totalKg = containerWeightKg(container);
  const remainKg = VEHICLE_MAX_WEIGHT_KG - totalKg;

  if (gap <= 0) {
    return (
      <div className="rounded-card border border-success/30 bg-success-bg/50 p-2.5 text-table-sm text-success flex items-center gap-2">
        <Check className="h-4 w-4 shrink-0" />
        <span>Đã đạt MOQ {moq.toLocaleString()}m² — không cần round-up.</span>
      </div>
    );
  }
  if (gapPct >= 15) {
    return (
      <div className="rounded-card border border-warning/30 bg-warning-bg/50 p-2.5 text-table-sm text-warning flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          Gap {gap.toLocaleString()}m² ({gapPct.toFixed(0)}% MOQ) <strong>quá lớn</strong> — đặt PO riêng thay vì round-up.
        </span>
      </div>
    );
  }

  const fillAfter = Math.min(100, ((totalM2 + Math.min(gap, remainCap)) / container.capacityM2) * 100);

  return (
    <div className="rounded-card border border-info/30 bg-info-bg/50 p-3 space-y-2">
      <div className="flex items-center gap-2 text-table-sm font-semibold text-info">
        <Sparkles className="h-3.5 w-3.5" /> Round-up gợi ý
      </div>
      <div className="text-caption text-text-2 leading-snug">
        MOQ {container.factoryName}: <strong>{moq.toLocaleString()}m²</strong>.
        Hiện: <strong>{totalM2.toLocaleString()}m²</strong> (thiếu {gap.toLocaleString()}m²).
        Container còn chứa được: <strong>{remainCap.toLocaleString()}m²</strong> (weight còn {remainKg.toLocaleString()}kg).
      </div>
      <div className="text-caption text-text-1">
        Gợi ý: +{Math.round(gap * 0.6)} GA-300 + {Math.round(gap * 0.4)} GA-600
        → fill <strong className="text-success">{fillAfter.toFixed(0)}%</strong>
      </div>
      <div className="flex items-center gap-1.5">
        <Button size="sm" className="h-7 px-2.5 text-[11px]"
          onClick={() => toast.success(`Đã round-up ${container.id} — fill ${fillAfter.toFixed(0)}%`)}>
          <Check className="h-3 w-3 mr-1" /> Round up
        </Button>
        <Button size="sm" variant="outline" className="h-7 px-2.5 text-[11px]"
          onClick={() => toast.info("Chọn SKU thủ công — coming soon")}>
          Chọn SKU khác
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-text-3"
          onClick={() => toast.info("Bỏ qua round-up — giữ nguyên kế hoạch")}>
          Bỏ qua
        </Button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   §  ③ UnscheduledPosSection — PO chưa xếp
   ════════════════════════════════════════════════════════════════════════════ */
function UnscheduledPosSection({ pos }: { pos: UnscheduledPo[] }) {
  const [open, setOpen] = useState(true);
  if (pos.length === 0) {
    return (
      <div className="rounded-card border border-success/30 bg-success-bg/40 px-3 py-2 text-table-sm text-success flex items-center gap-2">
        <Check className="h-4 w-4" /> Tất cả PO đã được xếp vào chuyến.
      </div>
    );
  }
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button type="button"
          className="w-full flex items-center justify-between rounded-card border border-warning/30 bg-warning-bg/50 px-3 py-2 text-table-sm text-warning hover:bg-warning-bg transition-colors"
        >
          <span className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            <strong>{pos.length} PO chưa xếp</strong>
            <span className="text-warning/70 hidden sm:inline">— cần xử lý trước khi duyệt</span>
          </span>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 rounded-card border border-surface-3 bg-surface-1 overflow-hidden">
          <table className="w-full text-table-sm">
            <thead className="bg-surface-2">
              <tr className="text-text-3 text-caption">
                <th className="text-left px-3 py-1.5 font-medium">PO#</th>
                <th className="text-left px-3 py-1.5 font-medium">NM</th>
                <th className="text-left px-3 py-1.5 font-medium">CN</th>
                <th className="text-left px-3 py-1.5 font-medium">SKU</th>
                <th className="text-right px-3 py-1.5 font-medium">SL</th>
                <th className="text-left px-3 py-1.5 font-medium">Lý do</th>
                <th className="text-right px-3 py-1.5 font-medium">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {pos.map((p) => (
                <tr key={p.poNumber} className="border-t border-surface-3/60">
                  <td className="px-3 py-1.5 font-mono text-text-1 text-[11px]">{p.poNumber}</td>
                  <td className="px-3 py-1.5 text-text-2">{p.factoryName}</td>
                  <td className="px-3 py-1.5 text-text-2">{p.cnCode}</td>
                  <td className="px-3 py-1.5 text-text-2 font-mono text-[11px]">{p.sku}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-text-1">{p.qtyM2.toLocaleString()}m²</td>
                  <td className="px-3 py-1.5 text-caption text-text-3">{p.reason}</td>
                  <td className="px-3 py-1.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]"
                        onClick={() => toast.success(`Đã tạo chuyến mới cho ${p.poNumber}`)}>
                        Tạo cont
                      </Button>
                      {p.suggestedContainerId && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] text-primary"
                          onClick={() => toast.success(`Đã ghép ${p.poNumber} vào ${p.suggestedContainerId}`)}>
                          Ghép {p.suggestedContainerId}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}


  // Khi highlightId đổi (cross-link arrive) → flash row & scroll
  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`container-row-${highlightId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-primary", "ring-offset-2", "bg-primary/5");
    const t = setTimeout(() => {
      el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "bg-primary/5");
    }, 1600);
    return () => clearTimeout(t);
  }, [highlightId]);

  const cols: SmartTableColumn<ContainerPlan>[] = [
    {
      key: "id", label: "Chuyến", width: 90,
      render: (r) => (
        <span id={`container-row-${r.id}`} className="font-mono text-text-1 font-semibold">
          {r.id}
        </span>
      ),
      accessor: (r) => r.id,
    },
    {
      key: "vehicle", label: "Loại xe", width: 80,
      render: (r) => <span className="text-text-2">{r.vehicle}</span>,
      accessor: (r) => r.vehicle,
      filter: "enum",
      filterOptions: [
        { value: "40ft", label: "40ft" },
        { value: "20ft", label: "20ft" },
        { value: "Xe10T", label: "Xe10T" },
      ],
    },
    {
      key: "factory", label: "Nhà máy", width: 110,
      render: (r) => <span className="text-text-1">{r.factoryName}</span>,
      accessor: (r) => r.factoryName,
    },
    {
      key: "route", label: "Tuyến", minWidth: 220,
      render: (r) => (
        <div className="flex items-center gap-1.5 text-text-1">
          <MapPin className="h-3 w-3 text-text-3 shrink-0" />
          <span className="truncate">{r.routeLabel}</span>
          {r.consolidated && (
            <span className="ml-1 inline-flex items-center gap-0.5 rounded-full border border-warning/40 bg-warning-bg px-1.5 py-0.5 text-[10px] font-semibold text-warning">
              <Link2 className="h-2.5 w-2.5" /> GHÉP
            </span>
          )}
        </div>
      ),
    },
    {
      key: "fill", label: "Lấp đầy", width: 100, align: "right",
      render: (r) => {
        const sev = r.fillPct < 70 ? "danger" : r.fillPct < 85 ? "warning" : "success";
        return (
          <div className="flex items-center justify-end gap-1.5 tabular-nums">
            {r.fillPct < 70 && <AlertTriangle className="h-3 w-3 text-warning" />}
            <span className={cn("font-semibold",
              sev === "success" && "text-success",
              sev === "warning" && "text-warning",
              sev === "danger" && "text-danger")}>
              {r.fillPct}%
            </span>
          </div>
        );
      },
      accessor: (r) => r.fillPct,
      numeric: true,
    },
    {
      key: "cnpo", label: "CN / PO", minWidth: 200,
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.drops.map((d) => (
            <button
              key={d.cnCode}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onCnClick) {
                  onCnClick(d.cnCode);
                  toast.info(`Chuyển sang Phân bổ — ${d.cnCode}`);
                }
              }}
              title={`Click để xem phân bổ ${d.cnName}`}
              className="inline-flex items-center gap-0.5 rounded-full border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              {d.cnCode}
            </button>
          ))}
          <span className="text-text-3 text-[11px] self-center ml-1">
            ({r.poIds.length} PO)
          </span>
        </div>
      ),
    },
    {
      key: "weight", label: "Trọng lượng", width: 110, align: "right",
      render: (r) => {
        const kg = containerWeightKg(r);
        const tons = (kg / 1000).toFixed(1).replace(/\.0$/, "");
        const over = kg > VEHICLE_MAX_WEIGHT_KG;
        const near = !over && kg > VEHICLE_MAX_WEIGHT_KG * 0.91;
        return (
          <div className="flex items-center justify-end gap-1 tabular-nums">
            {over && <AlertTriangle className="h-3 w-3 text-danger" />}
            <span className={cn(
              "font-medium",
              over && "text-danger font-bold",
              near && "text-warning",
            )}>
              {tons}T / 28T
            </span>
          </div>
        );
      },
      accessor: (r) => containerWeightKg(r),
      numeric: true,
    },
    {
      key: "freight", label: "Cước", width: 100, align: "right",
      render: (r) => (
        <div className="text-right tabular-nums">
          <div className="text-text-1 font-medium">{fmtVndShort(r.freightVnd)}</div>
          {r.savingVnd > 0 && (
            <div className="text-[10px] text-success">−{fmtVndShort(r.savingVnd)}</div>
          )}
        </div>
      ),
      accessor: (r) => r.freightVnd,
      numeric: true,
    },
    {
      key: "status", label: "Trạng thái", width: 130,
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className={cn("inline-flex items-center self-start rounded-full border px-1.5 py-0.5 text-[10px] font-semibold",
            STATUS_CLASS[r.status])}>
            {STATUS_LABEL[r.status]}
          </span>
          {r.status === "hold" && r.holdDeadline && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-warning">
              <Clock className="h-2.5 w-2.5" /> {r.holdDeadline}
            </span>
          )}
        </div>
      ),
      accessor: (r) => STATUS_LABEL[r.status],
      filter: "enum",
      filterOptions: Object.entries(STATUS_LABEL).map(([value, label]) => ({ value: label, label })),
    },
    {
      key: "actions", label: "Hành động", width: 90, align: "right",
      render: (r) => {
        const editable = r.status === "draft" || r.status === "ready" || r.status === "hold";
        return editable ? (
          <Button
            variant="ghost" size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={(e) => { e.stopPropagation(); setEditing(r); }}
          >
            <Pencil className="h-3 w-3 mr-1" /> Sửa
          </Button>
        ) : (
          <span className="text-text-3 text-[11px]">—</span>
        );
      },
    },
  ];

  // Sort: fill ASC (thấp lên đầu) — farmer thấy chuyến cần xử lý trước
  const sortedPlans = useMemo(
    () => [...CONTAINER_PLANS].sort((a, b) => a.fillPct - b.fillPct),
    [],
  );

  const overloadCount = summary.overweight ?? 0;
  const holdCount = CONTAINER_PLANS.filter((p) => p.status === "hold").length;
  const readyCount = CONTAINER_PLANS.filter(
    (p) => (p.status === "draft" || p.status === "ready") &&
           containerWeightKg(p) <= VEHICLE_MAX_WEIGHT_KG,
  ).length;

  return (
    <section className="space-y-4">
      {/* ─── Section header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-text-1 flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            Đóng container — kế hoạch vận chuyển tuần
          </h3>
          <p className="text-caption text-text-3 mt-0.5">
            Hệ thống đã tối ưu {summary.total} chuyến, ghép {summary.consolidated} tuyến — tiết kiệm{" "}
            <span className="text-success font-medium">{fmtVndShort(summary.totalSaving)}</span>.
            Bạn có thể chỉnh PO, đổi xe, round-up hoặc tách chuyến.
          </p>
        </div>
        <Button
          size="sm" variant="outline"
          onClick={() => toast.info("Tạo chuyến thủ công — coming soon")}
        >
          <Truck className="h-3.5 w-3.5 mr-1" /> Tạo chuyến mới
        </Button>
      </div>

      {/* ─── ① Logic explainer (collapsed mặc định) ─── */}
      <LogicExplainer />

      {/* ─── Mini summary chips ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-card border border-surface-3 bg-surface-2 p-3">
          <div className="text-caption text-text-3">Tổng chuyến</div>
          <div className="text-xl font-semibold text-text-1 tabular-nums">{summary.total}</div>
        </div>
        <div className="rounded-card border border-warning/30 bg-warning-bg/40 p-3">
          <div className="text-caption text-warning flex items-center gap-1">
            <Link2 className="h-3 w-3" /> Ghép tuyến
          </div>
          <div className="text-xl font-semibold text-warning tabular-nums">{summary.consolidated}</div>
        </div>
        <div className="rounded-card border border-surface-3 bg-surface-2 p-3">
          <div className="text-caption text-text-3">Fill TB</div>
          <div className={cn("text-xl font-semibold tabular-nums",
            summary.avgFill < 75 ? "text-warning" : "text-success")}>
            {summary.avgFill}%
          </div>
        </div>
        <div className="rounded-card border border-success/30 bg-success-bg/40 p-3">
          <div className="text-caption text-success flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Tiết kiệm
          </div>
          <div className="text-xl font-semibold text-success tabular-nums">
            {fmtVndShort(summary.totalSaving)}
          </div>
        </div>
      </div>

      {/* ─── ② Container table — sort fill ASC ─── */}
      <SmartTable
        screenId="drp-container-list"
        columns={cols}
        data={sortedPlans}
        defaultDensity="compact"
        title={`Kế hoạch ${summary.total} chuyến container`}
        exportFilename={`drp-container-w20`}
        getRowId={(r) => r.id}
        beforeCollapse={beforeCollapse}
        collapseRowSignal={collapseSignal}
        rowSeverity={(r) => {
          if (containerWeightKg(r) > VEHICLE_MAX_WEIGHT_KG) return "shortage";
          if (r.fillPct < 70) return "watch";
          return undefined;
        }}
        autoExpandWhen={(r) =>
          r.fillPct < 70 || containerWeightKg(r) > VEHICLE_MAX_WEIGHT_KG
        }
        drillDown={(r) => {
          const overWeight = containerWeightKg(r) > VEHICLE_MAX_WEIGHT_KG;
          return (
            <div className="space-y-3 p-3 bg-surface-1/40 rounded-card">
              {/* Suggestion / overload banner */}
              {overWeight && (
                <div className="rounded-card border border-danger/40 bg-danger-bg px-3 py-2 text-table-sm font-medium flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-danger">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Vượt 28T ({(containerWeightKg(r) / 1000).toFixed(1)}T) — bắt buộc tách 2 chuyến
                  </span>
                  <Button size="sm" className="h-7 px-2.5 text-[11px] bg-danger text-danger-foreground hover:bg-danger/90"
                    onClick={() => toast.success(`Đã tách ${r.id} → ${r.id}A (40ft 27,9T) + ${r.id}B (20ft 20,5T)`)}>
                    <Scissors className="h-3 w-3 mr-1" /> Tách tự động
                  </Button>
                </div>
              )}
              {!overWeight && r.suggestion && r.suggestionLabel && (
                <div className={cn("rounded-card border px-3 py-2 text-table-sm font-medium flex items-center gap-2",
                  SUGGESTION_CLASS[r.suggestion] ?? "border-info/40 bg-info-bg text-info")}>
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{r.suggestionLabel}</span>
                </div>
              )}

              {/* ─── Zone A: PO trong container (editable) ─── */}
              <PoLinesEditor container={r} />

              {/* ─── Zone B: Round-up gợi ý ─── */}
              <RoundUpSuggestion container={r} />

              {/* ─── Zone C: Tuyến giao + drop reorder ─── */}
              <div className="rounded-card border border-surface-3 bg-surface-1 p-3 space-y-2">
                <div className="text-table-sm font-semibold text-text-1 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> Tuyến giao
                </div>
                <DropPointsEditor
                  container={r}
                  onCnClick={onCnClick}
                  onDirtyChange={handleDirtyChange}
                  closeRequestNonce={closeRequests[r.id] ?? 0}
                  onCloseAllowed={() => handleCloseAllowed(r.id)}
                />
              </div>

              {/* Cost line */}
              <div className="flex items-center justify-between text-table-sm border-t border-surface-3 pt-2">
                <div className="flex items-center gap-3 text-text-2">
                  <span>Cước: <strong className="text-text-1 tabular-nums">{fmtVnd(r.freightVnd)}</strong></span>
                  {r.savingVnd > 0 && (
                    <span className="text-success">
                      Tiết kiệm <strong className="tabular-nums">{fmtVnd(r.savingVnd)}</strong>
                    </span>
                  )}
                </div>
                <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]"
                  onClick={(e) => { e.stopPropagation(); setEditing(r); }}>
                  <Pencil className="h-3 w-3 mr-1" /> Đổi xe / preview
                </Button>
              </div>
            </div>
          );
        }}
        emptyState={{
          icon: <Truck className="h-10 w-10" />,
          title: "Chưa có chuyến container nào",
          description: "DRP chưa tạo kế hoạch vận chuyển. Chạy DRP lại hoặc tạo chuyến thủ công.",
        }}
      />

      {/* ─── Edit preview dialog (full workspace với live recalc) ─── */}
      <ContainerEditPreview container={editing} onClose={() => setEditing(null)} />

      {/* ─── ③ PO chưa xếp ─── */}
      <UnscheduledPosSection pos={UNSCHEDULED_POS} />

      {/* ─── Footer action ─── */}
      <div className="flex items-center justify-between border-t border-surface-3 pt-3 gap-3 flex-wrap">
        <div className="text-caption text-text-3 flex items-center gap-3 flex-wrap">
          <span>
            <strong className="text-text-1">{readyCount}/{summary.total}</strong> sẵn sàng
          </span>
          {holdCount > 0 && (
            <span className="text-warning">· {holdCount} giữ chờ</span>
          )}
          {overloadCount > 0 && (
            <span className="text-danger font-semibold">
              · ⚠️ {overloadCount} vượt tải — cần [Tách] trước khi duyệt
            </span>
          )}
        </div>
        <Button
          size="sm"
          disabled={overloadCount > 0}
          title={overloadCount > 0 ? "Còn chuyến vượt tải — bấm [Tách tự động] trong drill-down" : undefined}
          onClick={() => {
            navigate("/orders?tab=approval");
            toast.success(`Đã chuyển ${readyCount} container sang Đơn hàng`);
          }}
        >
          Duyệt {readyCount} container <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
    </section>
  );
}
