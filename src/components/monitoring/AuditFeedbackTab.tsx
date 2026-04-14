import { useState } from "react";
import { cn } from "@/lib/utils";
import { StatusChip } from "@/components/StatusChip";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, Legend } from "recharts";
import { ArrowRight, Zap, Shield, Target, Box, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Period = "Tháng" | "Quý" | "YTD";

function PeriodFilter({ value, onChange }: { value: Period; onChange: (v: Period) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Period)}
      className="h-8 rounded-button border border-surface-3 bg-surface-0 px-3 text-table-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <option value="Tháng">Tháng</option>
      <option value="Quý">Quý</option>
      <option value="YTD">YTD</option>
    </select>
  );
}

function FeedForwardCard({ title, description, linkLabel, linkUrl }: { title: string; description: string; linkLabel: string; linkUrl: string }) {
  const navigate = useNavigate();
  return (
    <div className="rounded-card bg-info-bg border border-info/20 border-l-4 border-l-primary p-4 space-y-2">
      <h4 className="font-display text-table font-semibold text-text-1">{title}</h4>
      <p className="text-table-sm text-text-2">{description}</p>
      <button onClick={() => navigate(linkUrl)} className="inline-flex items-center gap-1 text-primary text-table-sm font-medium hover:underline">
        {linkLabel} <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

// Section A Data
const demandAudit = [
  { category: "Finished Goods", plan: "1,240.5", actual: "1,215.2", bias: "-2.0%", fva: "+4.2%" },
  { category: "Raw Materials", plan: "890.0", actual: "945.8", bias: "+6.2%", fva: "+1.8%" },
  { category: "Packaging", plan: "459.2", actual: "448.0", bias: "-0.5%", fva: "+0.9%" },
];

// Section B Data
const supplyPerf = [
  { node: "VN Central Hub", honoring: "98.5%", onTime: "94.0%", ltGap: "-0.2", grade: "A+" },
  { node: "North Sourcing", honoring: "82.1%", onTime: "78.5%", ltGap: "+2.5", grade: "C-" },
  { node: "East Gateway", honoring: "91.0%", onTime: "89.2%", ltGap: "0.0", grade: "B" },
];

// Section C Data
const topExceptions = [
  { sku: "SKU-7728: Stockout imminent", location: "Warehouse A", count: "12 occurrences" },
  { sku: "SKU-9102: Late Arrival Forecast", location: "In-Transit", count: "8 occurrences" },
  { sku: "SKU-1029: Price Variance Alert", location: "Procurement", count: "5 occurrences" },
];

// Section D Data
const inventoryHealth = [
  { channel: "Modern Trade", target: "$4.2M", actual: "$3.9M", stockout: "Moderate", adequacy: "92%" },
  { channel: "E-Commerce", target: "$2.8M", actual: "$3.1M", stockout: "Low", adequacy: "104%" },
  { channel: "General Trade", target: "$1.5M", actual: "$1.1M", stockout: "High", adequacy: "76%" },
];

// Section E Waterfall Data
const waterfallData = [
  { name: "Base Cost", value: 0, total: 245 },
  { name: "Freight", value: 0, total: 24.5 },
  { name: "Stockout", value: 0, total: 112 },
  { name: "SS Optim", value: 0, total: -45.1 },
  { name: "Net Plan", value: 0, total: 0 },
];

const waterfallChartData = [
  { name: "Base Cost", positive: 245, negative: 0 },
  { name: "Freight", positive: 24.5, negative: 0 },
  { name: "Stockout", positive: 112, negative: 0 },
  { name: "SS Optim", positive: 0, negative: 45.1 },
  { name: "Net Plan", positive: 336.4, negative: 0 },
];

export function AuditFeedbackTab() {
  const [periodA, setPeriodA] = useState<Period>("Tháng");
  const [periodB, setPeriodB] = useState<Period>("Tháng");
  const [periodC, setPeriodC] = useState<Period>("Tháng");
  const [periodD, setPeriodD] = useState<Period>("Tháng");
  const [periodE, setPeriodE] = useState<Period>("Tháng");

  return (
    <div className="space-y-6">
      {/* A: Demand Accuracy Audit */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 rounded-card border border-surface-3 bg-surface-2">
          <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <h2 className="font-display text-section-header text-text-1">A) Demand Accuracy Audit</h2>
            </div>
            <div className="flex items-center gap-2">
              <StatusChip status="success" label="Stable" />
              <PeriodFilter value={periodA} onChange={setPeriodA} />
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-3">
                {["Category", "Plan (K Units)", "Actual (K Units)", "Bias %", "FVA % (Best)"].map((h) => (
                  <th key={h} className="text-left text-table-header uppercase text-text-3 px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {demandAudit.map((r, i) => (
                <tr key={r.category} className={cn("border-b border-surface-3/50", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                  <td className="px-5 py-3 text-table font-medium text-text-1">{r.category}</td>
                  <td className="px-5 py-3 text-table text-text-2 tabular-nums">{r.plan}</td>
                  <td className="px-5 py-3 text-table text-text-2 tabular-nums">{r.actual}</td>
                  <td className={cn("px-5 py-3 text-table font-medium tabular-nums", r.bias.startsWith("-") ? "text-danger" : "text-success")}>{r.bias}</td>
                  <td className="px-5 py-3 text-table font-medium text-success tabular-nums">{r.fva}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="col-span-2 space-y-4">
          <div className="rounded-card border border-surface-3 bg-surface-2 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-info" />
              <span className="text-table-header uppercase text-info font-semibold tracking-wider">Trust Insights</span>
            </div>
            <h3 className="font-display text-section-header text-text-1">Model Trust Scores</h3>
            <p className="text-table text-text-2">
              System trust in ML forecast for Raw Materials has dropped by 12% due to consistent under-planning.
              Recommending manual adjustment for Q3.
            </p>
            <div className="flex items-center justify-between pt-2">
              <span className="text-table-sm text-text-2">Confidence Level</span>
              <span className="text-table font-bold text-primary">82%</span>
            </div>
            <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: "82%" }} />
            </div>
          </div>
          <FeedForwardCard
            title="Forecast Adjustment"
            description="Consider increasing Raw Materials buffer by 6% for Q3."
            linkLabel="Go to Config"
            linkUrl="/config"
          />
        </div>
      </div>

      {/* B: Supply Performance Metrics */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2 rounded-card border border-surface-3 bg-surface-2 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-warning" />
            <span className="text-table-header uppercase text-warning font-semibold tracking-wider">Automation Hub</span>
          </div>
          <h3 className="font-display text-section-header text-text-1">ATP Auto-Discount</h3>
          <p className="text-table text-text-2">
            Supplier "NM Logistics" is showing a 15% drop in LT honoring. System has triggered a 5% ATP discount for future orders from this node.
          </p>
          <button className="inline-flex items-center gap-1 rounded-button border border-primary text-primary px-4 py-2 text-table font-medium hover:bg-info-bg transition-colors">
            View Supplier Rankings
          </button>
        </div>
        <div className="col-span-3 rounded-card border border-surface-3 bg-surface-2">
          <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Box className="h-4 w-4 text-text-2" />
              <h2 className="font-display text-section-header text-text-1">B) Supply Performance Metrics</h2>
            </div>
            <PeriodFilter value={periodB} onChange={setPeriodB} />
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-3">
                {["Node", "Honoring %", "On-Time %", "LT Gap (Days)", "Grade"].map((h) => (
                  <th key={h} className="text-left text-table-header uppercase text-text-3 px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {supplyPerf.map((r, i) => (
                <tr key={r.node} className={cn("border-b border-surface-3/50", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                  <td className="px-5 py-3 text-table font-medium text-text-1">{r.node}</td>
                  <td className="px-5 py-3 text-table text-text-1 tabular-nums">{r.honoring}</td>
                  <td className="px-5 py-3 text-table text-text-1 tabular-nums">{r.onTime}</td>
                  <td className={cn("px-5 py-3 text-table font-medium tabular-nums", r.ltGap.startsWith("+") ? "text-danger" : r.ltGap === "0.0" ? "text-text-2" : "text-success")}>{r.ltGap}</td>
                  <td className="px-5 py-3">
                    <span className={cn(
                      "inline-flex items-center justify-center h-7 w-9 rounded-md text-table-sm font-bold border",
                      r.grade.startsWith("A") ? "border-success text-success bg-success-bg" :
                      r.grade.startsWith("B") ? "border-info text-info bg-info-bg" :
                      "border-danger text-danger bg-danger-bg"
                    )}>
                      {r.grade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* C: Execution & Exception Analysis */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 rounded-card border border-surface-3 bg-surface-2">
          <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-text-2" />
              <h2 className="font-display text-section-header text-text-1">C) Execution & Exception Analysis</h2>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-table-header uppercase text-text-3">Fill Rate</p>
                <p className="font-display text-kpi text-text-1">96.8%</p>
              </div>
              <div className="text-center">
                <p className="text-table-header uppercase text-text-3">Resolve Time</p>
                <p className="font-display text-kpi text-text-1">4.2h</p>
              </div>
              <PeriodFilter value={periodC} onChange={setPeriodC} />
            </div>
          </div>
          <div className="px-5 py-3">
            <p className="text-table-header uppercase text-text-3 mb-2">Top 5 Recurring Exceptions</p>
            <div className="space-y-2">
              {topExceptions.map((ex, i) => (
                <div key={i} className="flex items-center gap-3 text-table">
                  <span className={cn("h-2 w-2 rounded-full shrink-0", i < 2 ? "bg-danger" : "bg-primary")} />
                  <span className="text-text-1 font-medium flex-1">{ex.sku}</span>
                  <span className="text-text-2">{ex.location}</span>
                  <span className="text-text-2 tabular-nums">{ex.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-span-2 space-y-4">
          <div className="rounded-card border border-surface-3 bg-surface-2 p-5 space-y-3 text-center">
            <Zap className="h-8 w-8 text-primary mx-auto" />
            <h3 className="font-display text-section-header text-text-1">SS Auto-Increase</h3>
            <p className="text-table text-text-2">
              Recurrent stockouts detected in Category "Fresh". Safety Stock buffers auto-increased by +12%.
            </p>
            <span className="inline-block text-table-header uppercase font-bold text-text-1 border border-surface-3 rounded-full px-3 py-1">Active Correction</span>
          </div>
          <FeedForwardCard
            title="Exception Feed-Forward"
            description="Link recurring exceptions to SS adjustments automatically."
            linkLabel="Go to Safety Stock"
            linkUrl="/monitoring"
          />
        </div>
      </div>

      {/* D: Inventory Health Snapshot */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 rounded-card border border-surface-3 bg-surface-2">
          <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Box className="h-4 w-4 text-text-2" />
              <h2 className="font-display text-section-header text-text-1">D) Inventory Health Snapshot</h2>
            </div>
            <PeriodFilter value={periodD} onChange={setPeriodD} />
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-3">
                {["Channel", "HSTK Target", "Actual HSTK", "Stockout Risk", "SS Adequacy"].map((h) => (
                  <th key={h} className="text-left text-table-header uppercase text-text-3 px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inventoryHealth.map((r, i) => (
                <tr key={r.channel} className={cn("border-b border-surface-3/50", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                  <td className="px-5 py-3 text-table font-medium text-text-1">{r.channel}</td>
                  <td className="px-5 py-3 text-table text-text-1 tabular-nums">{r.target}</td>
                  <td className="px-5 py-3 text-table text-text-1 tabular-nums">{r.actual}</td>
                  <td className="px-5 py-3">
                    <span className={cn("text-table font-bold uppercase", r.stockout === "High" ? "text-danger" : r.stockout === "Moderate" ? "text-warning" : "text-success")}>
                      {r.stockout}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-table text-text-1 tabular-nums">{r.adequacy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="col-span-2 space-y-4">
          <div className="rounded-card border border-surface-3 bg-surface-2 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-5 w-1 rounded-full bg-gradient-primary" />
              <h3 className="font-display text-section-header text-text-1">SS Adjustments</h3>
            </div>
            <p className="text-caption text-text-3">Next Cycle Policy</p>
            <div className="space-y-2">
              <div className="flex justify-between text-table">
                <span className="text-text-2">Buffer Upscale</span>
                <span className="text-success font-medium">+15.2%</span>
              </div>
              <div className="flex justify-between text-table">
                <span className="text-text-2">Dynamic Throttling</span>
                <span className="text-text-1 font-medium">ENABLED</span>
              </div>
            </div>
            <p className="text-caption text-text-3 italic">Adjustments will take effect on Monday morning sync.</p>
          </div>
          <FeedForwardCard
            title="Inventory Feed-Forward"
            description="Low adequacy channels need SS review before next cycle."
            linkLabel="Go to Supply"
            linkUrl="/supply"
          />
        </div>
      </div>

      {/* E: Financial Impact & Waterfall */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 rounded-card border border-surface-3 bg-surface-2">
          <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-text-2" />
              <h2 className="font-display text-section-header text-text-1">E) Financial Impact & Waterfall</h2>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-table-header uppercase text-text-3">WC Locked</p>
                <p className="font-display text-kpi text-text-1">$12.4M</p>
              </div>
              <div className="text-center">
                <p className="text-table-header uppercase text-text-3">LCNB Savings</p>
                <p className="font-display text-kpi text-success">+$840K</p>
              </div>
              <PeriodFilter value={periodE} onChange={setPeriodE} />
            </div>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={waterfallChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-3)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => `$${v}K`} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: "var(--color-surface-3)", fontSize: 12 }} />
                <Bar dataKey="positive" fill="#2563EB" name="Cost" radius={[4, 4, 0, 0]} />
                <Bar dataKey="negative" fill="var(--color-success-text)" name="Savings" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-surface-3">
              {[
                { label: "Premium Freight", value: "$24.5K" },
                { label: "Stockout Cost", value: "$112.0K", color: "text-danger" },
                { label: "Inv. Holding", value: "$45.1K" },
                { label: "LCNB ROI", value: "14.2%", color: "text-success" },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <p className="text-table-header uppercase text-text-3">{item.label}</p>
                  <p className={cn("font-display text-section-header", item.color || "text-text-1")}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-span-2 space-y-4">
          <FeedForwardCard
            title="Cost Savings Goal"
            description="Reducing SS by 4% in non-volatile nodes would save an additional $120K in monthly working capital."
            linkLabel="Go to Config"
            linkUrl="/config"
          />
          <div className="rounded-card bg-success p-6 text-primary-foreground text-center space-y-3">
            <Shield className="h-10 w-10 mx-auto opacity-80" />
            <h3 className="font-display text-section-header">Audit Completion</h3>
            <p className="font-display text-kpi">98.2%</p>
            <button className="inline-flex items-center gap-1 rounded-button border border-white/30 bg-white/10 px-4 py-2 text-table font-medium hover:bg-white/20 transition-colors">
              Publish Audit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
