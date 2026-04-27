import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";
import type { KpiTrend, KpiUnit } from "@/lib/kpi-format";
import { formatKpiValue } from "@/lib/kpi-format";
import { useFarmerMode } from "@/components/FarmerModeContext";

/**
 * KpiCard — gọn, dễ đọc cho farmer / ops user.
 *
 * Hai cách truyền value/unit (chuẩn hoá):
 *
 *  1) RAW — caller đã format sẵn:
 *       <KpiCard title="Doanh thu rủi ro" value="3,17" unit="tỷ ₫" ... />
 *
 *  2) NUMERIC — KpiCard tự format theo unit chuẩn (vi-VN, separator, compact):
 *       <KpiCard title="Tiết kiệm" valueNum={507_000_000} valueUnit="vnd" ... />
 *       <KpiCard title="Mức phục vụ" valueNum={95.5} valueUnit="pct" ... />
 *       <KpiCard title="Ngoại lệ"   valueNum={14}    valueUnit="qty" qtyLabel="vấn đề" />
 *
 * Trend: ưu tiên `trend` (object KpiTrend chuẩn từ helper `kpiTrend(...)`).
 * Vẫn giữ lại form `{ value, positive }` (legacy) cho các call site cũ.
 */
export type KpiTone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";

interface KpiCardProps {
  title: string;
  /** Đã format. Bỏ qua nếu dùng `valueNum`. */
  value?: string;
  /** Đã format. */
  unit?: string;

  /** Numeric path — KpiCard tự format theo unit chuẩn. */
  valueNum?: number;
  valueUnit?: KpiUnit;
  /** Label cho unit khi valueUnit="qty" (vd: "vấn đề", "ngày", "m²"). */
  qtyLabel?: string;

  /** Trend chuẩn (preferred) — build qua `kpiTrend(...)`. */
  trend?: KpiTrend | { value: string; positive: boolean };

  tone?: KpiTone;
  icon?: LucideIcon;
  /** Hint ngắn dưới trend, <40 ký tự. */
  hint?: string;
  className?: string;
}

const TONE_STRIP: Record<KpiTone, string> = {
  neutral: "bg-surface-3",
  success: "bg-success",
  warning: "bg-warning",
  danger:  "bg-danger",
  info:    "bg-info",
  primary: "bg-primary",
};

const TONE_CHIP: Record<KpiTone, string> = {
  neutral: "bg-surface-2 text-text-2",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger:  "bg-danger/10  text-danger",
  info:    "bg-info/10    text-info",
  primary: "bg-primary/10 text-primary",
};

/** Normalize trend prop về dạng { value, direction, isGood } để render thống nhất. */
function normalizeTrend(t: KpiCardProps["trend"]): KpiTrend | undefined {
  if (!t) return undefined;
  if ("direction" in t) return t;
  // Legacy form: { value, positive } → infer direction từ value text
  const direction = /[-−]/.test(t.value) ? "down" : /\+/.test(t.value) ? "up" : "flat";
  return { value: t.value, direction, isGood: t.positive };
}

export function KpiCard({
  title,
  value,
  unit,
  valueNum,
  valueUnit,
  qtyLabel,
  trend,
  tone = "neutral",
  icon: Icon,
  hint,
  className,
}: KpiCardProps) {
  // Resolve value/unit — numeric path tự format
  let renderValue = value ?? "";
  let renderUnit = unit;
  if (valueNum !== undefined && valueUnit) {
    const [v, u] = formatKpiValue(valueNum, valueUnit, qtyLabel);
    renderValue = v;
    renderUnit = renderUnit ?? u;
  }

  const t = normalizeTrend(trend);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card border border-surface-3 bg-surface-1",
        "p-3.5 sm:p-4 transition-shadow hover:shadow-sm",
        className,
      )}
    >
      <span aria-hidden className={cn("absolute left-0 top-0 bottom-0 w-1 sm:w-[3px]", TONE_STRIP[tone])} />

      {/* Header: title + icon */}
      <div className="flex items-start justify-between gap-2 mb-2 sm:mb-1.5">
        <p className="text-table sm:text-table-sm font-semibold sm:font-medium text-text-2 leading-snug">{title}</p>
        {Icon && (
          <div className={cn("shrink-0 rounded-md p-1.5 sm:p-1", TONE_CHIP[tone])}>
            <Icon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
          </div>
        )}
      </div>

      {/* Value + unit */}
      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-[30px] sm:text-[26px] leading-none font-bold text-text-1 tabular-nums">
          {renderValue}
        </span>
        {renderUnit && <span className="text-table sm:text-table-sm text-text-3">{renderUnit}</span>}
      </div>

      {/* Trend + hint */}
      {(t || hint) && (
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          {t && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-table-sm sm:text-caption font-semibold tabular-nums",
                t.isGood ? "text-success" : "text-danger",
              )}
            >
              {t.direction === "up"   && <TrendingUp   className="h-3.5 w-3.5 sm:h-3 sm:w-3" />}
              {t.direction === "down" && <TrendingDown className="h-3.5 w-3.5 sm:h-3 sm:w-3" />}
              {t.direction === "flat" && <Minus        className="h-3.5 w-3.5 sm:h-3 sm:w-3" />}
              {t.value}
              {t.vs && <span className="ml-1 font-normal text-text-3">vs {t.vs}</span>}
            </span>
          )}
          {hint && (
            <span className="text-table-sm sm:text-caption text-text-3 inline-flex items-center gap-1">
              {t && <Minus className="h-2.5 w-2.5 text-text-3/60" />}
              {hint}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
