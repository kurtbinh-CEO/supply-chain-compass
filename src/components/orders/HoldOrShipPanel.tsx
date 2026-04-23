import { useState } from "react";
import { Sparkles, Truck, PauseCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  TRANSPORT_PLANS,
  BRANCHES,
  SKU_BASES,
  FACTORIES,
  type TransportPlan,
} from "@/data/unis-enterprise-dataset";

const fmt = (n: number) => `${n.toLocaleString("vi-VN")} m²`;

function nodeName(code: string): string {
  if (code.startsWith("NM-")) {
    const nm = FACTORIES.find((f) => f.code === code);
    return nm ? nm.name : code;
  }
  return BRANCHES.find((b) => b.code === code)?.name ?? code;
}

/** Hand-tuned per-CN HSTK (days) used for the hold-vs-ship decision rule. */
const CN_HSTK_DAYS: Record<string, number> = {
  "CN-HN": 5.2, "CN-HCM": 4.1, "CN-DN": 6.8, "CN-CT": 7.2, "CN-NA": 3.4,
  "CN-NT": 4.8, "CN-HP": 6.0, "CN-BMT": 2.6, "CN-LA": 5.8, "CN-PK": 7.5,
  "CN-QN": 5.0, "CN-BD": 8.2,
};

const TRANSIT_BUFFER_DAYS = 1;
function transitDays(plan: TransportPlan): number {
  // Approximate: 20ft = 2 days, 40ft = 3 days. Real impl reads route table.
  return plan.containerType === "20ft" ? 2 : 3;
}

/** Stable top-up suggestions per plan (same NM family, SS gần ngưỡng). */
function topUpFor(plan: TransportPlan): { sku: string; tail: string; qty: number; reason: string }[] {
  const seed = plan.id.charCodeAt(plan.id.length - 1);
  const tails = ["A4", "B2", "N1", "C1"];
  const candidates = SKU_BASES.slice(0, 6);
  return [0, 1, 2].map((i) => {
    const c = candidates[(seed + i) % candidates.length];
    return {
      sku: c.code,
      tail: tails[(seed + i) % tails.length],
      qty: 80 + ((seed + i * 17) % 6) * 20,
      reason:
        i === 0
          ? "SS gần ngưỡng, cùng NM"
          : i === 1
          ? "Demand spike tuần 21"
          : "Tận dụng container chưa đầy",
    };
  });
}

function StatusBadge({ plan, decision }: { plan: TransportPlan; decision: "ship" | "hold" }) {
  const fillTone =
    plan.fillPct < 60
      ? "bg-warning-bg text-warning border-warning/30"
      : plan.fillPct < 85
      ? "bg-info-bg text-primary border-primary/30"
      : "bg-success-bg text-success border-success/30";
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className={cn("rounded-full border px-2 py-0.5 text-caption font-semibold", fillTone)}>
        Fill {plan.fillPct}%
      </span>
      {decision === "ship" ? (
        <span className="rounded-full border px-2 py-0.5 text-caption font-semibold bg-danger-bg text-danger border-danger/30 inline-flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> XUẤT NGAY
        </span>
      ) : (
        <span className="rounded-full border px-2 py-0.5 text-caption font-semibold bg-warning-bg text-warning border-warning/30">
          CÓ THỂ GIỮ
        </span>
      )}
    </div>
  );
}

export function HoldOrShipPanel() {
  const [actioned, setActioned] = useState<Record<string, "ship" | "hold" | undefined>>({});

  const plans = TRANSPORT_PLANS;

  return (
    <div className="rounded-card border border-surface-3 bg-surface-0 p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-text-2" />
          <p className="text-table-sm font-semibold text-text-1">Quyết định Giữ / Xuất container</p>
          <span className="text-caption text-text-3">
            HSTK CN ≤ Vận chuyển + Đệm {TRANSIT_BUFFER_DAYS}n → tự động XUẤT
          </span>
        </div>
        <span className="text-caption text-text-3">{plans.length} container chờ quyết định</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {plans.map((p) => {
          const cnHstk = CN_HSTK_DAYS[p.toCnCode] ?? 4;
          const tDays = transitDays(p);
          const headroom = cnHstk - (tDays + TRANSIT_BUFFER_DAYS);
          const autoShip = headroom <= 0;
          const decision: "ship" | "hold" = autoShip ? "ship" : "hold";
          const acted = actioned[p.id];
          const topUps = topUpFor(p);

          return (
            <div
              key={p.id}
              className={cn(
                "rounded-card border bg-surface-1 p-3 space-y-3",
                autoShip ? "border-danger/40" : "border-surface-3"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-text-1 text-table-sm">{p.id}</p>
                  <p className="text-caption text-text-3 truncate">
                    {nodeName(p.fromCode)} → {nodeName(p.toCnCode)} · {p.containerType}
                  </p>
                </div>
                <StatusBadge plan={p} decision={decision} />
              </div>

              <div className="rounded-button bg-surface-2 px-2.5 py-2 text-caption text-text-2 leading-relaxed">
                CN HSTK <span className="font-semibold text-text-1">{cnHstk}</span> ngày
                {autoShip ? " ≤ " : " > "}
                Vận chuyển <span className="font-semibold">{tDays}</span> + Đệm{" "}
                <span className="font-semibold">{TRANSIT_BUFFER_DAYS}</span>
                {" → "}
                <span className={cn("font-semibold", autoShip ? "text-danger" : "text-warning")}>
                  {autoShip ? "phải XUẤT NGAY" : "có thể GIỮ 1–2 ngày"}
                </span>
              </div>

              <div>
                <p className="text-caption text-text-3 uppercase tracking-wider mb-1">Gợi ý gom thêm</p>
                <ul className="text-caption text-text-2 space-y-0.5">
                  {topUps.map((t, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <Sparkles className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                      <span>
                        <span className="font-mono text-text-1">{t.sku}</span> · {t.tail} · {fmt(t.qty)} —{" "}
                        <span className="text-text-3 italic">{t.reason}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setActioned((s) => ({ ...s, [p.id]: "ship" }));
                    toast.success(`Đã xác nhận XUẤT ${p.id}`, {
                      description: `${nodeName(p.fromCode)} → ${nodeName(p.toCnCode)} · ${fmt(p.loadedM2)}`,
                    });
                  }}
                  className={cn(
                    "flex-1 rounded-button px-3 py-1.5 text-table-sm font-medium transition-colors",
                    acted === "ship"
                      ? "bg-success text-primary-foreground"
                      : autoShip
                      ? "bg-gradient-primary text-primary-foreground"
                      : "border border-surface-3 bg-surface-0 text-text-1 hover:bg-surface-2"
                  )}
                >
                  <Truck className="inline h-3.5 w-3.5 mr-1" />
                  XUẤT ngay
                </button>
                <button
                  disabled={autoShip}
                  onClick={() => {
                    setActioned((s) => ({ ...s, [p.id]: "hold" }));
                    toast(`Giữ ${p.id} 1–2 ngày để gom hàng`, {
                      description: `Sẽ kiểm tra lại fill rate sau 24h.`,
                    });
                  }}
                  className={cn(
                    "flex-1 rounded-button px-3 py-1.5 text-table-sm font-medium transition-colors border",
                    autoShip && "opacity-40 cursor-not-allowed",
                    acted === "hold"
                      ? "bg-warning text-primary-foreground border-warning"
                      : "border-surface-3 bg-surface-0 text-text-1 hover:bg-surface-2"
                  )}
                >
                  <PauseCircle className="inline h-3.5 w-3.5 mr-1" />
                  GIỮ 1–2 ngày
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
