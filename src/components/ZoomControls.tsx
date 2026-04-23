import { useEffect, useState, useCallback, createContext, useContext, ReactNode } from "react";
import { Focus, Maximize2, Type } from "lucide-react";

const STORAGE_KEY = "scp-zoom";

export interface ZoomState {
  sectionFocus: boolean; // Z1
  tableFullscreen: boolean; // Z2
  largeNumbers: boolean; // Z3
}

const defaultState: ZoomState = {
  sectionFocus: false,
  tableFullscreen: false,
  largeNumbers: false,
};

interface ZoomContextType {
  zoom: ZoomState;
  toggle: (key: keyof ZoomState) => void;
}

const ZoomContext = createContext<ZoomContextType>({ zoom: defaultState, toggle: () => {} });

export const useZoom = () => useContext(ZoomContext);

export function ZoomProvider({ children }: { children: ReactNode }) {
  const [zoom, setZoom] = useState<ZoomState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...defaultState, ...JSON.parse(raw) };
    } catch {}
    return defaultState;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(zoom));
    } catch {}
    const root = document.documentElement;
    root.dataset.zoomFocus = zoom.sectionFocus ? "on" : "off";
    root.dataset.zoomTable = zoom.tableFullscreen ? "on" : "off";
    root.dataset.zoomLarge = zoom.largeNumbers ? "on" : "off";
  }, [zoom]);

  // Keyboard shortcut: ⌘⇧F → table fullscreen
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setZoom((z) => ({ ...z, tableFullscreen: !z.tableFullscreen }));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toggle = useCallback((key: keyof ZoomState) => {
    setZoom((z) => ({ ...z, [key]: !z[key] }));
  }, []);

  return <ZoomContext.Provider value={{ zoom, toggle }}>{children}</ZoomContext.Provider>;
}

export function ZoomControls() {
  const { zoom, toggle } = useZoom();

  const items: { key: keyof ZoomState; icon: typeof Focus; title: string; aria: string }[] = [
    { key: "sectionFocus", icon: Focus, title: "Tập trung khu vực", aria: "Bật/tắt tập trung khu vực" },
    { key: "tableFullscreen", icon: Maximize2, title: "Bảng toàn màn hình (⌘⇧F)", aria: "Bật/tắt bảng toàn màn hình" },
    { key: "largeNumbers", icon: Type, title: "Số to (+2px)", aria: "Bật/tắt cỡ chữ số to" },
  ];

  return (
    <div className="flex items-center rounded-lg border border-surface-3 p-0.5 gap-0.5" role="group" aria-label="Điều khiển phóng to">
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => toggle(it.key)}
          className={`rounded-md p-1.5 transition-all ${
            zoom[it.key] ? "bg-primary text-white shadow-sm" : "text-text-3 hover:text-text-1"
          }`}
          title={it.title}
          aria-label={it.aria}
          aria-pressed={zoom[it.key]}
        >
          <it.icon className="h-3 w-3" />
        </button>
      ))}
    </div>
  );
}
