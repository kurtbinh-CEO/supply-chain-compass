import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";

interface Props { tenant: string }

const tenantScale: Record<string, number> = { "UNIS Group": 1, "TTC Agris": 0.75, "Mondelez": 1.2 };

interface MetricRow { metric: string; aop: string; sop: string; delta: string; deltaPct: string; status: string; statusColor: string }

function getMetrics(s: number): MetricRow[] {
  return [
    { metric: "Volume (m²)", aop: `${Math.round(5200 * s).toLocaleString()}`, sop: `${Math.round(7650 * s).toLocaleString()}`, delta: `+${Math.round(2450 * s).toLocaleString()}`, deltaPct: "+47%", status: "Over AOP", statusColor: "text-danger" },
    { metric: "Revenue (₫)", aop: `${(15.6 * s).toFixed(1)}B`, sop: `${(22.9 * s).toFixed(1)}B`, delta: `+${(7.3 * s).toFixed(1)}B`, deltaPct: "+47%", status: "Escalate Board", statusColor: "text-danger" },
    { metric: "WC impact (₫)", aop: `${(1.0 * s).toFixed(1)}B`, sop: `${(1.5 * s).toFixed(1)}B`, delta: `+${(0.5 * s).toFixed(1)}B`, deltaPct: "+50%", status: "Over budget", statusColor: "text-warning" },
    { metric: "Margin %", aop: "28.5%", sop: "26.2%", delta: "−2.3pp", deltaPct: "", status: "Watch", statusColor: "text-warning" },
  ];
}

const baseMonthlyAop = [4500, 4200, 4500, 5000, 5200, 5100, 5000, 5500, 4800, 5200, 3800, 3500];
const baseMonthlyActual = [4200, 3800, 4100, 7280, 7650, 0, 0, 0, 0, 0, 0, 0];
const monthLabels = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];

export function AopFinanceTab({ tenant }: Props) {
  const s = tenantScale[tenant] || 1;
  const metrics = getMetrics(s);

  const chartData = monthLabels.map((m, i) => ({
    name: m,
    AOP: Math.round(baseMonthlyAop[i] * s),
    Actual: Math.round(baseMonthlyActual[i] * s),
  }));

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="font-display text-screen-title text-text-1">AOP & Tài chính — Reconciliation</h2>
        <p className="text-table text-text-2">So sánh S&OP consensus vs AOP target — impact tài chính.</p>
      </div>

      {/* Metrics table */}
      <div className="rounded-card border border-surface-3 bg-surface-2">
        <div className="px-5 py-3 border-b border-surface-3">
          <h3 className="font-display text-section-header text-text-1">Financial Summary — Tháng 5</h3>
        </div>
        <table className="w-full text-table-sm">
          <thead>
            <tr className="border-b border-surface-3 bg-surface-1/50">
              {["Metric", "AOP target", "S&OP consensus", "Delta", "Status"].map(h => (
                <th key={h} className="px-5 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((m, i) => (
              <tr key={i} className="border-b border-surface-3/50 hover:bg-primary/5 transition-colors">
                <td className="px-5 py-3 font-medium text-text-1">{m.metric}</td>
                <td className="px-5 py-3 tabular-nums text-text-2">{m.aop}</td>
                <td className="px-5 py-3 tabular-nums font-medium text-text-1">{m.sop}</td>
                <td className="px-5 py-3 tabular-nums font-medium text-danger">
                  {m.delta} {m.deltaPct && <span className="text-text-3">({m.deltaPct})</span>} 🔴
                </td>
                <td className="px-5 py-3">
                  <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-bold",
                    m.statusColor === "text-danger" ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning"
                  )}>{m.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AOP gap chart */}
      <div className="rounded-card border border-surface-3 bg-surface-2 p-5">
        <h3 className="font-display text-section-header text-text-1 mb-3">AOP Target vs Actual — 12 tháng</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e9ff" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e0e9ff", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="AOP" name="AOP Target" fill="#e0e9ff" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Actual" name="Actual/S&OP" radius={[4, 4, 0, 0]}>
              {chartData.map((e, i) => (
                <Cell key={i} fill={e.Actual > 0 ? (e.Actual > e.AOP ? "#ef4444" : "#059669") : "#d1d5db"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 text-caption text-text-3">
          <span>T1-T4: Actual (closed)</span>
          <span>T5: S&OP consensus</span>
          <span>T6-T12: Pending</span>
        </div>
      </div>

      {/* Decision area */}
      <div className="rounded-card border border-warning/30 bg-warning-bg p-5">
        <h3 className="font-display text-section-header text-warning mb-3">⚠ AOP Gap Decision Required</h3>
        <p className="text-table text-text-2 mb-4">
          S&OP consensus +47% vs AOP. Revenue gap +{(7.3 * s).toFixed(1)}B₫. WC over budget +{(0.5 * s).toFixed(1)}B₫.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { num: "1", label: "Sales justify gap", desc: "Demand team cung cấp business case cho over-AOP", color: "border-info text-info" },
            { num: "2", label: "SC add buffer", desc: "Supply chain bổ sung safety stock + pipeline buffer", color: "border-success text-success" },
            { num: "3", label: "Escalate Board AOP revision", desc: "Trình board phê duyệt điều chỉnh AOP 2026", color: "border-danger text-danger" },
          ].map(opt => (
            <button key={opt.num} className={cn("rounded-card border-2 bg-surface-2 p-4 text-left hover:bg-surface-1/50 transition-colors", opt.color)}>
              <div className={cn("font-display text-body font-bold", opt.color.split(" ")[1])}>Option {opt.num}</div>
              <div className="text-table font-medium text-text-1 mt-1">{opt.label}</div>
              <div className="text-caption text-text-3 mt-1">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
