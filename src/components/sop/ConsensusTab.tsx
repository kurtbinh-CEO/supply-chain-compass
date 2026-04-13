import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { ClickableNumber } from "@/components/ClickableNumber";
import type { ConsensusRow } from "@/pages/SopPage";

interface Props {
  data: ConsensusRow[];
  totalAop: number;
  totalV3: number;
  locked: boolean;
  onUpdateV3: (cnIdx: number, skuIdx: number | null, value: number) => void;
  onUpdateNote: (cnIdx: number, skuIdx: number, note: string) => void;
}

function EditableCell({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [edited, setEdited] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (editing && !disabled) {
    return (
      <input
        ref={inputRef}
        autoFocus
        className="w-20 rounded border border-primary bg-surface-0 px-2 py-1 text-table-sm tabular-nums text-text-1 font-medium focus:outline-none focus:ring-1 focus:ring-primary"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => {
          const n = parseInt(draft);
          if (!isNaN(n) && n !== value) { onChange(n); setEdited(true); }
          setEditing(false);
        }}
        onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditing(false); }}
      />
    );
  }

  return (
    <span
      onClick={() => { if (!disabled) { setDraft(String(value)); setEditing(true); } }}
      className={cn(
        "tabular-nums font-bold cursor-pointer px-2 py-1 rounded transition-colors",
        edited ? "bg-warning/15 border border-warning/40 text-warning" : "text-primary hover:bg-primary/5",
        disabled && "cursor-default opacity-70"
      )}
    >
      {value.toLocaleString()}
    </span>
  );
}

function NoteCell({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing && !disabled) {
    return (
      <input
        autoFocus
        className="w-full rounded border border-surface-3 bg-surface-0 px-2 py-1 text-table-sm text-text-2 focus:outline-none focus:ring-1 focus:ring-primary"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { onChange(draft); setEditing(false); }}
        onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      />
    );
  }

  return (
    <span
      onClick={() => { if (!disabled) { setDraft(value); setEditing(true); } }}
      className={cn("text-table-sm text-text-3 cursor-pointer hover:text-text-2", disabled && "cursor-default")}
    >
      {value || "—"}
    </span>
  );
}

export function ConsensusTab({ data, totalAop, totalV3, locked, onUpdateV3, onUpdateNote }: Props) {
  const [drillCn, setDrillCn] = useState<number | null>(null);

  const totals = {
    v0: data.reduce((a, r) => a + r.v0, 0),
    v1: data.reduce((a, r) => a + r.v1, 0),
    v2: data.reduce((a, r) => a + r.v2, 0),
    v3: totalV3,
    aop: totalAop,
  };

  const deltaAop = totalV3 - totalAop;
  const deltaAopPct = totalAop > 0 ? Math.round((deltaAop / totalAop) * 100) : 0;

  if (drillCn !== null) {
    const row = data[drillCn];
    return (
      <div className="space-y-4 animate-fade-in">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-table-sm">
          <button onClick={() => setDrillCn(null)} className="text-primary font-medium hover:underline flex items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5" /> Consensus
          </button>
          <span className="text-text-3">/</span>
          <span className="text-text-1 font-medium">{row.cn} (v3: {row.v3.toLocaleString()} m²)</span>
        </div>

        {/* SKU table */}
        <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-table-sm">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1/50">
                  {["Item", "Variant", "v0 Statistical", "v1 Sales", "v2 CN Input", "v3 Consensus", "Δ v0→v3", "AOP", "Note"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {row.skus.map((sku, si) => {
                  const delta = sku.v0 > 0 ? Math.round(((sku.v3 - sku.v0) / sku.v0) * 100) : 0;
                  const bigDelta = Math.abs(delta) > 10;
                  return (
                    <tr key={si} className={cn("border-b border-surface-3/50 hover:bg-primary/5 transition-colors", si % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                      <td className="px-4 py-2.5 font-medium text-text-1">{sku.item}</td>
                      <td className="px-4 py-2.5 text-text-2">{sku.variant}</td>
                      <td className="px-4 py-2.5 tabular-nums text-text-2">{sku.v0.toLocaleString()}</td>
                      <td className="px-4 py-2.5 tabular-nums text-text-2">{sku.v1.toLocaleString()}</td>
                      <td className="px-4 py-2.5 tabular-nums text-text-2">{sku.v2.toLocaleString()}</td>
                      <td className="px-4 py-2.5">
                        <EditableCell value={sku.v3} onChange={v => onUpdateV3(drillCn, si, v)} disabled={locked} />
                      </td>
                      <td className={cn("px-4 py-2.5 tabular-nums font-medium", bigDelta ? "text-warning" : "text-text-2")}>
                        {delta > 0 ? "+" : ""}{delta}% {bigDelta ? "⚠" : ""}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-text-3">{sku.aop.toLocaleString()}</td>
                      <td className="px-4 py-2.5 max-w-[180px]">
                        <NoteCell value={sku.note} onChange={v => onUpdateNote(drillCn, si, v)} disabled={locked} />
                      </td>
                    </tr>
                  );
                })}
                {/* Total */}
                <tr className="bg-surface-1 border-t-2 border-primary/20 font-bold">
                  <td className="px-4 py-2.5 text-text-1">TOTAL</td>
                  <td />
                  <td className="px-4 py-2.5 tabular-nums text-text-1">{row.skus.reduce((a, s) => a + s.v0, 0).toLocaleString()}</td>
                  <td className="px-4 py-2.5 tabular-nums text-text-1">{row.skus.reduce((a, s) => a + s.v1, 0).toLocaleString()}</td>
                  <td className="px-4 py-2.5 tabular-nums text-text-1">{row.skus.reduce((a, s) => a + s.v2, 0).toLocaleString()}</td>
                  <td className="px-4 py-2.5 tabular-nums text-primary font-bold">{row.v3.toLocaleString()}</td>
                  <td />
                  <td className="px-4 py-2.5 tabular-nums text-text-3">{row.aop.toLocaleString()}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Layer 1 — CN summary
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-table-sm">
            <thead>
              <tr className="border-b border-surface-3 bg-surface-1/50">
                {["CN", "v0 Statistical", "v1 Sales", "v2 CN Input", "v3 Consensus ★", "AOP target", "vs AOP", "FVA best", ""].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => {
                const delta = row.aop > 0 ? Math.round(((row.v3 - row.aop) / row.aop) * 100) : 0;
                const absDelta = Math.abs(delta);
                const aopColor = absDelta <= 5 ? "text-success" : delta > 0 ? "text-warning" : "text-danger";
                // Check for big version deltas
                const maxV = Math.max(row.v0, row.v1, row.v2, row.v3);
                const minV = Math.min(row.v0, row.v1, row.v2, row.v3);
                const versionSpread = minV > 0 ? ((maxV - minV) / minV) * 100 : 0;

                return (
                  <tr key={i} className={cn("border-b border-surface-3/50 hover:bg-primary/5 transition-colors", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                    <td className="px-4 py-3 font-medium text-text-1">{row.cn}</td>
                    <td className="px-4 py-3 tabular-nums text-text-2">
                      <ClickableNumber
                        value={row.v0}
                        label="v0 Statistical"
                        color="text-text-2"
                        breakdown={[
                          { label: "Model", value: "Holt-Winters" },
                          { label: "History", value: "24M" },
                          { label: "MAPE", value: "18,4%" },
                          { label: "Run", value: "10/05 auto" },
                        ]}
                        note={`Per CN: ${data.map(d => `${d.cn} ${d.v0.toLocaleString()}`).join(" | ")}`}
                      />
                    </td>
                    <td className={cn("px-4 py-3 tabular-nums text-text-2", versionSpread > 10 && "bg-warning/10")}>
                      <ClickableNumber
                        value={row.v1}
                        label="v1 Sales"
                        color="text-text-2"
                        breakdown={[
                          { label: "Nhập bởi", value: "Anh Tuấn, Chị Lan" },
                          { label: "Ngày", value: "03/05" },
                        ]}
                        note={`Per CN: ${data.map(d => `${d.cn} ${d.v1.toLocaleString()} (${d.v0 > 0 ? (d.v1 > d.v0 ? "+" : "") + Math.round(((d.v1-d.v0)/d.v0)*100) + "% vs v0" : ""})`).join(" | ")}\nSales thấy pipeline B2B tăng Q2`}
                      />
                    </td>
                    <td className="px-4 py-3 tabular-nums text-text-2">{row.v2.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1">
                        <span className="text-primary text-[10px]">★</span>
                        <EditableCell value={row.v3} onChange={v => onUpdateV3(i, null, v)} disabled={locked} />
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-text-3">{row.aop.toLocaleString()}</td>
                    <td className={cn("px-4 py-3 tabular-nums font-medium", aopColor)}>
                      {delta > 0 ? "+" : ""}{(row.v3 - row.aop).toLocaleString()} ({delta > 0 ? "+" : ""}{delta}%) {absDelta > 5 ? "⚠" : ""}
                    </td>
                    <td className="px-4 py-3 text-table-sm text-text-2">{row.fvaBest}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setDrillCn(i)} className="text-primary text-table-sm font-medium hover:underline flex items-center gap-0.5">
                        Detail <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {/* Total row */}
              <tr className="bg-surface-1 border-t-2 border-primary/20 font-bold">
                <td className="px-4 py-3 text-text-1">TOTAL</td>
                <td className="px-4 py-3 tabular-nums text-text-1">{totals.v0.toLocaleString()}</td>
                <td className="px-4 py-3 tabular-nums text-text-1">{totals.v1.toLocaleString()}</td>
                <td className="px-4 py-3 tabular-nums text-text-1">{totals.v2.toLocaleString()}</td>
                <td className="px-4 py-3 tabular-nums text-primary font-bold">
                  ★<ClickableNumber
                    value={totals.v3}
                    label="v3 Consensus"
                    color="text-primary font-bold"
                    breakdown={[
                      { label: "Quyết định", value: "SC Manager Thúy" },
                      { label: "Ngày", value: "05/05" },
                    ]}
                    note={`Logic: "Dùng v2 CN input cho BD+ĐN, v0 stat cho HN, v1 sales cho CT"`}
                  />
                </td>
                <td className="px-4 py-3 tabular-nums text-text-3">{totals.aop.toLocaleString()}</td>
                <td className={cn("px-4 py-3 tabular-nums font-medium", deltaAopPct > 5 ? "text-warning" : "text-success")}>
                  {deltaAop > 0 ? "+" : ""}{deltaAop.toLocaleString()} ({deltaAopPct > 0 ? "+" : ""}{deltaAopPct}%)
                </td>
                <td />
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* AOP gap summary strip */}
      <div className="rounded-card border border-warning/30 bg-warning/5 p-4">
        <p className="text-table text-text-1 mb-2">
          <span className="font-bold">Consensus {totals.v3.toLocaleString()}</span> vs <span className="font-bold">AOP {totals.aop.toLocaleString()}</span> = <span className="font-bold text-warning">+{deltaAopPct}%</span>
        </p>
        <div className="flex items-center gap-3 text-table-sm text-text-2">
          <span className="rounded-full bg-surface-2 border border-surface-3 px-2.5 py-0.5">① Sales giải trình tăng trưởng</span>
          <span className="rounded-full bg-surface-2 border border-surface-3 px-2.5 py-0.5">② Board điều chỉnh AOP</span>
          <span className="rounded-full bg-surface-2 border border-surface-3 px-2.5 py-0.5">③ SC Manager buffer</span>
        </div>
      </div>
    </div>
  );
}
