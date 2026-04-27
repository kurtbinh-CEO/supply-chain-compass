import { createContext, useContext, useEffect, useState } from "react";

/** Bề rộng sidebar (px) — đồng bộ giữa AppSidebar và AppLayout margin.
 *  - normal: 280px (mặc định, đủ chỗ cho text dài như "Rà soát nhu cầu" + badge).
 *  - compact: 232px (tối ưu cho màn hình nhỏ ≤1366; vẫn đủ cho text + badge nhỏ).
 *  - collapsed: 64px (icon-only, dùng chung cả hai mode). */
export const SIDEBAR_WIDTH = {
  normal: 280,
  compact: 232,
  collapsed: 64,
} as const;

const STORAGE_KEY = "sidebar.compact";

interface SidebarContextType {
  collapsed: boolean;
  toggle: () => void;
  /** Compact mode: giảm width để dành chỗ content trên màn hình nhỏ. */
  compact: boolean;
  toggleCompact: () => void;
  setCompact: (v: boolean) => void;
  /** Width hiện tại tính bằng px — consumer dùng cho style động. */
  width: number;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  toggle: () => {},
  compact: false,
  toggleCompact: () => {},
  setCompact: () => {},
  width: SIDEBAR_WIDTH.normal,
});

export const useSidebarState = () => useContext(SidebarContext);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  // Khởi tạo compact từ localStorage để preference persist qua reload.
  const [compact, setCompactState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  // Persist mỗi khi compact đổi.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, compact ? "1" : "0");
    } catch {
      /* localStorage có thể bị block (private mode) — bỏ qua, giữ state in-memory. */
    }
  }, [compact]);

  const setCompact = (v: boolean) => setCompactState(v);
  const toggleCompact = () => setCompactState((c) => !c);

  const width = collapsed
    ? SIDEBAR_WIDTH.collapsed
    : compact
      ? SIDEBAR_WIDTH.compact
      : SIDEBAR_WIDTH.normal;

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        toggle: () => setCollapsed((c) => !c),
        compact,
        toggleCompact,
        setCompact,
        width,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}
