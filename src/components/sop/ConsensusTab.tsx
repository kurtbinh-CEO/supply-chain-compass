/**
 * ConsensusTab — SOP Consensus (đã migrate sang SmartTable + drillDown).
 *
 * Convention:
 *  - Pivot CN-first: SmartTable, drillDown = SKU per CN + textarea giải trình variance.
 *  - Pivot SKU-first: SmartTable, drillDown = CN breakdown per SKU.
 *  - autoExpandWhen = |Δ top-down vs Σ(SKU v3)| > 10% — bắt buộc giải trình trước khi khoá.
 *  - Bỏ HÀNH TRÌNH VERSION (v0→v1→v2→v3) — dữ liệu đã có trong các cột.
 *  - Không còn custom expand state / drill page riêng.
 */
import React, { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { ClickableNumber } from "@/components/ClickableNumber";
import { LogicLink } from "@/components/LogicLink";
import { LogicTooltip } from "@/components/LogicTooltip";
import {
  ViewPivotToggle,
  usePivotMode,
  WorstCnCell,
  CnGapBadge,
} from "@/components/ViewPivotToggle";
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";
import type { ConsensusRow, SkuRow } from "@/pages/SopPage";

interface Props {
  data: ConsensusRow[];
  totalAop: number;
  totalV3: number;
  locked: boolean;
  onUpdateV3: (cnIdx: number, skuIdx: number | null, value: number) => void;
  onUpdateNote: (cnIdx: number, skuIdx: number, note: string) => void;
  varianceExplanations?: Record<string, string>;
  onUpdateVariance?: (cnCode: string, text: string) => void;
}

/* ═══ Inline editable cells (giữ nguyên UX) ═══ */
function EditableCell({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
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
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const n = parseInt(draft);
          if (!isNaN(n) && n !== value) {
            onChange(n);
            setEdited(true);
          }
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) {
          setDraft(String(value));
          setEditing(true);
        }
      }}
      className={cn(
        "tabular-nums font-bold cursor-pointer px-2 py-1 rounded transition-colors",
        edited
          ? "bg-warning/15 border border-warning/40 text-warning"
          : "text-primary hover:bg-primary/5",
        disabled && "cursor-default opacity-70",
      )}
    >
      {value.toLocaleString()}
    </span>
  );
}

function NoteCell({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing && !disabled) {
    return (
      <input
        autoFocus
        className="w-full rounded border border-surface-3 bg-surface-0 px-2 py-1 text-table-sm text-text-2 focus:outline-none focus:ring-1 focus:ring-primary"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          onChange(draft);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
    );
  }

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) {
          setDraft(value);
          setEditing(true);
        }
      }}
      className={cn(
        "text-table-sm text-text-3 cursor-pointer hover:text-text-2",
        disabled && "cursor-default",
      )}
    >
      {value || "—"}
    </span>
  );
}

/* ═══ SKU-first pivot helpers ═══ */
interface SkuPivotRow {
  item: string;
  variant: string;
  v0: number;
  v1: number;
  v2: number;
  v3: number;
  aop: number;
  worstCn: string;
  worstDelta: number;
  cnGapCount: number;
  cnBreakdown: {
    cn: string;
    cnIdx: number;
    v0: number;
    v1: number;
    v2: number;
    v3: number;
    aop: number;
    fvaBest: string;
    skuIdx: number;
    note: string;
  }[];
}

function buildSkuPivot(data: ConsensusRow[]): SkuPivotRow[] {
  const map = new Map<string, SkuPivotRow>();
  data.forEach((cn, cnIdx) => {
    cn.skus.forEach((sku, skuIdx) => {
      const key = `${sku.item}|${sku.variant}`;
      if (!map.has(key)) {
        map.set(key, {
          item: sku.item,
          variant: sku.variant,
          v0: 0, v1: 0, v2: 0, v3: 0, aop: 0,
          worstCn: "",
          worstDelta: Infinity,
          cnGapCount: 0,
          cnBreakdown: [],
        });
      }
      const r = map.get(key)!;
      r.v0 += sku.v0; r.v1 += sku.v1; r.v2 += sku.v2; r.v3 += sku.v3; r.aop += sku.aop;
      const delta = sku.aop > 0 ? ((sku.v3 - sku.aop) / sku.aop) * 100 : 0;
      if (Math.abs(delta) > 5) r.cnGapCount++;
      if (delta < r.worstDelta) {
        r.worstDelta = delta;
        r.worstCn = cn.cn;
      }
      r.cnBreakdown.push({
        cn: cn.cn, cnIdx,
        v0: sku.v0, v1: sku.v1, v2: sku.v2, v3: sku.v3, aop: sku.aop,
        fvaBest: cn.fvaBest, skuIdx, note: sku.note,
      });
    });
  });
  return Array.from(map.values()).sort((a, b) => b.v3 - a.v3);
}

/* ═══ Main component ═══ */
export function ConsensusTab({
  data,
  totalAop,
  totalV3,
  locked,
  onUpdateV3,
  onUpdateNote,
  varianceExplanations = {},
  onUpdateVariance,
}: Props) {
  const [pivotMode, setPivotMode] = usePivotMode("sop-consensus");

  const totals = {
    v0: data.reduce((a, r) => a + r.v0, 0),
    v1: data.reduce((a, r) => a + r.v1, 0),
    v2: data.reduce((a, r) => a + r.v2, 0),
    v3: totalV3,
    aop: totalAop,
  };

  const deltaAop = totalV3 - totalAop;
  const deltaAopPct = totalAop > 0 ? Math.round((deltaAop / totalAop) * 100) : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <ViewPivotToggle value={pivotMode} onChange={(m) => setPivotMode(m)} />

      {pivotMode === "cn" ? (
        <ConsensusCnTable
          data={data}
          totals={totals}
          locked={locked}
          onUpdateV3={onUpdateV3}
          onUpdateNote={onUpdateNote}
          varianceExplanations={varianceExplanations}
          onUpdateVariance={onUpdateVariance}
        />
      ) : (
        <ConsensusSkuTable
          data={data}
          totals={totals}
          locked={locked}
          onUpdateV3={onUpdateV3}
        />
      )}

      {/* AOP gap summary strip */}
      <div className="rounded-card border border-warning/30 bg-warning/5 p-4">
        <p className="text-table text-text-1 mb-2">
          <span className="font-bold">Consensus {totals.v3.toLocaleString()}</span>{" "}
          vs <span className="font-bold">AOP {totals.aop.toLocaleString()}</span> ={" "}
          <span className="font-bold text-warning">
            {deltaAopPct >= 0 ? "+" : ""}{deltaAopPct}%
          </span>
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

/* ═══════════════════════════════════════════════════════════════════════
   CN-FIRST  ──────────────────────────────────────────────────────────────
   ═══════════════════════════════════════════════════════════════════════ */

interface CnRowEnriched extends ConsensusRow {
  _idx: number;
  _bottomUpV3: number;
  _variancePct: number;
  _isVariance: boolean;
  _aopDelta: number;
  _aopDeltaPct: number;
}

function ConsensusCnTable({
  data,
  totals,
  locked,
  onUpdateV3,
  onUpdateNote,
  varianceExplanations,
  onUpdateVariance,
}: {
  data: ConsensusRow[];
  totals: { v0: number; v1: number; v2: number; v3: number; aop: number };
  locked: boolean;
  onUpdateV3: (cnIdx: number, skuIdx: number | null, value: number) => void;
  onUpdateNote: (cnIdx: number, skuIdx: number, note: string) => void;
  varianceExplanations: Record<string, string>;
  onUpdateVariance?: (cnCode: string, text: string) => void;
}) {
  const rows: CnRowEnriched[] = useMemo(
    () =>
      data.map((row, i) => {
        const bottomUpV3 = row.skus.reduce((a, s) => a + s.v3, 0);
        const variancePct = row.v0 > 0 ? ((bottomUpV3 - row.v0) / row.v0) * 100 : 0;
        const aopDelta = row.v3 - row.aop;
        const aopDeltaPct = row.aop > 0 ? Math.round((aopDelta / row.aop) * 100) : 0;
        return {
          ...row,
          _idx: i,
          _bottomUpV3: bottomUpV3,
          _variancePct: variancePct,
          _isVariance: Math.abs(variancePct) > 10,
          _aopDelta: aopDelta,
          _aopDeltaPct: aopDeltaPct,
        };
      }),
    [data],
  );

  const cols: SmartTableColumn<CnRowEnriched>[] = [
    {
      key: "cn",
      label: "CN",
      width: 130,
      sortable: true,
      filter: "text",
      accessor: (r) => r.cn,
      render: (r) => (
        <span className="flex items-center gap-1.5">
          <span className="font-medium text-text-1">{r.cn}</span>
          {r._isVariance && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full bg-danger text-danger-foreground text-[10px] font-bold px-1.5 py-0.5"
              title="Top-down v0 vs Σ(SKU v3) chênh >10%"
            >
              <AlertTriangle className="h-2.5 w-2.5" />
              {r._variancePct > 0 ? "+" : ""}{Math.round(r._variancePct)}%
            </span>
          )}
        </span>
      ),
    },
    {
      key: "v0",
      label: "v0 Thống kê",
      width: 120,
      numeric: true,
      sortable: true,
      align: "right",
      accessor: (r) => r.v0,
      render: (r) => (
        <ClickableNumber
          value={r.v0}
          label="v0 Statistical"
          color="text-text-2"
          breakdown={[
            { label: "Model", value: "Holt-Winters" },
            { label: "History", value: "24M" },
            { label: "MAPE", value: "18,4%" },
            { label: "Run", value: "10/05 auto" },
          ]}
          note={`Per CN: ${data.map((d) => `${d.cn} ${d.v0.toLocaleString()}`).join(" | ")}`}
        />
      ),
    },
    {
      key: "v1",
      label: "v1 Kinh doanh",
      width: 120,
      numeric: true,
      sortable: true,
      align: "right",
      accessor: (r) => r.v1,
      render: (r) => (
        <ClickableNumber
          value={r.v1}
          label="v1 Sales"
          color="text-text-2"
          breakdown={[
            { label: "Nhập bởi", value: "Anh Tuấn, Chị Lan" },
            { label: "Ngày", value: "03/05" },
          ]}
          note={`Sales thấy pipeline B2B tăng Q2`}
        />
      ),
    },
    {
      key: "v2",
      label: "v2 CN nhập",
      width: 110,
      numeric: true,
      sortable: true,
      align: "right",
      accessor: (r) => r.v2,
      render: (r) => r.v2.toLocaleString(),
    },
    {
      key: "v3",
      label: "v3 Đồng thuận ★",
      width: 140,
      numeric: true,
      sortable: true,
      align: "right",
      accessor: (r) => r.v3,
      render: (r) => (
        <span className="flex items-center gap-1 justify-end">
          <span className="text-primary text-[10px]">★</span>
          <EditableCell
            value={r.v3}
            onChange={(v) => onUpdateV3(r._idx, null, v)}
            disabled={locked}
          />
        </span>
      ),
    },
    {
      key: "aop",
      label: "AOP",
      width: 100,
      numeric: true,
      sortable: true,
      align: "right",
      accessor: (r) => r.aop,
      render: (r) => <span className="text-text-3">{r.aop.toLocaleString()}</span>,
    },
    {
      key: "vsAop",
      label: "vs AOP",
      width: 140,
      numeric: true,
      sortable: true,
      align: "right",
      accessor: (r) => r._aopDeltaPct,
      render: (r) => {
        const abs = Math.abs(r._aopDeltaPct);
        const color =
          abs <= 5 ? "text-success" : r._aopDeltaPct > 0 ? "text-warning" : "text-danger";
        return (
          <span className={cn("tabular-nums font-medium", color)}>
            {r._aopDelta > 0 ? "+" : ""}
            {r._aopDelta.toLocaleString()} ({r._aopDeltaPct > 0 ? "+" : ""}
            {r._aopDeltaPct}%) {abs > 5 ? "⚠" : ""}
          </span>
        );
      },
    },
    {
      key: "fvaBest",
      label: "FVA tốt nhất",
      width: 160,
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-text-2">
          {r.fvaBest}
          <LogicTooltip
            title={`FVA — ${r.cn}`}
            content={`FVA = Forecast Value Add — ai dự báo chính xác nhất tháng trước?\n\nTháng 4 actual ${r.cn} = ${Math.round(r.v3 * 0.87).toLocaleString()} m²\nv0 Statistical → MAPE 8,1%\nv1 Sales → MAPE 16,6%\nv2 CN Input → MAPE 2,2% ★ Best\nv3 Consensus → MAPE 1,3%\n\n→ ${r.fvaBest} có giá trị cao nhất.`}
          />
        </span>
      ),
    },
  ];

  const summaryRow: Partial<Record<string, React.ReactNode>> = {
    cn: <span className="font-bold text-text-1">TỔNG</span>,
    v0: totals.v0.toLocaleString(),
    v1: totals.v1.toLocaleString(),
    v2: totals.v2.toLocaleString(),
    v3: (
      <span className="text-primary font-bold tabular-nums">
        ★ {totals.v3.toLocaleString()}
      </span>
    ),
    aop: totals.aop.toLocaleString(),
    vsAop: (
      <span
        className={cn(
          "tabular-nums font-bold",
          Math.abs(totals.v3 - totals.aop) / Math.max(1, totals.aop) > 0.05
            ? "text-warning"
            : "text-success",
        )}
      >
        {totals.v3 - totals.aop > 0 ? "+" : ""}
        {(totals.v3 - totals.aop).toLocaleString()}
      </span>
    ),
  };

  return (
    <SmartTable<CnRowEnriched>
      screenId="sop-consensus-cn"
      title="Đồng thuận theo CN — Tháng 5"
      columns={cols}
      data={rows}
      defaultDensity="compact"
      getRowId={(r) => r.cn}
      rowSeverity={(r) => (r._isVariance ? "shortage" : "ok")}
      autoExpandWhen={(r) => r._isVariance}
      drillDown={(r) => (
        <ConsensusCnDrill
          row={r}
          locked={locked}
          onUpdateV3={onUpdateV3}
          onUpdateNote={onUpdateNote}
          varianceExplanations={varianceExplanations}
          onUpdateVariance={onUpdateVariance}
        />
      )}
      summaryRow={summaryRow}
      exportFilename="sop-consensus-cn"
    />
  );
}

/* ═══ CN drill: variance textarea + SKU sub-table ═══ */

function ConsensusCnDrill({
  row,
  locked,
  onUpdateV3,
  onUpdateNote,
  varianceExplanations,
  onUpdateVariance,
}: {
  row: CnRowEnriched;
  locked: boolean;
  onUpdateV3: (cnIdx: number, skuIdx: number | null, value: number) => void;
  onUpdateNote: (cnIdx: number, skuIdx: number, note: string) => void;
  varianceExplanations: Record<string, string>;
  onUpdateVariance?: (cnCode: string, text: string) => void;
}) {
  const explanation = varianceExplanations[row.cn] ?? "";
  const explanationOk = explanation.trim().length >= 6;

  type SkuRowEnriched = SkuRow & { _idx: number };
  const skuRows: SkuRowEnriched[] = row.skus.map((s, i) => ({ ...s, _idx: i }));

  const skuCols: SmartTableColumn<SkuRowEnriched>[] = [
    {
      key: "item", label: "Mã hàng", width: 110,
      render: (s) => <span className="font-medium text-text-1">{s.item}</span>,
    },
    {
      key: "variant", label: "Mẫu", width: 70,
      render: (s) => <span className="text-text-2">{s.variant}</span>,
    },
    {
      key: "v0", label: "v0", width: 90, numeric: true, align: "right",
      accessor: (s) => s.v0, render: (s) => s.v0.toLocaleString(),
    },
    {
      key: "v1", label: "v1", width: 90, numeric: true, align: "right",
      accessor: (s) => s.v1, render: (s) => s.v1.toLocaleString(),
    },
    {
      key: "v2", label: "v2", width: 90, numeric: true, align: "right",
      accessor: (s) => s.v2, render: (s) => s.v2.toLocaleString(),
    },
    {
      key: "v3", label: "v3 ★", width: 110, numeric: true, align: "right",
      accessor: (s) => s.v3,
      render: (s) => (
        <EditableCell
          value={s.v3}
          onChange={(v) => onUpdateV3(row._idx, s._idx, v)}
          disabled={locked}
        />
      ),
    },
    {
      key: "delta", label: "Δ v0→v3", width: 100, numeric: true, align: "right",
      accessor: (s) => (s.v0 > 0 ? Math.round(((s.v3 - s.v0) / s.v0) * 100) : 0),
      render: (s) => {
        const d = s.v0 > 0 ? Math.round(((s.v3 - s.v0) / s.v0) * 100) : 0;
        const big = Math.abs(d) > 10;
        return (
          <span className={cn("tabular-nums font-medium", big ? "text-warning" : "text-text-2")}>
            {d > 0 ? "+" : ""}{d}% {big ? "⚠" : ""}
          </span>
        );
      },
    },
    {
      key: "aop", label: "AOP", width: 90, numeric: true, align: "right",
      accessor: (s) => s.aop,
      render: (s) => <span className="text-text-3">{s.aop.toLocaleString()}</span>,
    },
    {
      key: "note", label: "Ghi chú", width: 200,
      render: (s) => (
        <NoteCell
          value={s.note}
          onChange={(v) => onUpdateNote(row._idx, s._idx, v)}
          disabled={locked}
        />
      ),
    },
  ];

  return (
    <div className="px-3 py-2 bg-surface-1/40 space-y-3">
      {row._isVariance && (
        <div className="flex items-start gap-3 rounded-md border border-danger/30 bg-danger-bg/40 px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 text-danger mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-table-sm text-text-1 font-medium mb-1">
              Chênh lệch top-down vs bottom-up = {row._variancePct > 0 ? "+" : ""}
              {Math.round(row._variancePct)}% — vượt biên ±10%
              <span className="text-text-3 font-normal ml-2">
                (v0 top-down: {row.v0.toLocaleString()} m² · Σ(SKU v3):{" "}
                {row._bottomUpV3.toLocaleString()} m²)
              </span>
            </p>
            <p className="text-caption text-text-3 mb-2">
              Phải giải thích trước khi khóa. Tối thiểu 6 ký tự.
            </p>
            <textarea
              value={explanation}
              onChange={(e) => onUpdateVariance?.(row.cn, e.target.value)}
              disabled={locked}
              placeholder="VD: B2B deal lớn confirmed Q2 — pipeline +14% vs FC gốc."
              className={cn(
                "w-full rounded-md border px-3 py-2 text-table-sm bg-surface-0 focus:outline-none focus:ring-2 transition-colors",
                explanationOk
                  ? "border-success/40 focus:ring-success/30 text-text-1"
                  : "border-danger/40 focus:ring-danger/30 text-text-1",
              )}
              rows={2}
            />
            {explanationOk && (
              <p className="text-caption text-success mt-1 font-medium">
                ✅ Đã giải thích — sẵn sàng khóa
              </p>
            )}
          </div>
        </div>
      )}

      <SmartTable<SkuRowEnriched>
        screenId={`sop-consensus-cn-${row.cn}-skus`}
        columns={skuCols}
        data={skuRows}
        defaultDensity="compact"
        getRowId={(s) => `${s.item}-${s.variant}`}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SKU-FIRST  ─────────────────────────────────────────────────────────────
   ═══════════════════════════════════════════════════════════════════════ */

function ConsensusSkuTable({
  data,
  totals,
  locked,
  onUpdateV3,
}: {
  data: ConsensusRow[];
  totals: { v0: number; v1: number; v2: number; v3: number; aop: number };
  locked: boolean;
  onUpdateV3: (cnIdx: number, skuIdx: number | null, value: number) => void;
}) {
  const rows = useMemo(() => buildSkuPivot(data), [data]);

  const cols: SmartTableColumn<SkuPivotRow>[] = [
    {
      key: "item", label: "SKU", width: 100, sortable: true, filter: "text",
      render: (r) => <span className="font-medium text-text-1">{r.item}</span>,
    },
    {
      key: "variant", label: "Mẫu", width: 80, sortable: true,
      render: (r) => <span className="text-text-2">{r.variant}</span>,
    },
    {
      key: "v0", label: "v0 Total", width: 100, numeric: true, sortable: true, align: "right",
      accessor: (r) => r.v0, render: (r) => r.v0.toLocaleString(),
    },
    {
      key: "v1", label: "v1 Total", width: 100, numeric: true, sortable: true, align: "right",
      accessor: (r) => r.v1, render: (r) => r.v1.toLocaleString(),
    },
    {
      key: "v2", label: "v2 Total", width: 100, numeric: true, sortable: true, align: "right",
      accessor: (r) => r.v2, render: (r) => r.v2.toLocaleString(),
    },
    {
      key: "v3", label: "v3 Total ★", width: 110, numeric: true, sortable: true, align: "right",
      accessor: (r) => r.v3,
      render: (r) => <span className="text-primary font-bold tabular-nums">{r.v3.toLocaleString()}</span>,
    },
    {
      key: "aop", label: "AOP", width: 100, numeric: true, sortable: true, align: "right",
      accessor: (r) => r.aop, render: (r) => <span className="text-text-3">{r.aop.toLocaleString()}</span>,
    },
    {
      key: "vsAop", label: "vs AOP", width: 110, numeric: true, sortable: true, align: "right",
      accessor: (r) => (r.aop > 0 ? Math.round(((r.v3 - r.aop) / r.aop) * 100) : 0),
      render: (r) => {
        const d = r.aop > 0 ? Math.round(((r.v3 - r.aop) / r.aop) * 100) : 0;
        const abs = Math.abs(d);
        const color = abs <= 5 ? "text-success" : d > 0 ? "text-warning" : "text-danger";
        return (
          <span className={cn("tabular-nums font-medium", color)}>
            {d > 0 ? "+" : ""}{d}% {abs > 5 ? "⚠" : ""}
          </span>
        );
      },
    },
    {
      key: "worstCn", label: "CN xấu nhất", width: 150,
      render: (r) => <WorstCnCell cnName={r.worstCn} hstk={Math.abs(r.worstDelta)} />,
    },
    {
      key: "cnGapCount", label: "# CN gap", width: 100, numeric: true, sortable: true,
      accessor: (r) => r.cnGapCount, render: (r) => <CnGapBadge count={r.cnGapCount} />,
    },
  ];

  const summaryRow: Partial<Record<string, React.ReactNode>> = {
    item: <span className="font-bold text-text-1">TỔNG</span>,
    v0: totals.v0.toLocaleString(),
    v1: totals.v1.toLocaleString(),
    v2: totals.v2.toLocaleString(),
    v3: <span className="text-primary font-bold tabular-nums">★ {totals.v3.toLocaleString()}</span>,
    aop: totals.aop.toLocaleString(),
  };

  return (
    <SmartTable<SkuPivotRow>
      screenId="sop-consensus-sku"
      title="Đồng thuận theo SKU — Tháng 5"
      columns={cols}
      data={rows}
      defaultDensity="compact"
      getRowId={(r) => `${r.item}-${r.variant}`}
      rowSeverity={(r) => {
        const d = r.aop > 0 ? Math.abs(((r.v3 - r.aop) / r.aop) * 100) : 0;
        return d > 10 ? "shortage" : d > 5 ? "watch" : "ok";
      }}
      autoExpandWhen={(r) => {
        const d = r.aop > 0 ? Math.abs(((r.v3 - r.aop) / r.aop) * 100) : 0;
        return d > 10;
      }}
      drillDown={(r) => (
        <ConsensusSkuDrill row={r} locked={locked} onUpdateV3={onUpdateV3} />
      )}
      summaryRow={summaryRow}
      exportFilename="sop-consensus-sku"
    />
  );
}

function ConsensusSkuDrill({
  row,
  locked,
  onUpdateV3,
}: {
  row: SkuPivotRow;
  locked: boolean;
  onUpdateV3: (cnIdx: number, skuIdx: number | null, value: number) => void;
}) {
  type Cb = SkuPivotRow["cnBreakdown"][number];

  const cols: SmartTableColumn<Cb>[] = [
    {
      key: "cn", label: "CN", width: 110,
      render: (r) => <span className="font-medium text-text-1">{r.cn}</span>,
    },
    { key: "v0", label: "v0", width: 90, numeric: true, align: "right", accessor: (r) => r.v0, render: (r) => r.v0.toLocaleString() },
    { key: "v1", label: "v1", width: 90, numeric: true, align: "right", accessor: (r) => r.v1, render: (r) => r.v1.toLocaleString() },
    { key: "v2", label: "v2", width: 90, numeric: true, align: "right", accessor: (r) => r.v2, render: (r) => r.v2.toLocaleString() },
    {
      key: "v3", label: "v3 ★", width: 110, numeric: true, align: "right",
      accessor: (r) => r.v3,
      render: (r) => (
        <span className="flex items-center gap-1 justify-end">
          <span className="text-primary text-[10px]">★</span>
          <EditableCell
            value={r.v3}
            onChange={(v) => onUpdateV3(r.cnIdx, r.skuIdx, v)}
            disabled={locked}
          />
        </span>
      ),
    },
    {
      key: "aop", label: "AOP", width: 90, numeric: true, align: "right",
      accessor: (r) => r.aop, render: (r) => <span className="text-text-3">{r.aop.toLocaleString()}</span>,
    },
    {
      key: "vsAop", label: "vs AOP", width: 110, numeric: true, align: "right",
      accessor: (r) => (r.aop > 0 ? Math.round(((r.v3 - r.aop) / r.aop) * 100) : 0),
      render: (r) => {
        const d = r.aop > 0 ? Math.round(((r.v3 - r.aop) / r.aop) * 100) : 0;
        const abs = Math.abs(d);
        const color = abs <= 5 ? "text-success" : d > 0 ? "text-warning" : "text-danger";
        return (
          <span className={cn("tabular-nums font-medium", color)}>
            {d > 0 ? "+" : ""}{d}% {abs > 5 ? "⚠" : ""}
          </span>
        );
      },
    },
    {
      key: "fvaBest", label: "FVA tốt nhất", width: 140,
      render: (r) => <span className="text-text-2">{r.fvaBest}</span>,
    },
  ];

  const summaryRow: Partial<Record<string, React.ReactNode>> = {
    cn: <span className="font-bold text-text-1">TỔNG</span>,
    v0: row.v0.toLocaleString(),
    v1: row.v1.toLocaleString(),
    v2: row.v2.toLocaleString(),
    v3: <span className="text-primary font-bold tabular-nums">★ {row.v3.toLocaleString()}</span>,
    aop: row.aop.toLocaleString(),
  };

  return (
    <div className="px-3 py-2 bg-surface-1/40">
      <SmartTable<Cb>
        screenId={`sop-consensus-sku-${row.item}-${row.variant}-cns`}
        columns={cols}
        data={row.cnBreakdown}
        defaultDensity="compact"
        getRowId={(r) => r.cn}
        summaryRow={summaryRow}
      />
    </div>
  );
}
