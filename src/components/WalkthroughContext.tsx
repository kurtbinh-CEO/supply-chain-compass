import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface TourHighlight {
  /** data-tour attribute value to find the element */
  selector: string;
  /** Short label shown in tooltip */
  label: string;
  /** Description shown in tooltip */
  description: string;
}

export interface WalkthroughStep {
  route: string;
  title: string;
  badge: string;
  what: string;
  how: string;
  highlights?: TourHighlight[];
}

interface WalkthroughContextType {
  active: WalkthroughStep | null;
  currentHighlight: number;
  /** All steps in the current flow sequence */
  flowSteps: WalkthroughStep[];
  /** Index of the active step within the flow */
  flowIndex: number;
  /** Whether there's a next step in the flow */
  hasNextFlowStep: boolean;
  start: (step: WalkthroughStep, flow?: WalkthroughStep[], flowIdx?: number) => void;
  dismiss: () => void;
  nextHighlight: () => void;
  prevHighlight: () => void;
  goToHighlight: (idx: number) => void;
  /** Navigate to the next step in the flow sequence */
  nextFlowStep: () => WalkthroughStep | null;
}

const WalkthroughContext = createContext<WalkthroughContextType>(null!);

export const useWalkthrough = () => useContext(WalkthroughContext);

export function WalkthroughProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<WalkthroughStep | null>(null);
  const [currentHighlight, setCurrentHighlight] = useState(0);
  const [flowSteps, setFlowSteps] = useState<WalkthroughStep[]>([]);
  const [flowIndex, setFlowIndex] = useState(0);

  const hasNextFlowStep = flowSteps.length > 0 && flowIndex < flowSteps.length - 1;

  const start = useCallback((step: WalkthroughStep, flow?: WalkthroughStep[], flowIdx?: number) => {
    setActive(step);
    setCurrentHighlight(0);
    if (flow) {
      setFlowSteps(flow);
      setFlowIndex(flowIdx ?? 0);
    }
  }, []);

  const dismiss = useCallback(() => {
    setActive(null);
    setCurrentHighlight(0);
    setFlowSteps([]);
    setFlowIndex(0);
  }, []);

  const nextHighlight = useCallback(() => {
    if (!active?.highlights) return;
    setCurrentHighlight(prev => Math.min(prev + 1, active.highlights!.length - 1));
  }, [active]);

  const prevHighlight = useCallback(() => {
    setCurrentHighlight(prev => Math.max(prev - 1, 0));
  }, []);

  const goToHighlight = useCallback((idx: number) => {
    setCurrentHighlight(idx);
  }, []);

  const nextFlowStep = useCallback((): WalkthroughStep | null => {
    if (!hasNextFlowStep) return null;
    const nextIdx = flowIndex + 1;
    const nextStep = flowSteps[nextIdx];
    setActive(nextStep);
    setCurrentHighlight(0);
    setFlowIndex(nextIdx);
    return nextStep;
  }, [flowSteps, flowIndex, hasNextFlowStep]);

  return (
    <WalkthroughContext.Provider value={{
      active, currentHighlight, flowSteps, flowIndex, hasNextFlowStep,
      start, dismiss, nextHighlight, prevHighlight, goToHighlight, nextFlowStep,
    }}>
      {children}
    </WalkthroughContext.Provider>
  );
}
