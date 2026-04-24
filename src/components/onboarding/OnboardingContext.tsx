import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";

/**
 * M23 — Onboarding Tour
 *
 * Hệ thống tour cho first-time users:
 *  - Highlight các nút quan trọng với spotlight + tooltip
 *  - Lưu tiến độ vào localStorage (theo screen)
 *  - Tự động bắt đầu khi mở screen lần đầu (nếu enabled)
 *  - Có thể restart từ menu help
 *
 * Mỗi tour định nghĩa các bước với data-tour-id selector.
 */

export interface TourStep {
  /** Selector để tìm element (data-tour-id="...") */
  target: string;
  /** Tiêu đề bước */
  title: string;
  /** Mô tả ngắn */
  description: string;
  /** Vị trí tooltip so với target */
  placement?: "top" | "bottom" | "left" | "right" | "auto";
}

export interface OnboardingTour {
  /** ID duy nhất của tour, dùng làm key trong localStorage */
  id: string;
  /** Tên tour hiển thị trong menu */
  name: string;
  /** Route mà tour này áp dụng (để auto-start) */
  route?: string;
  /** Các bước */
  steps: TourStep[];
}

interface OnboardingContextType {
  activeTour: OnboardingTour | null;
  currentStep: number;
  startTour: (tour: OnboardingTour) => void;
  nextStep: () => void;
  prevStep: () => void;
  finishTour: () => void;
  skipTour: () => void;
  /** Đánh dấu một tour đã xem (dùng cho auto-start) */
  isTourCompleted: (tourId: string) => boolean;
  /** Reset toàn bộ tiến độ */
  resetAllTours: () => void;
}

const OnboardingContext = createContext<OnboardingContextType>(null!);

export const useOnboarding = () => useContext(OnboardingContext);

const STORAGE_KEY = "scp:onboarding:completed";
const ENABLED_KEY = "scp:onboarding:enabled";

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [activeTour, setActiveTour] = useState<OnboardingTour | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedTours, setCompletedTours] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set<string>();
    }
  });

  const persist = useCallback((next: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
    } catch {}
  }, []);

  const startTour = useCallback((tour: OnboardingTour) => {
    setActiveTour(tour);
    setCurrentStep(0);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => {
      if (!activeTour) return prev;
      if (prev >= activeTour.steps.length - 1) return prev;
      return prev + 1;
    });
  }, [activeTour]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  const finishTour = useCallback(() => {
    if (!activeTour) return;
    setCompletedTours(prev => {
      const next = new Set(prev);
      next.add(activeTour.id);
      persist(next);
      return next;
    });
    setActiveTour(null);
    setCurrentStep(0);
  }, [activeTour, persist]);

  const skipTour = useCallback(() => {
    finishTour();
  }, [finishTour]);

  const isTourCompleted = useCallback((tourId: string) => completedTours.has(tourId), [completedTours]);

  const resetAllTours = useCallback(() => {
    setCompletedTours(new Set());
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  return (
    <OnboardingContext.Provider value={{
      activeTour, currentStep,
      startTour, nextStep, prevStep, finishTour, skipTour,
      isTourCompleted, resetAllTours,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}

/** Hook để auto-start tour khi mở route lần đầu (nếu user chưa tắt onboarding) */
export function useAutoStartTour(tour: OnboardingTour) {
  const { isTourCompleted, startTour, activeTour } = useOnboarding();

  useEffect(() => {
    if (activeTour) return; // không chạy đè
    if (isTourCompleted(tour.id)) return;

    // check global enable flag (default ON)
    let enabled = true;
    try {
      const raw = localStorage.getItem(ENABLED_KEY);
      if (raw === "false") enabled = false;
    } catch {}
    if (!enabled) return;

    // delay nhẹ để DOM render xong
    const timer = setTimeout(() => startTour(tour), 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour.id]);
}

export function setOnboardingEnabled(enabled: boolean) {
  try { localStorage.setItem(ENABLED_KEY, String(enabled)); } catch {}
}

export function isOnboardingEnabled(): boolean {
  try {
    const raw = localStorage.getItem(ENABLED_KEY);
    return raw !== "false";
  } catch { return true; }
}
