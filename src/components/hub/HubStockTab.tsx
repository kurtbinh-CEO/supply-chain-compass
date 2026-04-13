import { useState } from "react";
import { useTenant } from "@/components/TenantContext";
import { getHubNodes } from "./hubData";
import { StatusChip } from "@/components/StatusChip";
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, Minus, Package, Truck, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const gradeColor: Record<string, string> = {
  A: "bg-success-bg text-success",
  B: "bg-info-bg text-info",
  C: "bg-warning-bg text-warning",
  D: "bg-danger-bg text-danger",
};

const trendIcon = { Up: TrendingUp, Down: TrendingDown, Steady: Minus };
const trendColor = { Up: "text-success", Down: "text-danger", Steady: "text-text-3" };

export function HubStockTab() {
  const { tenant } = useTenant();
  const nodes = getHubNodes(tenant);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => setExpanded((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const totalSKU = nodes.reduce((s, n) => s + n.skus.reduce((a, sk) => a + sk.stock, 0), 0);
  const committed = Math.round(totalSKU * 0.67);
  const released = Math.round(totalSKU * 0.45);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Push Flow + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-card border border-surface-3 bg-surface-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-section-header text-text-1">Push Optimization Flow</h3>
            <span className="text-caption font-mono text-success bg-success-bg px-2 py-0.5 rounded-full">REAL-TIME SYNC</span>
          </div>
          {/* Static SVG Flow */}
          <div className="flex items-center justify-between">
            {["Inbound", "QC Hub", "Transit", "Store Alloc", "Final Release"].map((step, i) => {
              const active = i <= 1;
              const icons = [Package, CheckCircle, Truck, Package, CheckCircle];
              const Icon = icons[i];
              return (
                <div key={step} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center",
                      active ? "bg-gradient-primary text-primary-foreground" : "bg-surface-1 text-text-3 border border-surface-3"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={cn("text-caption", active ? "text-primary font-medium" : "text-text-3")}>{step}</span>
                  </div>
                  {i < 4 && <div className={cn("h-0.5 w-8 lg:w-12", active && i < 1 ? "bg-primary" : "bg-surface-3")} />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "COMMITTED", value: committed.toLocaleString(), sub: "SKU Total" },
            { label: "RELEASED", value: released.toLocaleString(), sub: `+${Math.round(released * 0.17).toLocaleString()} today`, subColor: "text-success" },
            { label: "AVAILABLE", value: (totalSKU - committed).toLocaleString(), sub: "Remaining" },
          ].map((k) => (
            <div key={k.label} className="rounded-card border border-surface-3 bg-surface-2 p-4 flex flex-col items-center justify-center text-center">
              <span className="text-table-header uppercase text-text-3">{k.label}</span>
              <span className="text-kpi text-text-1 tabular-nums">{k.value}</span>
              <span className={cn("text-caption", (k as any).subColor || "text-text-3")}>{k.sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Supply Node Table */}
      <div className="rounded-card border border-surface-3 bg-surface-2">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-3">
          <h3 className="font-display text-section-header text-text-1">Supply Node Monitoring</h3>
          <div className="flex gap-2">
            <button className="rounded-button border border-surface-3 px-3 py-1.5 text-table-sm text-text-2 hover:border-primary/40 transition-colors">Filter Hubs</button>
            <button className="rounded-button bg-gradient-primary text-primary-foreground px-3 py-1.5 text-table-sm font-medium">Export Data</button>
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-3 bg-surface-1/50">
              {["NODE NAME", "RELIABILITY", "TREND", "STOCK LEVEL", "EFFICIENCY", "ACTIONS"].map((h) => (
                <th key={h} className="px-5 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nodes.map((node) => (
              <>
                <tr
                  key={node.id}
                  onClick={() => toggle(node.id)}
                  className="border-b border-surface-3/50 cursor-pointer hover:bg-surface-1/30 transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {expanded.has(node.id) ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-text-3" />}
                      <span className="text-table font-medium text-text-1">{node.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-table-sm font-medium", gradeColor[node.grade])}>
                      <span className="h-[5px] w-[5px] rounded-full bg-current" />
                      {node.reliability}% {node.grade}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {(() => { const Icon = trendIcon[node.trend]; return (
                      <span className={cn("flex items-center gap-1 text-table-sm font-medium", trendColor[node.trend])}>
                        <Icon className="h-3.5 w-3.5" /> {node.trend}
                      </span>
                    ); })()}
                  </td>
                  <td className="px-5 py-3">
                    <div className="w-28 h-2 rounded-full bg-surface-3 overflow-hidden">
                      <div className={cn("h-full rounded-full", node.stockLevel > 0.5 ? "bg-primary" : node.stockLevel > 0.25 ? "bg-warning" : "bg-danger")}
                        style={{ width: `${node.stockLevel * 100}%` }} />
                    </div>
                  </td>
                  <td className={cn("px-5 py-3 text-table tabular-nums", node.efficiency < 0.5 ? "text-danger font-medium" : "text-text-1")}>
                    {node.efficiency.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-text-3">•••</td>
                </tr>
                {expanded.has(node.id) && (
                  <tr key={`${node.id}-exp`}>
                    <td colSpan={6} className="px-8 py-3 bg-surface-1/30">
                      <div className="text-table-header uppercase text-text-3 mb-2">SKU PERFORMANCE GAP</div>
                      <div className="space-y-1.5">
                        {node.skus.map((sk) => (
                          <div key={sk.sku} className="flex items-center justify-between">
                            <span className="text-table text-text-1">{sk.sku} ({sk.name})</span>
                            <div className="flex items-center gap-4">
                              <span className={cn("text-table-sm font-medium tabular-nums", sk.gap < -20 ? "text-danger" : sk.gap < 0 ? "text-warning" : "text-success")}>
                                {sk.gap > 0 ? "+" : ""}{sk.gap}% vs Target
                              </span>
                              <span className="text-caption text-text-3">{sk.stock.toLocaleString()} / {sk.target.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {node.skus.some((s) => s.gap < -20) && (
                        <button className="mt-3 rounded-button bg-gradient-primary text-primary-foreground px-4 py-1.5 text-table-sm font-medium">
                          TRIGGER RESTOCK
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: "💡", title: "Push Recommendation", msg: "Shift 1,200 units from Hub Vigracera to Phú Mỹ to avoid out-of-stock risk in Sector 4 within the next 48 hours.", link: "View Logistics Route →" },
          { icon: "⚠️", title: "Capacity Alert", msg: "Mikado Hub approaching 95% storage capacity. Incoming shipment FC-291 requires immediate rerouting or floor space audit.", link: "Manage Allocation →" },
          { icon: "✨", title: "AI Curator Summary", msg: "Network stability is at 84%. Current distribution velocity is 12% higher than previous cycle. Optimization focus: Sector North.", link: "Full Analytics Report →" },
        ].map((c) => (
          <div key={c.title} className="rounded-card border border-surface-3 bg-surface-2 p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{c.icon}</span>
              <h4 className="font-display text-body font-semibold text-text-1">{c.title}</h4>
            </div>
            <p className="text-table text-text-2 mb-3">{c.msg}</p>
            <span className="text-table-sm text-primary font-medium cursor-pointer hover:underline">{c.link}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
