import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Lock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import type { DecisionLog, FvaNode } from "./sopData";

interface Props { decisionLog: DecisionLog[]; fvaNodes: FvaNode[] }

export function LockLogTab({ decisionLog, fvaNodes }: Props) {
  const navigate = useNavigate();
  const [locked, setLocked] = useState(false);

  const handleLock = () => {
    setLocked(true);
    toast.success("✅ S&OP Consensus Locked — Day 7", { description: "Workflow advancing → Hub & Commitment" });
    setTimeout(() => navigate("/hub"), 1500);
  };

  const chartData = fvaNodes.map(n => ({ name: n.code, MAPE: n.mape, Target: 15 }));

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Lock status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full text-table-sm font-medium px-3 py-1",
            locked ? "bg-success-bg text-success" : "bg-warning-bg text-warning"
          )}>
            {locked ? <><CheckCircle className="h-4 w-4" /> ✅ Locked Day 7</> : "● Đang nhập — Day 4/30"}
          </span>
          {!locked && <span className="text-table-sm text-text-3">🔒 Lock Day 7</span>}
        </div>
        {!locked && (
          <button onClick={handleLock}
            className="rounded-button bg-gradient-primary text-primary-foreground px-5 py-2 text-table-sm font-medium flex items-center gap-2">
            <Lock className="h-4 w-4" /> Lock S&OP Consensus
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Lock card */}
        <div className={cn("rounded-card border p-6 space-y-4",
          locked ? "border-success/30 bg-success-bg" : "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20"
        )}>
          <h3 className={cn("font-display text-xl font-bold", locked ? "text-success" : "text-primary")}>
            {locked ? "✅ Consensus Locked" : "Trạng thái phê duyệt"}
          </h3>
          <p className="text-table text-text-2">
            {locked
              ? "S&OP consensus đã được lock. Workflow đang chuyển sang Hub & Commitment."
              : "Tiến độ cập nhật demand hiện tại đang được theo dõi. Đã gửi → Duyệt ở Workspace."}
          </p>
          <div className="rounded-card bg-surface-2 border border-surface-3 p-4 flex items-center gap-3">
            <span className="text-2xl">{locked ? "✅" : "⏳"}</span>
            <div>
              <p className="text-table-header uppercase text-text-3">Current Phase</p>
              <p className={cn("text-table font-bold", locked ? "text-success" : "text-primary")}>
                {locked ? "Locked → Hub & Commitment" : "Đã gửi 📤 → Duyệt ở Workspace"}
              </p>
            </div>
          </div>
          <button onClick={() => navigate(locked ? "/hub" : "/workspace")}
            className={cn("text-table-sm font-medium hover:underline", locked ? "text-success" : "text-primary")}>
            → {locked ? "Mở Hub & Commitment" : "Mở Workspace để duyệt"}
          </button>
        </div>

        {/* Decision Log */}
        <div className="rounded-card border border-surface-3 bg-surface-2">
          <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
            <h3 className="font-display text-section-header text-text-1">Decision Log</h3>
            <button className="text-table-sm text-primary font-medium hover:underline">🕐 Full audit trail</button>
          </div>
          <table className="w-full text-table-sm">
            <thead>
              <tr className="border-b border-surface-3">
                {["Who", "When", "", "Reason"].map(h => (
                  <th key={h} className="text-left text-table-header uppercase text-text-3 px-4 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {decisionLog.map((log, i) => (
                <tr key={i} className={cn("border-b border-surface-3/50 hover:bg-primary/5 transition-colors", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-gradient-primary flex items-center justify-center text-[10px] font-semibold text-white">{log.initials}</div>
                      <span className="text-table text-text-1">{log.who}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-table text-text-2 font-mono tabular-nums text-[11px]">{log.when}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-info-bg text-info text-[10px] font-bold px-2 py-0.5">{log.version}</span>
                  </td>
                  <td className="px-4 py-2.5 text-table text-text-2">{log.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FVA chart */}
      <div className="rounded-card border border-surface-3 bg-surface-2 p-5">
        <h3 className="font-display text-section-header text-text-1 mb-1">FVA Analysis — MAPE per Location</h3>
        <p className="text-table text-text-2 mb-4">Forecast Value Add — theo dõi ai dự báo chính xác nhất.</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e9ff" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e0e9ff", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="MAPE" name="Actual MAPE" fill="#2563EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Target" name="Target" fill="#e0e9ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="space-y-3">
            {fvaNodes.map(n => (
              <div key={n.code} className="rounded-card border border-surface-3 bg-surface-0 p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-table font-bold text-primary">{n.code}</div>
                <div className="flex-1">
                  <p className="text-caption uppercase text-text-3">{n.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-bold text-text-1">{n.mape}%</span>
                    <span className={cn("text-table-sm font-medium", n.delta >= 0 ? "text-success" : "text-danger")}>
                      {n.delta >= 0 ? "↗" : "↘"}{n.delta > 0 ? "+" : ""}{n.delta}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
