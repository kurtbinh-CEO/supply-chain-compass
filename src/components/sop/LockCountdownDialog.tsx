/**
 * LockCountdownDialog — 5-minute grace period before a hard S&OP lock.
 *
 * - Visual countdown MM:SS with progress bar
 * - "Hủy" cancels, "Khóa ngay" skips remaining time
 * - Warns when other editors are still in CellPresence
 */
import { useEffect, useState } from "react";
import { AlertTriangle, Clock, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface OtherEditor {
  name: string;
  role?: string;
}

interface Props {
  open: boolean;
  /** Initial seconds (default 300 = 5 minutes). */
  durationSec?: number;
  otherEditors: OtherEditor[];
  onCancel: () => void;
  /** Fires when the timer reaches 0 OR when user clicks "Khóa ngay". */
  onComplete: () => void;
}

export function LockCountdownDialog({
  open, durationSec = 300, otherEditors, onCancel, onComplete,
}: Props) {
  const [remaining, setRemaining] = useState(durationSec);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!open) {
      setRemaining(durationSec);
      setCompleted(false);
      return;
    }
    setRemaining(durationSec);
    setCompleted(false);
    const id = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(id);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [open, durationSec]);

  useEffect(() => {
    if (open && remaining === 0 && !completed) {
      setCompleted(true);
      onComplete();
    }
  }, [open, remaining, completed, onComplete]);

  if (!open) return null;

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const pct = (1 - remaining / durationSec) * 100;
  const hasOthers = otherEditors.length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div role="dialog" aria-modal="true"
        className="w-full max-w-md rounded-card border border-warning/40 bg-surface-0 shadow-xl">
        <div className="flex items-start justify-between gap-3 p-5 pb-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-warning-bg flex items-center justify-center text-warning shrink-0">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-h3 font-display font-semibold text-text-1">Sắp khóa S&OP</h3>
              <p className="text-table-sm text-text-2 mt-0.5">
                Hệ thống sẽ khóa sau <span className="font-semibold text-text-1">5 phút</span>. Editors có thể lưu lần cuối trong thời gian này.
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="text-text-3 hover:text-text-1 -mt-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Countdown */}
        <div className="px-5">
          <div className="flex items-baseline gap-2">
            <Clock className="h-5 w-5 text-warning shrink-0" />
            <span className="font-mono text-[2.25rem] font-bold tabular-nums text-text-1 leading-none">
              {mm}:{ss}
            </span>
            <span className="text-table-sm text-text-3 ml-auto">còn lại</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-1000 ease-linear",
                remaining > 60 ? "bg-warning" : "bg-danger",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Other editors warning */}
        {hasOthers && (
          <div className="mx-5 mt-4 rounded-lg border border-danger/40 bg-danger-bg/60 px-3 py-2.5 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
            <div className="text-table-sm text-danger">
              <p className="font-semibold">{otherEditors.length} người khác đang chỉnh sửa</p>
              <p className="text-text-2 mt-0.5">
                {otherEditors.slice(0, 3).map(e => e.name).join(", ")}
                {otherEditors.length > 3 ? ` +${otherEditors.length - 3}` : ""}
                {" — dữ liệu chưa lưu sẽ chuyển sang Drafts."}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 p-5 pt-4">
          <button
            onClick={onCancel}
            className="h-9 px-4 rounded-button border border-surface-3 bg-surface-0 text-text-1 hover:bg-surface-2 text-table-sm font-medium"
          >
            Hủy
          </button>
          <button
            onClick={() => { setCompleted(true); onComplete(); }}
            className="h-9 px-4 rounded-button bg-danger text-primary-foreground hover:opacity-90 text-table-sm font-semibold inline-flex items-center gap-1.5"
          >
            <Lock className="h-3.5 w-3.5" />Khóa ngay
          </button>
        </div>
      </div>
    </div>
  );
}
