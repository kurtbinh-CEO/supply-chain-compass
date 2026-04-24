/**
 * VersionHistoryButton — drop-in cặp [So sánh][Lịch sử] + VersionHistoryPanel
 * cho các planning screens (SOP / Hub / Demand FC).
 *
 * Một dòng wire vào header → tự quản state, mở panel, switch version qua callback.
 * Compare đơn giản: hiển thị toast + có thể wire onCompare ra ngoài.
 */
import { useMemo, useState } from "react";
import { ChevronDown, GitCompare, FileClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PLAN_VERSIONS, type PlanRunVersion } from "@/data/unis-enterprise-dataset";
import { VersionHistoryPanel } from "./VersionHistoryPanel";

type EntityType = "DRP" | "SOP" | "BOOKING" | "FC";

interface Props {
  entityType: EntityType;
  /** Mã thực thể chính (mặc định để filter & switch) */
  entityId: string;
  /** Optional: override version đang xem ở component cha — nếu undefined sẽ tự lấy ACTIVE/LOCKED mới nhất */
  currentVersion?: number;
  onSwitchVersion?: (versionNumber: number, entityId: string) => void;
  /** Optional: dùng PlanType khác hoặc all → "ALL" */
  filterPlanType?: PlanRunVersion["planType"] | "ALL";
}

export function VersionHistoryButton({
  entityType, entityId, currentVersion, onSwitchVersion, filterPlanType,
}: Props) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const versions = useMemo(() => {
    const pt = filterPlanType ?? entityType;
    if (pt === "ALL") return PLAN_VERSIONS;
    return PLAN_VERSIONS.filter((v) => v.planType === pt);
  }, [entityType, filterPlanType]);

  const sameEntity = versions.filter((v) => v.entityId === entityId);
  const activeVersion = useMemo(() => {
    const live = sameEntity.find((v) => v.status === "ACTIVE" || v.status === "LOCKED");
    return live?.versionNumber ?? sameEntity[0]?.versionNumber ?? 1;
  }, [sameEntity]);

  const viewing = currentVersion ?? activeVersion;

  return (
    <>
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            // Compare nhanh với phiên ngay trước
            const prev = sameEntity.find((v) => v.versionNumber === viewing - 1)
              ?? sameEntity.find((v) => v.versionNumber !== viewing);
            if (!prev) {
              toast.info("Chưa có phiên bản trước để so sánh.");
              return;
            }
            toast.info(`So sánh v${viewing} vs v${prev.versionNumber}`, {
              description: prev.inputSummary,
              action: { label: "Mở lịch sử", onClick: () => setHistoryOpen(true) },
            });
          }}
          className={cn(
            "inline-flex items-center gap-1 rounded-button border border-surface-3 bg-surface-2",
            "px-2.5 py-1 text-table-sm text-text-2 hover:text-text-1 hover:border-primary/30 transition-colors"
          )}
        >
          <GitCompare className="h-3 w-3" /> So sánh <ChevronDown className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className={cn(
            "inline-flex items-center gap-1 rounded-button border border-surface-3 bg-surface-2",
            "px-2.5 py-1 text-table-sm text-text-2 hover:text-text-1 hover:border-primary/30 transition-colors"
          )}
        >
          <FileClock className="h-3 w-3" /> Lịch sử <ChevronDown className="h-3 w-3" />
        </button>
      </div>

      <VersionHistoryPanel
        entityType={entityType}
        entityId={entityId}
        versions={versions}
        currentVersion={viewing}
        activeVersion={activeVersion}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSwitchVersion={(v, eid) => {
          setHistoryOpen(false);
          if (onSwitchVersion) {
            onSwitchVersion(v, eid);
          } else {
            toast.info(`Mở snapshot ${eid} v${v}`, {
              description: "Tính năng xem read-only sẽ wire vào màn cụ thể.",
            });
          }
        }}
        onCompare={(v1, v2, eid) => {
          setHistoryOpen(false);
          toast.info(`So sánh ${eid} v${v1} vs v${v2}`, {
            description: "Mở compare view chi tiết (đang tích hợp).",
          });
        }}
      />
    </>
  );
}

export default VersionHistoryButton;
