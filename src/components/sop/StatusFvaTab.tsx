import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import type { DecisionLog, FvaNode } from "./sopData";

interface Props {
  decisionLog: DecisionLog[];
  fvaNodes: FvaNode[];
}

export function StatusTab({ decisionLog }: { decisionLog: DecisionLog[] }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg text-success text-table-sm font-medium px-3 py-1">
            ● Đang nhập — Day 4/30
          </span>
          <span className="text-table-sm text-text-3">🔒 Lock Day 7</span>
        </div>
        <span className="text-table-sm text-text-3 font-mono">System: Zenith Curator V2.4.0</span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Status card */}
        <div className="rounded-card bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-6 space-y-4">
          <h3 className="font-display text-xl font-bold text-primary">Trạng thái phê duyệt</h3>
          <p className="text-table text-text-2">
            Tiến độ cập nhật demand hiện tại đang được theo dõi chặt chẽ bởi hệ thống Curator.
          </p>
          <div className="rounded-card bg-surface-2 border border-surface-3 p-4 flex items-center gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="text-table-header uppercase text-text-3">Current Phase</p>
              <p className="text-table font-bold text-primary">Đã gửi 📤 → Duyệt ở Workspace</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/workspace")}
            className="text-table-sm text-primary font-medium hover:underline"
          >
            → Mở Workspace để duyệt
          </button>
        </div>

        {/* Decision Log */}
        <div className="rounded-card border border-surface-3 bg-surface-2">
          <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
            <h2 className="font-display text-section-header text-text-1">Decision Log</h2>
            <button className="text-table-sm text-primary font-medium hover:underline">🕐 View full audit trail</button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-3">
                {["Who", "When", "", "Version Reason"].map(h => (
                  <th key={h} className="text-left text-table-header uppercase text-text-3 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {decisionLog.map((log, i) => (
                <tr key={i} className={cn("border-b border-surface-3/50 hover:bg-primary/5 transition-colors", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center text-[11px] font-semibold text-white">{log.initials}</div>
                      <span className="text-table text-text-1">{log.who}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-table text-text-2 font-mono tabular-nums">{log.when}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-info-bg text-info text-[10px] font-bold px-2 py-0.5">{log.version}</span>
                  </td>
                  <td className="px-4 py-3 text-table text-text-2">{log.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function FvaTab({ fvaNodes }: { fvaNodes: FvaNode[] }) {
  const chartData = fvaNodes.map(n => ({
    name: n.code,
    actual: n.mape,
    target: 15,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-screen-title text-text-1">FVA Analysis</h2>
        <p className="text-table text-text-2">Forecast Value Add metrics across regional nodes.</p>
      </div>

      <div className="flex gap-2 mb-2">
        <button className="rounded-button border border-surface-3 bg-surface-0 px-3 py-1.5 text-table-sm text-text-2 hover:bg-surface-3">MTD Review</button>
        <button className="rounded-button border border-primary bg-primary/5 px-3 py-1.5 text-table-sm text-primary font-medium">Full Report</button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="rounded-card border border-surface-3 bg-surface-2 p-5">
          <h3 className="text-table font-bold text-text-1 mb-4">MAPE per Location (%)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e9ff" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e0e9ff", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="actual" name="Actual" fill="#2563EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="target" name="Target" fill="#e0e9ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Node cards */}
        <div className="space-y-3">
          {fvaNodes.map(n => (
            <div key={n.code} className="rounded-card border border-surface-3 bg-surface-2 p-4 flex items-center gap-4 hover:border-primary/30 transition-colors cursor-pointer">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-table font-bold text-primary">{n.code}</div>
              <div className="flex-1">
                <p className="text-table-header uppercase text-text-3">{n.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="font-display text-xl font-bold text-text-1">{n.mape}%</span>
                  <span className={cn("text-table-sm font-medium", n.delta >= 0 ? "text-success" : "text-danger")}>
                    {n.delta >= 0 ? "↗" : "↘"}{n.delta > 0 ? "+" : ""}{n.delta}%
                  </span>
                </div>
              </div>
              <span className="text-text-3">›</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
