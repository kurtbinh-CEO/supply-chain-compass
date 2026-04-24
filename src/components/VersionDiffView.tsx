/**
 * VersionDiffView — bảng so sánh side-by-side 2 phiên bản bất kỳ.
 * Dùng cho:
 *   • S&OP: v2 (CN nhập) vs v3 (SC đồng thuận)
 *   • Planning Period: Plan T5 vs Plan T6
 *   • DRP run: batch hôm qua vs batch hôm nay
 *
 * Tự highlight: ▲ tăng (xanh), ▼ giảm (đỏ), → không đổi (xám).
 * Threshold mặc định: ±5% là "đáng kể".
 */
import { useMemo, useState } from "react";
import { ArrowRight, ArrowDown, ArrowUp, Minus, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface DiffRow {
  /** ID ổn định của row (vd "CN-HCM|GA-300") */
  id: string;
  /** Cột nhãn — vd "CN-HCM × GA-300" */
  label: string;
  /** Nhóm secondary — vd "TP HCM" */
  group?: string;
  /** Giá trị bên trái (phiên A) */
  left: number;
  /** Giá trị bên phải (phiên B) */
  right: number;
  /** Đơn vị — vd "m²" */
  unit?: string;
}

interface Props {
  /** Tên phiên bản trái — vd "v2 — CN nhập" */
  leftLabel: string;
  /** Tên phiên bản phải — vd "v3 — SC đồng thuận" */
  rightLabel: string;
  /** Sub-text trái (created_at, owner) */
  leftSubtitle?: string;
  rightSubtitle?: string;
  /** Dữ liệu so sánh */
  rows: DiffRow[];
  /** Ngưỡng % để highlight (mặc định 5%) */
  threshold?: number;
  /** Có cho phép filter "chỉ thay đổi" không */
  showFilter?: boolean;
}

type FilterMode = "all" | "changed" | "increased" | "decreased";

export function VersionDiffView({
  leftLabel, rightLabel, leftSubtitle, rightSubtitle,
  rows, threshold = 5, showFilter = true,
}: Props) {
  const [filter, setFilter] = useState<FilterMode>("changed");

  const enriched = useMemo(() => {
    return rows.map((r) => {
      const delta = r.right - r.left;
      const deltaPct = r.left > 0 ? (delta / r.left) * 100 : 0;
      const absPct = Math.abs(deltaPct);
      const direction: "up" | "down" | "flat" =
        delta > 0 ? "up" : delta < 0 ? "down" : "flat";
      const significant = absPct > threshold;
      return { ...r, delta, deltaPct, direction, significant };
    });
  }, [rows, threshold]);

  const filtered = useMemo(() => {
    if (filter === "all") return enriched;
    if (filter === "changed") return enriched.filter(r => r.delta !== 0);
    if (filter === "increased") return enriched.filter(r => r.delta > 0);
    return enriched.filter(r => r.delta < 0);
  }, [enriched, filter]);

  const totals = useMemo(() => {
    const left = enriched.reduce((a, r) => a + r.left, 0);
    const right = enriched.reduce((a, r) => a + r.right, 0);
    const delta = right - left;
    const deltaPct = left > 0 ? (delta / left) * 100 : 0;
    const upCount = enriched.filter(r => r.delta > 0).length;
    const downCount = enriched.filter(r => r.delta < 0).length;
    const flatCount = enriched.filter(r => r.delta === 0).length;
    const significantCount = enriched.filter(r => r.significant).length;
    return { left, right, delta, deltaPct, upCount, downCount, flatCount, significantCount };
  }, [enriched]);

  return (
    <div className="space-y-4">
      {/* ═══ HEADER — 2 phiên bản side-by-side ═══ */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
        <div className="rounded-card border border-surface-3 bg-surface-1 p-4">
          <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-1">PHIÊN A</div>
          <div className="text-section-header font-display font-bold text-text-1">{leftLabel}</div>
          {leftSubtitle && <div className="text-caption text-text-3 mt-0.5">{leftSubtitle}</div>}
          <div className="mt-3 pt-3 border-t border-surface-3">
            <div className="text-caption text-text-3">Tổng</div>
            <div className="text-h3 font-display font-bold text-text-1 tabular-nums">
              {totals.left.toLocaleString("vi-VN")}
              {rows[0]?.unit && <span className="text-table-sm text-text-3 ml-1 font-sans font-normal">{rows[0].unit}</span>}
            </div>
          </div>
        </div>

        <ArrowRight className="h-6 w-6 text-text-3" />

        <div className={cn("rounded-card border p-4",
          totals.delta > 0 ? "border-success/40 bg-success-bg/30"
          : totals.delta < 0 ? "border-danger/40 bg-danger-bg/30"
          : "border-surface-3 bg-surface-1",
        )}>
          <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-1">PHIÊN B</div>
          <div className="text-section-header font-display font-bold text-text-1">{rightLabel}</div>
          {rightSubtitle && <div className="text-caption text-text-3 mt-0.5">{rightSubtitle}</div>}
          <div className="mt-3 pt-3 border-t border-surface-3">
            <div className="text-caption text-text-3 flex items-center gap-1.5">
              Tổng
              <DeltaChip delta={totals.delta} pct={totals.deltaPct} />
            </div>
            <div className="text-h3 font-display font-bold text-text-1 tabular-nums">
              {totals.right.toLocaleString("vi-VN")}
              {rows[0]?.unit && <span className="text-table-sm text-text-3 ml-1 font-sans font-normal">{rows[0].unit}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SUMMARY BAR ═══ */}
      <div className="flex flex-wrap items-center gap-2 text-table-sm">
        <span className="text-text-3">Thay đổi:</span>
        <Badge tone="success" icon={<ArrowUp className="h-3 w-3" />}>{totals.upCount} tăng</Badge>
        <Badge tone="danger" icon={<ArrowDown className="h-3 w-3" />}>{totals.downCount} giảm</Badge>
        <Badge tone="muted" icon={<Minus className="h-3 w-3" />}>{totals.flatCount} không đổi</Badge>
        <span className="text-text-3 ml-2">·</span>
        <span className="text-text-2">
          <span className="font-semibold text-warning">{totals.significantCount}</span> dòng vượt ngưỡng ±{threshold}%
        </span>
        {showFilter && (
          <div className="ml-auto flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-text-3" />
            <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>Tất cả</FilterPill>
            <FilterPill active={filter === "changed"} onClick={() => setFilter("changed")}>Có thay đổi</FilterPill>
            <FilterPill active={filter === "increased"} onClick={() => setFilter("increased")}>Tăng</FilterPill>
            <FilterPill active={filter === "decreased"} onClick={() => setFilter("decreased")}>Giảm</FilterPill>
          </div>
        )}
      </div>

      {/* ═══ DIFF TABLE ═══ */}
      <div className="rounded-card border border-surface-3 bg-surface-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-table-sm">
            <thead>
              <tr className="bg-surface-1 border-b border-surface-3">
                <th className="text-left px-3 py-2 text-table-header uppercase text-text-3 font-semibold">Đối tượng</th>
                <th className="text-right px-3 py-2 text-table-header uppercase text-text-3 font-semibold">{leftLabel}</th>
                <th className="text-center px-2 py-2 w-12"></th>
                <th className="text-right px-3 py-2 text-table-header uppercase text-text-3 font-semibold">{rightLabel}</th>
                <th className="text-right px-3 py-2 text-table-header uppercase text-text-3 font-semibold">Δ</th>
                <th className="text-right px-3 py-2 text-table-header uppercase text-text-3 font-semibold">Δ%</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-text-3">
                    Không có dòng nào khớp filter "{filter}"
                  </td>
                </tr>
              ) : filtered.map((r) => (
                <tr key={r.id}
                  className={cn(
                    "border-b border-surface-2 hover:bg-surface-1/50 transition-colors",
                    r.significant && r.direction === "up" && "bg-success-bg/20",
                    r.significant && r.direction === "down" && "bg-danger-bg/20",
                  )}
                >
                  <td className="px-3 py-2">
                    <div className="font-medium text-text-1">{r.label}</div>
                    {r.group && <div className="text-caption text-text-3">{r.group}</div>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-text-2">
                    {r.left.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <DirectionIcon direction={r.direction} significant={r.significant} />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-text-1">
                    {r.right.toLocaleString("vi-VN")}
                  </td>
                  <td className={cn("px-3 py-2 text-right tabular-nums font-mono",
                    r.delta > 0 ? "text-success" : r.delta < 0 ? "text-danger" : "text-text-3",
                  )}>
                    {r.delta > 0 ? "+" : ""}{r.delta.toLocaleString("vi-VN")}
                  </td>
                  <td className={cn("px-3 py-2 text-right tabular-nums font-mono font-semibold",
                    r.significant && r.direction === "up" ? "text-success"
                    : r.significant && r.direction === "down" ? "text-danger"
                    : "text-text-3",
                  )}>
                    {r.deltaPct > 0 ? "+" : ""}{r.deltaPct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-surface-1 border-t-2 border-surface-3 font-semibold">
                <tr>
                  <td className="px-3 py-2 text-text-1">TỔNG ({filtered.length} dòng)</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {filtered.reduce((a, r) => a + r.left, 0).toLocaleString("vi-VN")}
                  </td>
                  <td></td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {filtered.reduce((a, r) => a + r.right, 0).toLocaleString("vi-VN")}
                  </td>
                  <td className={cn("px-3 py-2 text-right tabular-nums font-mono",
                    totals.delta > 0 ? "text-success" : totals.delta < 0 ? "text-danger" : "text-text-3")}>
                    {totals.delta > 0 ? "+" : ""}{totals.delta.toLocaleString("vi-VN")}
                  </td>
                  <td className={cn("px-3 py-2 text-right tabular-nums font-mono",
                    totals.delta > 0 ? "text-success" : totals.delta < 0 ? "text-danger" : "text-text-3")}>
                    {totals.deltaPct > 0 ? "+" : ""}{totals.deltaPct.toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────── */

function DirectionIcon({ direction, significant }: { direction: "up" | "down" | "flat"; significant: boolean }) {
  if (direction === "up") return <ArrowUp className={cn("h-3.5 w-3.5 inline", significant ? "text-success" : "text-success/50")} />;
  if (direction === "down") return <ArrowDown className={cn("h-3.5 w-3.5 inline", significant ? "text-danger" : "text-danger/50")} />;
  return <Minus className="h-3.5 w-3.5 inline text-text-3" />;
}

function DeltaChip({ delta, pct }: { delta: number; pct: number }) {
  if (delta === 0) return <span className="text-caption text-text-3">không đổi</span>;
  const tone = delta > 0 ? "text-success" : "text-danger";
  return (
    <span className={cn("text-caption font-mono font-semibold", tone)}>
      {delta > 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function Badge({ tone, icon, children }: { tone: "success" | "danger" | "muted"; icon: React.ReactNode; children: React.ReactNode }) {
  const cls =
    tone === "success" ? "bg-success-bg text-success border-success/30"
    : tone === "danger" ? "bg-danger-bg text-danger border-danger/30"
    : "bg-surface-2 text-text-3 border-surface-3";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-caption font-medium", cls)}>
      {icon} {children}
    </span>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={cn("rounded-full px-2.5 py-1 text-caption font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "bg-surface-2 text-text-2 hover:bg-surface-3")}>
      {children}
    </button>
  );
}
