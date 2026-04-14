import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { ClickableNumber } from "@/components/ClickableNumber";
import { LogicLink } from "@/components/LogicLink";
import { LogicTooltip } from "@/components/LogicTooltip";
import { ViewPivotToggle, usePivotMode, WorstCnCell, CnGapBadge } from "@/components/ViewPivotToggle";
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

/* ═══ SKU-first pivot helpers ═══ */
interface SkuPivotRow {
  item: string;
  variant: string;
  v0: number; v1: number; v2: number; v3: number; aop: number;
  worstCn: string;
  worstDelta: number;
  cnGapCount: number;
  cnBreakdown: { cn: string; cnIdx: number; v0: number; v1: number; v2: number; v3: number; aop: number; fvaBest: string; skuIdx: number; note: string }[];
}

function buildSkuPivot(data: ConsensusRow[]): SkuPivotRow[] {
  const map = new Map<string, SkuPivotRow>();
  data.forEach((cn, cnIdx) => {
    cn.skus.forEach((sku, skuIdx) => {
      const key = `${sku.item}|${sku.variant}`;
      if (!map.has(key)) {
        map.set(key, { item: sku.item, variant: sku.variant, v0: 0, v1: 0, v2: 0, v3: 0, aop: 0, worstCn: "", worstDelta: Infinity, cnGapCount: 0, cnBreakdown: [] });
      }
      const r = map.get(key)!;
      r.v0 += sku.v0; r.v1 += sku.v1; r.v2 += sku.v2; r.v3 += sku.v3; r.aop += sku.aop;
      const delta = sku.aop > 0 ? ((sku.v3 - sku.aop) / sku.aop) * 100 : 0;
      if (Math.abs(delta) > 5) r.cnGapCount++;
      if (delta < r.worstDelta) { r.worstDelta = delta; r.worstCn = cn.cn; }
      r.cnBreakdown.push({ cn: cn.cn, cnIdx, v0: sku.v0, v1: sku.v1, v2: sku.v2, v3: sku.v3, aop: sku.aop, fvaBest: cn.fvaBest, skuIdx, note: sku.note });
    });
  });
  return Array.from(map.values()).sort((a, b) => b.v3 - a.v3);
}

export function ConsensusTab({ data, totalAop, totalV3, locked, onUpdateV3, onUpdateNote }: Props) {
  const [pivotMode, setPivotMode] = usePivotMode("sop-consensus");
  const [drillCn, setDrillCn] = useState<number | null>(null);
  const [drillSku, setDrillSku] = useState<string | null>(null);

  const totals = {
    v0: data.reduce((a, r) => a + r.v0, 0),
    v1: data.reduce((a, r) => a + r.v1, 0),
    v2: data.reduce((a, r) => a + r.v2, 0),
    v3: totalV3,
    aop: totalAop,
  };

  const deltaAop = totalV3 - totalAop;
  const deltaAopPct = totalAop > 0 ? Math.round((deltaAop / totalAop) * 100) : 0;

  const skuPivotData = pivotMode === "sku" ? buildSkuPivot(data) : [];

  /* ═══ SKU-first drill: per CN for a SKU ═══ */
  if (pivotMode === "sku" && drillSku) {
    const skuRow = skuPivotData.find(r => `${r.item}|${r.variant}` === drillSku);
    if (!skuRow) return null;
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-2 text-table-sm">
          <button onClick={() => setDrillSku(null)} className="text-primary font-medium hover:underline flex items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5" /> Per SKU
          </button>
          <span className="text-text-3">/</span>
          <span className="text-text-1 font-medium">{skuRow.item} {skuRow.variant} (v3: {skuRow.v3.toLocaleString()} m²)</span>
        </div>
        <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-table-sm">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1/50">
                  {["CN", "v0 Statistical", "v1 Sales", "v2 CN Input", "v3 Consensus", "AOP", "vs AOP", "FVA best"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {skuRow.cnBreakdown.map((cb, i) => {
                  const delta = cb.aop > 0 ? Math.round(((cb.v3 - cb.aop) / cb.aop) * 100) : 0;
                  const aopColor = Math.abs(delta) <= 5 ? "text-success" : delta > 0 ? "text-warning" : "text-danger";
                  return (
                    <tr key={i} className={cn("border-b border-surface-3/50 hover:bg-primary/5 transition-colors", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                      <td className="px-4 py-2.5 font-medium text-text-1">{cb.cn}</td>
                      <td className="px-4 py-2.5 tabular-nums text-text-2">{cb.v0.toLocaleString()}</td>
                      <td className="px-4 py-2.5 tabular-nums text-text-2">{cb.v1.toLocaleString()}</td>
                      <td className="px-4 py-2.5 tabular-nums text-text-2">{cb.v2.toLocaleString()}</td>
                      <td className="px-4 py-2.5 tabular-nums text-primary font-bold">{cb.v3.toLocaleString()}</td>
                      <td className="px-4 py-2.5 tabular-nums text-text-3">{cb.aop.toLocaleString()}</td>
                      <td className={cn("px-4 py-2.5 tabular-nums font-medium", aopColor)}>
                        {delta > 0 ? "+" : ""}{delta}% {Math.abs(delta) > 5 ? "⚠" : ""}
                      </td>
                      <td className="px-4 py-2.5 text-text-2">{cb.fvaBest}</td>
                    </tr>
                  );
                })}
                <tr className="bg-surface-1 border-t-2 border-primary/20 font-bold">
                  <td className="px-4 py-2.5 text-text-1">TOTAL</td>
                  <td className="px-4 py-2.5 tabular-nums text-text-1">{skuRow.v0.toLocaleString()}</td>
                  <td className="px-4 py-2.5 tabular-nums text-text-1">{skuRow.v1.toLocaleString()}</td>
                  <td className="px-4 py-2.5 tabular-nums text-text-1">{skuRow.v2.toLocaleString()}</td>
                  <td className="px-4 py-2.5 tabular-nums text-primary font-bold">{skuRow.v3.toLocaleString()}</td>
                  <td className="px-4 py-2.5 tabular-nums text-text-3">{skuRow.aop.toLocaleString()}</td>
                  <td /><td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  /* ═══ CN-first drill (existing) ═══ */
  if (pivotMode === "cn" && drillCn !== null) {
    const row = data[drillCn];
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-2 text-table-sm">
          <button onClick={() => setDrillCn(null)} className="text-primary font-medium hover:underline flex items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5" /> Consensus
          </button>
          <span className="text-text-3">/</span>
          <span className="text-text-1 font-medium">{row.cn} (v3: {row.v3.toLocaleString()} m²)</span>
        </div>
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

  // Layer 1
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Pivot toggle */}
      <ViewPivotToggle value={pivotMode} onChange={(m) => { setPivotMode(m); setDrillCn(null); setDrillSku(null); }} />

      {pivotMode === "cn" ? (
        /* ═══ CN-FIRST Layer 1 ═══ */
        <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-table-sm">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1/50">
                  {[
                    { h: "CN" }, { h: "v0 Statistical" }, { h: "v1 Sales" }, { h: "v2 CN Input" }, { h: "v3 Consensus ★" },
                    { h: "AOP target" }, { h: "vs AOP" },
                    { h: "FVA best", logic: { tab: "forecast" as const, node: 4, tip: "FVA — Ai dự báo chính xác nhất?" } },
                    { h: "" },
                  ].map((col, i) => (
                    <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        {col.h}
                        {col.logic && <LogicLink tab={col.logic.tab} node={col.logic.node} tooltip={col.logic.tip} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => {
                  const delta = row.aop > 0 ? Math.round(((row.v3 - row.aop) / row.aop) * 100) : 0;
                  const absDelta = Math.abs(delta);
                  const aopColor = absDelta <= 5 ? "text-success" : delta > 0 ? "text-warning" : "text-danger";
                  const maxV = Math.max(row.v0, row.v1, row.v2, row.v3);
                  const minV = Math.min(row.v0, row.v1, row.v2, row.v3);
                  const versionSpread = minV > 0 ? ((maxV - minV) / minV) * 100 : 0;

                  return (
                    <tr key={i} className={cn("border-b border-surface-3/50 hover:bg-primary/5 transition-colors", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                      <td className="px-4 py-3 font-medium text-text-1">{row.cn}</td>
                      <td className="px-4 py-3 tabular-nums text-text-2">
                        <ClickableNumber value={row.v0} label="v0 Statistical" color="text-text-2"
                          breakdown={[{ label: "Model", value: "Holt-Winters" }, { label: "History", value: "24M" }, { label: "MAPE", value: "18,4%" }, { label: "Run", value: "10/05 auto" }]}
                          note={`Per CN: ${data.map(d => `${d.cn} ${d.v0.toLocaleString()}`).join(" | ")}`}
                        />
                      </td>
                      <td className={cn("px-4 py-3 tabular-nums text-text-2", versionSpread > 10 && "bg-warning/10")}>
                        <ClickableNumber value={row.v1} label="v1 Sales" color="text-text-2"
                          breakdown={[{ label: "Nhập bởi", value: "Anh Tuấn, Chị Lan" }, { label: "Ngày", value: "03/05" }]}
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
                      <td className="px-4 py-3 text-table-sm text-text-2">
                        <span className="inline-flex items-center gap-1">
                          {row.fvaBest}
                          <LogicTooltip
                            title={`FVA — ${row.cn}`}
                            content={`FVA = Forecast Value Add = ai dự báo chính xác nhất THÁNG TRƯỚC?\n\nTháng 4 actual ${row.cn} = ${Math.round(row.v3 * 0.87).toLocaleString()}m²\nv0 Statistical: FC = ${row.v0.toLocaleString()} → MAPE 8,1%\nv1 Sales: FC = ${row.v1.toLocaleString()} → MAPE 16,6%\nv2 CN Input: FC = ${row.v2.toLocaleString()} → MAPE 2,2% ★ Best\nv3 Consensus: FC = ${row.v3.toLocaleString()} → MAPE 1,3%\n\nFVA v2 = MAPE(v0) − MAPE(v2) = 8,1% − 2,2% = +5,9% (tốt hơn model)\nFVA v1 = 8,1% − 16,6% = −8,5% (xấu hơn model!)\n→ v2 CN Input có giá trị cao nhất → recommend dùng cho ${row.cn}.`}
                          />
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setDrillCn(i)} className="text-primary text-table-sm font-medium hover:underline flex items-center gap-0.5">
                          Detail <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-surface-1 border-t-2 border-primary/20 font-bold">
                  <td className="px-4 py-3 text-text-1">TOTAL</td>
                  <td className="px-4 py-3 tabular-nums text-text-1">{totals.v0.toLocaleString()}</td>
                  <td className="px-4 py-3 tabular-nums text-text-1">{totals.v1.toLocaleString()}</td>
                  <td className="px-4 py-3 tabular-nums text-text-1">{totals.v2.toLocaleString()}</td>
                  <td className="px-4 py-3 tabular-nums text-primary font-bold">
                    ★<ClickableNumber value={totals.v3} label="v3 Consensus" color="text-primary font-bold"
                      breakdown={[{ label: "Quyết định", value: "SC Manager Thúy" }, { label: "Ngày", value: "05/05" }]}
                      note={`Logic: "Dùng v2 CN input cho BD+ĐN, v0 stat cho HN, v1 sales cho CT"`}
                    />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text-3">{totals.aop.toLocaleString()}</td>
                  <td className={cn("px-4 py-3 tabular-nums font-medium", deltaAopPct > 5 ? "text-warning" : "text-success")}>
                    {deltaAop > 0 ? "+" : ""}{deltaAop.toLocaleString()} ({deltaAopPct > 0 ? "+" : ""}{deltaAopPct}%)
                  </td>
                  <td /><td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ═══ SKU-FIRST Layer 1 ═══ */
        <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-table-sm">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1/50">
                  {["Item", "Variant", "v0 Total", "v1 Total", "v2 Total", "v3 Total", "AOP", "vs AOP", "Worst CN", "# CN gap", ""].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {skuPivotData.map((row, i) => {
                  const delta = row.aop > 0 ? Math.round(((row.v3 - row.aop) / row.aop) * 100) : 0;
                  const aopColor = Math.abs(delta) <= 5 ? "text-success" : delta > 0 ? "text-warning" : "text-danger";
                  return (
                    <tr key={i} className={cn("border-b border-surface-3/50 hover:bg-primary/5 transition-colors cursor-pointer", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}
                      onClick={() => setDrillSku(`${row.item}|${row.variant}`)}>
                      <td className="px-4 py-2.5 font-medium text-text-1">{row.item}</td>
                      <td className="px-4 py-2.5 text-text-2">{row.variant}</td>
                      <td className="px-4 py-2.5 tabular-nums text-text-2">{row.v0.toLocaleString()}</td>
                      <td className="px-4 py-2.5 tabular-nums text-text-2">{row.v1.toLocaleString()}</td>
                      <td className="px-4 py-2.5 tabular-nums text-text-2">{row.v2.toLocaleString()}</td>
                      <td className="px-4 py-2.5 tabular-nums text-primary font-bold">{row.v3.toLocaleString()}</td>
                      <td className="px-4 py-2.5 tabular-nums text-text-3">{row.aop.toLocaleString()}</td>
                      <td className={cn("px-4 py-2.5 tabular-nums font-medium", aopColor)}>
                        {delta > 0 ? "+" : ""}{delta}% {Math.abs(delta) > 5 ? "⚠" : ""}
                      </td>
                      <td className="px-4 py-2.5">
                        <WorstCnCell cnName={row.worstCn} hstk={Math.abs(row.worstDelta)} />
                      </td>
                      <td className="px-4 py-2.5">
                        <CnGapBadge count={row.cnGapCount} />
                      </td>
                      <td className="px-4 py-2.5">
                        <ChevronRight className="h-3.5 w-3.5 text-text-3" />
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-surface-1 border-t-2 border-primary/20 font-bold">
                  <td className="px-4 py-2.5 text-text-1">TOTAL</td>
                  <td />
                  <td className="px-4 py-2.5 tabular-nums text-text-1">{totals.v0.toLocaleString()}</td>
                  <td className="px-4 py-2.5 tabular-nums text-text-1">{totals.v1.toLocaleString()}</td>
                  <td className="px-4 py-2.5 tabular-nums text-text-1">{totals.v2.toLocaleString()}</td>
                  <td className="px-4 py-2.5 tabular-nums text-primary font-bold">{totals.v3.toLocaleString()}</td>
                  <td className="px-4 py-2.5 tabular-nums text-text-3">{totals.aop.toLocaleString()}</td>
                  <td /><td /><td /><td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

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
