/**
 * VersionHistoryPanel — Sheet 420px slide từ phải, list lịch sử phiên bản.
 *
 * Đặc điểm:
 *   • Gom theo nhóm (Tuần / Tháng) — collapsed mặc định trừ nhóm hiện tại
 *   • Mỗi card hiển thị: số version, runAt, runBy, summary (3 KPI), inputSummary
 *   • Action: [Xem] (chuyển snapshot) / [So sánh với vX] / badge Đã khóa
 *   • Reusable cho DRP / SOP / BOOKING / FC
 *
 * Mọi text tiếng Việt — UX cho farmer.
 */
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Lock, Eye, GitCompare, Check, FileClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { PlanRunVersion } from "@/data/unis-enterprise-dataset";

type EntityType = "DRP" | "SOP" | "BOOKING" | "FC";

interface Props {
  entityType: EntityType;
  entityId: string;                              // "DRP-W20"
  versions: PlanRunVersion[];                    // tất cả version cùng entityType (đã filter trước)
  currentVersion: number;                        // version đang xem
  activeVersion: number;                         // version "thực tế" (mới nhất ACTIVE/LOCKED)
  open: boolean;
  onClose: () => void;
  onSwitchVersion: (versionNumber: number, entityId: string) => void;
  onCompare: (v1: number, v2: number, entityId: string) => void;
}

const ENTITY_LABELS: Record<EntityType, string> = {
  DRP: "DRP",
  SOP: "S&OP",
  BOOKING: "Cam kết NM",
  FC: "Demand FC",
};

/* Format hiển thị 1-2 KPI quan trọng từ summary, theo loại */
function formatSummary(planType: EntityType, s: Record<string, number>): string {
  if (planType === "DRP") {
    const parts: string[] = [];
    if (s.exceptions != null) parts.push(`${s.exceptions} ngoại lệ`);
    if (s.poDrafted != null) parts.push(`${s.poDrafted} PO`);
    if (s.toDrafted != null) parts.push(`${s.toDrafted} TO`);
    return parts.join(" · ");
  }
  if (planType === "SOP") {
    const parts: string[] = [];
    if (s.totalDemand != null) parts.push(`${s.totalDemand.toLocaleString("vi-VN")} m²`);
    if (s.vsAop != null) parts.push(`${s.vsAop > 0 ? "+" : ""}${s.vsAop}% vs AOP`);
    if (s.cnNeedExplain != null && s.cnNeedExplain > 0) parts.push(`${s.cnNeedExplain} CN giải trình`);
    return parts.join(" · ");
  }
  if (planType === "BOOKING") {
    const parts: string[] = [];
    if (s.confirmed != null) parts.push(`${s.confirmed} xác nhận`);
    if (s.pending != null) parts.push(`${s.pending} chờ`);
    if (s.gapM2 != null) parts.push(`Gap ${s.gapM2.toLocaleString("vi-VN")}m²`);
    return parts.join(" · ");
  }
  if (planType === "FC") {
    const parts: string[] = [];
    if (s.totalDemand != null) parts.push(`${s.totalDemand.toLocaleString("vi-VN")} m²`);
    if (s.b2bDeals != null) parts.push(`${s.b2bDeals} deal B2B`);
    return parts.join(" · ");
  }
  return "";
}

export function VersionHistoryPanel({
  entityType, entityId, versions, currentVersion, activeVersion,
  open, onClose, onSwitchVersion, onCompare,
}: Props) {
  // Group theo groupId
  const groups = useMemo(() => {
    const map = new Map<string, { groupId: string; groupLabel: string; entityId: string; items: PlanRunVersion[] }>();
    versions.forEach((v) => {
      const key = `${v.entityId}::${v.groupId}`;
      if (!map.has(key)) {
        map.set(key, { groupId: v.groupId, groupLabel: v.groupLabel, entityId: v.entityId, items: [] });
      }
      map.get(key)!.items.push(v);
    });
    // Sort items giảm dần version, group sắp current trước
    const list = Array.from(map.values()).map((g) => ({
      ...g,
      items: [...g.items].sort((a, b) => b.versionNumber - a.versionNumber),
    }));
    list.sort((a, b) => {
      if (a.entityId === entityId && b.entityId !== entityId) return -1;
      if (b.entityId === entityId && a.entityId !== entityId) return 1;
      return b.groupId.localeCompare(a.groupId);
    });
    return list;
  }, [versions, entityId]);

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const init = new Set<string>();
    // Auto-expand group có entityId hiện tại
    const cur = groups.find((g) => g.entityId === entityId);
    if (cur) init.add(`${cur.entityId}::${cur.groupId}`);
    return init;
  });

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px] p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-surface-3 shrink-0">
          <SheetTitle className="flex items-center gap-2 text-section-header">
            <FileClock className="h-4 w-4 text-primary" />
            Lịch sử phiên bản — {ENTITY_LABELS[entityType]} {entityId}
          </SheetTitle>
          <p className="text-caption text-text-3">
            Click <span className="font-medium text-text-2">Xem</span> để mở snapshot phiên cũ ·
            <span className="font-medium text-text-2"> So sánh</span> để diff với phiên đang xem
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {groups.map((g) => {
            const key = `${g.entityId}::${g.groupId}`;
            const isOpen = expanded.has(key);
            const isCurrentEntity = g.entityId === entityId;
            return (
              <div key={key} className="rounded-card border border-surface-3 bg-surface-0 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-table-sm font-medium transition-colors",
                    isCurrentEntity ? "bg-primary/5 text-text-1" : "bg-surface-1 text-text-2 hover:bg-surface-2"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    {g.groupLabel} · {g.entityId}
                    <span className="text-text-3 text-caption font-normal">({g.items.length} phiên)</span>
                  </span>
                  {isCurrentEntity && (
                    <span className="text-caption text-primary font-medium">đang xem</span>
                  )}
                </button>

                {isOpen && (
                  <div className="divide-y divide-surface-3">
                    {g.items.map((v) => {
                      const isViewing = isCurrentEntity && v.versionNumber === currentVersion;
                      const isLocked = v.status === "LOCKED";
                      const isActive = v.status === "ACTIVE";
                      const summaryStr = formatSummary(entityType, v.summary);
                      const canCompare = isCurrentEntity && v.versionNumber !== currentVersion;
                      return (
                        <div
                          key={v.versionId}
                          className={cn(
                            "px-3 py-3",
                            isViewing && "bg-primary/5"
                          )}
                        >
                          {/* Header row */}
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={cn(
                                  "h-2 w-2 rounded-full shrink-0",
                                  isViewing ? "bg-primary" : isActive ? "bg-success" : isLocked ? "bg-warning" : "bg-surface-3"
                                )}
                              />
                              <span className="font-mono font-bold text-table tabular-nums">v{v.versionNumber}</span>
                              <span className="text-caption text-text-3">·</span>
                              <span className="text-caption text-text-3 truncate">{v.runAt}</span>
                              <span className="text-caption text-text-3">·</span>
                              <span className="text-caption text-text-2 truncate">{v.runBy}</span>
                            </div>
                            {isViewing && (
                              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                                <Check className="h-2.5 w-2.5" /> Đang xem
                              </span>
                            )}
                            {!isViewing && isLocked && (
                              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-warning-bg text-warning border border-warning/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                                <Lock className="h-2.5 w-2.5" /> Đã khóa
                              </span>
                            )}
                            {!isViewing && isActive && (
                              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-success-bg text-success border border-success/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                                Active
                              </span>
                            )}
                            {!isViewing && !isLocked && !isActive && (
                              <span className="shrink-0 text-[10px] text-text-3 uppercase tracking-wide">
                                Đã lưu trữ
                              </span>
                            )}
                          </div>

                          {/* Summary KPI */}
                          {summaryStr && (
                            <p className="text-table-sm text-text-2 mb-1 ml-4 font-medium">
                              {summaryStr}
                            </p>
                          )}

                          {/* Input row — quan trọng */}
                          <p className="text-caption text-text-3 mb-2 ml-4 leading-relaxed">
                            <span className="font-medium text-text-3">Input:</span> {v.inputSummary}
                          </p>

                          {/* Lock info */}
                          {isLocked && v.lockedBy && (
                            <p className="text-caption text-warning ml-4 mb-2">
                              🔒 Khóa bởi {v.lockedBy} · {v.lockedAt}
                            </p>
                          )}

                          {/* Actions */}
                          {!isViewing && (
                            <div className="flex items-center gap-1.5 ml-4">
                              <Button
                                size="sm" variant="outline"
                                className="h-7 px-2 text-table-sm gap-1"
                                onClick={() => onSwitchVersion(v.versionNumber, v.entityId)}
                              >
                                <Eye className="h-3 w-3" /> Xem
                              </Button>
                              {canCompare && (
                                <Button
                                  size="sm" variant="outline"
                                  className="h-7 px-2 text-table-sm gap-1 text-primary border-primary/30 hover:bg-primary/5"
                                  onClick={() => onCompare(currentVersion, v.versionNumber, v.entityId)}
                                >
                                  <GitCompare className="h-3 w-3" /> So sánh với v{currentVersion}
                                </Button>
                              )}
                            </div>
                          )}
                          {isViewing && currentVersion !== activeVersion && (
                            <div className="flex items-center gap-1.5 ml-4">
                              <Button
                                size="sm" variant="ghost"
                                className="h-7 px-2 text-table-sm gap-1 text-info"
                                onClick={() => onSwitchVersion(activeVersion, entityId)}
                              >
                                Quay về v{activeVersion} (đang chạy)
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {groups.length === 0 && (
            <div className="text-center text-text-3 text-table-sm py-10">
              Chưa có lịch sử phiên bản cho {ENTITY_LABELS[entityType]}.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default VersionHistoryPanel;
