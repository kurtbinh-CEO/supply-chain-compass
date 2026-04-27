import { createContext, useContext, useEffect, useState } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
 * Appearance preferences (sidebar + layout + direction).
 * Tất cả persist qua localStorage để giữ qua reload và đồng bộ tab.
 * ─────────────────────────────────────────────────────────────────────────── */

/** Bề rộng sidebar (px). Compact dành cho màn ≤1366. */
export const SIDEBAR_WIDTH = {
  normal: 280,
  compact: 232,
  collapsed: 64,
} as const;

/** Phong cách hiển thị sidebar:
 *  - "sidebar": full-height sát mép trái, viền phải (mặc định cũ).
 *  - "inset":   nhỏ vào trong, có khoảng cách quanh, bo góc — content "inset" bên cạnh.
 *  - "floating": tách rời với bóng đổ, nổi trên content. */
export type SidebarStyle = "sidebar" | "inset" | "floating";

/** Mật độ layout content:
 *  - "default": padding p-6, max-width container.
 *  - "compact": p-4, gap nhỏ hơn — phù hợp Ops trên màn hình nhỏ.
 *  - "full":    p-6 nhưng full-bleed, không giới hạn max-width. */
export type LayoutDensity = "default" | "compact" | "full";

/** Hướng đọc — RTL cho ngôn ngữ Ả Rập/Do Thái nếu cần mở rộng sau. */
export type Direction = "ltr" | "rtl";

const STORAGE = {
  compact: "sidebar.compact",
  style:   "sidebar.style",
  density: "layout.density",
  dir:     "layout.direction",
} as const;

interface SidebarContextType {
  collapsed: boolean;
  toggle: () => void;
  /** Compact mode → giảm width sidebar 280→232. */
  compact: boolean;
  toggleCompact: () => void;
  setCompact: (v: boolean) => void;
  /** Width sidebar hiện tại (px). */
  width: number;
  /** Phong cách sidebar (sidebar/inset/floating). */
  sidebarStyle: SidebarStyle;
  setSidebarStyle: (s: SidebarStyle) => void;
  /** Mật độ layout content. */
  layoutDensity: LayoutDensity;
  setLayoutDensity: (d: LayoutDensity) => void;
  /** Hướng đọc. */
  direction: Direction;
  setDirection: (d: Direction) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false, toggle: () => {},
  compact: false, toggleCompact: () => {}, setCompact: () => {},
  width: SIDEBAR_WIDTH.normal,
  sidebarStyle: "sidebar", setSidebarStyle: () => {},
  layoutDensity: "default", setLayoutDensity: () => {},
  direction: "ltr", setDirection: () => {},
});

export const useSidebarState = () => useContext(SidebarContext);

/** Helper đọc localStorage có fallback an toàn (private mode block). */
function readLS<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = window.localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* ignore */ }
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [compact, setCompactState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return window.localStorage.getItem(STORAGE.compact) === "1"; } catch { return false; }
  });
  const [sidebarStyle, setSidebarStyleState] = useState<SidebarStyle>(
    () => readLS<SidebarStyle>(STORAGE.style, "sidebar", ["sidebar", "inset", "floating"]),
  );
  const [layoutDensity, setLayoutDensityState] = useState<LayoutDensity>(
    () => readLS<LayoutDensity>(STORAGE.density, "default", ["default", "compact", "full"]),
  );
  const [direction, setDirectionState] = useState<Direction>(
    () => readLS<Direction>(STORAGE.dir, "ltr", ["ltr", "rtl"]),
  );

  // Persist + sync side-effect (dir attribute trên <html>).
  useEffect(() => writeLS(STORAGE.compact, compact ? "1" : "0"), [compact]);
  useEffect(() => writeLS(STORAGE.style, sidebarStyle), [sidebarStyle]);
  useEffect(() => writeLS(STORAGE.density, layoutDensity), [layoutDensity]);
  useEffect(() => {
    writeLS(STORAGE.dir, direction);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("dir", direction);
    }
  }, [direction]);

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
        collapsed, toggle: () => setCollapsed((c) => !c),
        compact, toggleCompact, setCompact,
        width,
        sidebarStyle, setSidebarStyle: setSidebarStyleState,
        layoutDensity, setLayoutDensity: setLayoutDensityState,
        direction, setDirection: setDirectionState,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}
