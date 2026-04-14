import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";

export type WorkflowType = "daily" | "monthly" | null;

export interface WorkflowStep {
  label: string;
  routes: string[];
  status: "done" | "active" | "future" | "locked";
  description: string;
  completedAt?: number; // timestamp
}

const dailySteps: Omit<WorkflowStep, "status" | "completedAt">[] = [
  { label: "NM Supply", routes: ["/supply"], description: "Cập nhật tồn kho nhà máy" },
  { label: "Demand & Adjust", routes: ["/demand-weekly"], description: "Điều chỉnh nhu cầu tuần" },
  { label: "DRP & Orders", routes: ["/drp", "/orders"], description: "Phân bổ và đặt hàng" },
];

const monthlySteps: Omit<WorkflowStep, "status" | "completedAt">[] = [
  { label: "Demand Review", routes: ["/demand"], description: "Rà soát dự báo nhu cầu" },
  { label: "S&OP Consensus", routes: ["/sop"], description: "Đồng thuận kế hoạch" },
  { label: "Hub & Commitment", routes: ["/hub"], description: "Cam kết nhà máy" },
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
  }, []);

  const closeWorkflow = useCallback(() => {
    setWorkflowType(null);
    setCurrentStepIndex(0);
    setCompleted(false);
    setCompletedSteps([]);
    setSessionStartTime(null);
    setShowLeaveConfirm(false);
    setPendingNavigation(null);
  }, []);

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
    // Mark current step as done
    setCompletedSteps(prev => prev.includes(currentStepIndex) ? prev : [...prev, currentStepIndex]);
    const max = rawSteps.length;
    if (currentStepIndex < max - 1) {
      setCurrentStepIndex((i) => i + 1);
    } else {
      setCompleted(true);
      setTimeout(() => {
        setWorkflowType(null);
        setCurrentStepIndex(0);
        setCompleted(false);
        setCompletedSteps([]);
        setSessionStartTime(null);
      }, 10000);
    }
  }, [currentStepIndex, rawSteps.length]);

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
    setShowLeaveConfirm(false);
    setPendingNavigation(null);
    // Close the workflow session
    setWorkflowType(null);
    setCurrentStepIndex(0);
    setCompleted(false);
    setCompletedSteps([]);
    setSessionStartTime(null);
  }, []);

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
