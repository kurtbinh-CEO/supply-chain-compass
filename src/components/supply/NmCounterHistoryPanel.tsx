import { useMemo } from "react";
import { AlertTriangle, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { NM_COUNTER_HISTORY, type NmId } from "@/data/unis-enterprise-dataset";

interface Props {
  nmId: NmId;
  nmName: string;
  /** Render only when counter rate exceeds this threshold (0-100). Default 30 */
  threshold?: number;
}

/**
 * NM Counter Waterfall Panel
 * Shows 6-month history Committed → Counter → Delivered for one NM,
 * but only renders when counter rate > threshold (default 30%).
 */
export function NmCounterHistoryPanel({ nmId, nmName, threshold = 30 }: Props) {
  const rows = useMemo(
    () => NM_COUNTER_HISTORY.filter((r) => r.nmId === nmId).slice(-6),
    [nmId],
  );

  const stats = useMemo(() => {
    if (rows.length === 0) return null;
    const counterRows = rows.filter((r) => r.counterM2 < r.committedM2);
    const counterRate = Math.round((counterRows.length / rows.length) * 100);
    const reductions = counterRows.map((r) => (r.committedM2 - r.counterM2) / r.committedM2);
    const avgReduction = reductions.length
      ? Math.round((reductions.reduce((s, x) => s + x, 0) / reductions.length) * 100)
      : 0;
    // Worst month (largest cut)
    const worst = counterRows
      .map((r) => ({ ...r, deltaPct: Math.round(((r.counterM2 - r.committedM2) / r.committedM2) * 100) }))
      .sort((a, b) => a.deltaPct - b.deltaPct)[0];
    return { counterRate, avgReduction, worst };
  }, [rows]);

  if (!stats || stats.counterRate <= threshold) return null;

  const maxVal = Math.max(...rows.map((r) => Math.max(r.committedM2, r.counterM2, r.deliveredM2 ?? 0)));

  return (
    <section className="rounded-card border border-warning/40 bg-warning-bg/20 p-4 space-y-3">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            <h3 className="font-display text-section-header text-text-1">
              Lịch sử Counter — {nmName}
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-button bg-warning text-warning-foreground text-caption font-semibold">
              Counter rate: {stats.counterRate}% ⚠️
            </span>
          </div>
          <p className="text-table-sm text-text-2 mt-1.5">
            <span className="font-medium text-text-1">{nmName}:</span> Counter {stats.counterRate}%, avg reduction{" "}
            <span className="text-danger font-medium tabular-nums">{stats.avgReduction}%</span>.{" "}
            {stats.worst && (
              <>
                {stats.worst.month}:{" "}
                <span className="tabular-nums">{stats.worst.committedM2.toLocaleString()}</span>→
                <span className="tabular-nums">{stats.worst.counterM2.toLocaleString()}</span>
                <span className="text-danger font-medium"> ({stats.worst.deltaPct}%)</span>.
              </>
            )}
          </p>
        </div>
      </header>

      {/* Waterfall: 3 stacked bars per month */}
      <div className="space-y-2.5">
        {rows.map((r) => {
          const counterPct = (r.counterM2 / r.committedM2) * 100;
          const deltaPct = Math.round(((r.counterM2 - r.committedM2) / r.committedM2) * 100);
          const realPct = r.realizationPct;
          const isPending = r.deliveredM2 === null;
          return (
            <div key={r.month} className="space-y-1">
              <div className="flex items-center justify-between text-table-sm">
                <span className="font-mono text-text-1 font-medium">{r.month}</span>
                <span className="text-text-3 tabular-nums">
                  {r.committedM2.toLocaleString()} →{" "}
                  <span className={cn("font-medium", deltaPct < 0 ? "text-danger" : "text-text-1")}>
                    {r.counterM2.toLocaleString()}
                  </span>
                  {" "}
                  {deltaPct !== 0 && (
                    <span className={cn("inline-flex items-center gap-0.5 ml-1", deltaPct < 0 ? "text-danger" : "text-success")}>
                      {deltaPct < 0 && <TrendingDown className="h-3 w-3" />}
                      ({deltaPct > 0 ? "+" : ""}{deltaPct}%)
                    </span>
                  )}
                  {!isPending && (
                    <span className="ml-2 text-text-2">
                      · giao {r.deliveredM2!.toLocaleString()}{" "}
                      <span className={cn(
                        "font-medium",
                        (realPct ?? 0) >= 90 ? "text-success" : (realPct ?? 0) >= 70 ? "text-warning" : "text-danger",
                      )}>
                        ({realPct}%)
                      </span>
                    </span>
                  )}
                  {isPending && <span className="ml-2 text-text-3 italic">· chưa giao</span>}
                </span>
              </div>

              {/* 3-segment waterfall bar */}
              <div className="relative h-5 rounded-button bg-surface-3 overflow-hidden">
                {/* Committed (full background — info tone) */}
                <div
                  className="absolute inset-y-0 left-0 bg-info/30"
                  style={{ width: `${(r.committedM2 / maxVal) * 100}%` }}
                  title={`Committed ${r.committedM2.toLocaleString()} m²`}
                />
                {/* Counter (overlay — warning) */}
                <div
                  className={cn(
                    "absolute inset-y-0 left-0",
                    deltaPct < 0 ? "bg-warning/70" : "bg-success/60",
                  )}
                  style={{ width: `${(r.counterM2 / maxVal) * 100}%` }}
                  title={`Counter ${r.counterM2.toLocaleString()} m²`}
                />
                {/* Delivered (dark overlay) */}
                {!isPending && (
                  <div
                    className="absolute inset-y-0 left-0 bg-text-1/70"
                    style={{ width: `${((r.deliveredM2 ?? 0) / maxVal) * 100}%`, height: "40%", top: "30%" }}
                    title={`Delivered ${r.deliveredM2!.toLocaleString()} m²`}
                  />
                )}
                {/* Counter % label */}
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-text-1/80 tabular-nums">
                  {Math.round(counterPct)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-caption text-text-3 pt-1 border-t border-surface-3">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-info/30" /> Committed (Hub gửi)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-warning/70" /> Counter (NM phản hồi)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-text-1/70" /> Delivered (thực giao)
        </span>
      </div>
    </section>
  );
}
