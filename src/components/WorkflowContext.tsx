import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useActivityLog } from "@/components/ActivityLogContext";

export type WorkflowType = "daily" | "monthly" | null;

export interface WorkflowStep {
  label: string;
  routes: string[];
  status: "done" | "active" | "future" | "locked";
  description: string;
  completedAt?: number; // timestamp
}

/* M1 — Daily 4 bước (gộp Đồng bộ → Tồn kho; bỏ Phân bổ/Đóng hàng/Phản hồi) */
const dailySteps: Omit<WorkflowStep, "status" | "completedAt">[] = [
  { label: "Kiểm tra data",  routes: ["/inventory", "/supply"], description: "Tồn NM + CN tươi (< 24h)" },
  { label: "CN điều chỉnh",  routes: ["/demand-weekly"],        description: "SC Manager duyệt ±30%" },
  { label: "Xem DRP",        routes: ["/drp"],                  description: "0 exception còn pending" },
  { label: "Duyệt PO",       routes: ["/orders"],               description: "0 PO chờ duyệt" },
];

/* M1 — Monthly 6 bước */
const monthlySteps: Omit<WorkflowStep, "status" | "completedAt">[] = [
  { label: "Nhập nhu cầu",   routes: ["/demand"],       description: "FC 2 cấp + B2B" },
  { label: "Đồng thuận S&OP", routes: ["/sop"],          description: "Lock demand tháng" },
  { label: "Cam kết NM",     routes: ["/hub"],          description: "Hard / Firm / Soft" },
  { label: "Hub ảo",         routes: ["/hub"],          description: "Available formula" },
  { label: "Gap",            routes: ["/gap-scenario"], description: "Khoảng cách cung/cầu" },
  { label: "Kịch bản",       routes: ["/gap-scenario"], description: "4 kịch bản đối phó" },
];

export const feedbackLoops = [
  { from: "/monitoring", to: "/inventory",    label: "MAPE → Tính lại SS Hub" },
  { from: "/monitoring", to: "/drp",          label: "Tin cậy → Điều chỉnh SS CN" },
  { from: "/orders",     to: "/hub",          label: "PO đã phát hành → Hub ảo" },
  { from: "/orders",     to: "/gap-scenario", label: "Phát hành → Cập nhật Gap" },
];

interface WorkflowContextType {
  workflowType: WorkflowType;
  currentStepIndex: number;
  steps: WorkflowStep[];
  isBarVisible: boolean;
  completed: boolean;
  sessionStartTime: number | null;
  completedSteps: number[];
  startWorkflow: (type: "daily" | "monthly") => void;
  closeWorkflow: () => void;
  goToStep: (index: number) => boolean; // returns false if locked
  completeCurrentStep: () => void;
  nextStep: () => void;
  isRouteInWorkflow: (path: string) => boolean;
  isStepUnlocked: (index: number) => boolean;
  // Navigation guard
  showLeaveConfirm: boolean;
  pendingNavigation: string | null;
  requestLeave: (path: string) => boolean; // returns true if allowed, false if needs confirm
  confirmLeave: () => void;
  cancelLeave: () => void;
}

const WorkflowContext = createContext<WorkflowContextType>({
  workflowType: null,
  currentStepIndex: 0,
  steps: [],
  isBarVisible: false,
  completed: false,
  sessionStartTime: null,
  completedSteps: [],
  startWorkflow: () => {},
  closeWorkflow: () => {},
  goToStep: () => false,
  completeCurrentStep: () => {},
  nextStep: () => {},
  isRouteInWorkflow: () => false,
  isStepUnlocked: () => false,
  showLeaveConfirm: false,
  pendingNavigation: null,
  requestLeave: () => true,
  confirmLeave: () => {},
  cancelLeave: () => {},
});

export const useWorkflow = () => useContext(WorkflowContext);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const { addEntry } = useActivityLog();
  const [workflowType, setWorkflowType] = useState<WorkflowType>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const rawSteps = workflowType === "daily" ? dailySteps : workflowType === "monthly" ? monthlySteps : [];

  const isStepUnlocked = useCallback((index: number) => {
    if (index === 0) return true;
    // Step N is unlocked only if step N-1 is completed
    return completedSteps.includes(index - 1);
  }, [completedSteps]);

  const steps: WorkflowStep[] = rawSteps.map((s, i) => ({
    ...s,
    status: completed
      ? "done" as const
      : completedSteps.includes(i)
        ? "done" as const
        : i === currentStepIndex
          ? "active" as const
          : !isStepUnlocked(i)
            ? "locked" as const
            : "future" as const,
  }));

  const isBarVisible = workflowType !== null;

  const startWorkflow = useCallback((type: "daily" | "monthly") => {
    setWorkflowType(type);
    setCurrentStepIndex(0);
    setCompleted(false);
    setCompletedSteps([]);
    setSessionStartTime(Date.now());
    addEntry({
      type: "workflow",
      route: type === "daily" ? "/inventory" : "/demand",
      user: "Người dùng",
      message: `Bắt đầu phiên ${type === "daily" ? "Vận hành ngày" : "Kế hoạch tháng"}`,
    });
  }, [addEntry]);

  const closeWorkflow = useCallback(() => {
    if (workflowType) {
      addEntry({
        type: "workflow",
        route: "/workspace",
        user: "Người dùng",
        message: `Đóng phiên ${workflowType === "daily" ? "Vận hành ngày" : "Kế hoạch tháng"} (chưa hoàn tất)`,
      });
    }
    setWorkflowType(null);
    setCurrentStepIndex(0);
    setCompleted(false);
    setCompletedSteps([]);
    setSessionStartTime(null);
    setShowLeaveConfirm(false);
    setPendingNavigation(null);
  }, [workflowType, addEntry]);

  const goToStep = useCallback((index: number) => {
    if (index === 0 || completedSteps.includes(index - 1)) {
      setCurrentStepIndex(index);
      setCompleted(false);
      return true;
    }
    return false;
  }, [completedSteps]);

  const completeCurrentStep = useCallback(() => {
    setCompletedSteps(prev => prev.includes(currentStepIndex) ? prev : [...prev, currentStepIndex]);
  }, [currentStepIndex]);

  const nextStep = useCallback(() => {
    const stepLabel = rawSteps[currentStepIndex]?.label || "";
    const stepRoute = rawSteps[currentStepIndex]?.routes[0] || "/workspace";
    // Mark current step as done
    setCompletedSteps(prev => prev.includes(currentStepIndex) ? prev : [...prev, currentStepIndex]);
    addEntry({
      type: "workflow",
      route: stepRoute,
      user: "Người dùng",
      message: `Hoàn tất bước "${stepLabel}" (${currentStepIndex + 1}/${rawSteps.length})`,
    });
    const max = rawSteps.length;
    if (currentStepIndex < max - 1) {
      setCurrentStepIndex((i) => i + 1);
    } else {
      setCompleted(true);
      const wfType = workflowType;
      addEntry({
        type: "workflow",
        route: "/workspace",
        user: "Người dùng",
        message: `✅ Hoàn tất phiên ${wfType === "daily" ? "Vận hành ngày" : "Kế hoạch tháng"} — ${rawSteps.length}/${rawSteps.length} bước`,
      });
      setTimeout(() => {
        setWorkflowType(null);
        setCurrentStepIndex(0);
        setCompleted(false);
        setCompletedSteps([]);
        setSessionStartTime(null);
      }, 10000);
    }
  }, [currentStepIndex, rawSteps, workflowType, addEntry]);

  const isRouteInWorkflow = useCallback(
    (path: string) => rawSteps.some((s) => s.routes.includes(path)),
    [rawSteps]
  );

  // Navigation guard
  const requestLeave = useCallback((path: string) => {
    if (!workflowType) return true;
    // Allow if path is in workflow
    if (rawSteps.some(s => s.routes.includes(path))) return true;
    // Allow workspace
    if (path === "/workspace" || path === "/") return true;
    // Otherwise show confirmation
    setShowLeaveConfirm(true);
    setPendingNavigation(path);
    return false;
  }, [workflowType, rawSteps]);

  const confirmLeave = useCallback(() => {
    if (workflowType) {
      addEntry({
        type: "workflow",
        route: "/workspace",
        user: "Người dùng",
        message: `Rời khỏi phiên ${workflowType === "daily" ? "Vận hành ngày" : "Kế hoạch tháng"} (${completedSteps.length}/${rawSteps.length} bước)`,
      });
    }
    setShowLeaveConfirm(false);
    setPendingNavigation(null);
    setWorkflowType(null);
    setCurrentStepIndex(0);
    setCompleted(false);
    setCompletedSteps([]);
    setSessionStartTime(null);
  }, [workflowType, completedSteps.length, rawSteps.length, addEntry]);

  const cancelLeave = useCallback(() => {
    setShowLeaveConfirm(false);
    setPendingNavigation(null);
  }, []);

  return (
    <WorkflowContext.Provider
      value={{
        workflowType, currentStepIndex, steps, isBarVisible, completed,
        sessionStartTime, completedSteps,
        startWorkflow, closeWorkflow, goToStep, completeCurrentStep, nextStep,
        isRouteInWorkflow, isStepUnlocked,
        showLeaveConfirm, pendingNavigation, requestLeave, confirmLeave, cancelLeave,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
}
