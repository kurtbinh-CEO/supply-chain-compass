import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { CalendarDays, MapPin, Database, FileSpreadsheet, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FC_MAPE_BY_CN,
  BRANCHES,
  DEMAND_FC,
  FC_ACTUAL,
  getFcActualByMonth,
  getFcActualMonthsClosed,
} from "@/data/unis-enterprise-dataset";
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";

type MonthRow = { month: string; fc: number; actual: number | null; delta: number | null; mape: number | null; model: string; source: "real" | "mock" };
type CnMapeRow = { cn: string; name: string; mape: number; model: string };

/* ─────────────────────────────────────────────────────────────────────────── */
/* FC vs Actual — 12 months                                                   */
/* T6/25 → T12/25: mock historical (chưa có actual real trong dataset)        */
/* T1/26 → T4/26: REAL từ FC_ACTUAL dataset                                   */
/* T5/26: đang chạy (no actual yet)                                           */
/* ─────────────────────────────────────────────────────────────────────────── */

const MONTHS = [
  { label: "T6/25", year: 2025, m: 6,  source: "mock" as const },
  { label: "T7/25", year: 2025, m: 7,  source: "mock" as const },
  { label: "T8/25", year: 2025, m: 8,  source: "mock" as const },
  { label: "T9/25", year: 2025, m: 9,  source: "mock" as const },
  { label: "T10/25",year: 2025, m: 10, source: "mock" as const },
  { label: "T11/25",year: 2025, m: 11, source: "mock" as const },
  { label: "T12/25",year: 2025, m: 12, source: "mock" as const },
  { label: "T1/26", year: 2026, m: 1,  source: "real" as const },
  { label: "T2/26", year: 2026, m: 2,  source: "real" as const },
  { label: "T3/26", year: 2026, m: 3,  source: "real" as const },
  { label: "T4/26", year: 2026, m: 4,  source: "real" as const },
  { label: "T5/26", year: 2026, m: 5,  source: "real" as const },
];

// Mock baseline FC for historical months (deterministic seasonal)
const MOCK_FC: Record<string, number> = {
  "T6/25": 42000, "T7/25": 44500, "T8/25": 47000, "T9/25": 46500,
  "T10/25": 48000, "T11/25": 49500, "T12/25": 51000,
};
const MOCK_NOISE: Record<string, number> = {
  "T6/25": 0.97, "T7/25": 1.04, "T8/25": 0.95, "T9/25": 1.06,
  "T10/25": 0.98, "T11/25": 1.02, "T12/25": 0.94,
};

// FC tháng 2026 = Σ DEMAND_FC.fcM2 (cùng baseline cho mọi tháng vì DEMAND_FC là snapshot)
const FC_2026_TOTAL = DEMAND_FC.reduce((s, r) => s + r.fcM2, 0);

const MODEL_BY_MONTH: Record<string, string> = {
  "T6/25": "Holt-Winters", "T7/25": "Holt-Winters", "T8/25": "Holt-Winters",
  "T9/25": "XGBoost", "T10/25": "XGBoost", "T11/25": "XGBoost", "T12/25": "XGBoost",
  "T1/26": "HW+XGB", "T2/26": "HW+XGB", "T3/26": "HW+XGB", "T4/26": "HW+XGB", "T5/26": "HW+XGB",
};

function buildSeries(): MonthRow[] {
  const closedMonths = new Set(getFcActualMonthsClosed(2026));
  return MONTHS.map((m) => {
    let fc: number;
    let actual: number | null;
    if (m.source === "mock") {
      fc = MOCK_FC[m.label];
      actual = Math.round(fc * MOCK_NOISE[m.label]);
    } else {
      fc = FC_2026_TOTAL;
      actual = closedMonths.has(m.m) ? getFcActualByMonth(m.year, m.m) : null;
    }
    const delta = actual !== null ? actual - fc : null;
    const mape = actual !== null && fc > 0 ? Math.round((Math.abs(delta!) / fc) * 1000) / 10 : null;
    return {
      month: m.label,
      fc,
      actual,
      delta,
      mape,
      model: MODEL_BY_MONTH[m.label],
      source: m.source,
    };
  });
}

export function FcVsActualTab() {
  const series = useMemo(buildSeries, []);
  const closed = series.filter((r) => r.actual !== null);
  const avgMape = closed.length
    ? Math.round((closed.reduce((a, r) => a + (r.mape ?? 0), 0) / closed.length) * 10) / 10
    : 0;
  const target = 15;
  const realCount = series.filter((r) => r.source === "real" && r.actual !== null).length;

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
          <p className="text-caption text-text-3 uppercase tracking-wide mb-1">Nguồn thực tế</p>
          <p className="font-display text-kpi-md text-text-1 tabular-nums">
            {realCount}/4 <span className="text-body text-text-3">tháng 2026</span>
          </p>
          <p className="text-caption text-text-3 mt-1 inline-flex items-center gap-1">
            <Database className="h-3 w-3" />
            FC_ACTUAL · {FC_ACTUAL.length} dòng
          </p>
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

      {/* Table — Chi tiết theo tháng (SmartTable) */}
      {(() => {
        const monthCols: SmartTableColumn<MonthRow>[] = [
          { key: "month", label: "Tháng", sortable: true, width: 100, accessor: (r) => r.month, priority: "high" },
          {
            key: "fc",
            label: "Dự báo (m²)",
            numeric: true,
            sortable: true,
            width: 130,
            align: "right",
            accessor: (r) => r.fc,
            render: (r) => <span className="tabular-nums text-text-1">{r.fc.toLocaleString()}</span>,
          },
          {
            key: "actual",
            label: "Thực tế (m²)",
            numeric: true,
            sortable: true,
            width: 130,
            align: "right",
            accessor: (r) => r.actual ?? 0,
            render: (r) =>
              r.actual !== null ? (
                <span className="tabular-nums text-text-1">{r.actual.toLocaleString()}</span>
              ) : (
                <span className="text-text-3 italic">đang chạy</span>
              ),
          },
          {
            key: "delta",
            label: "Δ",
            numeric: true,
            sortable: true,
            width: 110,
            align: "right",
            accessor: (r) => r.delta ?? 0,
            render: (r) =>
              r.delta !== null ? (
                <span className={cn("font-medium tabular-nums", r.delta > 0 ? "text-success" : "text-danger")}>
                  {r.delta > 0 ? "+" : ""}
                  {r.delta.toLocaleString()}
                </span>
              ) : (
                <span className="text-text-3">—</span>
              ),
          },
          {
            key: "mape",
            label: "MAPE",
            numeric: true,
            sortable: true,
            width: 100,
            align: "right",
            accessor: (r) => r.mape ?? 0,
            render: (r) => {
              if (r.mape === null) return <span className="text-text-3">—</span>;
              const over = r.mape > target;
              return (
                <span className={cn("font-medium tabular-nums", over ? "text-danger" : "text-success")}>
                  {r.mape}% {over && "🔴"}
                </span>
              );
            },
          },
          {
            key: "model",
            label: "Mô hình",
            sortable: true,
            width: 140,
            filter: "enum",
            filterOptions: [
              { value: "Holt-Winters", label: "Holt-Winters" },
              { value: "XGBoost", label: "XGBoost" },
              { value: "HW+XGB", label: "HW+XGB" },
            ],
            accessor: (r) => r.model,
          },
          {
            key: "source",
            label: "Nguồn",
            sortable: true,
            width: 110,
            filter: "enum",
            filterOptions: [
              { value: "real", label: "Thực tế" },
              { value: "mock", label: "Lịch sử (mock)" },
            ],
            accessor: (r) => r.source,
            render: (r) =>
              r.source === "real" ? (
                <span className="inline-flex items-center gap-1 text-table-sm font-medium text-success">
                  <Database className="h-3 w-3" /> Thực tế
                </span>
              ) : (
                <span className="text-table-sm text-text-3">Lịch sử</span>
              ),
          },
        ];
        return (
          <SmartTable<MonthRow>
            screenId="fc-vs-actual-monthly"
            title="Chi tiết theo tháng"
            exportFilename="fc-vs-actual-monthly"
            columns={monthCols}
            data={series}
            getRowId={(r) => r.month}
            rowSeverity={(r) => ((r.mape ?? 0) > target ? "watch" : undefined)}
            emptyState={{
              icon: <CalendarDays />,
              title: "Chưa có dữ liệu tháng",
              description: "12 kỳ FC vs Actual sẽ xuất hiện sau khi đóng tháng đầu tiên. Hệ thống tự cập nhật vào ngày 1 mỗi tháng.",
            }}
          />
        );
      })()}

      {/* Per-CN MAPE — SmartTable */}
      {(() => {
        const cnCols: SmartTableColumn<CnMapeRow>[] = [
          { key: "cn", label: "CN", sortable: true, width: 80, accessor: (r) => r.cn, priority: "high" },
          { key: "name", label: "Tên", sortable: true, width: 200, accessor: (r) => r.name },
          {
            key: "mape",
            label: "MAPE",
            numeric: true,
            sortable: true,
            width: 110,
            align: "right",
            accessor: (r) => r.mape,
            render: (r) => (
              <span className={cn("font-medium tabular-nums", r.mape > target ? "text-danger" : "text-success")}>
                {r.mape}% {r.mape > target && "🔴"}
              </span>
            ),
          },
          {
            key: "model",
            label: "Mô hình",
            sortable: true,
            width: 140,
            filter: "enum",
            filterOptions: [
              { value: "Holt-Winters", label: "Holt-Winters" },
              { value: "XGBoost", label: "XGBoost" },
            ],
            accessor: (r) => r.model,
          },
        ];
        return (
          <SmartTable<CnMapeRow>
            screenId="fc-vs-actual-cn-mape"
            title="MAPE theo CN — tháng gần nhất"
            exportFilename="fc-vs-actual-cn-mape"
            columns={cnCols}
            data={cnMape}
            getRowId={(r) => r.cn}
            rowSeverity={(r) => (r.mape > target ? "watch" : undefined)}
            emptyState={{
              icon: <MapPin />,
              title: "Chưa có dữ liệu MAPE theo CN",
              description: "Bảng MAPE sẽ điền sau khi mỗi CN có ít nhất 1 kỳ Actual đóng. Kiểm tra lại sau khi chốt tháng.",
            }}
          />
        );
      })()}
    </div>
  );
}
