import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ScatterChart,
  Scatter,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  FACTORIES,
  NM_COUNTER_HISTORY,
  NM_LT_HISTORY,
  type NmId,
} from "@/data/unis-enterprise-dataset";
import { ChevronDown, ChevronRight } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */

type Grade = "A" | "B" | "C" | "D";

function gradeOf(honoring: number): Grade {
  if (honoring >= 90) return "A";
  if (honoring >= 80) return "B";
  if (honoring >= 60) return "C";
  return "D";
}

function gradeStyle(g: Grade) {
  const map: Record<Grade, { dot: string; bg: string; text: string; emoji: string }> = {
    A: { dot: "bg-success", bg: "bg-success-bg", text: "text-success", emoji: "🟢" },
    B: { dot: "bg-warning", bg: "bg-warning-bg", text: "text-warning", emoji: "🟡" },
    C: { dot: "bg-orange-500", bg: "bg-orange-500/15", text: "text-orange-600 dark:text-orange-400", emoji: "🟠" },
    D: { dot: "bg-danger", bg: "bg-danger-bg", text: "text-danger", emoji: "🔴" },
  };
  return map[g];
}

/* 5-factor scorecard per NM (mock — derived from FACTORIES) */
function factorsFor(nm: typeof FACTORIES[number]) {
  return [
    { key: "Honoring", value: nm.honoringPct },
    { key: "On-time", value: Math.max(0, Math.round(nm.reliability * 100) - 5) },
    { key: "LT ổn định", value: Math.max(0, 100 - Math.round(nm.sigmaLt * 18)) },
    { key: "Capacity", value: Math.min(100, Math.round((nm.capacityM2Month / 220) )) },
    { key: "Counter rate", value: nm.id === "TOKO" ? 28 : nm.id === "PHUMY" ? 50 : 95 },
  ];
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Component                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

export function NmRiskTab() {
  const [drillNm, setDrillNm] = useState<NmId | null>(null);

  const nmCards = useMemo(
    () =>
      FACTORIES.map((nm) => {
        const grade = gradeOf(nm.honoringPct);
        const factors = factorsFor(nm);
        const counterRows = NM_COUNTER_HISTORY.filter((c) => c.nmId === nm.id);
        const ltRows = NM_LT_HISTORY.filter((l) => l.nmId === nm.id);
        const onTimeCount = ltRows.filter((l) => l.onTime).length;
        const reductions = counterRows
          .filter((r) => r.committedM2 > 0)
          .map((r) => Math.round(((r.committedM2 - r.counterM2) / r.committedM2) * 100));
        const avgReduction = reductions.length
          ? Math.round(reductions.reduce((a, b) => a + b, 0) / reductions.length)
          : 0;
        const counterPct = counterRows.length
          ? Math.round(
              (counterRows.filter((r) => r.counterM2 < r.committedM2).length /
                counterRows.length) *
                100
            )
          : 0;
        return {
          ...nm,
          grade,
          factors,
          counterRows,
          ltRows,
          onTimeCount,
          totalLt: ltRows.length,
          avgReduction,
          counterPct,
        };
      }),
    []
  );

  const drilled = nmCards.find((n) => n.id === drillNm);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="rounded-card bg-surface-2 border border-surface-3 p-5">
        <h2 className="font-display text-section-header text-text-1 mb-1">
          Rủi ro NM — 5 nhà máy
        </h2>
        <p className="text-table-sm text-text-2">
          Đánh giá A/B/C/D dựa trên Honoring%, On-time, LT ổn định, Capacity và Counter rate.
          Click thẻ để xem waterfall counter & scatter LT.
        </p>
      </div>

      {/* 5 NM cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {nmCards.map((nm) => {
          const gs = gradeStyle(nm.grade);
          const isActive = drillNm === nm.id;
          return (
            <button
              key={nm.id}
              onClick={() => setDrillNm(isActive ? null : nm.id)}
              className={cn(
                "text-left rounded-card border bg-surface-2 p-4 transition-all hover:shadow-md",
                isActive ? "border-primary ring-2 ring-primary/30" : "border-surface-3"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-display text-body font-semibold text-text-1">{nm.name}</div>
                  <div className="text-caption text-text-3 font-mono">{nm.code}</div>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-caption font-bold inline-flex items-center gap-1",
                    gs.bg,
                    gs.text
                  )}
                >
                  {nm.grade} {gs.emoji}
                </span>
              </div>

              {/* 5-factor bar */}
              <div className="space-y-1.5">
                {nm.factors.map((f) => (
                  <div key={f.key} className="flex items-center gap-2">
                    <span className="text-[10px] text-text-3 w-20 shrink-0">{f.key}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-surface-3 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          f.value >= 85
                            ? "bg-success"
                            : f.value >= 70
                            ? "bg-warning"
                            : f.value >= 50
                            ? "bg-orange-500"
                            : "bg-danger"
                        )}
                        style={{ width: `${Math.max(2, f.value)}%` }}
                      />
                    </div>
                    <span className="text-[10px] tabular-nums text-text-2 w-7 text-right">
                      {f.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Mini description */}
              <div className="mt-3 pt-3 border-t border-surface-3 text-table-sm text-text-2 leading-snug">
                On-time {nm.onTimeCount}/{nm.totalLt}. Counter {nm.counterPct}%.
                {nm.avgReduction > 0 && ` Avg reduction ${nm.avgReduction}%.`}
              </div>

              <div className="mt-2 text-caption text-primary font-medium flex items-center gap-1">
                {isActive ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {isActive ? "Đang xem chi tiết" : "Xem chi tiết"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Drill-down */}
      {drilled && (
        <div className="rounded-card border border-surface-3 bg-surface-2 p-5 animate-fade-in space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-body font-semibold text-text-1">
                {drilled.name} — Drill-down
              </h3>
              <p className="text-table-sm text-text-2 mt-0.5">
                {drilled.name}: On-time {drilled.onTimeCount}/{drilled.totalLt}. Counter{" "}
                {drilled.counterPct}%. Avg reduction {drilled.avgReduction}%.
              </p>
            </div>
            <button
              onClick={() => setDrillNm(null)}
              className="text-caption text-text-3 hover:text-text-1"
            >
              ✕ Đóng
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Counter waterfall */}
            <div>
              <h4 className="text-table-sm font-medium text-text-2 mb-2">
                Counter waterfall (Committed → Counter → Delivered)
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={drilled.counterRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-3)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-text-3)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--color-text-3)" }} unit="m²" />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="committedM2" name="Committed" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="counterM2" name="Counter" fill="var(--color-warning-text)" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="deliveredM2" name="Delivered" fill="var(--color-success-text)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {drilled.counterRows.length === 0 && (
                <div className="text-caption text-text-3 italic">Không có dữ liệu counter.</div>
              )}
            </div>

            {/* LT scatter */}
            <div>
              <h4 className="text-table-sm font-medium text-text-2 mb-2">
                LT scatter (Config vs Actual, last {drilled.ltRows.length} POs)
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-3)" />
                    <XAxis
                      type="number"
                      dataKey="configLt"
                      name="Config LT"
                      unit="d"
                      domain={[0, 35]}
                      tick={{ fontSize: 11, fill: "var(--color-text-3)" }}
                    />
                    <YAxis
                      type="number"
                      dataKey="actualLt"
                      name="Actual LT"
                      unit="d"
                      domain={[0, 35]}
                      tick={{ fontSize: 11, fill: "var(--color-text-3)" }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <ReferenceLine
                      segment={[
                        { x: 0, y: 0 },
                        { x: 35, y: 35 },
                      ]}
                      stroke="var(--color-text-3)"
                      strokeDasharray="4 3"
                    />
                    <Scatter data={drilled.ltRows}>
                      {drilled.ltRows.map((row, i) => (
                        <Cell
                          key={i}
                          fill={row.onTime ? "var(--color-success-text)" : "var(--color-danger-text)"}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              {drilled.ltRows.length === 0 && (
                <div className="text-caption text-text-3 italic">Không có dữ liệu LT.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
