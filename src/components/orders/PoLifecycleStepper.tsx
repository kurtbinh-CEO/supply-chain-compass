import { cn } from "@/lib/utils";
import {
  FileText, ClipboardCheck, Inbox, Factory, Truck, PackageCheck, CheckCircle2,
} from "lucide-react";

/**
 * 7-stage PO lifecycle stepper.
 *
 * Stages:
 *  0 DRAFT          (Soạn)
 *  1 SUBMITTED      (Xác nhận / NM phản hồi)
 *  2 NM_ACCEPTED    (NM nhận)
 *  3 IN_PRODUCTION  (Đang SX)
 *  4 SHIPPED        (Giao)
 *  5 RECEIVED       (Nhận)
 *  6 CLOSED         (Đóng)
 */

export type LifecycleStage =
  | "draft" | "submitted" | "nm_accepted" | "in_production"
  | "shipped" | "received" | "closed";

const STAGES: { key: LifecycleStage; label: string; icon: typeof FileText }[] = [
  { key: "draft",         label: "Soạn",       icon: FileText },
  { key: "submitted",     label: "Xác nhận",   icon: ClipboardCheck },
  { key: "nm_accepted",   label: "NM nhận",    icon: Inbox },
  { key: "in_production", label: "Đang SX",    icon: Factory },
  { key: "shipped",       label: "Giao",       icon: Truck },
  { key: "received",      label: "Nhận",       icon: PackageCheck },
  { key: "closed",        label: "Đóng",       icon: CheckCircle2 },
];

/** Map a coarse PO status (or TO status) onto the 7-stage rail. */
export function stageFromStatus(s: string): LifecycleStage {
  switch (s) {
    case "draft":     return "draft";
    case "submitted": return "submitted";
    case "confirmed": return "nm_accepted";
    case "shipped":   return "shipped";
    case "received":  return "received";
    case "cancelled": return "draft";
    default:          return "draft";
  }
}

export function PoLifecycleStepper({
  currentStage,
  className,
}: {
  currentStage: LifecycleStage;
  className?: string;
}) {
  const currentIdx = STAGES.findIndex((s) => s.key === currentStage);

  return (
    <div className={cn("flex items-stretch gap-0", className)}>
      {STAGES.map((s, i) => {
        const Icon = s.icon;
        const reached = i <= currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 min-w-0">
              <div
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center border transition-colors shrink-0",
                  active
                    ? "bg-gradient-primary border-primary text-primary-foreground shadow-sm"
                    : reached
                    ? "bg-success-bg border-success/40 text-success"
                    : "bg-surface-1 border-surface-3 text-text-3"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span
                className={cn(
                  "text-[10px] leading-tight text-center whitespace-nowrap",
                  active ? "text-text-1 font-semibold" : reached ? "text-text-2" : "text-text-3"
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-[2px] mx-1 mt-[-14px] rounded-full",
                  i < currentIdx ? "bg-success/50" : "bg-surface-3"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
