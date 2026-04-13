import { useState, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import type { PhasingRow } from "./sopData";

interface Props {
  rows: PhasingRow[];
  totalVolume: number;
}

const methods = [
  { label: "③ Historical active", weights: [28, 25, 24, 23] },
  { label: "① Even Split", weights: [25, 25, 25, 25] },
  { label: "② Front-loaded", weights: [35, 28, 22, 15] },
  { label: "④ Back-loaded", weights: [15, 22, 28, 35] },
];

const weeks = ["W16", "W17", "W18", "W19"];

export function PhasingTab({ rows: initialRows, totalVolume }: Props) {
  const [methodIdx, setMethodIdx] = useState(0);
  const method = methods[methodIdx];

  const computedRows = useMemo(() => {
    return initialRows.map(r => {
      const base = r.monthlyBase;
      return {
        ...r,
        w16: Math.round(base * method.weights[0] / 100),
        w17: Math.round(base * method.weights[1] / 100),
        w18: Math.round(base * method.weights[2] / 100),
        w19: Math.round(base * method.weights[3] / 100),
      };
    });
  }, [initialRows, method]);

  const totalMonthly = computedRows.reduce((s, r) => s + r.monthlyBase, 0);
  const totalWeekly = computedRows.reduce((s, r) => s + r.w16 + r.w17 + r.w18 + r.w19, 0);
  const isBalanced = totalMonthly === totalWeekly || Math.abs(totalMonthly - totalWeekly) <= computedRows.length;

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
        {/* Reconciliation status */}
        <div className={cn("rounded-card border px-4 py-2 flex items-center gap-2",
          isBalanced ? "border-success bg-success-bg" : "border-danger bg-danger-bg")}>
          <span className="text-table-header uppercase text-text-3">Reconciliation Status</span>
          <span className="font-mono text-table font-bold text-text-1">
            Σ {totalMonthly.toLocaleString()} = {totalWeekly.toLocaleString()}
          </span>
          {isBalanced
            ? <span className="text-success font-bold">☑ Balanced</span>
            : <span className="text-danger font-bold">✗ Mismatch</span>}
        </div>
      </div>

      <div className="font-display text-screen-title text-text-1">Phasing Month to Week</div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Distribution Strategy */}
        <div className="space-y-5">
          <div className="rounded-card border border-surface-3 bg-surface-2 p-5 space-y-4">
            <p className="text-table-header uppercase text-text-3">Distribution Strategy</p>
            <div>
              <p className="text-table text-text-2 mb-1.5">Phasing Method</p>
              <select
                value={methodIdx}
                onChange={e => setMethodIdx(Number(e.target.value))}
                className="w-full h-10 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {methods.map((m, i) => <option key={i} value={i}>⚙️ {m.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-table-header uppercase text-text-3">Target Month</p>
                <p className="font-display text-xl text-primary font-bold">April<br />2024</p>
              </div>
              <div>
                <p className="text-table-header uppercase text-text-3">Total Volume</p>
                <p className="font-display text-xl text-text-1 font-bold">{totalVolume.toLocaleString()}<br /><span className="text-table text-text-3 font-normal">units</span></p>
              </div>
            </div>
          </div>

          <div className="rounded-card border border-surface-3 bg-surface-2 p-5 space-y-3">
            <p className="text-table-header uppercase text-text-3">Calculated Weekly Weights</p>
            {weeks.map((w, i) => (
              <div key={w} className="flex items-center gap-3">
                <span className="text-table font-medium text-text-1 w-10">{w}</span>
                <div className="flex-1 h-2.5 bg-surface-3 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${method.weights[i]}%` }} />
                </div>
                <span className="text-table tabular-nums font-bold text-text-1 w-10 text-right">{method.weights[i]}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Phasing Execution Grid */}
        <div className="col-span-2 rounded-card border border-surface-3 bg-surface-2">
          <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
            <h2 className="font-display text-section-header text-text-1">Phasing Execution Grid</h2>
            <div className="flex gap-2">
              <button className="rounded-button border border-surface-3 bg-primary text-white px-3 py-1 text-table-sm font-medium">Units</button>
              <button className="rounded-button border border-surface-3 bg-surface-0 text-text-2 px-3 py-1 text-table-sm">Value</button>
              <span className="ml-3 text-table-sm text-primary font-medium cursor-pointer hover:underline">Apply all SKU</span>
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-3">
                <th className="text-left text-table-header uppercase text-text-3 px-5 py-3">SKU Artifact</th>
                <th className="text-center text-table-header uppercase text-text-3 px-4 py-3">Monthly Base</th>
                {weeks.map((w, i) => (
                  <th key={w} className="text-center text-table-header uppercase text-text-3 px-4 py-3">
                    <span className="text-primary font-bold">{w}</span>
                    <br />
                    <span className="text-text-3">({method.weights[i]}%)</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {computedRows.map((r, i) => (
                <tr key={r.sku} className={cn("border-b border-surface-3/50 hover:bg-primary/5 transition-colors", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                  <td className="px-5 py-3">
                    <span className="text-table font-bold text-text-1 block">{r.sku}</span>
                    <span className="text-caption text-text-3 font-mono">{r.node}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-table tabular-nums font-medium text-text-1 font-mono">{r.monthlyBase.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center text-table tabular-nums font-bold text-primary">{r.w16.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center text-table tabular-nums font-bold text-primary">{r.w17.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center text-table tabular-nums font-bold text-primary">{r.w18.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center text-table tabular-nums font-bold text-primary">{r.w19.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 border-t border-surface-3 flex items-center justify-between">
            <div className="flex gap-2">
              <button className="rounded-button border border-surface-3 bg-surface-0 px-2 py-1 text-table-sm text-text-2">‹</button>
              <button className="rounded-button border border-surface-3 bg-surface-0 px-2 py-1 text-table-sm text-text-2">›</button>
            </div>
            <span className="text-table-sm text-text-3 font-mono">Showing {computedRows.length} of 124 SKU entries</span>
            <button className="text-table-sm text-primary font-medium hover:underline">Commit Batch Changes</button>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between rounded-card border border-surface-3 bg-surface-1 px-5 py-3">
        <div>
          <span className="text-table-header uppercase text-text-3">Current Phase</span>
          <span className="ml-2 text-table font-medium text-primary">● Phasing Execution</span>
        </div>
        <div className="flex gap-3">
          <button className="text-table-sm text-text-2 hover:text-text-1">Save Draft</button>
          <button className="rounded-button bg-gradient-primary text-white px-4 py-2 text-table-sm font-medium">Complete Phasing →</button>
        </div>
      </div>
    </div>
  );
}
