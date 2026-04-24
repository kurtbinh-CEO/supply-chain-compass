/**
 * DrpProgress — Bước 2/3. Hiện 10 bước tính toán đang chạy.
 *
 * Mỗi step done → ✅ + con số kết quả (farmer thấy DRP "đang nghĩ gì").
 * Mock 5s cho demo. Cha component truyền step index hiện tại + canCancel.
 *
 * Mọi text tiếng Việt.
 */
import { Check, Loader2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProgressStep {
  id: number;
  label: string;
  /** Kết quả hiển thị khi done — vd "31.632 m²" hoặc "5 PO · 4 TO" */
  result?: string;
}

interface Props {
  steps: ProgressStep[];
  /** Index của step đang chạy (0-based). Tất cả < currentIdx coi là done. */
  currentIdx: number;
  elapsedSec: number;
  estimatedSec: number;
  canCancel: boolean;
  onCancel?: () => void;
}

function fmtSec(s: number) {
  const mm = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function DrpProgress({ steps, currentIdx, elapsedSec, estimatedSec, canCancel, onCancel }: Props) {
  const pct = Math.min(100, Math.round((currentIdx / steps.length) * 100));

  return (
    <div className="rounded-card border border-primary/30 bg-primary/5 p-5 space-y-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-h3 font-display font-semibold text-text-1">
            Bước 2/3 — Đang chạy DRP
          </div>
          <div className="text-table-sm text-text-3 mt-0.5">
            ⏱ {fmtSec(elapsedSec)} / ~{fmtSec(estimatedSec)}
          </div>
        </div>
        {canCancel && onCancel && (
          <button
            onClick={onCancel}
            className="rounded-button border border-surface-3 bg-surface-2 px-3 py-1.5 text-caption text-text-2 hover:text-danger"
          >
            Hủy
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div>
        <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
          <div
            className="h-full bg-gradient-primary transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-caption text-text-3 mt-1 tabular-nums text-right">
          {pct}%
        </div>
      </div>

      {/* Steps list */}
      <div className="space-y-1">
        {steps.map((s, i) => {
          const isDone = i < currentIdx;
          const isActive = i === currentIdx;
          const isPending = i > currentIdx;
          return (
            <div
              key={s.id}
              className={cn(
                "flex items-center gap-2.5 px-2 py-1.5 rounded text-table-sm",
                isActive && "bg-primary/10 border-l-2 border-l-primary"
              )}
            >
              <span className="shrink-0">
                {isDone && <Check className="h-3.5 w-3.5 text-success" />}
                {isActive && <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />}
                {isPending && <Circle className="h-3.5 w-3.5 text-text-3" />}
              </span>
              <span
                className={cn(
                  "flex-1",
                  isDone && "text-text-2",
                  isActive && "text-text-1 font-medium",
                  isPending && "text-text-3"
                )}
              >
                {s.label}{isActive ? "..." : ""}
              </span>
              {isDone && s.result && (
                <span className="text-text-2 tabular-nums text-caption">{s.result}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DrpProgress;
