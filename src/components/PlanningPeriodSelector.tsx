/**
 * PlanningPeriodSelector — dropdown chọn kỳ kế hoạch tháng.
 *
 * Hiện trên header mỗi planning screen (Demand / S&OP / Hub / Gap).
 * Trạng thái:
 *   LOCKED  → ✅ "Đã khóa" (chọn được nhưng read-only)
 *   ACTIVE  → ● "Đang làm"
 *   DRAFT   → 🔒 "Chưa mở" (disabled, tooltip giải thích)
 */
import { Calendar, Lock, Circle, CalendarOff, ChevronDown } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { usePlanningPeriod } from "./PlanningPeriodContext";
import type { PlanningCycle } from "@/data/unis-enterprise-dataset";

const statusMeta: Record<PlanningCycle["status"], { icon: typeof Circle; label: string; tone: string }> = {
  LOCKED:   { icon: Lock,        label: "Đã khóa",  tone: "text-text-3" },
  ACTIVE:   { icon: Circle,      label: "Đang làm", tone: "text-success" },
  DRAFT:    { icon: CalendarOff, label: "Chưa mở",  tone: "text-text-3" },
  ARCHIVED: { icon: Lock,        label: "Lưu trữ",  tone: "text-text-3" },
};

interface Props {
  className?: string;
  /** Hiển thị compact (chỉ label + chevron) hay full (icon + label + status badge) */
  variant?: "default" | "compact";
}

export function PlanningPeriodSelector({ className, variant = "default" }: Props) {
  const { cycles, current, setCycleId } = usePlanningPeriod();
  const meta = statusMeta[current.status];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-button border border-surface-3 bg-surface-2 px-3 text-table-sm font-medium text-text-1 hover:bg-surface-1 transition-colors whitespace-nowrap",
            className,
          )}
        >
          <Calendar className="h-3.5 w-3.5 text-text-3" />
          <span className="text-text-2">Kế hoạch:</span>
          <span>{current.label}</span>
          {variant === "default" && (
            <span className={cn("inline-flex items-center gap-1 text-caption", meta.tone)}>
              <meta.icon className="h-3 w-3" />
              {meta.label} · v{current.version}
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-text-3" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[320px]">
        <DropdownMenuLabel className="text-caption text-text-3 font-normal">
          Chọn kỳ kế hoạch tháng
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {cycles.map((c) => {
          const m = statusMeta[c.status];
          const disabled = c.status === "DRAFT";
          const active = c.id === current.id;
          return (
            <DropdownMenuItem
              key={c.id}
              disabled={disabled}
              onSelect={() => !disabled && setCycleId(c.id)}
              className={cn(
                "flex items-start gap-2 py-2 cursor-pointer",
                active && "bg-primary/5",
                disabled && "opacity-60",
              )}
              title={disabled ? "Khóa kế hoạch tháng trước để mở kỳ này" : undefined}
            >
              <m.icon className={cn("h-4 w-4 mt-0.5 shrink-0", m.tone)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-table font-medium text-text-1">{c.label}</span>
                  {active && (
                    <span className="text-caption text-primary font-medium">● đang xem</span>
                  )}
                </div>
                <div className="text-caption text-text-3 mt-0.5">
                  {m.label} · v{c.version}
                  {c.status === "LOCKED" && c.lockedAt && (
                    <> · khóa {c.lockedAt} bởi {c.lockedBy}</>
                  )}
                  {c.status === "ACTIVE" && (
                    <> · {c.stepsCompleted.length}/6 bước · {c.totalExceptions} ngoại lệ</>
                  )}
                  {c.status === "DRAFT" && (
                    <> · chờ tháng trước khóa</>
                  )}
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
