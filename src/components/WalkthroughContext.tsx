import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface WalkthroughStep {
  route: string;
  title: string;
  badge: string;
  what: string;
  how: string;
}

interface WalkthroughContextType {
  active: WalkthroughStep | null;
  start: (step: WalkthroughStep) => void;
  dismiss: () => void;
}

const WalkthroughContext = createContext<WalkthroughContextType>(null!);

export const useWalkthrough = () => useContext(WalkthroughContext);

export function WalkthroughProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<WalkthroughStep | null>(null);
  const start = useCallback((step: WalkthroughStep) => setActive(step), []);
  const dismiss = useCallback(() => setActive(null), []);

  return (
    <WalkthroughContext.Provider value={{ active, start, dismiss }}>
      {children}
    </WalkthroughContext.Provider>
  );
}
