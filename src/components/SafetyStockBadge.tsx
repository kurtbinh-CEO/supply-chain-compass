import { cn } from "@/lib/utils";
import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface SafetyStockBadgeProps {
  ssTarget: number;
  ssReserved: number;
  allocated?: number;
  size?: "sm" | "md";
}

type SsStatus = "above_ss" | "at_ss" | "below_ss" | "no_ss";

const STATUS_META = {
  above_ss: { icon: ShieldCheck, color: "text-success", bg: "bg-success-bg", border: "border-success/30", label: "Trên SS" },
  at_ss:    { icon: Shield,      color: "text-info",    bg: "bg-info-bg",    border: "border-info/30",    label: "Đủ SS" },
  below_ss: { icon: ShieldAlert, color: "text-danger",  bg: "bg-danger-bg",  border: "border-danger/30",  label: "Dưới SS" },
  no_ss:    { icon: Shield,      color: "text-text-3",  bg: "bg-surface-2",  border: "border-text-3/30",  label: "Không có SS" },
} as const;

export function getSsStatus(ssTarget: number, ssReserved: number): SsStatus {
  if (ssTarget === 0) return "no_ss";
  if (ssReserved >= ssTarget) return "above_ss";
  if (ssReserved >= ssTarget * 0.8) return "at_ss";
  return "below_ss";
}

export function SafetyStockBadge({ ssTarget, ssReserved, allocated, size = "md" }: SafetyStockBadgeProps) {
  const status = getSsStatus(ssTarget, ssReserved);
  const meta = STATUS_META[status];
  const pct = ssTarget > 0 ? Math.round((ssReserved / ssTarget) * 100) : 0;
  const Icon = meta.icon;
  const sizeCls = size === "sm"
    ? "gap-0.5 rounded px-1 py-0.5 text-[10px]"
    : "gap-1 rounded-full px-2 py-0.5 text-[11px]";
  const iconCls = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";

  if (status === "no_ss") return null;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            "inline-flex items-center font-medium border cursor-help",
            sizeCls,
            meta.color,
            meta.bg,
            meta.border,
          )}>
            <Icon className={iconCls} />
            <span className="tabular-nums">
              SS {ssReserved.toLocaleString()}/{ssTarget.toLocaleString()}
            </span>
            <span className="opacity-80">({pct}%)</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-3 space-y-2 bg-surface-0 border-surface-3">
          <div className="flex items-center gap-1.5">
            <Icon className={cn("h-3.5 w-3.5", meta.color)} />
            <strong className="text-text-1">{meta.label}</strong>
          </div>
          <div className="rounded border border-surface-3 bg-surface-1/60 p-2 font-mono text-[11px] text-text-2 space-y-0.5">
            <div>SS target:    <span className="text-text-1">{ssTarget.toLocaleString()}</span></div>
            <div>SS reserved:  <span className="text-text-1">{ssReserved.toLocaleString()}</span></div>
            <div>Coverage:     <span className={cn("font-semibold", meta.color)}>{pct}%</span></div>
            {allocated !== undefined && (
              <div className="pt-1 mt-1 border-t border-surface-3 text-text-3">
                Allocated {allocated.toLocaleString()} (KHÔNG ăn SS — SS reserved riêng biệt)
              </div>
            )}
          </div>
          <p className="text-caption text-text-2 leading-snug">
            SS bảo vệ inventory khỏi rủi ro stockout. ssReserved &lt; ssTarget = đã ăn vào SS, cần hành động.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
