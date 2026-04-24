/**
 * DrpStepIndicator — 3-step header indicator (Kiểm tra · Đang chạy · Kết quả)
 *
 * Hiện trên cùng mọi state của DRP. Farmer biết mình đang ở đâu trong flow.
 */
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type DrpStep = 1 | 2 | 3;

interface Props {
  current: DrpStep;
  /** Steps đã hoàn thành (vd: [1, 2] khi current = 3) */
  completed: DrpStep[];
}

const STEPS: { id: DrpStep; label: string }[] = [
  { id: 1, label: "Kiểm tra" },
  { id: 2, label: "Đang chạy" },
  { id: 3, label: "Kết quả" },
];

export function DrpStepIndicator({ current, completed }: Props) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {STEPS.map((s, i) => {
        const isDone = completed.includes(s.id);
        const isActive = current === s.id;
        const idle = !isDone && !isActive;
        return (
          <div key={s.id} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-bold transition-colors",
                  isDone && "bg-success text-primary-foreground",
                  isActive && "bg-primary text-primary-foreground",
                  idle && "bg-surface-3 text-text-3"
                )}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : <span>{s.id}</span>}
              </span>
              <span
                className={cn(
                  "text-table-sm font-medium",
                  isActive && "text-text-1",
                  isDone && "text-text-2",
                  idle && "text-text-3"
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-10 sm:w-16",
                  completed.includes(STEPS[i + 1].id) || (isDone && current === STEPS[i + 1].id)
                    ? "bg-success"
                    : isDone
                    ? "bg-primary/40"
                    : "bg-surface-3"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default DrpStepIndicator;
