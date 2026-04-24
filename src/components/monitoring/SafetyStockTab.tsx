import { useState } from "react";
import { cn } from "@/lib/utils";
import { StatusChip } from "@/components/StatusChip";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { TermTooltip } from "@/components/TermTooltip";

// Mục tiêu SS
const ssTargets = [
  { node: "CN_NORTH_01", sku: "SKU-29384-H", current: 1420, formula: "z*σ*√LT", demand: 84.2, status: "Tối ưu" as const },
  { node: "CN_SOUTH_04", sku: "SKU-11029-K", current: 840, formula: "z*σ*√LT", demand: 32.1, status: "Thiếu hàng" as const },
  { node: "CN_WEST_02", sku: "SKU-88210-L", current: 2100, formula: "Ghi đè thủ công", demand: 112.5, status: "Thủ công" as const },
];

// Nhật ký thay đổi
const changeLogs = [
  { date: "24/10/2023", sku: "SKU-29384-H", from: 1200, to: 1420, delta: "+18.3%", trigger: "Nhu cầu tăng đột biến (Mùa vụ)", approver: "Nguyễn T. Anh" },
  { date: "22/10/2023", sku: "SKU-11029-K", from: 950, to: 840, delta: "-11.5%", trigger: "Tối ưu thời gian đặt hàng", approver: "Mark S. Curator" },
];

// Dữ liệu xu hướng
const trendData = [
  { month: "T8", fc: 1.2, ss: 1.4, wc: 1.8 }, { month: "T9", fc: 1.5, ss: 1.5, wc: 1.9 },
  { month: "T10", fc: 1.8, ss: 1.6, wc: 2.1 }, { month: "T11", fc: 2.4, ss: 1.8, wc: 2.4 },
  { month: "T12", fc: 2.0, ss: 1.7, wc: 2.2 },
];

const simParams = ["Mức phục vụ mục tiêu (α)", "Thời gian đặt hàng (ngày)", "Biến động nhu cầu (σ)", "Chu kỳ kiểm tra"];

// Cảnh báo SS — δ ≥ 10% → CHỜ DUYỆT
const ssAlert = {
  sku: "GA-300",
  oldSs: 2719,
  newSs: 2350,
  deltaPct: -13.6,
  reason: "MAPE giảm từ 22% → 14% (CN-BD 3 tuần liên tiếp)",
};

export function SafetyStockTab() {
  const [simParam, setSimParam] = useState(simParams[0]);
  const [simValue, setSimValue] = useState(98);
  const [dateFilter, setDateFilter] = useState("all");
  const [ssAlertStatus, setSsAlertStatus] = useState<"pending" | "confirmed" | "kept">("pending");

  const beforeSS = 12402;
  const afterSS = Math.round(beforeSS * (simValue / 95));
  const wcDelta = Math.round((afterSS - beforeSS) * 18.5);
  const isLargeDelta = Math.abs(ssAlert.deltaPct) >= 10;

  const handleApply = () => {
    toast.success("Đã gửi đề xuất SS đến Workspace", { description: `Mức phục vụ: ${simValue}% → SS: ${afterSS.toLocaleString()}` });
  };

  const handleConfirmSs = () => {
    setSsAlertStatus("confirmed");
    toast.success("Đã xác nhận SS mới", { description: `${ssAlert.sku}: ${ssAlert.oldSs.toLocaleString()} → ${ssAlert.newSs.toLocaleString()} m²` });
  };

  const handleKeepSs = () => {
    setSsAlertStatus("kept");
    toast.info("Giữ SS cũ", { description: `${ssAlert.sku}: vẫn ${ssAlert.oldSs.toLocaleString()} m². Đã ghi log.` });
  };

  return (
    <div className="space-y-6">
      {/* Card cảnh báo SS — đầu tab */}
      {ssAlertStatus === "pending" && (
        <div className={cn(
          "rounded-card border-l-4 p-5 animate-fade-in",
          isLargeDelta ? "border-warning bg-warning-bg/40 border border-warning/30" : "border-success bg-success-bg/40 border border-success/30"
        )}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-table font-semibold text-text-1">
                  {isLargeDelta ? "⚠ SS đề xuất — chờ xác nhận" : "✅ SS tự áp dụng"}
                </span>
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-caption font-bold",
                  isLargeDelta ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground"
                )}>
                  {isLargeDelta ? "CHỜ DUYỆT" : "TỰ ĐỘNG"}
                </span>
              </div>
              <p className="text-table text-text-1">
                <TermTooltip term="SS"><span className="font-mono font-medium">SS</span></TermTooltip>{" "}
                <span className="font-mono font-medium">{ssAlert.sku}</span>:{" "}
                <span className="tabular-nums">{ssAlert.oldSs.toLocaleString()}</span>
                {" → "}
                <span className="tabular-nums font-semibold">{ssAlert.newSs.toLocaleString()}</span>
                {" m² "}
                <span className={cn("font-semibold", ssAlert.deltaPct < 0 ? "text-success" : "text-danger")}>
                  ({ssAlert.deltaPct > 0 ? "+" : ""}{ssAlert.deltaPct}%)
                </span>
              </p>
              <p className="text-table-sm text-text-2 mt-1">{ssAlert.reason}</p>
              {!isLargeDelta && (
                <p className="text-caption text-text-3 italic mt-1">
                  δ &lt; 10% → tự động áp dụng. Đã ghi log audit.
                </p>
              )}
            </div>
            {isLargeDelta && (
              <div className="flex flex-col gap-2 shrink-0">
                <Button size="sm" onClick={handleConfirmSs} className="bg-success text-success-foreground hover:bg-success/90">
                  ✅ Xác nhận
                </Button>
                <Button size="sm" variant="outline" onClick={handleKeepSs}>
                  ❌ Giữ cũ
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      {ssAlertStatus !== "pending" && (
        <div className="rounded-card border border-surface-3 bg-surface-2 px-4 py-2.5 text-table-sm text-text-2 flex items-center gap-2">
          {ssAlertStatus === "confirmed" ? "✅ Đã xác nhận SS" : "❌ Giữ SS cũ"} —{" "}
          <span className="font-mono">{ssAlert.sku}</span>. Đã ghi log audit.
        </div>
      )}
      <div className="grid grid-cols-5 gap-6">
        {/* A: Bảng mục tiêu SS */}
        <div className="col-span-3 rounded-card border border-surface-3 bg-surface-2">
          <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
            <h2 className="font-display text-section-header text-text-1">
              Mục tiêu <TermTooltip term="SS">SS</TermTooltip> hiện tại
            </h2>
            <span className="text-table-sm text-text-3 bg-surface-0 rounded-full px-2.5 py-0.5 border border-surface-3">z=1.64 (95%)</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-3">
                {["Node × SKU", "Mục tiêu hiện tại", "Công thức SS", "Σ Nhu cầu", "Trạng thái", ""].map((h) => (
                  <th key={h} className="text-left text-table-header uppercase text-text-3 px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ssTargets.map((r, i) => (
                <tr key={r.node} className={cn("border-b border-surface-3/50 hover:bg-surface-3 transition-colors", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                  <td className="px-5 py-3">
                    <span className="text-table font-medium text-text-1 block">{r.node}</span>
                    <span className="text-caption text-text-3 font-mono">{r.sku}</span>
                  </td>
                  <td className="px-5 py-3 text-table font-medium text-text-1 tabular-nums">{r.current.toLocaleString()} <span className="text-text-3 text-caption">đv</span></td>
                  <td className="px-5 py-3 text-table text-text-2 font-mono italic">{r.formula}</td>
                  <td className="px-5 py-3 text-table text-text-1 tabular-nums">{r.demand}</td>
                  <td className="px-5 py-3">
                    <StatusChip
                      status={r.status === "Tối ưu" ? "success" : r.status === "Thiếu hàng" ? "danger" : "warning"}
                      label={r.status}
                    />
                  </td>
                  <td className="px-5 py-3"><Pencil className="h-4 w-4 text-text-3 hover:text-primary cursor-pointer" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* C: Mô phỏng */}
        <div className="col-span-2 rounded-card border border-surface-3 bg-surface-2 p-5 space-y-5">
          <h2 className="font-display text-section-header text-text-1">Mô phỏng</h2>
          <div>
            <label className="text-table-header uppercase text-text-3 mb-1.5 block">Tham số mô phỏng</label>
            <select
              value={simParam}
              onChange={(e) => setSimParam(e.target.value)}
              className="w-full h-9 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {simParams.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-table-header uppercase text-text-3 mb-1.5 block">Giá trị mô phỏng</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={80}
                max={99}
                value={simValue}
                onChange={(e) => setSimValue(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-table font-bold text-primary tabular-nums w-12 text-right">{simValue}%</span>
            </div>
          </div>
          <div className="space-y-2 py-2">
            <div className="flex justify-between text-table text-text-2 border-b border-surface-3/50 pb-2">
              <span>Tác động đến vốn lưu động</span>
              <span className={cn("font-medium", wcDelta > 0 ? "text-danger" : "text-success")}>
                {wcDelta > 0 ? "+" : ""}{(wcDelta / 1000).toFixed(0)}K ₫
              </span>
            </div>
            <div className="flex justify-between text-table text-text-2 border-b border-surface-3/50 pb-2">
              <span>Bảo vệ rủi ro thiếu hàng</span>
              <span className="text-success font-medium">+{Math.round((simValue - 95) * 3.5)}%</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="text-center">
              <p className="text-table-header uppercase text-text-3">SS trước</p>
              <p className="font-display text-kpi text-text-1">{beforeSS.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-table-header uppercase text-success">SS sau</p>
              <p className="font-display text-kpi text-success">{afterSS.toLocaleString()}</p>
            </div>
          </div>
          <Button className="w-full bg-gradient-primary text-primary-foreground" onClick={handleApply}>
            Áp dụng → Workspace 🚀
          </Button>
        </div>
      </div>

      {/* B: Audit & Nhật ký thay đổi */}
      <div className="rounded-card border border-surface-3 bg-surface-2">
        <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
          <h2 className="font-display text-section-header text-text-1">Audit & Nhật ký thay đổi</h2>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-8 rounded-button border border-surface-3 bg-surface-0 px-3 text-table-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">Tất cả</option>
            <option value="7d">7 ngày</option>
            <option value="30d">30 ngày</option>
          </select>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-3">
              {["Ngày", "SKU", "Thay đổi", "Nguyên nhân", "Người duyệt"].map((h) => (
                <th key={h} className="text-left text-table-header uppercase text-text-3 px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {changeLogs.map((log, i) => (
              <tr key={i} className={cn("border-b border-surface-3/50 hover:bg-surface-3 transition-colors", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                <td className="px-5 py-3 text-table text-text-2 tabular-nums">{log.date}</td>
                <td className="px-5 py-3 text-table font-medium text-text-1 font-mono">{log.sku}</td>
                <td className="px-5 py-3">
                  <span className="text-table tabular-nums">
                    <span className="text-text-2">{log.from.toLocaleString()}</span>
                    <span className={cn("mx-1", log.delta.startsWith("+") ? "text-success" : "text-danger")}>→</span>
                    <span className="text-text-1 font-medium">{log.to.toLocaleString()}</span>
                    <span className={cn("ml-1 text-table-sm font-medium", log.delta.startsWith("+") ? "text-success" : "text-danger")}>{log.delta}</span>
                  </span>
                </td>
                <td className="px-5 py-3 text-table text-text-2">{log.trigger}</td>
                <td className="px-5 py-3 text-table text-text-1">{log.approver}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* D: Biểu đồ xu hướng FC→SS→WC */}
      <div className="rounded-card border border-surface-3 bg-surface-2 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-section-header text-text-1">FC → SS → ROI</h2>
          <span className="text-table-sm text-primary font-medium cursor-pointer hover:underline">Xem chi tiết</span>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-3)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <Tooltip contentStyle={{ borderRadius: 8, borderColor: "var(--color-surface-3)", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="fc" fill="#2563EB" name="Dự báo" radius={[4, 4, 0, 0]} />
            <Bar dataKey="ss" fill="var(--color-surface-3)" name="Tồn an toàn" radius={[4, 4, 0, 0]} />
            <Bar dataKey="wc" fill="var(--color-success-text)" name="Vốn lưu động" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-surface-3">
          <div className="flex justify-between text-table text-text-2">
            <span>Giá trị tăng thêm của FC (<TermTooltip term="FVA">FVA</TermTooltip>)</span>
            <span className="text-success font-medium">+12.4%</span>
          </div>
          <div className="flex justify-between text-table text-text-2">
            <span>Hệ số giảm SS</span>
            <span className="text-danger font-medium">-8.2%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
