import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type LogEventType = "workflow" | "data" | "approval" | "system";

export interface LogEntry {
  id: string;
  timestamp: number;
  type: LogEventType;
  route: string; // which page generated this
  user: string;
  message: string;
  detail?: string;
}

interface ActivityLogContextType {
  entries: LogEntry[];
  addEntry: (entry: Omit<LogEntry, "id" | "timestamp">) => void;
  getEntriesForRoute: (route: string) => LogEntry[];
  clearAll: () => void;
}

const ActivityLogContext = createContext<ActivityLogContextType>({
  entries: [],
  addEntry: () => {},
  getEntriesForRoute: () => [],
  clearAll: () => {},
});

export const useActivityLog = () => useContext(ActivityLogContext);

let _counter = 0;

// Seed some demo entries
const seedEntries: LogEntry[] = [
  { id: "seed-1", timestamp: Date.now() - 3600_000 * 2, type: "data", route: "/demand", user: "Nguyễn Văn A", message: "Cập nhật dự báo GT-6060 (+12%)" },
  { id: "seed-2", timestamp: Date.now() - 3600_000 * 1.5, type: "system", route: "/drp", user: "Hệ thống", message: "DRP run #47 hoàn tất — 3 cảnh báo" },
  { id: "seed-3", timestamp: Date.now() - 3600_000, type: "approval", route: "/orders", user: "Trần Thị B", message: "Duyệt PO-2506-001 (NM Bình Dương)" },
  { id: "seed-4", timestamp: Date.now() - 1800_000, type: "data", route: "/supply", user: "Hệ thống", message: "Tự động điều chỉnh allocation CN Miền Nam" },
  { id: "seed-5", timestamp: Date.now() - 900_000, type: "data", route: "/monitoring", user: "Lê Văn C", message: "Cập nhật Safety Stock SKU-7728 (+15%)" },
];

export function ActivityLogProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<LogEntry[]>(seedEntries);

  const addEntry = useCallback((entry: Omit<LogEntry, "id" | "timestamp">) => {
    const newEntry: LogEntry = {
      ...entry,
      id: `log-${++_counter}-${Date.now()}`,
      timestamp: Date.now(),
    };
    setEntries(prev => [newEntry, ...prev]);
  }, []);

  const getEntriesForRoute = useCallback((route: string) => {
    return entries.filter(e => e.route === route);
  }, [entries]);

  const clearAll = useCallback(() => setEntries([]), []);

  return (
    <ActivityLogContext.Provider value={{ entries, addEntry, getEntriesForRoute, clearAll }}>
      {children}
    </ActivityLogContext.Provider>
  );
}
