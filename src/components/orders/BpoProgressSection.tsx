/**
 * BpoProgressSection — "Tiến độ cam kết tháng" cho Orders page.
 *
 * Tracking 2 tầng (PRD §11.1F):
 *   Hub_available = Σ(NM_committed) − Σ(PO_released) − Hub_SS
 *
 * Mỗi PO tuần (RPO) approved → trừ lùi khỏi cam kết tháng (BPO).
 * Farmer nhìn 1 phát: NM nào đúng tiến độ, NM nào chậm, còn bao nhiêu chưa release.
 *
 *   ┌─ collapsible header ────────────────────────────────────┐
 *   │ Tiến độ cam kết — Tháng 5/2026 · Ngày 24/30 · 61% ▼     │
 *   ├─ Monthly→Weekly flow ───────────────────────────────────┤
 *   │ W18 ✅ 3.2K · W19 🚛 2.4K · W20 📝 2.2K · W21 📅 ~2.4K  │
 *   ├─ Per-NM SmartTable (compact) ───────────────────────────┤
 *   │ Mikado | 4.200 | 3.000 | 1.200 | 71% | ████░ | 🟢       │
 *   │   ↳ drill-down: list các PO đã release per NM           │
 *   └─────────────────────────────────────────────────────────┘
 */
import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BPO_TRACKER, BPO_DEMO_MONTH, BPO_DEMO_YEAR,
  BPO_DEMO_DAY_OF_MONTH, BPO_DEMO_DAYS_IN_MONTH, BPO_EXPECTED_PCT,
  aggregateByNm, aggregateByWeek, totals,
  bpoStatusTone, WEEK_STATUS_META,
  type BpoTracker, type BpoNmSummary,
} from "@/lib/bpo-tracker";

interface Props {
  /** mặc định mở; controlled từ parent (vd: click summary card) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** anchor scroll target id */
  anchorId?: string;
}

export function BpoProgressSection({ open: openProp, onOpenChange, anchorId = "bpo-progress" }: Props) {
  const [openLocal, setOpenLocal] = useState(true);
  const open = openProp ?? openLocal;
  const setOpen = (v: boolean) => {
    setOpenLocal(v);
    onOpenChange?.(v);
  };

  const summary = useMemo(() => totals(), []);
  const byNm = useMemo(() => aggregateByNm(), []);
  const byWeek = useMemo(() => aggregateByWeek(), []);
  const expectedPctRounded = Math.round(BPO_EXPECTED_PCT);

  // Gap = nếu Σ planned (W21+W22) + released < committed → cảnh báo
  const totalPlanned = byWeek.reduce((s, w) => s + w.qty, 0);
  const gap = summary.committed - totalPlanned;

  return (
    <section
      id={anchorId}
      className="rounded-card border border-surface-3 bg-surface-1 overflow-hidden scroll-mt-24"
    >
      {/* ═══ HEADER (clickable to toggle) ═══ */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-surface-2/40 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {open ? (
            <ChevronDown className="h-4 w-4 text-text-3 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-text-3 shrink-0" />
          )}
          <span className="text-section-header font-display text-text-1 truncate">
            Tiến độ cam kết — Tháng {BPO_DEMO_MONTH}/{BPO_DEMO_YEAR}
          </span>
          <span className="text-caption text-text-3 hidden sm:inline">
            · Ngày {BPO_DEMO_DAY_OF_MONTH}/{BPO_DEMO_DAYS_IN_MONTH}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="tabular-nums text-table-sm text-text-2">
            <span className="font-semibold text-text-1">{summary.released.toLocaleString()}</span>
            <span className="text-text-3"> / {summary.committed.toLocaleString()} m²</span>
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
              summary.pct >= expectedPctRounded
                ? "bg-success-bg text-success border border-success/30"
                : summary.pct >= expectedPctRounded * 0.6
                ? "bg-warning-bg text-warning border border-warning/30"
                : "bg-danger-bg text-danger border border-danger/30",
            )}
          >
            {summary.pct}%
          </span>
        </div>
      </button>

      {open && (
        <div className="border-t border-surface-3 px-4 py-3 space-y-3 bg-surface-0/40">
          {/* ═══ MONTHLY → WEEKLY FLOW VIZ ═══ */}
          <div className="rounded border border-surface-3 bg-surface-1 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-caption uppercase tracking-wide text-text-3 font-semibold">
                Cam kết T{BPO_DEMO_MONTH}: {summary.committed.toLocaleString()} m² · phân rã theo tuần
              </div>
              {gap > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-warning">
                  <AlertTriangle className="h-3 w-3" />
                  Thiếu {gap.toLocaleString()}m² chưa plan — cần DRP cover
                </span>
              )}
              {gap <= 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-success">
                  <CheckCircle2 className="h-3 w-3" /> Đã plan đủ
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {byWeek.map((w, i) => {
                const meta = WEEK_STATUS_META[w.status];
                return (
                  <div key={w.week} className="flex items-center gap-2">
                    <div
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded border px-2 py-1 text-table-sm",
                        w.status === "completed" && "border-success/30 bg-success-bg",
                        w.status === "in_transit" && "border-info/30 bg-info-bg",
                        w.status === "draft" && "border-warning/30 bg-warning-bg",
                        w.status === "planned" && "border-dashed border-surface-3 bg-surface-2",
                      )}
                      title={`${meta.label}${w.poCount ? ` · ${w.poCount} PO` : ""}`}
                    >
                      <span className="font-mono text-[10px] text-text-3">W{w.week}</span>
                      <span className={cn("font-semibold tabular-nums", meta.cls)}>
                        {w.qty.toLocaleString()}
                      </span>
                      <span className="text-[11px]">{meta.emoji}</span>
                    </div>
                    {i < byWeek.length - 1 && (
                      <span className="text-text-3">→</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-caption text-text-3">
              Tổng đã release/dự kiến:{" "}
              <span className="tabular-nums font-medium text-text-2">
                {totalPlanned.toLocaleString()} m²
              </span>{" "}
              · Đã release thực tế:{" "}
              <span className="tabular-nums font-medium text-text-1">
                {summary.released.toLocaleString()} m²
              </span>{" "}
              · Còn cam kết chưa đặt:{" "}
              <span className="tabular-nums font-semibold text-warning">
                {summary.remaining.toLocaleString()} m²
              </span>
            </div>
          </div>

          {/* ═══ PER-NM TABLE ═══ */}
          <div className="rounded border border-surface-3 bg-surface-1 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-2/60 border-b border-surface-3">
                    <th className="px-3 py-2 text-left text-table-header uppercase text-text-3 w-8"></th>
                    <th className="px-3 py-2 text-left text-table-header uppercase text-text-3">NM</th>
                    <th className="px-3 py-2 text-right text-table-header uppercase text-text-3">Cam kết</th>
                    <th className="px-3 py-2 text-right text-table-header uppercase text-text-3">Đã release</th>
                    <th className="px-3 py-2 text-right text-table-header uppercase text-text-3">Còn lại</th>
                    <th className="px-3 py-2 text-right text-table-header uppercase text-text-3 hidden md:table-cell">% Hoàn thành</th>
                    <th className="px-3 py-2 text-left text-table-header uppercase text-text-3 hidden lg:table-cell w-[160px]">Tiến độ</th>
                    <th className="px-3 py-2 text-left text-table-header uppercase text-text-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {byNm.map((nm) => (
                    <NmRow key={nm.nmId} nm={nm} />
                  ))}
                  {/* TOTAL row */}
                  <tr className="bg-surface-2/40 border-t-2 border-surface-3 font-semibold">
                    <td colSpan={2} className="px-3 py-2 text-table-sm text-text-1">TỔNG</td>
                    <td className="px-3 py-2 text-right text-table-sm tabular-nums text-text-1">
                      {summary.committed.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-table-sm tabular-nums text-text-1">
                      {summary.released.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-table-sm tabular-nums text-warning">
                      {summary.remaining.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-table-sm tabular-nums text-text-1 hidden md:table-cell">
                      {summary.pct}%
                    </td>
                    <td className="hidden lg:table-cell" />
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footnote */}
          <div className="text-caption text-text-3">
            Tiến độ kỳ vọng tại ngày {BPO_DEMO_DAY_OF_MONTH}/{BPO_DEMO_DAYS_IN_MONTH}:{" "}
            <span className="font-semibold text-text-2 tabular-nums">≥ {expectedPctRounded}%</span>{" "}
            · NM dưới ngưỡng này sẽ được đánh dấu chậm.
          </div>
        </div>
      )}
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   NM row + drill-down
   ═══════════════════════════════════════════════════════════════════════════ */
function NmRow({ nm }: { nm: BpoNmSummary }) {
  const [expanded, setExpanded] = useState(false);
  const status = bpoStatusTone({
    nmId: nm.nmId, nmName: nm.nmName, skuBaseCode: "_", skuLabel: "_",
    month: BPO_DEMO_MONTH, year: BPO_DEMO_YEAR,
    committedQty: nm.committedQty, releasedQty: nm.releasedQty, remainingQty: nm.remainingQty,
    releasePct: nm.releasePct, weeklyBreakdown: [],
    onTrack: nm.releasePct >= BPO_EXPECTED_PCT,
  });
  const expectedPctRounded = Math.round(BPO_EXPECTED_PCT);
  return (
    <>
      <tr
        className={cn(
          "border-b border-surface-3 hover:bg-surface-2/40 transition-colors cursor-pointer",
          expanded && "bg-surface-2/30",
        )}
        onClick={() => setExpanded(v => !v)}
      >
        <td className="px-3 py-2 text-text-3">
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </td>
        <td className="px-3 py-2 text-table-sm font-medium text-text-1">
          {nm.nmName}
          <span className="text-caption text-text-3 ml-1.5">({nm.skuCount} SKU)</span>
        </td>
        <td className="px-3 py-2 text-right text-table-sm tabular-nums text-text-2">
          {nm.committedQty.toLocaleString()}
        </td>
        <td className="px-3 py-2 text-right text-table-sm tabular-nums text-text-1 font-medium">
          {nm.releasedQty.toLocaleString()}
        </td>
        <td className="px-3 py-2 text-right text-table-sm tabular-nums">
          {nm.remainingQty > 0 ? (
            <span className="text-warning font-medium">{nm.remainingQty.toLocaleString()}</span>
          ) : (
            <span className="text-success">0</span>
          )}
        </td>
        <td className="px-3 py-2 text-right text-table-sm tabular-nums hidden md:table-cell">
          <span
            className={cn(
              "font-semibold",
              status.tone === "done" && "text-success",
              status.tone === "ok" && "text-success",
              status.tone === "warn" && "text-warning",
              status.tone === "critical" && "text-danger",
            )}
          >
            {nm.releasePct}%
          </span>
        </td>
        <td className="px-3 py-2 hidden lg:table-cell">
          <ProgressBar pct={nm.releasePct} expectedPct={expectedPctRounded} tone={status.tone} />
        </td>
        <td className="px-3 py-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
              status.tone === "done" && "border-success/30 bg-success-bg text-success",
              status.tone === "ok" && "border-success/30 bg-success-bg text-success",
              status.tone === "warn" && "border-warning/30 bg-warning-bg text-warning",
              status.tone === "critical" && "border-danger/30 bg-danger-bg text-danger",
            )}
          >
            <span>{status.emoji}</span> {status.label}
          </span>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-surface-0/60 border-b border-surface-3">
          <td colSpan={8} className="px-3 py-3">
            <NmDrillDown nm={nm} />
          </td>
        </tr>
      )}
    </>
  );
}

function ProgressBar({ pct, expectedPct, tone }: { pct: number; expectedPct: number; tone: string }) {
  const fill = Math.min(100, Math.max(0, pct));
  return (
    <div className="relative h-2.5 w-full rounded-full bg-surface-3 overflow-hidden">
      {/* expected marker */}
      <div
        className="absolute inset-y-0 w-px bg-text-3/60"
        style={{ left: `${expectedPct}%` }}
        title={`Kỳ vọng ≥ ${expectedPct}%`}
      />
      <div
        className={cn(
          "h-full transition-all",
          tone === "done" && "bg-success",
          tone === "ok" && "bg-success",
          tone === "warn" && "bg-warning",
          tone === "critical" && "bg-danger",
        )}
        style={{ width: `${fill}%` }}
      />
    </div>
  );
}

/** Drill-down: liệt kê tất cả PO đã release per NM (gộp theo SKU) */
function NmDrillDown({ nm }: { nm: BpoNmSummary }) {
  return (
    <div className="space-y-2">
      {nm.trackers.map((t) => (
        <SkuPoBlock key={`${t.nmId}-${t.skuBaseCode}`} tracker={t} />
      ))}
    </div>
  );
}

function SkuPoBlock({ tracker }: { tracker: BpoTracker }) {
  const status = bpoStatusTone(tracker);
  return (
    <div className="rounded border border-surface-3 bg-surface-1 p-3">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div className="flex items-center gap-2 text-table-sm">
          <span className="font-mono font-medium text-text-1">{tracker.skuBaseCode}</span>
          <span className="text-text-3">— {tracker.skuLabel}</span>
        </div>
        <div className="text-caption text-text-3 tabular-nums">
          Đã release{" "}
          <span className="font-semibold text-text-1">
            {tracker.releasedQty.toLocaleString()}
          </span>{" "}
          / {tracker.committedQty.toLocaleString()} m² ({tracker.releasePct}%) ·{" "}
          <span
            className={cn(
              "font-medium",
              status.tone === "warn" && "text-warning",
              status.tone === "critical" && "text-danger",
              (status.tone === "ok" || status.tone === "done") && "text-success",
            )}
          >
            {status.emoji} {status.label}
          </span>
        </div>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-surface-3">
            <th className="text-left text-[10px] uppercase tracking-wide text-text-3 font-semibold py-1">PO#</th>
            <th className="text-left text-[10px] uppercase tracking-wide text-text-3 font-semibold py-1">Tuần</th>
            <th className="text-right text-[10px] uppercase tracking-wide text-text-3 font-semibold py-1">Số lượng</th>
            <th className="text-left text-[10px] uppercase tracking-wide text-text-3 font-semibold py-1 hidden sm:table-cell">Ngày release</th>
            <th className="text-left text-[10px] uppercase tracking-wide text-text-3 font-semibold py-1">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {tracker.weeklyBreakdown.filter(w => w.qty > 0).map((w, i) => {
            const meta = WEEK_STATUS_META[w.status];
            return (
              <tr key={i} className="border-b border-surface-3/60">
                <td className="py-1 text-table-sm font-mono text-text-2">
                  {w.poNumber || "—"}
                </td>
                <td className="py-1 text-table-sm font-mono text-text-3">W{w.week}</td>
                <td className="py-1 text-table-sm text-right tabular-nums text-text-1 font-medium">
                  {w.qty.toLocaleString()}
                </td>
                <td className="py-1 text-table-sm text-text-3 hidden sm:table-cell">
                  {w.releaseDate || "—"}
                </td>
                <td className="py-1 text-table-sm">
                  <span className={cn("inline-flex items-center gap-1", meta.cls)}>
                    <span>{meta.emoji}</span> {meta.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-surface-3">
            <td colSpan={2} className="py-1.5 text-caption text-text-3 font-semibold uppercase">Tổng đã release</td>
            <td className="py-1.5 text-right text-table-sm tabular-nums font-semibold text-text-1">
              {tracker.releasedQty.toLocaleString()}
            </td>
            <td colSpan={2} className="py-1.5 text-caption text-text-3">
              / {tracker.committedQty.toLocaleString()} m²
            </td>
          </tr>
          {tracker.remainingQty > 0 && (
            <tr>
              <td colSpan={5} className="pt-1.5 text-caption">
                <span
                  className="inline-flex items-center gap-1 text-warning font-medium cursor-help"
                  title={`Hub ảo ${tracker.nmName} ${tracker.skuBaseCode} còn ${tracker.remainingQty.toLocaleString()}m². DRP tuần tới sẽ release.`}
                >
                  ⚠️ Còn chưa đặt: {tracker.remainingQty.toLocaleString()} m²
                </span>
                <span className="text-text-3 ml-2">
                  (cần DRP W{Math.max(...tracker.weeklyBreakdown.map(w => w.week)) + 1}+ cover)
                </span>
              </td>
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  );
}
