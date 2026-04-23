import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertTriangle, FileSearch } from "lucide-react";

interface OverrideReason {
  reason: string;
  pct: number;
  example: string;
  fill: string;
}

const OVERRIDE_REASONS: OverrideReason[] = [
  {
    reason: "Số lượng quá cao",
    pct: 35,
    example: "v3 vượt năng lực NM hoặc kho không chứa nổi.",
    fill: "var(--color-danger-text)",
  },
  {
    reason: "Sai NM",
    pct: 22,
    example: "Phụ trách đổi sang NM uy tín hơn (ví dụ Toko → Mikado).",
    fill: "var(--color-warning-text)",
  },
  {
    reason: "Sai CN",
    pct: 18,
    example: "Hệ thống đề xuất CN-BD nhưng CN-HCM đã có lateral coverage.",
    fill: "var(--color-warning-text)",
  },
  {
    reason: "Thời gian (ETA/Lead-time)",
    pct: 15,
    example: "Push sớm để tránh lễ; hoặc giãn để cân container.",
    fill: "#2563EB",
  },
  {
    reason: "Khác",
    pct: 10,
    example: "Lý do khác — ưu đãi NCC, đổi mã thay thế, ad-hoc.",
    fill: "#94a3b8",
  },
];

const TOTAL_PO = 47;
const OVERRIDE_PO = 18;
const OVERRIDE_RATE = Math.round((OVERRIDE_PO / TOTAL_PO) * 100);

export function PlannerOverridePanel() {
  return (
    <div className="space-y-4">
      {/* Header KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-card border border-surface-3 bg-surface-1/50 p-3">
          <div className="text-[11px] uppercase text-text-3 mb-0.5">Tổng PO tháng</div>
          <div className="font-display text-section-header tabular-nums text-text-1">{TOTAL_PO}</div>
        </div>
        <div className="rounded-card border border-warning/30 bg-warning-bg/30 p-3">
          <div className="text-[11px] uppercase text-text-3 mb-0.5">PO bị sửa</div>
          <div className="font-display text-section-header tabular-nums text-warning">{OVERRIDE_PO}</div>
        </div>
        <div className="rounded-card border border-warning/30 bg-warning-bg/30 p-3">
          <div className="text-[11px] uppercase text-text-3 mb-0.5">Tỷ lệ override</div>
          <div className="font-display text-section-header tabular-nums text-warning">{OVERRIDE_RATE}%</div>
          <div className="text-caption text-text-3 mt-0.5">target ≤ 25%</div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="rounded-card border border-surface-3 bg-surface-2 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileSearch className="h-4 w-4 text-primary" />
          <h4 className="text-table font-semibold text-text-1">Top 5 lý do sửa PO</h4>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={OVERRIDE_REASONS} layout="vertical" margin={{ left: 24, right: 36 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-3)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--color-text-3)" }} unit="%" domain={[0, 40]} />
              <YAxis
                type="category"
                dataKey="reason"
                tick={{ fontSize: 11, fill: "var(--color-text-2)" }}
                width={150}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(value: number) => [`${value}%`, "Tỷ lệ"]}
              />
              <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                {OVERRIDE_REASONS.map((r, i) => (
                  <Cell key={i} fill={r.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Reason details */}
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <table className="w-full text-table-sm">
          <thead>
            <tr className="border-b border-surface-3 bg-surface-1/50">
              {["Lý do", "Tỷ lệ", "Ví dụ điển hình"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {OVERRIDE_REASONS.map((r, i) => (
              <tr key={r.reason} className="border-b border-surface-3/50 hover:bg-surface-1/30">
                <td className="px-4 py-2.5 font-medium text-text-1">{r.reason}</td>
                <td className="px-4 py-2.5 tabular-nums">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-bold"
                    style={{ background: `${r.fill}1A`, color: r.fill }}
                  >
                    {r.pct}%
                  </span>
                </td>
                <td className="px-4 py-2.5 text-text-2">{r.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Insight callout */}
      <div className="rounded-md bg-warning-bg/40 border border-warning/30 px-4 py-3 text-table-sm text-text-1 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
        <span>
          <span className="font-semibold text-warning">Insight:</span> 35% sửa do "số lượng quá cao" → cần
          siết tolerance ở module Demand Weekly. 22% "sai NM" → review NM Honoring Grade trước khi đề xuất PO.
        </span>
      </div>
    </div>
  );
}
