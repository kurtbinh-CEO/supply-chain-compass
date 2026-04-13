import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { StatusChip } from "@/components/StatusChip";
import { ArrowUpDown, X, Pencil, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import type { B2BDeal } from "./demandData";

interface Props {
  deals: B2BDeal[];
}

const stages: B2BDeal["stage"][] = ["Lead", "Qualified", "Proposal", "Committed", "Won"];
const stageColor: Record<string, "info" | "warning" | "success" | "danger"> = {
  Lead: "info", Qualified: "info", Proposal: "warning", Committed: "success", Won: "success",
};

type SortKey = "customer" | "qty" | "probability" | "stage";

function SlideInPanel({ deal, onClose }: { deal: B2BDeal; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-text-1/30 z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[480px] bg-surface-2 border-l border-surface-3 z-50 rounded-l-panel shadow-xl overflow-y-auto animate-slide-in-right">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-3 sticky top-0 bg-surface-2 z-10">
          <div>
            <p className="text-table-header uppercase text-primary">Active Selection</p>
            <h2 className="font-display text-section-header text-text-1">{deal.customer}: {deal.project}</h2>
          </div>
          <button onClick={onClose} className="text-text-3 hover:text-text-1 transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-card border border-surface-3 bg-surface-0 p-3 text-center">
              <p className="text-table-header uppercase text-text-3">Total Weighted Qty</p>
              <p className="font-display text-kpi text-text-1">{deal.qty.toLocaleString()} <span className="text-table text-text-3">units</span></p>
            </div>
            <div className="rounded-card border border-surface-3 bg-surface-0 p-3 text-center">
              <p className="text-table-header uppercase text-text-3">Probability</p>
              <p className={cn("font-display text-kpi", deal.probability >= 80 ? "text-success" : deal.probability >= 50 ? "text-warning" : "text-danger")}>{deal.probability}%</p>
            </div>
          </div>

          {/* Cascade alert */}
          {deal.changeLog.some(c => c.action.includes("Qty") || c.action.includes("increased")) && (
            <div className="rounded-card border border-danger bg-danger-bg p-3">
              <p className="text-table font-medium text-danger flex items-center gap-1.5">⚠️ Cascade Alert: Qty Change &gt; 20%</p>
              <p className="text-table-sm text-text-2 mt-1">Quantity updated. Network capacity check recommended.</p>
            </div>
          )}

          {/* CN Split */}
          <div>
            <p className="text-table-header uppercase text-text-3 mb-2">Network Distribution</p>
            {deal.cnSplit.map(c => (
              <div key={c.cn} className="mb-2">
                <div className="flex justify-between text-table"><span className="font-medium text-text-1">{c.cn}</span><span className="text-text-2">{c.units.toLocaleString()} units ({c.pct}%)</span></div>
                <div className="h-2 bg-surface-3 rounded-full mt-1 overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${c.pct}%` }} /></div>
              </div>
            ))}
          </div>

          {/* SKU Breakdown */}
          <div>
            <p className="text-table-header uppercase text-text-3 mb-2">SKU Breakdown</p>
            {deal.skuBreakdown.map(s => (
              <div key={s.sku} className="flex justify-between text-table border-b border-surface-3/50 py-1.5">
                <span className="text-text-1 font-mono">{s.sku}</span>
                <span className="tabular-nums text-text-1">{s.qty.toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* PO Mapping */}
          <div>
            <p className="text-table-header uppercase text-text-3 mb-1">PO Mapping</p>
            <p className="text-table text-text-1 font-mono">{deal.poMapping}</p>
          </div>

          {/* Delivery Timeline */}
          <div>
            <p className="text-table-header uppercase text-text-3 mb-3">Delivery Timeline</p>
            <div className="space-y-3">
              {deal.timeline.map((t, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className={cn("mt-1 h-2.5 w-2.5 rounded-full flex-none",
                    t.status === "done" ? "bg-success" : t.status === "active" ? "bg-primary" : "bg-text-3/30")} />
                  <div>
                    <p className="text-table font-medium text-text-1">{t.week} - {t.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Change Log */}
          <div>
            <p className="text-table-header uppercase text-text-3 mb-3">Change Log</p>
            <div className="space-y-3">
              {deal.changeLog.map((c, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="mt-1 h-7 w-7 rounded-full bg-surface-3 flex items-center justify-center flex-none">
                    {c.user === "System" ? <TrendingUp className="h-3.5 w-3.5 text-text-3" /> : <Pencil className="h-3.5 w-3.5 text-text-3" />}
                  </span>
                  <div>
                    <p className="text-table text-text-1"><span className="font-medium">{c.user}</span> {c.action}</p>
                    <p className="text-table-sm text-text-3">{c.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-3 text-center text-table-sm text-primary hover:underline py-2 border border-surface-3 rounded-button">View All Activity</button>
          </div>
        </div>
      </div>
    </>
  );
}

export function B2BPipelineTab({ deals }: Props) {
  const [view, setView] = useState<"table" | "kanban">("table");
  const [sortKey, setSortKey] = useState<SortKey>("customer");
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState<B2BDeal | null>(null);

  const sorted = useMemo(() => {
    return [...deals].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "customer") cmp = a.customer.localeCompare(b.customer);
      else if (sortKey === "qty") cmp = a.qty - b.qty;
      else if (sortKey === "probability") cmp = a.probability - b.probability;
      else cmp = stages.indexOf(a.stage) - stages.indexOf(b.stage);
      return sortAsc ? cmp : -cmp;
    });
  }, [deals, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const handleRowClick = (deal: B2BDeal) => {
    // Cascade alert check
    const lastQty = deal.qty;
    const prevQty = Math.round(lastQty * 0.75); // simulate previous
    const delta = ((lastQty - prevQty) / prevQty) * 100;
    if (delta > 20) {
      toast.warning("Cascade Alert: Qty Change > 20%", {
        description: `${deal.customer} — Delta ${delta.toFixed(0)}%. Network capacity check recommended.`,
      });
    }
    setSelectedDeal(deal);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-screen-title text-text-1">B2B Pipeline</h2>
          <p className="text-table text-text-2">Enterprise Opportunity & Demand Alignment</p>
        </div>
        <div className="inline-flex rounded-button border border-surface-3 overflow-hidden">
          <button onClick={() => setView("kanban")} className={cn("px-4 py-2 text-table-sm transition-colors", view === "kanban" ? "bg-primary text-white" : "bg-surface-2 text-text-2 hover:bg-surface-3")}>Kanban</button>
          <button onClick={() => setView("table")} className={cn("px-4 py-2 text-table-sm transition-colors", view === "table" ? "bg-primary text-white" : "bg-surface-2 text-text-2 hover:bg-surface-3")}>Bảng</button>
        </div>
      </div>

      {view === "table" ? (
        <div className="rounded-card border border-surface-3 bg-surface-2">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-3">
                {([["Deal", "customer"], ["Khách hàng", "customer"], ["Dự án", "customer"], ["CN", "customer"], ["Items", "customer"], ["Qty", "qty"], ["Prob.", "probability"], ["Stage", "stage"]] as [string, SortKey][]).map(([label, key]) => (
                  <th key={label} className="text-left text-table-header uppercase text-text-3 px-4 py-3 cursor-pointer hover:text-text-1"
                    onClick={() => handleSort(key)}>
                    <span className="flex items-center gap-1">{label} {sortKey === key && <ArrowUpDown className="h-3 w-3" />}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((d, i) => (
                <tr key={d.id}
                  onClick={() => handleRowClick(d)}
                  className={cn("border-b border-surface-3/50 cursor-pointer transition-colors hover:bg-primary/8",
                    i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                  <td className="px-4 py-3 text-table font-medium text-primary">{d.id}</td>
                  <td className="px-4 py-3 text-table font-bold text-text-1">{d.customer}</td>
                  <td className="px-4 py-3 text-table text-text-2">{d.project}</td>
                  <td className="px-4 py-3 text-table text-text-2">{d.cn}</td>
                  <td className="px-4 py-3 text-table font-mono text-text-1">{d.items}</td>
                  <td className="px-4 py-3 text-table tabular-nums font-medium text-text-1">{d.qty.toLocaleString()}</td>
                  <td className="px-4 py-3 text-table tabular-nums font-medium text-text-1">{d.probability}%</td>
                  <td className="px-4 py-3"><StatusChip status={stageColor[d.stage]} label={d.stage} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Kanban view */
        <div className="flex gap-3 overflow-x-auto pb-2">
          {(["Lead", "Qualified", "Proposal", "Committed", "Won", "Lost"] as const).map(stage => {
            const stageDeals = deals.filter(d => d.stage === stage);
            return (
              <div key={stage} className="min-w-[200px] flex-1 rounded-card border border-surface-3 bg-surface-1 p-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-table font-bold text-text-1">{stage}</h4>
                  <span className="text-table-sm text-text-3 bg-surface-3 rounded-full px-2 py-0.5">{stageDeals.length}</span>
                </div>
                <div className="space-y-2">
                  {stageDeals.map(d => (
                    <div key={d.id} onClick={() => handleRowClick(d)}
                      className="rounded-button border border-surface-3 bg-surface-2 p-3 cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all">
                      <p className="text-table font-medium text-text-1">{d.customer}</p>
                      <p className="text-table-sm text-text-2">{d.project}</p>
                      <div className="flex justify-between mt-2 text-table-sm">
                        <span className="text-text-3">{d.qty.toLocaleString()} units</span>
                        <span className={cn("font-medium", d.probability >= 70 ? "text-success" : "text-warning")}>{d.probability}%</span>
                      </div>
                    </div>
                  ))}
                  {stageDeals.length === 0 && (
                    <p className="text-table-sm text-text-3 text-center py-4 italic">No deals</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedDeal && <SlideInPanel deal={selectedDeal} onClose={() => setSelectedDeal(null)} />}
    </div>
  );
}
