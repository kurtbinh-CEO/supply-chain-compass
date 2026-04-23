import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────── */
/* Flywheel — 4 nodes in a circle: FC → SS → Capital → Reinvest               */
/* ─────────────────────────────────────────────────────────────────────────── */

const flywheelNodes = [
  {
    key: "FC",
    label: "FC chính xác hơn",
    detail: "MAPE 18 → 14%",
    pos: "top-0 left-1/2 -translate-x-1/2",
    color: "bg-info-bg text-info border-info/30",
  },
  {
    key: "SS",
    label: "SS giảm",
    detail: "−2.300m² network",
    pos: "top-1/2 right-0 -translate-y-1/2",
    color: "bg-success-bg text-success border-success/30",
  },
  {
    key: "Capital",
    label: "Vốn lưu động giảm",
    detail: "425M₫/tháng",
    pos: "bottom-0 left-1/2 -translate-x-1/2",
    color: "bg-warning-bg text-warning border-warning/30",
  },
  {
    key: "Reinvest",
    label: "Tái đầu tư FC/AI",
    detail: "→ chu kỳ mới",
    pos: "top-1/2 left-0 -translate-y-1/2",
    color: "bg-primary/10 text-primary border-primary/30",
  },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/* Feedback loop visual — circular: FC → SS → DRP → PO → Actual → FC          */
/* ─────────────────────────────────────────────────────────────────────────── */

const loopNodes = [
  { key: "FC", label: "FC", metric: "MAPE 18%" },
  { key: "SS", label: "SS", metric: "−13,6%" },
  { key: "DRP", label: "DRP", metric: "Fill 95,5%" },
  { key: "PO", label: "PO", metric: "On-time 78%" },
  { key: "Actual", label: "Actual", metric: "FVA +12%" },
];

export function RoiFlywheelTab() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 4 KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Vốn lưu động"
          value="1,2"
          unit="tỷ ₫"
          trend={{ value: "20% vượt mục tiêu", positive: false }}
        />
        <KpiCard
          title="Tiết kiệm tháng này"
          value="507"
          unit="triệu ₫"
          trend={{ value: "+58 triệu vs T3", positive: true }}
        />
        <KpiCard title="Vòng quay tồn kho" value="4,8" unit="x/năm" trend={{ value: "+0,6", positive: true }} />
        <KpiCard
          title="Mức phục vụ"
          value="95,5"
          unit="%"
          trend={{ value: "→ ổn định", positive: true }}
        />
      </div>

      {/* Savings breakdown */}
      <div className="rounded-card border border-surface-3 bg-success-bg/30 p-5">
        <h3 className="font-display text-body font-semibold text-success mb-2">
          💰 Savings breakdown — 507M₫/tháng
        </h3>
        <p className="text-table text-text-1">
          SS giảm 2.300m² × 185K = <span className="font-semibold">425M₫</span> + LCNB{" "}
          <span className="font-semibold">82M₫</span> ={" "}
          <span className="font-semibold text-success">507M₫/tháng</span>
        </p>
      </div>

      {/* Flywheel visual */}
      <div className="rounded-card border border-surface-3 bg-surface-2 p-5">
        <h3 className="font-display text-body font-semibold text-text-1 mb-4">
          🔄 Bánh đà cải tiến — FC → SS → Vốn → Tái đầu tư
        </h3>
        <div className="relative mx-auto w-full max-w-[480px] aspect-square">
          {/* Center label */}
          <div className="absolute inset-1/4 rounded-full border-2 border-dashed border-primary/40 bg-surface-1 flex flex-col items-center justify-center">
            <span className="font-display text-section-header text-primary">Bánh đà</span>
            <span className="text-caption text-text-3 mt-1">Tự gia tốc</span>
          </div>

          {/* 4 nodes */}
          {flywheelNodes.map((n) => (
            <div
              key={n.key}
              className={cn(
                "absolute w-32 h-32 rounded-full border-2 flex flex-col items-center justify-center text-center p-2 shadow-sm",
                n.pos,
                n.color
              )}
            >
              <span className="font-display text-table font-semibold leading-tight">
                {n.label}
              </span>
              <span className="text-caption mt-1 opacity-80">{n.detail}</span>
            </div>
          ))}

          {/* Rotating arrows (CSS) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
            <defs>
              <marker
                id="arr"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="4"
                markerHeight="4"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" />
              </marker>
            </defs>
            <circle
              cx="50"
              cy="50"
              r="34"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="0.5"
              strokeDasharray="2 2"
              markerEnd="url(#arr)"
              transform="rotate(-90 50 50)"
              opacity="0.5"
            />
          </svg>
        </div>
      </div>

      {/* Feedback loop visual — bottom of ROI tab */}
      <div className="rounded-card border border-surface-3 bg-surface-2 p-5">
        <h3 className="font-display text-body font-semibold text-text-1 mb-1">
          Vòng phản hồi — FC → SS → DRP → PO → Actual → FC
        </h3>
        <p className="text-table-sm text-text-2 mb-5">
          Mỗi node đo bằng 1 chỉ số. Khi vòng đóng → chu kỳ kế hoạch mới bắt đầu.
        </p>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          {loopNodes.map((n, i) => (
            <div key={n.key} className="flex items-center gap-2">
              <div className="rounded-card border-2 border-primary/30 bg-primary/5 px-4 py-3 text-center min-w-[110px]">
                <div className="font-display text-body font-bold text-primary">{n.label}</div>
                <div className="text-caption text-text-2 mt-1 tabular-nums">{n.metric}</div>
              </div>
              {i < loopNodes.length - 1 && (
                <ArrowRight className="h-5 w-5 text-primary shrink-0" />
              )}
              {i === loopNodes.length - 1 && (
                <div className="flex items-center gap-1 text-primary">
                  <ArrowRight className="h-5 w-5" />
                  <span className="text-caption font-medium">về FC</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate("/demand")}
          className="mt-5 w-full rounded-card bg-primary text-primary-foreground px-4 py-3 text-table font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          🔄 Chu kỳ mới bắt đầu — sang Demand Review
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
