/* ═══════════════════════════════════════════════════════════════════════════
   §  FillExceptionAlert — cảnh báo exception-first khi fill% vượt ngưỡng.
   §  Hiện ngay trên KpiImpactGrid trong drill-down container.
   §  - fill < 70%: "underfill" → gợi ý xe nhỏ hơn HOẶC gom thêm PO HOẶC tách drop fill kém.
   §  - fill > 100%: "overflow" → gợi ý xe lớn hơn HOẶC gỡ drop nhỏ nhất / xa nhất.
   §  - fill 70-84%: "warn" → gợi ý nhẹ, không chặn.
   §  Có thể click "Áp dụng" → callback đến parent (đổi xe / xoá drop).
   ═══════════════════════════════════════════════════════════════════════════ */
import { AlertTriangle, AlertOctagon, Lightbulb, ArrowRight, Truck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContainerPlan, DropPoint } from "@/data/container-plans";
import {
  getVehicle, suggestLargerVehicle, suggestSmallerVehicle,
  type VehicleType,
} from "@/data/vehicles";

export type FillSeverity = "ok" | "warn" | "underfill" | "overflow";

export function classifyFill(fillPct: number): FillSeverity {
  if (fillPct > 100) return "overflow";
  if (fillPct < 70) return "underfill";
  if (fillPct < 85) return "warn";
  return "ok";
}

interface SuggestionAction {
  label: string;
  detail: string;
  primary?: boolean;
  onApply?: () => void;
}

interface Props {
  container: ContainerPlan;
  /** fillM2 hiện tại sau các thao tác (có thể khác container.fillM2 khi user gỡ drop). */
  currentFillM2: number;
  /** Capacity hiện tại (có thể khác container.capacityM2 khi user đổi xe). */
  currentCapacityM2: number;
  currentVehicleCode: string;
  /** Drop hiện tại (sau khi user gỡ/sắp xếp). */
  currentDrops: DropPoint[];
  onChangeVehicle?: (vehicle: VehicleType) => void;
  onRemoveDrop?: (cnCode: string) => void;
}

export function FillExceptionAlert({
  container, currentFillM2, currentCapacityM2,
  currentVehicleCode, currentDrops,
  onChangeVehicle, onRemoveDrop,
}: Props) {
  const fillPct = currentCapacityM2 > 0
    ? Math.round((currentFillM2 / currentCapacityM2) * 100)
    : 0;
  const sev = classifyFill(fillPct);

  if (sev === "ok") return null;

  // ── Build gợi ý theo từng severity ────────────────────────────────────
  const suggestions: SuggestionAction[] = [];

  if (sev === "overflow") {
    const overflowM2 = currentFillM2 - currentCapacityM2;
    const larger = suggestLargerVehicle(currentVehicleCode);
    if (larger) {
      const newPct = Math.round((currentFillM2 / larger.capacityM2) * 100);
      suggestions.push({
        label: `Đổi sang ${larger.label} (${larger.capacityM2.toLocaleString()}m²)`,
        detail: `Fill mới ~${newPct}% — đủ chỗ cho ${currentFillM2.toLocaleString()}m²`,
        primary: true,
        onApply: () => onChangeVehicle?.(larger),
      });
    }
    // Tìm drop nhỏ nhất để gỡ
    const smallest = [...currentDrops].sort((a, b) => a.qtyM2 - b.qtyM2)[0];
    if (smallest) {
      const newFill = currentFillM2 - smallest.qtyM2;
      const newPct = Math.round((newFill / currentCapacityM2) * 100);
      suggestions.push({
        label: `Gỡ ${smallest.cnCode} (${smallest.qtyM2.toLocaleString()}m²)`,
        detail: `Drop nhỏ nhất — fill còn ~${newPct}%, dư ${(currentCapacityM2 - newFill).toLocaleString()}m²`,
        onApply: () => onRemoveDrop?.(smallest.cnCode),
      });
    }
    if (suggestions.length === 0) {
      suggestions.push({
        label: "Tách thành 2 chuyến",
        detail: `Quá tải ${overflowM2.toLocaleString()}m² — chia drops thành 2 xe riêng`,
      });
    }
  }

  if (sev === "underfill") {
    const headroom = currentCapacityM2 - currentFillM2;
    const smaller = suggestSmallerVehicle(currentVehicleCode, currentFillM2);
    if (smaller) {
      const newPct = Math.round((currentFillM2 / smaller.capacityM2) * 100);
      const currentVeh = getVehicle(currentVehicleCode);
      // Ước tính tiết kiệm cước (~30% giữa các tier)
      const saving = currentVeh
        ? Math.round(container.freightVnd * (1 - smaller.capacityM2 / currentVeh.capacityM2) * 0.5)
        : 0;
      suggestions.push({
        label: `Đổi sang ${smaller.label} (${smaller.capacityM2.toLocaleString()}m²)`,
        detail: `Fill mới ~${newPct}%${saving > 0 ? ` · tiết kiệm ~${(saving / 1_000_000).toFixed(1).replace(/\.0$/, "")}M₫` : ""}`,
        primary: true,
        onApply: () => onChangeVehicle?.(smaller),
      });
    }
    suggestions.push({
      label: `Gom thêm ${headroom.toLocaleString()}m² PO khác`,
      detail: `Còn dư ${headroom.toLocaleString()}m² — tìm PO cùng tuyến để ghép`,
    });
    // Drop nhỏ nhất — tách ra xe khác để các drop còn lại fill cao hơn
    if (currentDrops.length >= 2) {
      const smallest = [...currentDrops].sort((a, b) => a.qtyM2 - b.qtyM2)[0];
      const remainingFill = currentFillM2 - smallest.qtyM2;
      const remainingPct = Math.round((remainingFill / currentCapacityM2) * 100);
      suggestions.push({
        label: `Tách ${smallest.cnCode} sang chuyến khác`,
        detail: `Drop nhỏ nhất (${smallest.qtyM2.toLocaleString()}m²) — chuyến chính fill còn ~${remainingPct}%`,
        onApply: () => onRemoveDrop?.(smallest.cnCode),
      });
    }
  }

  if (sev === "warn") {
    const headroom = currentCapacityM2 - currentFillM2;
    suggestions.push({
      label: `Cân nhắc gom thêm ~${headroom.toLocaleString()}m²`,
      detail: `Fill ${fillPct}% — chấp nhận được nhưng còn dư ${headroom.toLocaleString()}m² chỗ`,
    });
  }

  // ── Style theo severity ─────────────────────────────────────────────────
  const tone = {
    overflow: {
      box: "border-danger/50 bg-danger-bg/60",
      icon: "text-danger",
      Icon: AlertOctagon,
      title: `Quá tải ${(currentFillM2 - currentCapacityM2).toLocaleString()}m² — fill ${fillPct}%`,
      subtitle: `Xe ${currentVehicleCode} chỉ chứa ${currentCapacityM2.toLocaleString()}m². Cần xử lý trước khi xuất.`,
    },
    underfill: {
      box: "border-warning/50 bg-warning-bg/60",
      icon: "text-warning",
      Icon: AlertTriangle,
      title: `Fill thấp ${fillPct}% — lãng phí ${(currentCapacityM2 - currentFillM2).toLocaleString()}m² chỗ`,
      subtitle: `Cước/m² cao bất thường. Nên đổi xe nhỏ hoặc gom thêm hàng cùng tuyến.`,
    },
    warn: {
      box: "border-warning/30 bg-warning-bg/30",
      icon: "text-warning",
      Icon: Lightbulb,
      title: `Fill ${fillPct}% — có thể tối ưu thêm`,
      subtitle: `Cân nhắc gom thêm PO để đạt ≥ 85%.`,
    },
    ok: { box: "", icon: "", Icon: Lightbulb, title: "", subtitle: "" },
  }[sev];

  const ToneIcon = tone.Icon;

  return (
    <div className={cn("rounded-card border-2 p-3 space-y-2", tone.box)}>
      {/* Header */}
      <div className="flex items-start gap-2">
        <ToneIcon className={cn("h-5 w-5 shrink-0 mt-0.5", tone.icon)} />
        <div className="min-w-0 flex-1">
          <div className={cn("text-table-sm font-semibold", tone.icon)}>
            {tone.title}
          </div>
          <div className="text-caption text-text-2 mt-0.5">
            {tone.subtitle}
          </div>
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-1.5 pl-7">
          <div className="text-[10px] uppercase tracking-wide font-semibold text-text-3 flex items-center gap-1">
            <Lightbulb className="h-3 w-3" /> Gợi ý xử lý
          </div>
          {suggestions.map((s, i) => (
            <div
              key={i}
              className={cn(
                "rounded-card border bg-surface-1 p-2 flex items-start gap-2",
                s.primary ? "border-primary/40" : "border-surface-3",
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-table-sm font-medium text-text-1">
                  {s.label.startsWith("Đổi") && <Truck className="h-3 w-3 text-primary shrink-0" />}
                  {s.label.startsWith("Gỡ") && <X className="h-3 w-3 text-danger shrink-0" />}
                  <span className="truncate">{s.label}</span>
                </div>
                <div className="text-[11px] text-text-3 mt-0.5">{s.detail}</div>
              </div>
              {s.onApply && (
                <button
                  type="button"
                  onClick={s.onApply}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1 rounded-button px-2 py-1 text-[11px] font-semibold transition-colors",
                    s.primary
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-surface-3 bg-surface-2 text-text-2 hover:text-text-1",
                  )}
                >
                  Áp dụng <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
