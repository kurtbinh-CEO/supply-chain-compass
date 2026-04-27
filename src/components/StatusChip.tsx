import { cn } from "@/lib/utils";
import { KPI_THRESHOLDS, resolveTier } from "@/lib/kpi-thresholds";

interface StatusChipProps {
  status: "success" | "warning" | "danger" | "info";
  label: string;
  className?: string;
  /**
   * Override the `max-width` cap. Defaults come from
   * `KPI_THRESHOLDS.chipMaxWidthMobile/Desktop`. Pass `"none"` to disable
   * truncation entirely (use only when the chip lives in a flexible row
   * that already constrains width).
   */
  maxWidth?: string;
}

const statusStyles = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
};

const dotStyles = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

/**
 * StatusChip — pill with status dot + label.
 *
 * Auto-shrink + ellipsis: long labels (>chip.lg / chip.xl from KPI_THRESHOLDS)
 * downshift font and truncate within `chipMaxWidth*` so they never break
 * header rows on mobile. Hover/long-press shows the full text via `title`.
 */
export function StatusChip({ status, label, className, maxWidth }: StatusChipProps) {
  const tier = resolveTier(label.length, KPI_THRESHOLDS.chip);

  // Font size downshift on long labels (mobile-first).
  const sizeClass =
    tier === "xl" ? "text-caption sm:text-caption px-2 py-0.5"
    : tier === "lg" ? "text-caption sm:text-table-sm px-2 py-0.5"
    : "text-table-sm px-2.5 py-0.5";

  // Resolve max-width — caller override > config default.
  const mobileMax  = maxWidth ?? KPI_THRESHOLDS.chipMaxWidthMobile;
  const desktopMax = maxWidth ?? KPI_THRESHOLDS.chipMaxWidthDesktop;

  return (
    <span
      title={tier !== "base" ? label : undefined}
      style={
        maxWidth === "none"
          ? undefined
          : ({
              maxWidth: mobileMax,
              ["--chip-max-w-md" as never]: desktopMax,
            } as React.CSSProperties)
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium min-w-0 max-w-full sm:[max-width:var(--chip-max-w-md)]",
        sizeClass,
        statusStyles[status],
        className,
      )}
    >
      <span className={cn("h-[5px] w-[5px] rounded-full shrink-0", dotStyles[status])} />
      <span className="truncate min-w-0">{label}</span>
    </span>
  );
}
