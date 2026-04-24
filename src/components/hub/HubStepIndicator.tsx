/**
 * HubStepIndicator — 3-step horizontal progress for Hub workflow.
 * Step 1 Booking → Step 2 Cam kết NM → Step 3 PO & Theo dõi
 */
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type HubStepKey = "booking" | "commitment" | "tracking";

export interface HubStep {
  key: HubStepKey;
  index: number;
  title: string;
  summary: string;
  status: "done" | "active" | "pending";
}

interface Props {
  steps: HubStep[];
  active: HubStepKey;
  onSelect: (k: HubStepKey) => void;
}

export function HubStepIndicator({ steps, active, onSelect }: Props) {
  return (
    <div className="rounded-card border border-surface-3 bg-surface-1 p-4">
      <div className="flex items-stretch gap-2">
        {steps.map((s, i) => {
          const isActive = active === s.key;
          const isDone = s.status === "done";
          return (
            <div key={s.key} className="flex-1 flex items-stretch">
              <button
                onClick={() => onSelect(s.key)}
                className={cn(
                  "flex-1 text-left rounded-card border px-3 py-2.5 transition-all",
                  isActive
                    ? "border-primary bg-primary/5 shadow-sm"
                    : isDone
                      ? "border-success/30 bg-success-bg/30 hover:border-success/50"
                      : "border-surface-3 bg-surface-2 hover:border-primary/30"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center text-caption font-bold",
                    isDone ? "bg-success text-success-foreground" :
                    isActive ? "bg-primary text-primary-foreground" :
                    "bg-surface-3 text-text-3"
                  )}>
                    {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.index}
                  </span>
                  <span className={cn(
                    "text-table-sm font-semibold",
                    isActive ? "text-primary" : isDone ? "text-success" : "text-text-2"
                  )}>
                    {s.title}
                  </span>
                  {s.status === "active" && (
                    <Loader2 className="h-3 w-3 animate-spin text-primary ml-auto" />
                  )}
                </div>
                <div className={cn(
                  "mt-1 text-caption tabular-nums",
                  isActive ? "text-text-1 font-medium" : "text-text-3"
                )}>
                  {s.summary}
                </div>
              </button>
              {i < steps.length - 1 && (
                <div className="flex items-center px-1">
                  <div className={cn(
                    "h-0.5 w-3",
                    isDone ? "bg-success" : "bg-surface-3"
                  )} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
