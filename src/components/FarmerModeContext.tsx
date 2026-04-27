/**
 * FarmerModeContext — toggle "Chế độ Farmer" cho mobile.
 *
 * Khi BẬT:
 *  - KpiCard / HeroCard tăng padding, font-size value và unit lớn hơn.
 *  - Khoảng cách (gap) giữa các thẻ rộng hơn để chạm tay dễ.
 *
 * Persist qua localStorage để user không phải bật lại mỗi phiên.
 * Tự động mount class `farmer-mode` lên <html> để CSS global cũng có thể tận dụng nếu cần.
 *
 * Hook tiện ích:
 *  - useFarmerMode() → { enabled, toggle, setEnabled }
 *  - useFarmerClass(on, off) → trả on khi enabled, off khi tắt — tránh boilerplate ở component.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "scp:farmer-mode";

interface FarmerModeCtx {
  enabled: boolean;
  toggle: () => void;
  setEnabled: (v: boolean) => void;
}

const Ctx = createContext<FarmerModeCtx | null>(null);

export function FarmerModeProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  // Persist + reflect to <html> class
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch {}
    const root = document.documentElement;
    root.classList.toggle("farmer-mode", enabled);
  }, [enabled]);

  const setEnabled = useCallback((v: boolean) => setEnabledState(v), []);
  const toggle = useCallback(() => setEnabledState(v => !v), []);

  const value = useMemo(() => ({ enabled, toggle, setEnabled }), [enabled, toggle, setEnabled]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFarmerMode(): FarmerModeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fallback an toàn nếu provider chưa mount (vd: storybook)
    return { enabled: false, toggle: () => {}, setEnabled: () => {} };
  }
  return ctx;
}

/** Tiện: trả `on` nếu farmer mode bật, ngược lại `off`. */
export function useFarmerClass(on: string, off = ""): string {
  const { enabled } = useFarmerMode();
  return enabled ? on : off;
}
