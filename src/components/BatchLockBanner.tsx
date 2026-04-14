import { useState } from "react";
import { cn } from "@/lib/utils";

/* ═══ Types ═══ */
export type BatchStatus = "running" | "completed" | "failed" | "info";

export interface QueuedAction {
  id: string;
  description: string;
  queuedAt: string;
  queuedBy: string;
  superseded?: boolean;
}

export interface BatchInfo {
  batchType: string;
  status: BatchStatus;
  progress?: number;
  currentStep?: string;
  startedAt: string;
  estimatedEnd?: string;
  resultSummary?: string;
  failReason?: string;
  queuedActions?: QueuedAction[];
}

/* ═══ Hook: useBatchLock ═══ */
export function useBatchLock(initialBatch?: BatchInfo | null) {
  const [batch, setBatch] = useState<BatchInfo | null>(initialBatch || null);
  const [dismissed, setDismissed] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  const dismiss = () => setDismissed(true);
  const show = () => setDismissed(false);

  return { batch, setBatch, dismissed, dismiss, show, showQueue, setShowQueue };
}

/* ═══ Banner ═══ */
interface Props {
  batch: BatchInfo;
  dismissed: boolean;
  onDismiss: () => void;
  showQueue: boolean;
  onToggleQueue: () => void;
  onProcessQueue?: (id: string) => void;
  onCancelQueue?: (id: string) => void;
  onRetry?: () => void;
  onViewResults?: () => void;
}

export function BatchLockBanner({ batch, dismissed, onDismiss, showQueue, onToggleQueue, onProcessQueue, onCancelQueue, onRetry, onViewResults }: Props) {
  if (dismissed && batch.status !== "failed") {
    return (
      <div className="fixed top-2 right-2 z-40">
        <button onClick={() => {}} title={`${batch.batchType} ${batch.status}`}
          className={cn("h-3 w-3 rounded-full animate-pulse", batch.status === "running" ? "bg-warning" : batch.status === "completed" ? "bg-success" : "bg-danger")} />
      </div>
    );
  }

  const queueCount = batch.queuedActions?.length || 0;

  const bgCls = {
    running: "bg-warning/10 border-warning/30",
    completed: "bg-success/10 border-success/30",
    failed: "bg-danger/10 border-danger/30",
    info: "bg-info/10 border-info/30",
  }[batch.status];

  return (
    <div className="w-full">
      <div className={cn("w-full border rounded-lg px-4 py-2.5 flex items-center gap-3 text-table-sm animate-fade-in", bgCls)}>
        {/* Icon */}
        <span className="text-base shrink-0">
          {batch.status === "running" ? "🔄" : batch.status === "completed" ? "✅" : batch.status === "failed" ? "❌" : "ℹ️"}
        </span>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {batch.status === "running" && (
            <div className="flex items-center gap-3">
              <span className="text-text-1 font-medium">
                {batch.batchType} đang chạy{batch.currentStep ? ` (${batch.currentStep})` : ""}
              </span>
              <span className="text-text-3">· Bắt đầu {batch.startedAt}</span>
              {batch.estimatedEnd && <span className="text-text-3">· ~{batch.estimatedEnd} còn lại</span>}
              {batch.progress != null && (
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                    <div className="h-full bg-warning rounded-full transition-all" style={{ width: `${batch.progress}%` }} />
                  </div>
                  <span className="text-text-2 tabular-nums">{batch.progress}%</span>
                </div>
              )}
            </div>
          )}

          {batch.status === "completed" && (
            <span className="text-text-1">
              {batch.batchType} hoàn tất {batch.startedAt}. {batch.resultSummary}
              {queueCount > 0 && ` Bạn có ${queueCount} queued actions.`}
            </span>
          )}

          {batch.status === "failed" && (
            <span className="text-danger">
              {batch.batchType} failed lúc {batch.startedAt}{batch.failReason ? ` (${batch.failReason})` : ""}. Lock đã release.
            </span>
          )}

          {batch.status === "info" && (
            <span className="text-text-2">{batch.resultSummary}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {batch.status === "running" && queueCount > 0 && (
            <button onClick={onToggleQueue} className="text-warning hover:underline text-caption font-medium">
              Xem queue ({queueCount})
            </button>
          )}
          {batch.status === "completed" && onViewResults && (
            <button onClick={onViewResults} className="text-success hover:underline text-caption font-medium">Xem kết quả</button>
          )}
          {batch.status === "completed" && queueCount > 0 && (
            <button onClick={onToggleQueue} className="text-primary hover:underline text-caption font-medium">Xử lý queue</button>
          )}
          {batch.status === "failed" && onRetry && (
            <button onClick={onRetry} className="text-danger hover:underline text-caption font-medium">Chạy lại</button>
          )}
          {batch.status !== "failed" && (
            <button onClick={onDismiss} className="text-text-3 hover:text-text-1 text-caption">✕</button>
          )}
        </div>
      </div>

      {/* Queue panel */}
      {showQueue && batch.queuedActions && batch.queuedActions.length > 0 && (
        <div className="mt-2 rounded-lg border border-surface-3 bg-surface-1 p-4 space-y-3 animate-fade-in">
          <p className="text-caption text-text-3 font-medium uppercase">Actions đang chờ {batch.batchType} xong:</p>
          {batch.queuedActions.map((a, i) => (
            <div key={a.id} className={cn("flex items-center justify-between text-table-sm", a.superseded && "opacity-50")}>
              <div className="flex-1">
                <span className="text-text-2 mr-1">{i + 1}.</span>
                <span className={cn("text-text-1", a.superseded && "line-through")}>{a.description}</span>
                {a.superseded && <span className="ml-2 text-caption text-warning font-medium">SUPERSEDED</span>}
                <span className="text-text-3 text-caption ml-2">(queued {a.queuedAt} by {a.queuedBy})</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onProcessQueue?.(a.id)}
                  className="text-primary hover:underline text-caption font-medium">Xử lý</button>
                <button onClick={() => onCancelQueue?.(a.id)}
                  className="text-danger hover:underline text-caption font-medium">Hủy</button>
              </div>
            </div>
          ))}
          <p className="text-caption text-text-3 italic">
            Sau {batch.batchType} xong: review queue. Kết quả có thể đã cover actions này.
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══ Pre-Lock Check Dialog (S&OP specific) ═══ */
interface ActiveEditor { name: string; cell: string; duration: string }

export function PreLockDialog({ editors, onNotifyWait, onForceLock, onClose }: {
  editors: ActiveEditor[];
  onNotifyWait: () => void;
  onForceLock: () => void;
  onClose: () => void;
}) {
  const [countdown, setCountdown] = useState<number | null>(null);

  return (
    <>
      <div className="fixed inset-0 bg-text-1/30 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] bg-surface-2 border border-surface-3 rounded-card shadow-xl z-50 p-6 space-y-4 animate-fade-in">
        <h3 className="font-display text-section-header text-text-1 flex items-center gap-2">
          <span className="text-warning">⚠</span> {editors.length} người đang edit S&OP
        </h3>

        <div className="space-y-2">
          {editors.map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-table-sm text-text-2">
              <span className="h-5 w-5 rounded-full bg-info text-white text-[9px] flex items-center justify-center font-bold">{e.name.charAt(0)}</span>
              <span className="font-medium text-text-1">{e.name}</span> — cell {e.cell} ({e.duration} active)
            </div>
          ))}
        </div>

        {countdown !== null && (
          <div className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-table-sm text-danger">
            ⏰ S&OP lock trong {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}. Editors sẽ nhận thông báo.
          </div>
        )}

        <div className="space-y-2">
          <button onClick={() => { setCountdown(300); onNotifyWait(); }}
            className="w-full rounded-button border border-surface-3 py-2.5 text-table text-text-2 hover:bg-surface-3 transition-colors text-left px-4">
            <span className="font-medium text-text-1">Gửi thông báo + chờ 5 phút</span>
            <span className="block text-caption text-text-3">Push: "SC Manager sắp lock S&OP. Lưu thay đổi trong 5 phút."</span>
          </button>
          <button onClick={() => { onForceLock(); onClose(); }}
            className="w-full rounded-button border border-danger/30 bg-danger/10 py-2.5 text-table text-left px-4 hover:bg-danger/20 transition-colors">
            <span className="font-medium text-danger">Force lock ngay</span>
            <span className="block text-caption text-text-3">Unsaved data → draft + conflict_log</span>
          </button>
        </div>
      </div>
    </>
  );
}

/* ═══ CN Ownership Banner ═══ */
export function CnOwnershipBanner({ cn, editorName, isAvailable }: { cn: string; editorName?: string; isAvailable: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 text-table-sm px-3 py-1.5 rounded-lg", 
      isAvailable ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
      <span className="font-medium">{cn}</span>
      {isAvailable ? (
        <span>— 🟢 Available</span>
      ) : (
        <span>— 🔒 Đang edit bởi {editorName}</span>
      )}
    </div>
  );
}
