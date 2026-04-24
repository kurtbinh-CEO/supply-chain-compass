/**
 * PlanningPeriodContext — kỳ kế hoạch tháng đang được chọn trên các planning screens.
 *
 * Tất cả screen Demand / S&OP / Hub / Gap đều scope theo cycle này. DRP & Orders
 * KHÔNG dùng selector nhưng có thể đọc cycle hiện tại để hiển thị truy vết
 * "Kỳ KH: T5/2026".
 */
import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from "react";
import {
  PLANNING_CYCLES,
  getActivePlanningCycle,
  type PlanningCycle,
} from "@/data/unis-enterprise-dataset";

interface PlanningPeriodContextValue {
  cycles: PlanningCycle[];
  current: PlanningCycle;
  setCycleId: (id: string) => void;
  isReadOnly: boolean;          // true khi cycle.status === "LOCKED" | "ARCHIVED"
}

const PlanningPeriodContext = createContext<PlanningPeriodContextValue | null>(null);

export function PlanningPeriodProvider({ children }: { children: ReactNode }) {
  const [currentId, setCurrentId] = useState<string>(() => getActivePlanningCycle().id);

  const setCycleId = useCallback((id: string) => {
    const found = PLANNING_CYCLES.find((c) => c.id === id);
    if (!found) return;
    if (found.status === "DRAFT") return; // tháng chưa mở — không cho switch
    setCurrentId(id);
  }, []);

  const value = useMemo<PlanningPeriodContextValue>(() => {
    const current = PLANNING_CYCLES.find((c) => c.id === currentId) ?? getActivePlanningCycle();
    return {
      cycles: PLANNING_CYCLES,
      current,
      setCycleId,
      isReadOnly: current.status === "LOCKED" || current.status === "ARCHIVED",
    };
  }, [currentId, setCycleId]);

  return <PlanningPeriodContext.Provider value={value}>{children}</PlanningPeriodContext.Provider>;
}

export function usePlanningPeriod(): PlanningPeriodContextValue {
  const ctx = useContext(PlanningPeriodContext);
  if (!ctx) throw new Error("usePlanningPeriod must be used inside <PlanningPeriodProvider>");
  return ctx;
}
