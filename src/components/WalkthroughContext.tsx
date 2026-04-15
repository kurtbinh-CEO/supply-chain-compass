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
  start: (step: WalkthroughStep) => void;
  dismiss: () => void;
  nextHighlight: () => void;
  prevHighlight: () => void;
  goToHighlight: (idx: number) => void;
}

const WalkthroughContext = createContext<WalkthroughContextType>(null!);

export const useWalkthrough = () => useContext(WalkthroughContext);

export function WalkthroughProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<WalkthroughStep | null>(null);
  const [currentHighlight, setCurrentHighlight] = useState(0);

  const start = useCallback((step: WalkthroughStep) => {
    setActive(step);
    setCurrentHighlight(0);
  }, []);

  const dismiss = useCallback(() => {
    setActive(null);
    setCurrentHighlight(0);
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

  return (
    <WalkthroughContext.Provider value={{ active, currentHighlight, start, dismiss, nextHighlight, prevHighlight, goToHighlight }}>
      {children}
    </WalkthroughContext.Provider>
  );
}
