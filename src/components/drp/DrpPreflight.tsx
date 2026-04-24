/**
 * DrpPreflight — Bước 1/3. Kiểm tra dữ liệu trước khi chạy DRP.
 *
 * Rules (PRD D1):
 *   ✅ Sẵn sàng | ⚠️ Cảnh báo (vẫn chạy được) | 🔴 Chặn (disable nút Chạy)
 *
 * Mọi text tiếng Việt.
 */
import { CheckCircle2, AlertTriangle, AlertOctagon, ArrowRight, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export type PreflightLevel = "ok" | "warn" | "block";

export interface PreflightItem {
  key: string;
  label: string;
  result: string;
  level: PreflightLevel;
  /** Optional link nếu user cần xử lý */
  fixHref?: string;
  fixLabel?: string;
  /** Tooltip / chi tiết thêm */
  detail?: string;
}

interface Props {
  items: PreflightItem[];
  onRun: () => void;
  onBack?: () => void;
  /** Nếu auto run preflight chạy tự động — hiện banner */
  autoRunFailed?: { reason: string; fixHref?: string };
}

function levelIcon(l: PreflightLevel) {
  if (l === "ok") return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (l === "warn") return <AlertTriangle className="h-4 w-4 text-warning" />;
  return <AlertOctagon className="h-4 w-4 text-danger" />;
}

function levelLabel(l: PreflightLevel) {
  if (l === "ok") return "Sẵn sàng";
  if (l === "warn") return "Cảnh báo";
  return "Chặn — cần xử lý";
}

export function DrpPreflight({ items, onRun, onBack, autoRunFailed }: Props) {
  const blocking = items.filter((i) => i.level === "block");
  const warnings = items.filter((i) => i.level === "warn");
  const okCount = items.filter((i) => i.level === "ok").length;

  const canRun = blocking.length === 0;

  const summaryText = blocking.length > 0
    ? `Không thể chạy: ${blocking.length} mục bị chặn`
    : warnings.length > 0
    ? `Chạy với ${warnings.length} cảnh báo. Kết quả có thể thiếu chính xác.`
    : "Tất cả sẵn sàng ✅. Có thể chạy DRP.";

  return (
    <div className="rounded-card border border-surface-3 bg-surface-1 p-5 space-y-4">
      {/* Auto-run failed banner */}
      {autoRunFailed && (
        <div className="rounded-card border border-danger/40 bg-danger-bg/40 p-3 flex items-start gap-2.5">
          <AlertOctagon className="h-5 w-5 text-danger shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-table font-semibold text-danger">
              ⚠️ DRP đêm qua KHÔNG chạy được
            </div>
            <div className="text-table-sm text-text-2 mt-0.5">{autoRunFailed.reason}</div>
            {autoRunFailed.fixHref && (
              <a
                href={autoRunFailed.fixHref}
                className="text-table-sm font-medium text-danger inline-flex items-center gap-1 mt-1 hover:underline"
              >
                Xử lý <ArrowRight className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="text-h3 font-display font-semibold text-text-1">
          Bước 1/3 — Kiểm tra dữ liệu trước khi chạy
        </div>
        <div className="text-table-sm text-text-3 mt-0.5">
          Đảm bảo nguồn dữ liệu đầu vào đầy đủ và mới nhất.
        </div>
      </div>

      {/* Table */}
      <div className="rounded border border-surface-3 bg-surface-0 overflow-hidden">
        <table className="w-full text-table-sm">
          <thead className="bg-surface-1 border-b border-surface-3">
            <tr className="text-text-3 text-caption uppercase">
              <th className="text-left px-3 py-2 font-semibold">Kiểm tra</th>
              <th className="text-left px-3 py-2 font-semibold">Kết quả</th>
              <th className="text-right px-3 py-2 font-semibold">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr
                key={it.key}
                className={cn(
                  "border-t border-surface-3/60",
                  it.level === "block" && "bg-danger-bg/20",
                  it.level === "warn" && "bg-warning-bg/15"
                )}
              >
                <td className="px-3 py-2 font-medium text-text-1">{it.label}</td>
                <td className="px-3 py-2 text-text-2">
                  {it.result}
                  {it.detail && (
                    <div className="text-caption text-text-3 mt-0.5">{it.detail}</div>
                  )}
                  {it.fixHref && it.level !== "ok" && (
                    <a
                      href={it.fixHref}
                      className={cn(
                        "inline-flex items-center gap-1 mt-1 text-caption font-medium hover:underline",
                        it.level === "block" ? "text-danger" : "text-warning"
                      )}
                    >
                      {it.fixLabel ?? "Xử lý"} <ArrowRight className="h-3 w-3" />
                    </a>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <span className="inline-flex items-center gap-1.5">
                    {levelIcon(it.level)}
                    <span className={cn(
                      "text-caption font-medium",
                      it.level === "ok" && "text-success",
                      it.level === "warn" && "text-warning",
                      it.level === "block" && "text-danger"
                    )}>
                      {levelLabel(it.level)}
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-surface-3 bg-surface-1/60">
            <tr>
              <td colSpan={3} className="px-3 py-2 text-table-sm">
                <span className="font-semibold text-text-1">Kết quả:</span>{" "}
                <span className="text-text-2">
                  {okCount}/{items.length} sẵn sàng
                  {warnings.length > 0 && ` · ${warnings.length} cảnh báo`}
                  {blocking.length > 0 && ` · ${blocking.length} bị chặn`}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Summary + actions */}
      <div className={cn(
        "rounded border p-3 text-table-sm",
        blocking.length > 0 && "border-danger/40 bg-danger-bg/30 text-danger",
        blocking.length === 0 && warnings.length > 0 && "border-warning/40 bg-warning-bg/30 text-warning",
        blocking.length === 0 && warnings.length === 0 && "border-success/40 bg-success-bg/30 text-success"
      )}>
        {summaryText}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {onBack && (
          <button
            onClick={onBack}
            className="rounded-button border border-surface-3 bg-surface-2 px-3.5 py-2 text-table-sm text-text-2 hover:text-text-1"
          >
            ← Quay lại hoàn tất dữ liệu
          </button>
        )}
        <button
          onClick={onRun}
          disabled={!canRun}
          title={!canRun ? "Cần xử lý mục bị chặn trước khi chạy" : ""}
          className={cn(
            "inline-flex items-center gap-2 rounded-button px-5 py-2 text-table font-semibold shadow-sm transition-all",
            canRun && warnings.length === 0 && "bg-success text-primary-foreground hover:opacity-90",
            canRun && warnings.length > 0 && "bg-warning text-primary-foreground hover:opacity-90",
            !canRun && "bg-surface-3 text-text-3 cursor-not-allowed"
          )}
        >
          <Play className="h-4 w-4" /> Chạy DRP ngay
        </button>
      </div>
    </div>
  );
}

export default DrpPreflight;
