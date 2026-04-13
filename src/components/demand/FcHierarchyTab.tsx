import { StatusChip } from "@/components/StatusChip";
import { Download } from "lucide-react";

const levels = [
  { id: "01", name: "AOP: Strategic", desc: "Strategic Annual Operating Plan focused on high-level financial targets and total volume capacity.", w: 220, color: "#2563EB" },
  { id: "02", name: "S&OP: Consensus", desc: "Monthly Sales & Operations Planning. Cross-functional alignment on demand forecast and supply constraints.", w: 280, color: "#2563EB" },
  { id: "03", name: "MPS: Production", desc: "Master Production Schedule executed on a weekly cadence to stabilize manufacturing line schedules.", w: 340, color: "#2563EB" },
  { id: "04", name: "DRP: Distribution", desc: "Daily Distribution Requirements Planning. Balancing inventory across the network to meet local demand.", w: 400, color: "#2563EB" },
  { id: "05", name: "Actual: Sales", desc: "Sales & Invoiced execution tracking real-time market performance against the plan levels.", w: 460, color: "#64748b" },
];

const metrics = [
  { level: "AOP", cadence: "Annual", owner: "Finance / CEO", mape: "+/- 5.0%", status: "Aligned" as const },
  { level: "S&OP", cadence: "Monthly", owner: "Supply Chain Lead", mape: "+/- 12.0%", status: "Aligned" as const },
  { level: "MPS", cadence: "Weekly", owner: "Plant Manager", mape: "+/- 18.5%", status: "Review" as const },
  { level: "DRP", cadence: "Daily", owner: "Logistics / Dist.", mape: "+/- 25.0%", status: "Aligned" as const },
];

export function FcHierarchyTab() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-table-header uppercase text-primary font-medium tracking-wider mb-1">🏛️ Network Architecture</p>
        <h2 className="font-display text-screen-title text-text-1">FC Hierarchy</h2>
        <p className="text-table text-text-2 mt-1">Visualizing the structural flow from strategic enterprise planning to tactical execution across the supply chain network.</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Pyramid SVG */}
        <div className="rounded-card border border-surface-3 bg-gradient-to-b from-surface-1 to-surface-2 p-6 flex items-center justify-center">
          <svg viewBox="0 0 500 380" className="w-full max-w-md">
            {levels.map((l, i) => {
              const y = 20 + i * 72;
              const x = (500 - l.w) / 2;
              const isActual = i === levels.length - 1;
              return (
                <g key={l.id}>
                  <rect x={x} y={y} width={l.w} height={58} rx={8}
                    fill={isActual ? "#64748b" : "#2563EB"} opacity={isActual ? 0.85 : 1 - i * 0.12} />
                  <text x={250} y={y + 28} textAnchor="middle" fill="white" fontWeight="700" fontSize="15" fontFamily="Manrope">{l.name.split(":")[0]}</text>
                  <text x={250} y={y + 46} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="10" fontFamily="Inter">
                    {l.name.includes("AOP") ? "STRATEGIC" : l.name.includes("S&OP") ? "MONTHLY" : l.name.includes("MPS") ? "WEEKLY" : l.name.includes("DRP") ? "DAILY / SHIPMENT" : "EXECUTION"}
                  </text>
                </g>
              );
            })}
            {/* Net Requirements callout */}
            <rect x={355} y={283} width={130} height={32} rx={6} fill="#e8f4fd" stroke="#2563EB" strokeWidth={1} />
            <text x={420} y={295} textAnchor="middle" fill="#0c4a6e" fontSize="9" fontFamily="Inter">NET REQUIREMENTS</text>
            <text x={420} y={308} textAnchor="middle" fill="#2563EB" fontSize="11" fontWeight="600" fontFamily="JetBrains Mono">Max(FC, PO)</text>
          </svg>
        </div>

        {/* Definitions */}
        <div className="rounded-card border border-surface-3 bg-surface-2 p-5 space-y-4">
          <h3 className="font-display text-section-header text-text-1 flex items-center gap-2">🏷️ Hierarchy Definitions</h3>
          <div className="space-y-4">
            {levels.map(l => (
              <div key={l.id} className="flex gap-3">
                <span className="flex-none w-8 h-8 rounded-full bg-primary/10 text-primary font-display font-bold text-table flex items-center justify-center">{l.id}</span>
                <div>
                  <h4 className="text-table font-medium text-text-1">{l.name}</h4>
                  <p className="text-table-sm text-text-2 mt-0.5">{l.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Core Calculation Logic card */}
      <div className="rounded-card bg-gradient-to-br from-[#1e293b] to-[#334155] p-6 text-white">
        <p className="text-table-header uppercase tracking-wider text-white/60 mb-2">Core Calculation Logic</p>
        <h3 className="font-display text-xl font-bold">Dual Demand Netting</h3>
        <p className="text-table text-white/80 mt-2 max-w-2xl">
          At the DRP (tactical) level, the system automatically uses the <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono">Max(Forecast, PO)</code> logic
          to ensure supply covers both predicted demand and committed customer orders.
        </p>
        <div className="flex items-center gap-2 mt-4 text-table text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Prevents under-stocking during high-volume spikes
        </div>
      </div>

      {/* Metrics table */}
      <div className="rounded-card border border-surface-3 bg-surface-2">
        <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
          <div>
            <h2 className="font-display text-section-header text-text-1">Hierarchy Performance Metrics</h2>
            <p className="text-table-sm text-text-2 mt-0.5">Forecast Accuracy vs. Actual Execution by Planning Level</p>
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-0 px-3 py-1.5 text-table-sm text-text-2 hover:bg-surface-3 transition-colors">
            <Download className="h-3.5 w-3.5" /> Export Report
          </button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-3 bg-surface-1">
              {["Planning Level", "Cadence", "Primary Owner", "MAPE Target", "Status"].map(h => (
                <th key={h} className="text-left text-table-header uppercase text-text-3 px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((m, i) => (
              <tr key={m.level} className={`border-b border-surface-3/50 ${i % 2 === 0 ? "bg-surface-0" : "bg-surface-2"} hover:bg-primary/5 transition-colors`}>
                <td className="px-5 py-3 text-table font-bold text-text-1">{m.level}</td>
                <td className="px-5 py-3 text-table text-text-2">{m.cadence}</td>
                <td className="px-5 py-3 text-table text-text-2">{m.owner}</td>
                <td className="px-5 py-3 text-table font-mono tabular-nums text-text-1">{m.mape}</td>
                <td className="px-5 py-3">
                  <StatusChip status={m.status === "Aligned" ? "success" : "danger"} label={m.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
