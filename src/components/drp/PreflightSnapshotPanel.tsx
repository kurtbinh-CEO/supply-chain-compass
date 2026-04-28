/**
 * PreflightSnapshotPanel — lịch sử "ảnh chụp" preflight DRP.
 *
 * Mỗi lần user mở /drp/preflight-audit, hệ thống tự lưu 1 snapshot vào
 * Supabase (drp_preflight_snapshots). Panel này liệt kê 20 snapshot gần
 * nhất theo tenant, cho phép expand để xem chi tiết từng điều kiện
 * thời điểm đó (vì sao block / warn / ok).
 *
 * Mọi text tiếng Việt.
 */
import { useState } from "react";
import {
  History, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle,
  AlertOctagon, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreflightAuditRow } from "@/lib/drp-preflight";
import type { PreflightLevel } from "@/components/drp/DrpPreflight";

export interface SnapshotRow {
  id: string;
  created_at: string;
  cycle_label: string | null;
  cycle_version: number | null;
  cycle_status: string | null;
  can_run: boolean;
  ok_count: number;
  warn_count: number;
  block_count: number;
  total_count: number;
  block_reasons: string[];
  rows: PreflightAuditRow[];
  source: string;
}

interface Props {
  snapshots: SnapshotRow[];
  loading: boolean;
  currentSummary: {
    canRun: boolean;
    ok: number;
    warn: number;
    block: number;
    total: number;
  };
  onRefresh: () => void;
}

function levelDot(l: PreflightLevel) {
  if (l === "ok") return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
  if (l === "warn") return <AlertTriangle className="h-3.5 w-3.5 text-warning" />;
  return <AlertOctagon className="h-3.5 w-3.5 text-danger" />;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function diffWithCurrent(
  snap: SnapshotRow,
  cur: Props["currentSummary"],
): string | null {
  const dOk = cur.ok - snap.ok_count;
  const dWarn = cur.warn - snap.warn_count;
  const dBlock = cur.block - snap.block_count;
  if (dOk === 0 && dWarn === 0 && dBlock === 0) return null;
  const parts: string[] = [];
  if (dOk !== 0) parts.push(`${dOk > 0 ? "+" : ""}${dOk} ✅`);
  if (dWarn !== 0) parts.push(`${dWarn > 0 ? "+" : ""}${dWarn} ⚠️`);
  if (dBlock !== 0) parts.push(`${dBlock > 0 ? "+" : ""}${dBlock} 🔴`);
  return parts.join(" · ");
}

export function PreflightSnapshotPanel({
  snapshots, loading, currentSummary, onRefresh,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="rounded-card border border-surface-3 bg-surface-1">
      <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-surface-3">
        <div className="flex items-center gap-2 min-w-0">
          <History className="h-4 w-4 text-text-3 shrink-0" />
          <h2 className="text-table font-semibold text-text-1 truncate">
            Lịch sử ảnh chụp Preflight
          </h2>
          <span className="text-caption text-text-3 shrink-0">
            ({snapshots.length} bản ghi gần nhất)
          </span>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex h-7 items-center gap-1 rounded-button border border-surface-3 bg-surface-0 px-2 text-caption font-medium text-text-2 hover:bg-surface-2 hover:text-text-1 disabled:opacity-50"
          title="Tải lại từ database"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Tải lại
        </button>
      </header>

      {loading && snapshots.length === 0 ? (
        <div className="px-4 py-6 text-center text-table-sm text-text-3">
          Đang tải lịch sử…
        </div>
      ) : snapshots.length === 0 ? (
        <div className="px-4 py-8 text-center text-table-sm text-text-3">
          Chưa có ảnh chụp nào. Mở trang này lần nữa để tạo bản ghi đầu tiên.
        </div>
      ) : (
        <ul className="divide-y divide-surface-3">
          {snapshots.map((snap) => {
            const isOpen = openId === snap.id;
            const diff = diffWithCurrent(snap, currentSummary);
            return (
              <li key={snap.id}>
                <button
                  onClick={() => setOpenId(isOpen ? null : snap.id)}
                  className="w-full text-left px-4 py-2.5 hover:bg-surface-2 flex items-center gap-3"
                >
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 text-text-3 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-text-3 shrink-0" />
                  )}

                  <span className="font-mono text-caption text-text-3 shrink-0 w-[140px]">
                    {formatTime(snap.created_at)}
                  </span>

                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-caption font-semibold shrink-0",
                      snap.can_run
                        ? "bg-success-bg text-success border-success/30"
                        : "bg-danger-bg text-danger border-danger/40",
                    )}
                  >
                    {snap.can_run ? "Chạy được" : "Bị chặn"}
                  </span>

                  <span className="text-caption text-text-2 shrink-0">
                    {snap.ok_count}✅ · {snap.warn_count}⚠️ · {snap.block_count}🔴
                  </span>

                  {snap.cycle_label && (
                    <span className="text-caption text-text-3 shrink-0 hidden md:inline">
                      Kỳ {snap.cycle_label}
                      {snap.cycle_version != null && ` · v${snap.cycle_version}`}
                    </span>
                  )}

                  <span className="flex-1 min-w-0 text-caption text-text-2 truncate">
                    {snap.block_reasons.length > 0
                      ? snap.block_reasons[0] +
                        (snap.block_reasons.length > 1
                          ? ` · +${snap.block_reasons.length - 1} mục khác`
                          : "")
                      : "Tất cả điều kiện đạt"}
                  </span>

                  {diff && (
                    <span
                      className="text-caption text-text-3 shrink-0 hidden lg:inline"
                      title="So với hiện tại"
                    >
                      Δ {diff}
                    </span>
                  )}
                </button>

                {isOpen && (
                  <div className="px-4 pb-3 pt-1 bg-surface-0 border-t border-surface-3">
                    {snap.rows.length === 0 ? (
                      <div className="text-caption text-text-3 py-2">
                        Snapshot không có chi tiết điều kiện.
                      </div>
                    ) : (
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 mt-2">
                        {snap.rows.map((r) => (
                          <li
                            key={r.key}
                            className="flex items-start gap-2 text-table-sm"
                          >
                            <span className="mt-0.5 shrink-0">
                              {levelDot(r.level)}
                            </span>
                            <div className="min-w-0">
                              <div className="text-text-1 font-medium truncate">
                                {r.label}
                              </div>
                              <div className="text-caption text-text-2 truncate">
                                {r.result}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
