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
  const { enabled: farmer } = useFarmerMode();

  // ─── Auto-shrink heuristic (mobile <sm) ──────────────────────────────
  // Khi chuỗi quá dài, hạ 1 nấc font và cho phép ellipsis (1 dòng) để
  // thẻ giữ chiều cao đều, scan nhanh trên 480px. Desktop giữ nguyên.
  const titleLen = title?.length ?? 0;
  const unitLen  = (renderUnit ?? "").length;
  const hintLen  = (hint ?? "").length;

  // Title: >22 ký tự → giảm 1 nấc; >32 → giảm 2 nấc + clamp 2 dòng
  const titleMobileClass =
    titleLen > 32 ? (farmer ? "text-table sm:text-table-sm" : "text-table-sm sm:text-table-sm")
    : titleLen > 22 ? (farmer ? "text-table sm:text-table-sm" : "text-table-sm sm:text-table-sm")
    : (farmer ? "text-body sm:text-table-sm" : "text-table sm:text-table-sm");
  const titleClampClass = titleLen > 32 ? "line-clamp-2" : "truncate";

  // Unit: >8 ký tự → giảm 1 nấc; luôn truncate để khỏi đẩy value xuống dòng
  const unitMobileClass =
    unitLen > 8 ? (farmer ? "text-table-sm sm:text-table-sm font-medium" : "text-table-sm sm:text-table-sm")
    : (farmer ? "text-body sm:text-table-sm font-medium" : "text-table sm:text-table-sm");

  // Value: nếu chuỗi value quá dài (vd "1.234,5") trên mobile → giảm 1 nấc
  const valueLen = renderValue.length;
  const valueMobileClass =
    valueLen > 7 ? (farmer ? "text-[32px] sm:text-[26px]" : "text-[26px] sm:text-[26px]")
    : valueLen > 5 ? (farmer ? "text-[34px] sm:text-[26px]" : "text-[28px] sm:text-[26px]")
    : (farmer ? "text-[38px] sm:text-[26px]" : "text-[30px] sm:text-[26px]");

  // Hint: >28 ký tự → giảm 1 nấc + truncate (1 dòng)
  const hintMobileClass =
    hintLen > 28 ? (farmer ? "text-table-sm sm:text-caption" : "text-caption sm:text-caption")
    : (farmer ? "text-table sm:text-caption" : "text-table-sm sm:text-caption");

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card border border-surface-3 bg-surface-1",
        // Farmer ON (mobile): padding lớn hơn để chạm tay dễ.
        farmer ? "p-5 sm:p-4" : "p-3.5 sm:p-4",
        "transition-shadow hover:shadow-sm",
        className,
      )}
    >
      <span aria-hidden className={cn("absolute left-0 top-0 bottom-0 w-1 sm:w-[3px]", TONE_STRIP[tone])} />

      {/* Header: title + icon */}
      <div className={cn("flex items-start justify-between gap-2", farmer ? "mb-3 sm:mb-1.5" : "mb-2 sm:mb-1.5")}>
        <p
          title={titleLen > 22 ? title : undefined}
          className={cn(
            "font-semibold sm:font-medium text-text-2 leading-snug min-w-0 flex-1",
            titleMobileClass,
            titleClampClass,
          )}
        >{title}</p>
        {Icon && (
          <div className={cn("shrink-0 rounded-md", farmer ? "p-2 sm:p-1" : "p-1.5 sm:p-1", TONE_CHIP[tone])}>
            <Icon className={cn(farmer ? "h-5 w-5 sm:h-3.5 sm:w-3.5" : "h-4 w-4 sm:h-3.5 sm:w-3.5")} />
          </div>
        )}
      </div>

      {/* Value + unit */}
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className={cn(
          "font-display leading-none font-bold text-text-1 tabular-nums shrink-0",
          valueMobileClass,
        )}>
          {renderValue}
        </span>
        {renderUnit && (
          <span
            title={unitLen > 8 ? renderUnit : undefined}
            className={cn(
              "text-text-3 truncate min-w-0",
              unitMobileClass,
            )}
          >{renderUnit}</span>
        )}
      </div>

      {/* Trend + hint */}
      {(t || hint) && (
        <div className={cn("flex items-center gap-1.5 flex-wrap", farmer ? "mt-2.5" : "mt-2")}>
          {t && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-semibold tabular-nums",
                farmer ? "text-table sm:text-caption" : "text-table-sm sm:text-caption",
                t.isGood ? "text-success" : "text-danger",
              )}
            >
              {t.direction === "up"   && <TrendingUp   className={cn(farmer ? "h-4 w-4 sm:h-3 sm:w-3" : "h-3.5 w-3.5 sm:h-3 sm:w-3")} />}
              {t.direction === "down" && <TrendingDown className={cn(farmer ? "h-4 w-4 sm:h-3 sm:w-3" : "h-3.5 w-3.5 sm:h-3 sm:w-3")} />}
              {t.direction === "flat" && <Minus        className={cn(farmer ? "h-4 w-4 sm:h-3 sm:w-3" : "h-3.5 w-3.5 sm:h-3 sm:w-3")} />}
              {t.value}
              {t.vs && <span className="ml-1 font-normal text-text-3">vs {t.vs}</span>}
            </span>
          )}
          {hint && (
            <span
              title={hintLen > 28 ? hint : undefined}
              className={cn(
                "text-text-3 inline-flex items-center gap-1 min-w-0 max-w-full",
                hintMobileClass,
              )}
            >
              {t && <Minus className="h-2.5 w-2.5 text-text-3/60 shrink-0" />}
              <span className="truncate">{hint}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
