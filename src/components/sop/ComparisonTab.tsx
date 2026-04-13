import { useState } from "react";
import { cn } from "@/lib/utils";
import type { VersionCard, VariantRow } from "./sopData";

interface Props {
  versions: VersionCard[];
  variants: VariantRow[];
}

export function ComparisonTab({ versions, variants }: Props) {
  const [skuFilter, setSkuFilter] = useState("All Categories");

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center gap-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg text-success text-table-sm font-medium px-3 py-1">
          ● Đang nhập — Day 4/30
        </span>
        <span className="text-table-sm text-text-2">Deadline: <span className="font-bold text-text-1">Lock Day 7</span></span>
      </div>

      {/* Version cards */}
      <div className="grid grid-cols-4 gap-4">
        {versions.map(v => (
          <div key={v.version} className={cn(
            "rounded-card border p-4 transition-all",
            v.active ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-surface-3 bg-surface-2"
          )}>
            <p className={cn("text-table-header uppercase tracking-wider mb-2", v.active ? "text-primary font-bold" : "text-text-3")}>{v.label}</p>
            <p className="text-table font-medium text-text-1">{v.name}</p>
            <p className="font-display text-2xl font-bold tabular-nums mt-1" style={{ color: v.active ? "#2563EB" : undefined }}>{v.value.toLocaleString()}</p>
            <p className="text-table-sm text-text-3 mt-1">{v.subtitle}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Variant Analysis table */}
        <div className="col-span-2 rounded-card border border-surface-3 bg-surface-2">
          <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
            <h2 className="font-display text-section-header text-text-1">Detailed Variant Analysis</h2>
            <div className="flex items-center gap-2">
              <span className="text-table-sm text-text-3">SKU filter:</span>
              <select value={skuFilter} onChange={e => setSkuFilter(e.target.value)}
                className="h-8 rounded-button border border-surface-3 bg-surface-0 px-2 text-table-sm text-text-1 focus:outline-none focus:ring-1 focus:ring-primary">
                <option>All Categories</option>
                <option>Bottled Water</option>
                <option>Soda</option>
              </select>
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-3">
                {["Category / SKU", "Statistical", "Sales", "Consensus", "Delta (%)"].map(h => (
                  <th key={h} className="text-left text-table-header uppercase text-text-3 px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {variants.map((v, i) => {
                const absDelta = Math.abs(v.delta);
                const isHighDelta = absDelta > 10;
                return (
                  <tr key={v.skuCode} className={cn("border-b border-surface-3/50 hover:bg-primary/5 transition-colors", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                    <td className="px-5 py-3">
                      <span className="text-table font-medium text-text-1 block">{v.name}</span>
                      <span className="text-caption text-text-3 font-mono">{v.skuCode}</span>
                    </td>
                    <td className="px-5 py-3 text-table tabular-nums text-text-1 font-mono">{v.statistical.toLocaleString()}</td>
                    <td className="px-5 py-3 text-table tabular-nums text-text-1 font-mono">{v.sales.toLocaleString()}</td>
                    <td className="px-5 py-3 text-table tabular-nums font-bold text-text-1 font-mono">{v.consensus.toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-table-sm font-medium tabular-nums",
                        isHighDelta ? "bg-warning-bg text-warning" : "text-text-2"
                      )}>
                        {isHighDelta && "▲ "}
                        {v.delta > 0 ? "+" : ""}{v.delta}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Meeting agenda checklist */}
        <div className="space-y-4">
          <div className="rounded-card bg-gradient-to-br from-[#1e293b] to-[#334155] p-5 text-white space-y-4">
            <h3 className="font-display text-section-header font-bold">Meeting agenda checklist</h3>
            {[
              { label: "Review exceptions", done: true },
              { label: "Align on B2B pipeline", done: false },
              { label: "Verify NM constraints", done: false },
              { label: "Confirm S&OP lock", done: false },
              { label: "Approve and push to DRP", done: false },
            ].map(item => (
              <label key={item.label} className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" defaultChecked={item.done}
                  className="h-4 w-4 rounded border-white/30 bg-white/10 accent-primary" />
                <span className={cn("text-table", item.done && "line-through text-white/50")}>{item.label}</span>
              </label>
            ))}
            <div className="pt-3 border-t border-white/10 flex justify-between text-table-sm">
              <span className="text-white/60">Session Progress</span>
              <span className="font-bold">20% Done</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: "20%" }} />
            </div>
          </div>

          {/* Curator Insight */}
          <div className="rounded-card border border-surface-3 bg-info-bg p-4 space-y-2">
            <h4 className="text-table font-bold text-text-1 flex items-center gap-1.5">💡 Curator Insight</h4>
            <p className="text-table-sm text-text-2">
              Sales v1 is consistently <span className="font-medium text-primary underline cursor-pointer">higher than historical peaks</span> in the Southern region. Statistical forecast suggests a 15% downward adjustment to avoid overstock.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
