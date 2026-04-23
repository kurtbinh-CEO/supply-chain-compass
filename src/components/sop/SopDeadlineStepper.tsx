import { Check, Clock, Lock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Phase {
  key: string;
  label: string;
  range: string;
  startDay: number;
  endDay: number;
  icon: React.ElementType;
}

const PHASES: Phase[] = [
  { key: "input",   label: "Nhập liệu",  range: "Ngày 1–3",  startDay: 1,  endDay: 3,  icon: Clock },
  { key: "balance", label: "Cân đối",    range: "Ngày 3–5",  startDay: 3,  endDay: 5,  icon: Clock },
  { key: "lock",    label: "Khóa",       range: "Ngày 5–7",  startDay: 5,  endDay: 7,  icon: Lock },
  { key: "auto",    label: "Tự khóa",    range: "Ngày 10",   startDay: 7,  endDay: 10, icon: AlertTriangle },
];

interface Props {
  currentDay: number;
  locked?: boolean;
}

export function SopDeadlineStepper({ currentDay, locked = false }: Props) {
  const activeIdx = PHASES.findIndex((p) => currentDay >= p.startDay && currentDay <= p.endDay);
  const activePhase = activeIdx >= 0 ? PHASES[activeIdx] : PHASES[PHASES.length - 1];
  const daysRemaining = Math.max(0, activePhase.endDay - currentDay);
  const showAutoLockWarning = !locked && currentDay >= 5 && currentDay < 10;
  const isAutoLockToday = !locked && currentDay >= 10;

  return (
    <div className="rounded-card border border-surface-3 bg-surface-2 p-4 mb-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-table-sm font-semibold text-text-1">
            Lịch trình S&OP — Tháng 5
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-table-sm font-medium px-3 py-1">
            Ngày {currentDay}/30 — Giai đoạn {activePhase.label}
            {daysRemaining > 0 && !locked && (
              <span className="text-text-2">({daysRemaining} ngày còn lại)</span>
            )}
          </span>
        </div>
        {showAutoLockWarning && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-bg text-warning text-table-sm font-medium px-3 py-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            Tự khóa dùng FC gốc (v0) nếu chưa khóa trước Ngày 10
          </span>
        )}
        {isAutoLockToday && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-bg text-danger text-table-sm font-bold px-3 py-1 animate-pulse">
            <AlertTriangle className="h-3.5 w-3.5" />
            ⚠️ HÔM NAY tự khóa — đang sử dụng FC v0 gốc
          </span>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-stretch gap-1.5">
        {PHASES.map((phase, idx) => {
          const isPast = currentDay > phase.endDay || (locked && idx <= activeIdx);
          const isActive = idx === activeIdx && !locked;
          const isFuture = currentDay < phase.startDay;
          const Icon = phase.icon;

          return (
            <div
              key={phase.key}
              className={cn(
                "flex-1 rounded-md border px-3 py-2.5 transition-all",
                isActive && "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/20",
                isPast && "border-success/30 bg-success-bg",
                isFuture && "border-surface-3 bg-surface-1/40 opacity-70",
              )}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <div
                  className={cn(
                    "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                    isActive && "bg-primary text-primary-foreground",
                    isPast && "bg-success text-success-foreground",
                    isFuture && "bg-surface-3 text-text-3",
                  )}
                >
                  {isPast ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                </div>
                <span
                  className={cn(
                    "text-table-sm font-semibold truncate",
                    isActive && "text-primary",
                    isPast && "text-success",
                    isFuture && "text-text-3",
                  )}
                >
                  {phase.label}
                </span>
              </div>
              <p
                className={cn(
                  "text-caption font-mono",
                  isActive ? "text-text-1" : "text-text-3",
                )}
              >
                {phase.range}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
