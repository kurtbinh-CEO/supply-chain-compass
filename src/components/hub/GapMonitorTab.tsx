import { useState } from "react";
import { scenarios } from "./hubData";
import { cn } from "@/lib/utils";
import { X, ArrowRight, Sparkles } from "lucide-react";

export function GapMonitorTab() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = scenarios.find((s) => s.id === selectedId);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-screen-title text-text-1">Gap Monitor & Scenarios</h2>
          <p className="text-table text-text-2">Optimization phase for Day 20+ projections</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-button border border-surface-3 px-4 py-2 text-table-sm text-text-2 hover:border-primary/40 transition-colors">Export Report</button>
          <button className="rounded-button bg-danger text-primary-foreground px-4 py-2 text-table-sm font-medium">Execute Scenario</button>
        </div>
      </div>

      {/* Pace Warning */}
      <div className="rounded-card border border-surface-3 bg-surface-2 p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">⚠️</span>
          <h3 className="font-display text-section-header text-text-1">Pace Warning: Commitment Gap</h3>
          <span className="ml-auto text-caption font-mono text-text-3">SYS_LOG: 4022-A</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-table text-text-2">Released / Committed Progress</span>
          <span className="text-kpi text-text-1 tabular-nums">69%</span>
        </div>
        <div className="h-2.5 rounded-full bg-surface-3 overflow-hidden">
          <div className="h-full rounded-full bg-warning" style={{ width: "69%" }} />
        </div>
        <p className="mt-2 text-table text-danger flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-danger" />
          Current velocity indicates a 12% shortfall against end-of-month targets. Action required.
        </p>
      </div>

      {/* Main grid: Scenarios + AI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Scenario Cards */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {scenarios.map((s) => (
            <div
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={cn(
                "rounded-card border p-5 cursor-pointer transition-all hover:shadow-md",
                s.recommended ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20" : "border-surface-3 bg-surface-2",
                selectedId === s.id && "ring-2 ring-primary"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn("h-8 w-8 rounded-lg flex items-center justify-center text-table-sm font-bold",
                  s.recommended ? "bg-gradient-primary text-primary-foreground" : "bg-surface-1 text-primary border border-surface-3"
                )}>
                  {s.label}
                </span>
                <span className="text-table-header uppercase text-text-3">{s.tag}</span>
              </div>
              {s.recommended && (
                <span className="inline-flex items-center gap-1 text-caption font-bold text-primary bg-info-bg px-2 py-0.5 rounded mb-2">
                  <Sparkles className="h-3 w-3" /> AI RECOMMENDED · OPTIMIZED
                </span>
              )}
              <h4 className="font-display text-body font-semibold text-text-1 mb-1">{s.title}</h4>
              <p className="text-table text-text-2 mb-4 line-clamp-2">{s.description}</p>
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-surface-3">
                <span className={cn("text-caption font-mono font-bold",
                  s.estCost.startsWith("-") ? "text-success" : s.estCost === "+4.8%" ? "text-primary" : "text-danger"
                )}>
                  EST COST: {s.estCost}
                </span>
                <ArrowRight className="h-4 w-4 text-text-3" />
              </div>
            </div>
          ))}
        </div>

        {/* AI Trust Block */}
        <div className="space-y-4">
          <div className="rounded-card border border-surface-3 bg-surface-2 p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h4 className="font-display text-body font-semibold text-text-1">Curator's Logic</h4>
                <span className="text-table-header uppercase text-primary">DECISION SUPPORT SYSTEM</span>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <span className="text-table-header uppercase text-danger">INFERENCE ENGINE</span>
              <p className="text-table text-text-1 mt-1 italic">
                "Scenario D balances 'Time-to-Customer' with 'Landed Cost' by utilizing predictive buffer stock at Hub 4."
              </p>
            </div>

            <ul className="mt-4 space-y-2 text-table text-text-2">
              <li className="flex items-start gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" /> 92.4% confidence in fulfillment improvement.</li>
              <li className="flex items-start gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" /> Leverages historical T5 volatility patterns from 2022-2023.</li>
              <li className="flex items-start gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" /> Mitigates potential labor disruptions in Pacific routes.</li>
            </ul>

            {/* Mini chart placeholder */}
            <div className="mt-4 h-24 rounded-lg bg-gradient-to-br from-primary/10 to-info-bg flex items-center justify-center">
              <svg viewBox="0 0 200 60" className="w-full h-full p-2">
                <polyline fill="none" stroke="var(--color-primary)" strokeWidth="2" points="0,50 30,42 60,38 90,30 120,25 150,18 180,12 200,8" />
                <polyline fill="none" stroke="var(--color-primary)" strokeWidth="1" strokeDasharray="4" points="0,55 30,50 60,48 90,44 120,40 150,35 180,30 200,26" />
              </svg>
            </div>
          </div>

          <div className="rounded-card border border-surface-3 bg-surface-2 p-5">
            <h4 className="font-display text-body font-semibold text-text-1 mb-3">Impact Analysis</h4>
            {[
              { label: "Service Level Impact", value: "+4.2%", color: "text-success" },
              { label: "Inventory Turnover", value: "— Neutral", color: "text-text-3" },
              { label: "Expedited Shipping", value: "+1.8%", color: "text-success" },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between py-2 border-b border-surface-3/50 last:border-0">
                <span className="text-table text-text-2">{r.label}</span>
                <span className={cn("text-table-sm font-medium tabular-nums", r.color)}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-1/40" onClick={() => setSelectedId(null)}>
          <div className="bg-surface-2 rounded-xl border border-surface-3 p-6 max-w-lg w-full mx-4 shadow-xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={cn("h-10 w-10 rounded-lg flex items-center justify-center text-body font-bold",
                  selected.recommended ? "bg-gradient-primary text-primary-foreground" : "bg-surface-1 text-primary border border-surface-3"
                )}>
                  {selected.label}
                </span>
                <div>
                  <h3 className="font-display text-section-header text-text-1">{selected.title}</h3>
                  <span className="text-caption text-text-3 uppercase">{selected.tag}</span>
                </div>
              </div>
              <button onClick={() => setSelectedId(null)} className="p-1 hover:bg-surface-3 rounded-button transition-colors">
                <X className="h-5 w-5 text-text-3" />
              </button>
            </div>
            <p className="text-table text-text-2 mb-4">{selected.details}</p>
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-1">
              <span className="text-table-sm text-text-3">Estimated Cost Impact</span>
              <span className={cn("text-body font-bold tabular-nums",
                selected.estCost.startsWith("-") ? "text-success" : selected.estCost === "+4.8%" ? "text-primary" : "text-danger"
              )}>{selected.estCost}</span>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setSelectedId(null)} className="flex-1 rounded-button border border-surface-3 py-2 text-table-sm text-text-2 hover:border-primary/40 transition-colors">
                Đóng
              </button>
              <button className="flex-1 rounded-button bg-gradient-primary text-primary-foreground py-2 text-table-sm font-medium">
                Áp dụng Scenario {selected.label}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-caption text-text-3 px-2">
        <span className="font-mono">LAST SYNC: 4M AGO — SEOUL DC HUB</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-success" /> SYSTEM OPERATIONAL</span>
      </div>
    </div>
  );
}
