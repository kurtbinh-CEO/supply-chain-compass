import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LogicLink } from "@/components/LogicLink";

export interface BridgeStep {
  operator: string;         // "" | "−" | "+" | "=" | "↑"
  label: string;
  value: number;
  detail: string;
  link?: { label: string; to: string };
  accent: "blue" | "green" | "amber" | "red";
  highlight?: string;       // ★ note
  explain?: string;
  logicTab?: "monthly" | "daily" | "forecast" | "ss";
  logicNode?: number;
  isFinal?: boolean;
}

interface DemandToOrderBridgeProps {
  item: string;
  variant: string;
  cn: string;
  steps: BridgeStep[];
  /** Show footer summary */
  footer?: { demandQty: number; orderQty: number; reasons: { label: string; value: string }[] };
  /** Only show steps from this index */
  fromStep?: number;
  /** Only show steps up to this index */
  toStep?: number;
  className?: string;
}

export function DemandToOrderBridge({ item, variant, cn: cnName, steps, footer, fromStep = 0, toStep, className }: DemandToOrderBridgeProps) {
  const navigate = useNavigate();
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const visibleSteps = steps.slice(fromStep, toStep !== undefined ? toStep + 1 : undefined);

  const accentDot: Record<string, string> = {
    blue: "bg-info", green: "bg-success", amber: "bg-warning", red: "bg-danger",
  };
  const accentBg: Record<string, string> = {
    blue: "bg-info/5", green: "bg-success/5", amber: "bg-warning/5", red: "bg-danger/5",
  };
  const accentBorder: Record<string, string> = {
    blue: "border-info/30", green: "border-success/30", amber: "border-warning/30", red: "border-danger/30",
  };

  // Determine divider positions
  const getDivider = (stepIdx: number): "dashed" | "solid" | null => {
    const globalIdx = fromStep + stepIdx;
    if (globalIdx === 2) return "dashed"; // after PIPELINE
    if (globalIdx === 4) return "dashed"; // after SS
    if (globalIdx === 6) return "solid";  // before FINAL
    return null;
  };

  return (
    <div className={cn("rounded-lg border border-surface-3 bg-surface-0 overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 py-2.5 bg-surface-1/50 border-b border-surface-3 flex items-center gap-2">
        <span className="text-table-sm font-semibold text-text-1">{item} {variant}</span>
        <span className="text-caption text-text-3">— {cnName}</span>
        <span className="text-caption text-text-3 ml-auto">Demand → Order Bridge</span>
      </div>

      {/* Steps */}
      <div className="relative px-4 py-3">
        {/* Vertical connector line */}
        <div className="absolute left-[26px] top-6 bottom-6 w-[2px] bg-surface-3" />

        <div className="space-y-0">
          {visibleSteps.map((step, idx) => {
            const divider = getDivider(idx);
            const isExpanded = expandedStep === idx;
            const stepNum = fromStep + idx + 1;

            return (
              <div key={idx}>
                {/* Divider before this step if applicable */}
                {idx > 0 && divider === "dashed" && (
                  <div className="ml-[14px] pl-6 my-1.5">
                    <div className="border-t border-dashed border-surface-3" />
                  </div>
                )}
                {idx > 0 && divider === "solid" && (
                  <div className="ml-[14px] pl-6 my-2">
                    <div className="border-t-2 border-surface-3" />
                  </div>
                )}

                {/* Step row */}
                <button
                  onClick={() => setExpandedStep(isExpanded ? null : idx)}
                  className={cn(
                    "w-full flex items-start gap-3 py-2 px-1 rounded-lg text-left transition-colors relative z-10",
                    "hover:bg-info/5",
                    isExpanded && accentBg[step.accent]
                  )}
                >
                  {/* Dot */}
                  <div className="flex-shrink-0 mt-1 relative">
                    <div className={cn("h-3 w-3 rounded-full border-2 border-white ring-2",
                      accentDot[step.accent],
                      step.isFinal ? "h-4 w-4 ring-primary" : `ring-${step.accent === 'blue' ? 'info' : step.accent === 'green' ? 'success' : step.accent === 'amber' ? 'warning' : 'danger'}/30`
                    )} style={{ boxShadow: `0 0 0 2px hsl(var(--${step.accent === 'blue' ? 'info' : step.accent === 'green' ? 'success' : step.accent === 'amber' ? 'warning' : 'danger'}) / 0.2)` }} />
                  </div>

                  {/* Operator */}
                  <span className="w-4 text-center font-mono text-table-sm font-bold text-text-3 mt-0.5 flex-shrink-0">
                    {step.operator}
                  </span>

                  {/* Label */}
                  <span className={cn("text-table-sm font-medium text-text-2 w-24 flex-shrink-0 mt-0.5", step.isFinal && "text-text-1 font-bold text-body")}>
                    {step.label}
                  </span>

                  {/* Value */}
                  <span className={cn(
                    "font-mono font-bold tabular-nums flex-shrink-0 mt-0.5",
                    step.isFinal ? "text-[18px] text-text-1" : "text-[13px] text-text-1"
                  )}>
                    {step.value < 0 ? "−" : ""}{Math.abs(step.value).toLocaleString()}
                  </span>

                  {/* Detail */}
                  <span className="text-caption text-text-3 mt-0.5 truncate flex-1 min-w-0">
                    {step.detail}
                  </span>

                  {/* Link + Logic */}
                  <span className="flex items-center gap-1 flex-shrink-0">
                    {step.logicTab !== undefined && (
                      <LogicLink tab={step.logicTab} node={step.logicNode} tooltip={step.label} />
                    )}
                  </span>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className={cn("ml-[38px] pl-3 py-2 mb-1 rounded-lg border", accentBg[step.accent], accentBorder[step.accent])} style={{ animationDuration: "150ms" }}>
                    {step.highlight && (
                      <p className="text-caption font-semibold text-warning mb-1">★ {step.highlight}</p>
                    )}
                    {step.explain && (
                      <p className="text-caption text-text-2 leading-relaxed">{step.explain}</p>
                    )}
                    {step.link && (
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(step.link!.to); }}
                        className="text-caption text-info font-medium underline mt-1 hover:text-info/80"
                      >
                        {step.link.label}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer summary */}
      {footer && (
        <div className="px-4 py-3 bg-surface-1/50 border-t border-surface-3">
          <p className="text-caption font-semibold text-text-1 mb-1">
            Demand {footer.demandQty.toLocaleString()} → Order {footer.orderQty.toLocaleString()}. Tại sao +{(footer.orderQty - footer.demandQty).toLocaleString()}?
          </p>
          <div className="space-y-0.5">
            {footer.reasons.map((r, i) => (
              <p key={i} className="text-[11px] text-text-2 font-mono">{r.label}: {r.value}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ Preset step builders ═══ */

export function buildFullBridgeSteps(data: {
  demand: number; fcPhased: number; cnAdj: number; po: number; overlap: number;
  onHand: number; pipeline: number; pipelineSource: string;
  ssTarget: number; zVal: number; sigma: number; lt: number;
  moq: number; moqNm: string; finalOrder: number; rpoNum: string;
}): BridgeStep[] {
  const grossGap = data.demand - data.onHand - data.pipeline;
  const netReq = grossGap + data.ssTarget;
  const surplus = data.finalOrder - netReq;

  return [
    {
      operator: "", label: "Demand", value: data.demand, accent: "blue",
      detail: `FC ${data.fcPhased} + CN adj +${data.cnAdj} + PO ${data.po} − overlap ${data.overlap}`,
      link: { label: "→ /demand", to: "/demand" },
      explain: "Tổng nhu cầu tháng/tuần này cho SKU này tại CN này.",
      logicTab: "monthly", logicNode: 0,
    },
    {
      operator: "−", label: "Tồn kho", value: -data.onHand, accent: "green",
      detail: `Tồn kho hiện tại (WMS sync 14:32)`,
      link: { label: "→ /monitoring", to: "/monitoring" },
      explain: "Hàng đang có sẵn trong kho CN.",
    },
    {
      operator: "−", label: "Đang về", value: -data.pipeline, accent: "green",
      detail: `${data.pipelineSource}`,
      link: { label: "→ /orders", to: "/orders" },
      explain: "Hàng đã đặt NM, đang trên đường về.",
    },
    {
      operator: "=", label: "Chênh lệch", value: grossGap, accent: "amber",
      detail: `${data.demand} − ${data.onHand} − ${data.pipeline} = ${grossGap} (CHƯA tính SS)`,
      highlight: grossGap <= 0 ? "Nếu KHÔNG có SS: đủ hàng, KHÔNG cần đặt thêm." : undefined,
      explain: "Nhu cầu trừ hàng có. Âm = đủ hàng. Dương = thiếu hàng.",
    },
    {
      operator: "+", label: "Safety Stock", value: data.ssTarget, accent: "red",
      detail: `z(${data.zVal}) × σ(${data.sigma}) × √LT(${data.lt}) = ${data.ssTarget}`,
      link: { label: "→ /drp Lớp 3", to: "/drp" },
      highlight: "SS là lý do chính đặt NHIỀU HƠN demand.",
      explain: `Dự phòng forecast sai. Đảm bảo ${Math.round((1 - (1 / (1 + data.zVal))) * 100)}% không hết hàng. Xem chi tiết tại /logic tab 4.`,
      logicTab: "ss", logicNode: 0,
    },
    {
      operator: "=", label: "Cần đặt NM", value: netReq, accent: "amber",
      detail: `${grossGap} + ${data.ssTarget} = ${netReq}m²`,
      link: { label: "→ /sop tab 2", to: "/sop" },
      explain: "Số lượng cần đặt nhà máy, CHƯA round MOQ.",
      logicTab: "monthly", logicNode: 2,
    },
    {
      operator: "↑", label: "MOQ round", value: data.finalOrder, accent: "red",
      detail: `${data.moqNm} MOQ ${data.moq.toLocaleString()}. ceil(${netReq}÷${data.moq.toLocaleString()})×${data.moq.toLocaleString()}`,
      link: { label: "→ /hub MOQ", to: "/hub" },
      highlight: `MOQ là lý do thứ hai đặt nhiều hơn. Surplus ${surplus} dùng tuần sau.`,
      explain: `NM chỉ nhận đơn tối thiểu ${data.moq.toLocaleString()}m²/container.`,
      logicTab: "monthly", logicNode: 3,
    },
    {
      operator: "=", label: "ĐẶT HÀNG", value: data.finalOrder, accent: "blue", isFinal: true,
      detail: `${data.rpoNum}. Surplus ${surplus} → trừ tuần sau.`,
      link: { label: "→ /orders", to: "/orders" },
      explain: `Đơn hàng chính thức gửi ${data.moqNm}.`,
    },
  ];
}

/** Mini bridge for Hub MOQ: only steps 6-8 (Net req → MOQ → Final) */
export function buildMiniBridgeSteps(data: {
  netReq: number; moq: number; moqNm: string; finalOrder: number; rpoNum: string;
}): BridgeStep[] {
  const surplus = data.finalOrder - data.netReq;
  return [
    {
      operator: "=", label: "Net req", value: data.netReq, accent: "amber",
      detail: `Từ DRP netting`,
      logicTab: "daily", logicNode: 2,
    },
    {
      operator: "↑", label: "MOQ round", value: data.finalOrder, accent: "red",
      detail: `${data.moqNm} MOQ ${data.moq.toLocaleString()}. ceil(${data.netReq}÷${data.moq.toLocaleString()})×${data.moq.toLocaleString()}`,
      highlight: surplus > 0 ? `Surplus ${surplus} dùng tuần sau.` : undefined,
      logicTab: "monthly", logicNode: 3,
    },
    {
      operator: "=", label: "ĐẶT HÀNG", value: data.finalOrder, accent: "blue", isFinal: true,
      detail: `${data.rpoNum}. Surplus ${surplus > 0 ? surplus : 0} → trừ tuần sau.`,
    },
  ];
}
