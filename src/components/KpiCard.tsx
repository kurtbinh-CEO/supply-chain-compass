import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";

/**
 * KpiCard — gọn, dễ đọc cho farmer / ops user.
 *
 * Nguyên tắc design:
 *  - Số (value) là điểm neo thị giác → font lớn, đậm, tabular-nums.
 *  - Title ngắn, chữ thường, không UPPERCASE (uppercase khó đọc nhanh).
 *  - Padding p-4 (16px) thay vì p-5 (20px) — giảm whitespace lãng phí.
 *  - Tone strip bên trái (4px) thay cho viền cả thẻ → ít noise hơn.
 *  - Trend dùng icon arrow + màu semantic (success/danger/muted), tự suy ra
 *    direction tốt/xấu theo prop `positive`.
 *  - Optional icon ở góc phải, dưới dạng tonal chip mờ — không tranh giành với số.
 */
interface KpiCardProps {
  title: string;
  value: string;
  unit?: string;
  trend?: { value: string; positive: boolean };
  /** Tone semantic — đổ màu strip bên trái + tint icon chip. Default: neutral. */
  tone?: "neutral" | "success" | "warning" | "danger" | "info" | "primary";
  /** Icon optional. Nếu có sẽ render thành chip nhỏ ở góc phải. */
  icon?: LucideIcon;
  /** Hint phụ — câu giải thích ngắn dưới trend. Giữ <40 ký tự. */
  hint?: string;
  className?: string;
}

const TONE_STRIP: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  neutral: "bg-surface-3",
  success: "bg-success",
  warning: "bg-warning",
  danger:  "bg-danger",
  info:    "bg-info",
  primary: "bg-primary",
};

const TONE_CHIP: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  neutral: "bg-surface-2 text-text-2",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger:  "bg-danger/10  text-danger",
  info:    "bg-info/10    text-info",
  primary: "bg-primary/10 text-primary",
};

export function KpiCard({
  title,
  value,
  unit,
  trend,
  tone = "neutral",
  icon: Icon,
  hint,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        // Strip bên trái = pseudo via overflow-hidden + absolute child
        "relative overflow-hidden rounded-card border border-surface-3 bg-surface-1",
        // Mobile: padding rộng hơn 1 chút để chạm tay dễ; sm+: thu gọn lại
        "p-3.5 sm:p-4 transition-shadow hover:shadow-sm",
        className,
      )}
    >
      {/* Tone strip — 4px mobile / 3px desktop để dễ thấy trên màn nhỏ */}
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

      {/* Value + unit — điểm neo. Mobile to hơn (30px) để farmer scan không cần zoom */}
      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-[30px] sm:text-[26px] leading-none font-bold text-text-1 tabular-nums">
          {value}
        </span>
        {unit && <span className="text-table sm:text-table-sm text-text-3">{unit}</span>}
      </div>

      {/* Trend + hint */}
      {(trend || hint) && (
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-table-sm sm:text-caption font-semibold tabular-nums",
                trend.positive ? "text-success" : "text-danger",
              )}
            >
              {trend.positive ? (
                <TrendingUp className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
              )}
              {trend.value}
            </span>
          )}
          {hint && (
            <span className="text-table-sm sm:text-caption text-text-3 inline-flex items-center gap-1">
              {trend && <Minus className="h-2.5 w-2.5 text-text-3/60" />}
              {hint}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
