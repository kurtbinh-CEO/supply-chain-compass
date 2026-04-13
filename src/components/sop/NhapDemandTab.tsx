import { useState, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SopSku, AopTarget } from "./sopData";

interface Props {
  skus: SopSku[];
  aop: AopTarget;
}

// Simulated conflicts
const conflicts: Record<string, string> = {
  "GA-300 A4-cnHn": "⚠ Thúy sửa 5m ago",
  "GA-300 C1-cnDn": "⚠ Minh sửa 12m ago",
  "GA-600 A4-cnCt": "⚠ System auto-adjust 2m ago",
};

const regions = ["cnBd", "cnDn", "cnHn", "cnCt"] as const;
const regionLabels = { cnBd: "CN-BD", cnDn: "CN-DN", cnHn: "CN-HN", cnCt: "CN-CT" };

export function NhapDemandTab({ skus, aop }: Props) {
  const [data, setData] = useState<SopSku[]>(skus);
  const [edited, setEdited] = useState<Set<string>>(new Set());

  // Reset data when tenant changes
  const prevSkusRef = useRef(skus);
  if (prevSkusRef.current !== skus) {
    prevSkusRef.current = skus;
    setData(skus);
    setEdited(new Set());
  }

  const totals = useMemo(() => ({
    cnBd: data.reduce((s, r) => s + r.cnBd, 0),
    cnDn: data.reduce((s, r) => s + r.cnDn, 0),
    cnHn: data.reduce((s, r) => s + r.cnHn, 0),
    cnCt: data.reduce((s, r) => s + r.cnCt, 0),
    total: data.reduce((s, r) => s + r.total, 0),
  }), [data]);

  const gap = {
    cnBd: totals.cnBd - aop.cnBd,
    cnDn: totals.cnDn - aop.cnDn,
    cnHn: totals.cnHn - aop.cnHn,
    cnCt: totals.cnCt - aop.cnCt,
    total: totals.total - aop.total,
  };
  const gapPct = ((gap.total / aop.total) * 100).toFixed(0);

  const handleCellEdit = (skuIdx: number, field: typeof regions[number], newVal: number) => {
    setData(prev => {
      const next = [...prev];
      const row = { ...next[skuIdx], [field]: newVal };
      row.total = row.cnBd + row.cnDn + row.cnHn + row.cnCt;
      next[skuIdx] = row;
      return next;
    });
    setEdited(prev => new Set(prev).add(`${data[skuIdx].sku}-${field}`));
  };

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center gap-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg text-success text-table-sm font-medium px-3 py-1">
          ● Đang nhập — Day 4/30
        </span>
        <span className="inline-flex items-center gap-1.5 text-danger text-table-sm font-medium">
          🔴 Lock Day 7
        </span>
        <div className="flex-1" />
        <div className="flex -space-x-2">
          {["TH", "LM", "NQ"].map(i => (
            <div key={i} className="h-7 w-7 rounded-full bg-gradient-primary flex items-center justify-center text-[10px] font-semibold text-white border-2 border-surface-2">{i}</div>
          ))}
          <div className="h-7 w-7 rounded-full bg-surface-3 flex items-center justify-center text-[10px] font-medium text-text-2 border-2 border-surface-2">+3</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Main matrix */}
        <div className="col-span-3 rounded-card border border-surface-3 bg-surface-2">
          <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
            <h2 className="font-display text-section-header text-text-1">Demand Entry Matrix</h2>
            <div className="flex items-center gap-3">
              <span className="text-table-sm text-text-3 bg-surface-0 rounded-full px-2.5 py-0.5 border border-surface-3 font-mono">SKUs: {data.length}</span>
              <span className="text-table-sm text-text-3">Unit: Case</span>
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-3">
                <th className="text-left text-table-header uppercase text-text-3 px-5 py-3">SKU / Region</th>
                {regions.map(r => (
                  <th key={r} className="text-center text-table-header uppercase text-text-3 px-4 py-3">{regionLabels[r]}</th>
                ))}
                <th className="text-center text-table-header uppercase text-primary font-bold px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row.sku} className={cn("border-b border-surface-3/50 hover:bg-primary/5 transition-colors", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                  <td className="px-5 py-3 text-table font-mono font-medium text-text-1">{row.sku}</td>
                  {regions.map(r => {
                    const cellKey = `${row.sku}-${r}`;
                    const isEdited = edited.has(cellKey);
                    const conflict = conflicts[cellKey];
                    return (
                      <td key={r} className="px-4 py-3 text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={cn(
                                "inline-block min-w-[60px] px-2 py-1 rounded text-table tabular-nums font-medium cursor-text transition-all",
                                isEdited ? "border-2 border-warning bg-warning-bg text-warning" :
                                conflict ? "border border-dashed border-warning text-text-1" :
                                "text-text-1 hover:bg-surface-3"
                              )}
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={e => {
                                const val = parseInt(e.currentTarget.textContent || "0", 10);
                                if (!isNaN(val) && val !== row[r]) handleCellEdit(i, r, val);
                              }}
                            >
                              {row[r].toLocaleString()}
                            </span>
                          </TooltipTrigger>
                          {conflict && (
                            <TooltipContent className="bg-warning-bg text-warning border-warning text-table-sm">
                              {conflict}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center text-table tabular-nums font-bold text-primary">{row.total.toLocaleString()}</td>
                </tr>
              ))}

              {/* Total Demand row */}
              <tr className="bg-primary/10 border-t-2 border-primary/30">
                <td className="px-5 py-3 text-table font-bold text-primary uppercase">Total Demand</td>
                {regions.map(r => (
                  <td key={r} className="px-4 py-3 text-center text-table tabular-nums font-bold text-primary">{totals[r].toLocaleString()}</td>
                ))}
                <td className="px-4 py-3 text-center text-table tabular-nums font-bold text-primary">{totals.total.toLocaleString()}</td>
              </tr>

              {/* AOP Target row */}
              <tr className="bg-surface-1">
                <td className="px-5 py-3 text-table font-medium text-text-2 uppercase font-mono">AOP Target</td>
                {regions.map(r => (
                  <td key={r} className="px-4 py-3 text-center text-table tabular-nums text-text-2 font-mono">{aop[r].toLocaleString()}</td>
                ))}
                <td className="px-4 py-3 text-center text-table tabular-nums font-medium text-text-2 font-mono">{aop.total.toLocaleString()}</td>
              </tr>

              {/* Gap row */}
              <tr className="bg-warning-bg/50">
                <td className="px-5 py-3 text-table font-bold text-warning flex items-center gap-1.5">⚠️ Gap vs Target</td>
                {regions.map(r => (
                  <td key={r} className="px-4 py-3 text-center text-table tabular-nums font-medium text-warning">
                    {gap[r] > 0 ? "+" : ""}{gap[r].toLocaleString()}
                  </td>
                ))}
                <td className="px-4 py-3 text-center">
                  <span className="text-table tabular-nums font-bold text-warning">
                    {gap.total > 0 ? "+" : ""}{gap.total.toLocaleString()}
                  </span>
                  <br />
                  <span className="text-table-sm font-bold text-warning">+{gapPct}%</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* AI Curator Insight */}
          <div className="rounded-card border border-surface-3 bg-surface-2 p-4 space-y-3">
            <h4 className="text-table font-bold text-text-1 flex items-center gap-1.5">🧠 AI Curator Insight</h4>
            <p className="text-table-sm text-text-2">
              Current demand for <span className="font-bold text-text-1">GA-300 HN</span> is 45% higher than last 3 months average. Regional promo detected in HN during Week 3.
            </p>
            <div className="flex justify-between text-table-sm pt-2 border-t border-surface-3">
              <span className="text-text-3 uppercase">Confidence Score</span>
              <span className="font-bold text-primary">89%</span>
            </div>
          </div>

          {/* Regional Mix */}
          <div className="rounded-card border border-surface-3 bg-surface-2 p-4 space-y-3">
            <h4 className="text-table font-bold text-text-1">Regional Mix</h4>
            {[
              { name: "CN-HN", pct: 33, color: "bg-primary" },
              { name: "CN-BD", pct: 27, color: "bg-[#0891b2]" },
              { name: "CN-DN", pct: 22, color: "bg-[#7c3aed]" },
              { name: "CN-CT", pct: 18, color: "bg-[#059669]" },
            ].map(r => (
              <div key={r.name} className="flex items-center gap-2">
                <span className="text-table-sm font-medium text-text-1 w-14">{r.name}</span>
                <div className="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", r.color)} style={{ width: `${r.pct}%` }} />
                </div>
                <span className="text-table-sm tabular-nums font-medium text-text-1 w-8 text-right">{r.pct}%</span>
              </div>
            ))}
          </div>

          {/* Node Approval */}
          <div className="rounded-card border border-surface-3 bg-surface-2 p-4 space-y-2">
            <h4 className="text-table-header uppercase text-text-3">Node Approval</h4>
            {[
              { dept: "Sales", status: "Approved", color: "text-success" },
              { dept: "Marketing", status: "Pending", color: "text-warning" },
              { dept: "Finance", status: "Reviewing", color: "text-info" },
            ].map(n => (
              <div key={n.dept} className="flex justify-between text-table">
                <span className="text-text-1">{n.dept}</span>
                <span className={cn("font-medium", n.color)}>● {n.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
