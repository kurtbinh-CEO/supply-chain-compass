import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { cn } from "@/lib/utils";
import { FC_MAPE_BY_CN, BRANCHES } from "@/data/unis-enterprise-dataset";

/* ─────────────────────────────────────────────────────────────────────────── */
/* FC vs Actual — 12 months (mock historical, deterministic)                  */
/* ─────────────────────────────────────────────────────────────────────────── */

const MONTHS = ["T6/25", "T7/25", "T8/25", "T9/25", "T10/25", "T11/25", "T12/25", "T1/26", "T2/26", "T3/26", "T4/26", "T5/26"];

// Deterministic seasonal FC + actual (slightly off) — based on weighted MAPE
function buildSeries() {
  const baseFc = [42000, 44500, 47000, 46500, 48000, 49500, 51000, 47500, 45000, 46500, 48000, 47000];
  const noise = [0.97, 1.04, 0.95, 1.06, 0.98, 1.02, 0.94, 1.08, 0.96, 1.01, 0.99, 1.03];
  const models = ["Holt-Winters", "Holt-Winters", "Holt-Winters", "XGBoost", "XGBoost", "XGBoost", "XGBoost", "HW+XGB", "HW+XGB", "HW+XGB", "HW+XGB", "HW+XGB"];
  return MONTHS.map((m, i) => {
    const fc = baseFc[i];
    const actual = i === MONTHS.length - 1 ? null : Math.round(fc * noise[i]);
    const delta = actual !== null ? actual - fc : null;
    const mape = actual !== null ? Math.round((Math.abs(delta!) / fc) * 1000) / 10 : null;
    return { month: m, fc, actual, delta, mape, model: models[i] };
  });
}

export function FcVsActualTab() {
  const series = useMemo(buildSeries, []);
  const closed = series.filter((r) => r.actual !== null);
  const avgMape = closed.length
    ? Math.round((closed.reduce((a, r) => a + (r.mape ?? 0), 0) / closed.length) * 10) / 10
    : 0;
  const target = 15;

  // Per-CN MAPE (last month) from dataset
  const cnMape = FC_MAPE_BY_CN.map((r) => {
    const branch = BRANCHES.find((b) => b.code === r.cnCode);
    const eff = r.bestModel === "AI" ? r.mapeAi : r.mapeHw;
    return { cn: r.cnCode, name: branch?.name ?? r.cnCode, mape: eff, model: r.bestModel === "AI" ? "XGBoost" : "Holt-Winters" };
  }).sort((a, b) => b.mape - a.mape);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-card border border-surface-3 bg-surface-2 p-4">
          <p className="text-caption text-text-3 uppercase tracking-wide mb-1">MAPE 12T trung bình</p>
          <p className={cn("font-display text-kpi-md tabular-nums", avgMape > target ? "text-danger" : "text-success")}>
            {avgMape}%
          </p>
          <p className="text-caption text-text-3 mt-1">target ≤ {target}%</p>
        </div>
        <div className="rounded-card border border-surface-3 bg-surface-2 p-4">
          <p className="text-caption text-text-3 uppercase tracking-wide mb-1">Tháng trễ nhất (delta lớn nhất)</p>
          {(() => {
            const worst = [...closed].sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0))[0];
            return (
              <>
                <p className="font-display text-kpi-md text-text-1 tabular-nums">{worst?.month}</p>
                <p className={cn("text-caption mt-1", (worst?.delta ?? 0) > 0 ? "text-success" : "text-danger")}>
                  Δ {(worst?.delta ?? 0) > 0 ? "+" : ""}{(worst?.delta ?? 0).toLocaleString()} m² · MAPE {worst?.mape}%
                </p>
              </>
            );
          })()}
        </div>
        <div className="rounded-card border border-surface-3 bg-surface-2 p-4">
          <p className="text-caption text-text-3 uppercase tracking-wide mb-1">Bias 12T</p>
          {(() => {
            const bias = closed.reduce((a, r) => a + (r.delta ?? 0), 0);
            const biasPct = closed.reduce((a, r) => a + (r.delta ?? 0), 0) / closed.reduce((a, r) => a + r.fc, 0);
            return (
              <>
                <p className={cn("font-display text-kpi-md tabular-nums", bias >= 0 ? "text-success" : "text-danger")}>
                  {bias >= 0 ? "+" : ""}{Math.round(bias / 1000)}K
                </p>
                <p className="text-caption text-text-3 mt-1">{(biasPct * 100).toFixed(1)}% (+ = dự báo thấp)</p>
              </>
            );
          })()}
        </div>
        <div className="rounded-card border border-surface-3 bg-surface-2 p-4">
          <p className="text-caption text-text-3 uppercase tracking-wide mb-1">Mô hình dùng nhiều nhất</p>
          <p className="font-display text-kpi-md text-text-1">HW+XGB</p>
          <p className="text-caption text-text-3 mt-1">5/12 tháng gần đây</p>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-card border border-surface-3 bg-surface-2 p-5">
        <h3 className="font-display text-body font-semibold text-text-1 mb-3">Dự báo vs Thực tế — 12 tháng</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-3)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-text-3)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-text-3)" }} unit="m²" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={47000} stroke="var(--color-text-3)" strokeDasharray="4 3" />
              <Line type="monotone" dataKey="fc" name="Dự báo" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              <Line
                type="monotone"
                dataKey="actual"
                name="Thực tế"
                stroke="var(--color-success-text)"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <div className="px-5 py-3 border-b border-surface-3 flex items-center justify-between">
          <h3 className="font-display text-body font-semibold text-text-1">Chi tiết theo tháng</h3>
          <span className="text-caption text-text-3">12 tháng gần nhất</span>
        </div>
        <table className="w-full text-table-sm">
          <thead>
            <tr className="border-b border-surface-3 bg-surface-1/50">
              {["Tháng", "Dự báo (m²)", "Thực tế (m²)", "Δ", "MAPE", "Mô hình"].map((h, i) => (
                <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {series.map((r) => {
              const overTarget = (r.mape ?? 0) > target;
              return (
                <tr key={r.month} className="border-b border-surface-3/50 hover:bg-surface-1/30">
                  <td className="px-4 py-2.5 text-table font-medium text-text-1">{r.month}</td>
                  <td className="px-4 py-2.5 text-table tabular-nums text-text-1">{r.fc.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-table tabular-nums text-text-1">
                    {r.actual !== null ? r.actual.toLocaleString() : <span className="text-text-3 italic">đang chạy</span>}
                  </td>
                  <td className="px-4 py-2.5 text-table tabular-nums">
                    {r.delta !== null ? (
                      <span className={cn("font-medium", r.delta > 0 ? "text-success" : "text-danger")}>
                        {r.delta > 0 ? "+" : ""}{r.delta.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-text-3">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-table tabular-nums">
                    {r.mape !== null ? (
                      <span className={cn("font-medium", overTarget ? "text-danger" : "text-success")}>
                        {r.mape}% {overTarget && "🔴"}
                      </span>
                    ) : (
                      <span className="text-text-3">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-table text-text-2">{r.model}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Per-CN MAPE */}
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <div className="px-5 py-3 border-b border-surface-3">
          <h3 className="font-display text-body font-semibold text-text-1">MAPE theo CN — tháng gần nhất</h3>
        </div>
        <table className="w-full text-table-sm">
          <thead>
            <tr className="border-b border-surface-3 bg-surface-1/50">
              {["CN", "Tên", "MAPE", "Mô hình"].map((h, i) => (
                <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cnMape.map((r) => (
              <tr key={r.cn} className="border-b border-surface-3/50 hover:bg-surface-1/30">
                <td className="px-4 py-2.5 text-table font-medium text-text-1">{r.cn}</td>
                <td className="px-4 py-2.5 text-table text-text-2">{r.name}</td>
                <td className="px-4 py-2.5 text-table tabular-nums">
                  <span className={cn("font-medium", r.mape > target ? "text-danger" : "text-success")}>
                    {r.mape}% {r.mape > target && "🔴"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-table text-text-2">{r.model}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
