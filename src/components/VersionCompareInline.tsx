/**
 * VersionCompareInline — section so sánh 2 phiên bản inline DƯỚI header.
 *
 * Layout:
 *   • Toolbar: dropdown chọn version đối chiếu + close
 *   • 3 summary cards (Nhu cầu ròng, Ngoại lệ, Đơn hàng)
 *   • Bảng "Chi tiết thay đổi" (10 hạng mục — DRP)
 *   • Bảng "Thay đổi per CN" (chỉ CN khác nhau — DRP)
 *   • Footer Gốc rễ + actions [Giữ vX] [Chuyển vY] [Xuất so sánh]
 *
 * Dùng cho DRP. SOP/BOOKING dùng VersionDiffView (đã có).
 */
import { useMemo, useState } from "react";
import { ArrowUp, ArrowDown, Minus, X, Download, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PlanRunVersion } from "@/data/unis-enterprise-dataset";
import { toast } from "sonner";

interface Props {
  /** Tất cả version cùng entityId (DRP-W20) */
  versions: PlanRunVersion[];
  /** Phiên đang xem (mặc định left) */
  leftVersion: number;
  /** Phiên so sánh (right) */
  rightVersion: number;
  /** Đổi phiên so sánh */
  onChangeRight: (v: number) => void;
  onClose: () => void;
  /** Khi click "Chuyển sang vY" */
  onSwitchTo: (v: number) => void;
}

interface DiffRow {
  label: string;
  left: number;
  right: number;
  /** "good" = tăng tốt, "bad" = tăng xấu, "neutral" */
  bias: "good" | "bad" | "neutral";
  /** lý do hiển thị cuối */
  reason?: string;
  /** key trong summary để pull data */
  key: string;
}

/* Map field summary → label hiển thị + bias */
const DRP_DIFF_FIELDS: Omit<DiffRow, "left" | "right">[] = [
  { key: "grossDemand", label: "Nhu cầu gộp",     bias: "neutral", reason: "Demand version đổi" },
  { key: "cnInv",       label: "Tồn CN",          bias: "good",    reason: "Bán hàng/nhập kho ngày" },
  { key: "pipeline",    label: "Pipeline",        bias: "good",    reason: "PO/TO đang về" },
  { key: "netReq",      label: "Nhu cầu ròng",    bias: "bad",     reason: "= Gross − Tồn − Pipeline" },
  { key: "lcnbCover",   label: "LCNB cover",      bias: "good",    reason: "Cân kho liên CN" },
  { key: "hubCover",    label: "Hub cover",       bias: "good",    reason: "Phân bổ Hub ảo" },
  { key: "nmAtpPartial",label: "NM ATP partial",  bias: "bad",     reason: "NM thiếu ATP" },
  { key: "poDrafted",   label: "PO nháp",         bias: "neutral", reason: "Số PO sinh ra" },
  { key: "toDrafted",   label: "TO nháp",         bias: "neutral", reason: "Số TO liên CN" },
  { key: "exceptions",  label: "Ngoại lệ",        bias: "bad",     reason: "Cần planner xử lý" },
];

/* Per-CN demo data — sẽ wire DB sau */
interface PerCnRow {
  cn: string;
  fillLeft: number;
  fillRight: number;
  detail: string;
}

function buildPerCnRows(left: number, right: number): PerCnRow[] {
  // Mock cho W20 v3 vs các phiên cũ — tỉ lệ % fill rate per CN
  const baseV3: Record<string, number> = { "CN-BD": 75, "CN-NA": 90, "CN-HCM": 95, "CN-ĐN": 88, "CN-HN": 92 };
  const baseV2: Record<string, number> = { "CN-BD": 80, "CN-NA": 95, "CN-HCM": 95, "CN-ĐN": 88, "CN-HN": 92 };
  const baseV1: Record<string, number> = { "CN-BD": 82, "CN-NA": 96, "CN-HCM": 90, "CN-ĐN": 85, "CN-HN": 90 };
  const detail: Record<string, string> = {
    "CN-BD": "Demand +432, tồn −200",
    "CN-NA": "Mới thiếu GA-300 120m²",
    "CN-HCM": "Tồn cao, ổn định",
    "CN-ĐN": "Thay đổi nhỏ",
    "CN-HN": "Không đổi",
  };
  const pick = (v: number) => (v === 3 ? baseV3 : v === 2 ? baseV2 : baseV1);
  const L = pick(left); const R = pick(right);
  return Object.keys(L).map((cn) => ({
    cn, fillLeft: L[cn], fillRight: R[cn], detail: detail[cn],
  })).filter((r) => r.fillLeft !== r.fillRight); // chỉ CN khác
}

function fmt(n: number | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("vi-VN");
}

function deltaFmt(left: number | undefined, right: number | undefined): string {
  if (left == null || right == null) return "—";
  const d = left - right;
  if (d === 0) return "0";
  return `${d > 0 ? "+" : ""}${d.toLocaleString("vi-VN")}`;
}

/* Quyết định màu CHÊNH LỆCH dựa trên bias */
function deltaColor(left: number | undefined, right: number | undefined, bias: DiffRow["bias"]): string {
  if (left == null || right == null) return "text-text-3";
  const d = left - right;
  if (d === 0) return "text-text-3";
  if (bias === "neutral") return "text-text-2";
  // bias=good: tăng = xanh; bias=bad: tăng = đỏ
  if (bias === "good") return d > 0 ? "text-success" : "text-danger";
  return d > 0 ? "text-danger" : "text-success";
}

function ArrowFor({ value }: { value: number }) {
  if (value > 0) return <ArrowUp className="h-3 w-3 inline" />;
  if (value < 0) return <ArrowDown className="h-3 w-3 inline" />;
  return <Minus className="h-3 w-3 inline" />;
}

export function VersionCompareInline({
  versions, leftVersion, rightVersion, onChangeRight, onClose, onSwitchTo,
}: Props) {
  const left = versions.find((v) => v.versionNumber === leftVersion);
  const right = versions.find((v) => v.versionNumber === rightVersion);

  /* Dropdown options — exclude current left */
  const rightOptions = useMemo(
    () => versions.filter((v) => v.versionNumber !== leftVersion).sort((a, b) => b.versionNumber - a.versionNumber),
    [versions, leftVersion]
  );

  const diffRows = useMemo<DiffRow[]>(() => {
    if (!left || !right) return [];
    return DRP_DIFF_FIELDS.map((f) => ({
      ...f,
      left: left.summary[f.key] ?? 0,
      right: right.summary[f.key] ?? 0,
    }));
  }, [left, right]);

  const perCnRows = useMemo(() => buildPerCnRows(leftVersion, rightVersion), [leftVersion, rightVersion]);

  if (!left || !right) {
    return (
      <div className="rounded-card border border-warning/30 bg-warning-bg/30 p-4 mb-4 text-table-sm text-warning">
        Không tìm thấy phiên bản để so sánh.
      </div>
    );
  }

  const netDelta = (left.summary.netReq ?? 0) - (right.summary.netReq ?? 0);
  const excDelta = (left.summary.exceptions ?? 0) - (right.summary.exceptions ?? 0);
  const poDelta = (left.summary.poDrafted ?? 0) - (right.summary.poDrafted ?? 0);
  const toDelta = (left.summary.toDrafted ?? 0) - (right.summary.toDrafted ?? 0);

  /* Detect root cause text */
  const rootCause = (() => {
    const reasons: string[] = [];
    if (perCnRows.length > 0) {
      const worst = perCnRows.reduce((a, b) =>
        Math.abs(a.fillLeft - a.fillRight) > Math.abs(b.fillLeft - b.fillRight) ? a : b);
      reasons.push(`${worst.cn} ${worst.detail}`);
    }
    const grossDelta = (left.summary.grossDemand ?? 0) - (right.summary.grossDemand ?? 0);
    if (grossDelta !== 0) {
      const pct = ((grossDelta / Math.max(1, right.summary.grossDemand ?? 1)) * 100).toFixed(1);
      reasons.push(`Demand ${grossDelta > 0 ? "tăng" : "giảm"} ${Math.abs(grossDelta).toLocaleString("vi-VN")} m² (${pct}%)`);
    }
    return reasons.join(" + ") || "Không phát hiện thay đổi đáng kể";
  })();

  return (
    <div className="rounded-card border-2 border-primary/30 bg-primary/5 mb-4 overflow-hidden animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-primary/10 border-b border-primary/20">
        <div className="flex items-center gap-2 text-table-sm flex-wrap">
          <span className="font-semibold text-text-1">So sánh:</span>
          <span className="font-mono font-bold text-primary">v{left.versionNumber}</span>
          <span className="text-text-3">({left.runAt})</span>
          <span className="text-text-3">vs</span>
          <Select value={String(rightVersion)} onValueChange={(s) => onChangeRight(Number(s))}>
            <SelectTrigger className="h-7 w-32 bg-surface-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rightOptions.map((v) => (
                <SelectItem key={v.versionNumber} value={String(v.versionNumber)}>
                  v{v.versionNumber} · {v.runAt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* 3 summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 pt-4">
        <SummaryCard
          label="NHU CẦU RÒNG"
          value={`${fmt(left.summary.netReq)} m²`}
          prev={`trước ${fmt(right.summary.netReq)} m²`}
          delta={netDelta}
          deltaText={`${netDelta > 0 ? "▲ +" : netDelta < 0 ? "▼ " : ""}${netDelta.toLocaleString("vi-VN")}`}
          bias="bad"
        />
        <SummaryCard
          label="NGOẠI LỆ"
          value={String(left.summary.exceptions ?? 0)}
          prev={`trước ${right.summary.exceptions ?? 0}`}
          delta={excDelta}
          deltaText={`${excDelta > 0 ? "▲ +" : excDelta < 0 ? "▼ " : ""}${excDelta}`}
          bias="bad"
        />
        <SummaryCard
          label="ĐƠN HÀNG"
          value={`${left.summary.poDrafted ?? 0} PO · ${left.summary.toDrafted ?? 0} TO`}
          prev={`trước ${right.summary.poDrafted ?? 0} PO · ${right.summary.toDrafted ?? 0} TO`}
          delta={poDelta + toDelta}
          deltaText={`${poDelta >= 0 ? "▲ +" : "▼ "}${poDelta} PO ${toDelta >= 0 ? "+" : ""}${toDelta} TO`}
          bias="neutral"
        />
      </div>

      {/* Diff table */}
      <div className="px-4 pt-4">
        <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-1.5">
          Chi tiết thay đổi
        </div>
        <div className="rounded-card border border-surface-3 bg-surface-0 overflow-x-auto">
          <table className="w-full text-table-sm">
            <thead className="bg-surface-1 border-b border-surface-3">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-text-2">Hạng mục</th>
                <th className="text-right px-3 py-2 font-medium text-text-2">v{left.versionNumber}</th>
                <th className="text-right px-3 py-2 font-medium text-text-2">v{right.versionNumber}</th>
                <th className="text-right px-3 py-2 font-medium text-text-2">Chênh lệch</th>
                <th className="text-left px-3 py-2 font-medium text-text-2">Lý do</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-3">
              {diffRows.map((r) => {
                const d = r.left - r.right;
                return (
                  <tr key={r.key} className={cn("hover:bg-surface-1", d !== 0 && "font-medium")}>
                    <td className="px-3 py-2 text-text-1">{r.label}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-text-1">{fmt(r.left)}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-text-2">{fmt(r.right)}</td>
                    <td className={cn("px-3 py-2 text-right font-mono tabular-nums", deltaColor(r.left, r.right, r.bias))}>
                      <ArrowFor value={d} /> {deltaFmt(r.left, r.right)}
                    </td>
                    <td className="px-3 py-2 text-text-3 text-caption">{d !== 0 ? r.reason : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-CN table */}
      {perCnRows.length > 0 && (
        <div className="px-4 pt-4">
          <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-1.5">
            Thay đổi per CN <span className="text-text-3 normal-case font-normal">(chỉ CN khác nhau)</span>
          </div>
          <div className="rounded-card border border-surface-3 bg-surface-0 overflow-x-auto">
            <table className="w-full text-table-sm">
              <thead className="bg-surface-1 border-b border-surface-3">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-text-2">CN</th>
                  <th className="text-right px-3 py-2 font-medium text-text-2">Fill v{left.versionNumber}</th>
                  <th className="text-right px-3 py-2 font-medium text-text-2">Fill v{right.versionNumber}</th>
                  <th className="text-right px-3 py-2 font-medium text-text-2">Δ</th>
                  <th className="text-left px-3 py-2 font-medium text-text-2">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-3">
                {perCnRows.map((r) => {
                  const d = r.fillLeft - r.fillRight;
                  const sev = Math.abs(d) >= 5 ? "danger" : "warning";
                  return (
                    <tr key={r.cn} className="hover:bg-surface-1">
                      <td className="px-3 py-2 font-medium text-text-1">{r.cn}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-text-1">{r.fillLeft}%</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-text-2">{r.fillRight}%</td>
                      <td className={cn(
                        "px-3 py-2 text-right font-mono tabular-nums font-semibold",
                        d < 0 ? "text-danger" : "text-success"
                      )}>
                        {d > 0 ? "+" : ""}{d}% {sev === "danger" ? "🔴" : "🟡"}
                      </td>
                      <td className="px-3 py-2 text-text-3 text-caption">{r.detail}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 mt-4 bg-surface-1 border-t border-surface-3 flex items-center justify-between flex-wrap gap-2">
        <div className="text-table-sm text-text-2">
          <span className="font-semibold text-text-1">Gốc rễ thay đổi:</span> {rootCause}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={onClose}>
            Giữ v{left.versionNumber} ✓
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1 bg-primary text-primary-foreground"
            onClick={() => onSwitchTo(right.versionNumber)}
          >
            Chuyển sang v{right.versionNumber} <ArrowRight className="h-3 w-3" />
          </Button>
          <Button
            size="sm" variant="ghost" className="h-8 gap-1"
            onClick={() => toast.success(`Đã xuất so sánh v${left.versionNumber} vs v${right.versionNumber}`, {
              description: "File CSV được tải về (giả lập).",
            })}
          >
            <Download className="h-3 w-3" /> Xuất so sánh
          </Button>
        </div>
      </div>
    </div>
  );
}

/* Sub: summary card 1 thẻ */
function SummaryCard({
  label, value, prev, delta, deltaText, bias,
}: {
  label: string; value: string; prev: string; delta: number; deltaText: string;
  bias: "good" | "bad" | "neutral";
}) {
  const color = delta === 0
    ? "text-text-3"
    : bias === "neutral"
    ? "text-text-2"
    : bias === "good"
    ? (delta > 0 ? "text-success" : "text-danger")
    : (delta > 0 ? "text-danger" : "text-success");
  return (
    <div className="rounded-card border border-surface-3 bg-surface-0 p-3">
      <div className="text-[10px] uppercase tracking-wide text-text-3 font-medium mb-1">{label}</div>
      <div className="font-mono font-bold text-section-header text-text-1 leading-tight">{value}</div>
      <div className="text-caption text-text-3 mt-1">{prev}</div>
      <div className={cn("text-table-sm font-semibold mt-1", color)}>{deltaText}</div>
    </div>
  );
}

export default VersionCompareInline;
