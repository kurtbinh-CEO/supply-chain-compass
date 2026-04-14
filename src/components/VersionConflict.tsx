import { useState } from "react";
import { cn } from "@/lib/utils";

/* ═══ Types ═══ */
export interface ConflictChange {
  field: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
}

export interface ConflictInfo {
  entityType: string;
  entityId: string;
  changedBy: string;
  changedAt: string;
  yourVersion: number;
  currentVersion: number;
  changes: ConflictChange[];
}

/* ═══ Hook: useVersionConflict ═══ */
export function useVersionConflict() {
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);

  const triggerConflict = (info: ConflictInfo) => setConflict(info);
  const clearConflict = () => setConflict(null);

  return { conflict, triggerConflict, clearConflict };
}

/* ═══ Conflict Dialog ═══ */
interface Props {
  conflict: ConflictInfo;
  onReload: () => void;
  onForceUpdate: () => void;
  onClose: () => void;
}

export function VersionConflictDialog({ conflict, onReload, onForceUpdate, onClose }: Props) {
  return (
    <>
      <div className="fixed inset-0 bg-text-1/30 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] bg-surface-2 border border-surface-3 rounded-card shadow-xl z-50 p-6 space-y-4 animate-fade-in">
        <h3 className="font-display text-section-header text-text-1 flex items-center gap-2">
          <span className="text-warning">⚠</span> Dữ liệu đã thay đổi
        </h3>

        <p className="text-table text-text-2">
          <span className="font-medium text-text-1">{conflict.entityType} {conflict.entityId}</span> đã được sửa bởi{" "}
          <span className="font-medium text-text-1">{conflict.changedBy}</span> lúc {conflict.changedAt}.
        </p>

        {/* Changes diff */}
        <div className="rounded-lg border border-surface-3 bg-surface-1 p-3 space-y-1.5">
          <p className="text-caption text-text-3 font-medium uppercase">Thay đổi:</p>
          {conflict.changes.map((c, i) => (
            <div key={i} className="text-table-sm flex items-center gap-2">
              <span className="text-text-2">{c.field}:</span>
              <span className="text-danger line-through">{c.oldValue}</span>
              <span className="text-text-3">→</span>
              <span className="text-success font-medium">{c.newValue}</span>
              <span className="text-text-3 text-caption">(bởi {c.changedBy})</span>
            </div>
          ))}
        </div>

        <p className="text-table text-text-2">Bạn muốn:</p>

        <div className="space-y-2">
          <button onClick={() => { onReload(); onClose(); }}
            className="w-full rounded-button border border-surface-3 py-2.5 text-table text-text-2 hover:bg-surface-3 transition-colors text-left px-4">
            <span className="font-medium text-text-1">Tải lại dữ liệu mới</span>
            <span className="block text-caption text-text-3">Xem data mới rồi quyết định lại</span>
          </button>
          <button onClick={() => { onForceUpdate(); onClose(); }}
            className="w-full rounded-button border border-warning/30 bg-warning/10 py-2.5 text-table text-text-2 hover:bg-warning/20 transition-colors text-left px-4">
            <span className="font-medium text-warning">Ghi đè bằng data tôi</span>
            <span className="block text-caption text-text-3">⚠ audit logged</span>
          </button>
        </div>

        <p className="text-caption text-text-3">
          Phiên bản: bạn v{conflict.yourVersion}, hiện tại v{conflict.currentVersion}
        </p>
      </div>
    </>
  );
}
