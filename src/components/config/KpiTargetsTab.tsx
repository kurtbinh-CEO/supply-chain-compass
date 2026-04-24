/**
 * KpiTargetsTab — M17 GAP5
 *
 * Bảng editable cho 8 KPI lãnh đạo (KPI_TARGETS):
 *   target + warningThreshold + setBy + setDate.
 *
 * Khi locked → tất cả input disabled; nút "Mở khóa" chỉ SC_MANAGER được bấm.
 * In-memory state — wire vào ExecutivePage qua getKpiTarget() ở lần render kế.
 *
 * Pattern mượn từ ConfigTable (numeric Input + sticky thead via SmartTable rule
 * NHƯNG dùng raw <table> để tận dụng cùng style với các tab khác trong Config).
 */
import { useEffect, useMemo, useState } from "react";
import { Lock, Unlock, Save, RotateCcw, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRbac } from "@/components/RbacContext";
import { ChangeLogPanel } from "@/components/ChangeLogPanel";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { KPI_TARGETS, type KpiTarget, type KpiDirection } from "@/data/unis-enterprise-dataset";

interface RuntimeKpi extends KpiTarget {
  initialTarget: number;
  initialWarning: number;
}

const DIRECTION_LABEL: Record<KpiDirection, string> = {
  higher_better: "Càng cao càng tốt",
  lower_better:  "Càng thấp càng tốt",
};

function fmt(n: number): string {
  return n.toLocaleString("vi-VN");
}

export function KpiTargetsTab() {
  const { user } = useRbac();
  const isSC = user.role === "SC_MANAGER";

  const [locked, setLocked] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [rows, setRows] = useState<RuntimeKpi[]>(() =>
    KPI_TARGETS.map((k) => ({ ...k, initialTarget: k.target, initialWarning: k.warningThreshold })),
  );

  const editable = !locked;

  const dirty = useMemo(
    () => rows.some((r) => r.target !== r.initialTarget || r.warningThreshold !== r.initialWarning),
    [rows],
  );

  const setField = (idx: number, field: "target" | "warningThreshold", v: number) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: v };
      return next;
    });
  };

  const handleSave = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        initialTarget: r.target,
        initialWarning: r.warningThreshold,
        setDate: new Date().toLocaleDateString("vi-VN"),
      })),
    );
    toast.success("Đã lưu mục tiêu KPI");
  };

  const handleReset = () => {
    setRows((prev) => prev.map((r) => ({ ...r, target: r.initialTarget, warningThreshold: r.initialWarning })));
    toast.message("Đã hoàn tác về giá trị đã lưu");
  };

  const handleToggleLock = () => {
    if (!isSC) {
      toast.error("Chỉ SC Manager / CEO / CSCO được khóa mục tiêu KPI");
      return;
    }
    setLocked((v) => !v);
    toast.message(locked ? "Đã mở khóa mục tiêu KPI" : "Đã khóa mục tiêu KPI");
  };

  return (
    <div className="space-y-4">
      {/* Intro banner */}
      <div className="rounded-card border border-surface-3 bg-info-bg/40 px-4 py-3 text-table-sm text-text-2 flex items-start gap-2">
        <span>🎯</span>
        <span>
          Mục tiêu KPI là chuẩn so sánh cho <b>Tổng quan lãnh đạo</b> (/executive),
          <b> Giám sát</b> (/monitoring), và <b>Tổng quan</b> (Trang chủ).
          Đặt <b>Mục tiêu</b> là giá trị lý tưởng. Đặt <b>Cảnh báo khi</b> là ngưỡng để
          card chuyển sang trạng thái 🔴 (dưới target) hoặc 🟡 (gần target).
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {locked ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success-bg text-success border border-success/30 px-2 py-0.5 text-caption font-medium">
              <Lock className="h-3 w-3" /> Khóa
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning-bg text-warning border border-warning/30 px-2 py-0.5 text-caption font-medium">
              <Unlock className="h-3 w-3" /> Đang chỉnh sửa
            </span>
          )}
          <span className="text-caption text-text-3">
            {KPI_TARGETS.length} KPI · cập nhật: {rows[0]?.setDate ?? "—"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            onClick={handleToggleLock}
            disabled={!isSC}
            title={!isSC ? "Chỉ SC Manager được khóa" : ""}
          >
            {locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            {locked ? "Mở khóa" : "Khóa lại"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5"
            onClick={handleReset}
            disabled={!dirty}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Hoàn tác
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5"
            onClick={handleSave}
            disabled={!dirty || !editable}
          >
            <Save className="h-3.5 w-3.5" />
            Lưu mục tiêu
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <table className="w-full text-table">
          <thead className="bg-surface-1">
            <tr>
              <th className="text-left px-4 py-2.5 text-table-header uppercase text-text-3 font-medium">KPI</th>
              <th className="text-right px-4 py-2.5 text-table-header uppercase text-text-3 font-medium w-32">Mục tiêu</th>
              <th className="text-left  px-4 py-2.5 text-table-header uppercase text-text-3 font-medium w-24">Đơn vị</th>
              <th className="text-right px-4 py-2.5 text-table-header uppercase text-text-3 font-medium w-44">Cảnh báo khi</th>
              <th className="text-left  px-4 py-2.5 text-table-header uppercase text-text-3 font-medium w-44">Hướng tốt</th>
              <th className="text-left  px-4 py-2.5 text-table-header uppercase text-text-3 font-medium w-28">Thiết lập bởi</th>
              <th className="text-left  px-4 py-2.5 text-table-header uppercase text-text-3 font-medium w-28">Ngày</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const changed =
                r.target !== r.initialTarget || r.warningThreshold !== r.initialWarning;
              const cmp = r.direction === "higher_better" ? "<" : ">";
              return (
                <tr
                  key={r.kpiKey}
                  className={cn(
                    i % 2 === 0 ? "bg-surface-2" : "bg-surface-0",
                    changed && "ring-1 ring-inset ring-warning/30",
                  )}
                >
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-text-1">{r.label}</div>
                    <div className="font-mono text-caption text-text-3 mt-0.5">{r.kpiKey}</div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Input
                      type="number"
                      value={r.target}
                      disabled={!editable}
                      onChange={(e) => setField(i, "target", Number(e.target.value) || 0)}
                      className="h-8 w-24 text-table tabular-nums text-right ml-auto font-display font-semibold"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-text-2 text-table-sm">{r.unit}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <span className="text-text-3 font-mono text-table-sm">{cmp}</span>
                      <Input
                        type="number"
                        value={r.warningThreshold}
                        disabled={!editable}
                        onChange={(e) => setField(i, "warningThreshold", Number(e.target.value) || 0)}
                        className="h-8 w-24 text-table tabular-nums text-right"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-text-2 text-table-sm">
                    {DIRECTION_LABEL[r.direction]}
                  </td>
                  <td className="px-4 py-2.5 text-text-2 text-table-sm">{r.setBy}</td>
                  <td className="px-4 py-2.5 text-text-3 text-table-sm tabular-nums">{r.setDate}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* History */}
      <div>
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="inline-flex items-center gap-1.5 text-table-sm text-text-2 hover:text-text-1"
        >
          <History className="h-3.5 w-3.5" />
          {showHistory ? "Ẩn lịch sử thay đổi" : "Lịch sử thay đổi"}
        </button>
        {showHistory && (
          <div className="mt-3">
            <ChangeLogPanel entityType="kpi_targets" entityId="kpi-2026" maxItems={5} defaultOpen />
          </div>
        )}
      </div>
    </div>
  );
}
