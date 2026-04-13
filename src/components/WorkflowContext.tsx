import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type WorkflowType = "daily" | "monthly" | null;

export interface WorkflowStep {
  label: string;
  routes: string[];
  status: "done" | "active" | "future";
}

const dailySteps: Omit<WorkflowStep, "status">[] = [
  { label: "NM Sync", routes: ["/supply"] },
  { label: "Demand & Adjust", routes: ["/demand-weekly"] },
  { label: "DRP & Allocation", routes: ["/drp", "/allocation"] },
  { label: "Orders & Tracking", routes: ["/orders"] },
];

const monthlySteps: Omit<WorkflowStep, "status">[] = [
  { label: "Demand Review", routes: ["/demand"] },
  { label: "S&OP Consensus", routes: ["/sop"] },
  { label: "Hub & Commitment", routes: ["/hub"] },
];

interface WorkflowContextType {
  workflowType: WorkflowType;
  currentStepIndex: number;
  steps: WorkflowStep[];
  isBarVisible: boolean;
  completed: boolean;
  startWorkflow: (type: "daily" | "monthly") => void;
  closeWorkflow: () => void;
  goToStep: (index: number) => void;
  nextStep: () => void;
  isRouteInWorkflow: (path: string) => boolean;
}

const WorkflowContext = createContext<WorkflowContextType>({
  workflowType: null,
  currentStepIndex: 0,
  steps: [],
  isBarVisible: false,
  completed: false,
  startWorkflow: () => {},
  closeWorkflow: () => {},
  goToStep: () => {},
  nextStep: () => {},
  isRouteInWorkflow: () => false,
});

export const useWorkflow = () => useContext(WorkflowContext);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [workflowType, setWorkflowType] = useState<WorkflowType>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completed, setCompleted] = useState(false);

  const rawSteps = workflowType === "daily" ? dailySteps : workflowType === "monthly" ? monthlySteps : [];

  const steps: WorkflowStep[] = rawSteps.map((s, i) => ({
    ...s,
    status: completed ? "done" as const : i < currentStepIndex ? "done" as const : i === currentStepIndex ? "active" as const : "future" as const,
  }));

  const isBarVisible = workflowType !== null;

  const startWorkflow = useCallback((type: "daily" | "monthly") => {
    setWorkflowType(type);
    setCurrentStepIndex(0);
    setCompleted(false);
  }, []);

  const closeWorkflow = useCallback(() => {
    setWorkflowType(null);
    setCurrentStepIndex(0);
    setCompleted(false);
  }, []);

  const goToStep = useCallback((index: number) => {
    setCurrentStepIndex(index);
    setCompleted(false);
  }, []);

  const nextStep = useCallback(() => {
    const max = rawSteps.length;
    if (currentStepIndex < max - 1) {
      setCurrentStepIndex((i) => i + 1);
    } else {
      setCompleted(true);
      setTimeout(() => {
        setWorkflowType(null);
        setCurrentStepIndex(0);
        setCompleted(false);
      }, 10000);
    }
  }, [currentStepIndex, rawSteps.length]);

  const isRouteInWorkflow = useCallback(
    (path: string) => rawSteps.some((s) => s.routes.includes(path)),
    [rawSteps]
  );

  return (
    <WorkflowContext.Provider
      value={{ workflowType, currentStepIndex, steps, isBarVisible, completed, startWorkflow, closeWorkflow, goToStep, nextStep, isRouteInWorkflow }}
    >
      {children}
    </WorkflowContext.Provider>
  );
}
