/**
 * PlanningPeriodContext — kỳ kế hoạch tháng đang được chọn trên các planning screens.
 *
 * Tất cả screen Demand / S&OP / Hub / Gap đều scope theo cycle này. DRP & Orders
 * KHÔNG dùng selector nhưng có thể đọc cycle hiện tại để hiển thị truy vết
 * "Kỳ KH: T5/2026".
 *
 * State machine (P1-ENFORCE):
 *   DRAFT  → ACTIVE : chỉ khi tháng trước đã LOCKED
 *   ACTIVE → LOCKED : chỉ khi ≥5/6 stepsCompleted + 0 critical exception
 *   LOCKED          : readonly, không sửa, không chạy lại
 */
import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from "react";
import {
  PLANNING_CYCLES,
  getActivePlanningCycle,
  type PlanningCycle,
  type PlanningStepKey,
} from "@/data/unis-enterprise-dataset";

interface PlanningPeriodContextValue {
  cycles: PlanningCycle[];
  current: PlanningCycle;
  setCycleId: (id: string) => void;
  isReadOnly: boolean; // true khi cycle.status === "LOCKED" | "ARCHIVED"

  /** Đánh dấu một bước hoàn tất cho cycle ACTIVE hiện tại. Idempotent. */
  markStepCompleted: (step: PlanningStepKey) => void;
  /** Có đủ điều kiện chuyển ACTIVE → LOCKED hay không (>=5/6 bước, 0 critical). */
  canLockCurrent: boolean;
  /** Lý do KHÔNG khoá được — null nếu canLockCurrent. */
  lockBlockedReason: string | null;
  /** Thực hiện ACTIVE → LOCKED. Trả false nếu không hợp lệ. */
  lockCurrent: (by: string) => boolean;
  /** Mở DRAFT kế tiếp thành ACTIVE (sau khi tháng hiện tại đã LOCKED). */
  promoteNextDraft: () => boolean;
}

const PlanningPeriodContext = createContext<PlanningPeriodContextValue | null>(null);

const REQUIRED_STEPS_TO_LOCK = 5; // ≥5/6 bước

function formatToday(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function PlanningPeriodProvider({ children }: { children: ReactNode }) {
  // Clone PLANNING_CYCLES để có thể mutate state cycle local mà không đụng tới dataset gốc.
  const [cycles, setCycles] = useState<PlanningCycle[]>(() =>
    PLANNING_CYCLES.map((c) => ({ ...c, stepsCompleted: [...c.stepsCompleted] })),
  );
  const [currentId, setCurrentId] = useState<string>(() => getActivePlanningCycle().id);

  const setCycleId = useCallback(
    (id: string) => {
      const found = cycles.find((c) => c.id === id);
      if (!found) return;
      if (found.status === "DRAFT") return; // tháng chưa mở — không cho switch
      setCurrentId(id);
    },
    [cycles],
  );

  const current = useMemo(
    () => cycles.find((c) => c.id === currentId) ?? cycles.find((c) => c.status === "ACTIVE") ?? cycles[0],
    [cycles, currentId],
  );

  const markStepCompleted = useCallback(
    (step: PlanningStepKey) => {
      setCycles((prev) =>
        prev.map((c) => {
          if (c.id !== currentId) return c;
          if (c.status !== "ACTIVE") return c;
          if (c.stepsCompleted.includes(step)) return c;
          return { ...c, stepsCompleted: [...c.stepsCompleted, step] };
        }),
      );
    },
    [currentId],
  );

  const { canLockCurrent, lockBlockedReason } = useMemo(() => {
    if (current.status !== "ACTIVE") {
      return {
        canLockCurrent: false,
        lockBlockedReason: current.status === "LOCKED" ? "Kỳ đã khoá" : "Kỳ chưa ACTIVE",
      };
    }
    const done = current.stepsCompleted.length;
    if (done < REQUIRED_STEPS_TO_LOCK) {
      return {
        canLockCurrent: false,
        lockBlockedReason: `Mới ${done}/6 bước hoàn tất — cần ≥${REQUIRED_STEPS_TO_LOCK}/6.`,
      };
    }
    if (current.totalExceptions > 0 && current.approvalStatus !== "approved") {
      return {
        canLockCurrent: false,
        lockBlockedReason: `Còn ${current.totalExceptions} ngoại lệ chưa duyệt.`,
      };
    }
    return { canLockCurrent: true, lockBlockedReason: null };
  }, [current]);

  const lockCurrent = useCallback(
    (by: string) => {
      if (!canLockCurrent) return false;
      setCycles((prev) =>
        prev.map((c) =>
          c.id === currentId
            ? { ...c, status: "LOCKED", lockedAt: formatToday(), lockedBy: by }
            : c,
        ),
      );
      return true;
    },
    [canLockCurrent, currentId],
  );

  const promoteNextDraft = useCallback(() => {
    let promoted = false;
    setCycles((prev) => {
      const lockedCurrent = prev.find((c) => c.id === currentId);
      if (!lockedCurrent || lockedCurrent.status !== "LOCKED") return prev;
      // Tìm DRAFT kế tiếp (year, month tăng dần)
      const next = [...prev]
        .filter((c) => c.status === "DRAFT")
        .sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month))[0];
      if (!next) return prev;
      promoted = true;
      return prev.map((c) =>
        c.id === next.id
          ? { ...c, status: "ACTIVE", version: 1, startedAt: formatToday() }
          : c,
      );
    });
    return promoted;
  }, [currentId]);

  const value = useMemo<PlanningPeriodContextValue>(
    () => ({
      cycles,
      current,
      setCycleId,
      isReadOnly: current.status === "LOCKED" || current.status === "ARCHIVED",
      markStepCompleted,
      canLockCurrent,
      lockBlockedReason,
      lockCurrent,
      promoteNextDraft,
    }),
    [cycles, current, setCycleId, markStepCompleted, canLockCurrent, lockBlockedReason, lockCurrent, promoteNextDraft],
  );

  return <PlanningPeriodContext.Provider value={value}>{children}</PlanningPeriodContext.Provider>;
}

export function usePlanningPeriod(): PlanningPeriodContextValue {
  const ctx = useContext(PlanningPeriodContext);
  if (!ctx) throw new Error("usePlanningPeriod must be used inside <PlanningPeriodProvider>");
  return ctx;
}
